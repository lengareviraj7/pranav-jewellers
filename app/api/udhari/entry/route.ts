import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import SaleRecord from "@/models/SaleRecord";
import Customer from "@/models/Customer";
import CashTransaction from "@/models/CashTransaction";
import FinanceLoan from "@/models/FinanceLoan";
import FinancePayment from "@/models/FinancePayment";

export const dynamic = "force-dynamic";

// GET /api/udhari/entry?phone=...
// Returns complete chronological ledger entries for a customer (You Gave vs You Got)
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const phone = (searchParams.get("phone") || "").trim();
    const name = (searchParams.get("name") || "").trim();

    if (!phone && !name) {
      return NextResponse.json({ error: "Customer phone or name is required" }, { status: 400 });
    }

    const cleanPhoneDigits = phone.replace(/\D/g, "");
    const phoneFilter = cleanPhoneDigits
      ? {
          $or: [
            { "customer.phone": { $regex: cleanPhoneDigits.slice(-10) } },
            { "customer.phone": phone },
          ],
        }
      : { "customer.name": { $regex: name, $options: "i" } };

    const sales = await SaleRecord.find(phoneFilter).sort({ saleDate: 1, createdAt: 1 }).lean();

    // Compile flat chronological ledger
    interface LedgerEntry {
      id: string;
      type: "gave" | "got";
      amountPaise: number;
      amountRupees: number;
      date: string;
      description: string;
      saleNumber: string;
      saleId: string;
      paymentMode?: string;
      runningBalancePaise: number;
      runningBalanceRupees: number;
    }

    const rawEvents: Array<{
      id: string;
      type: "gave" | "got";
      amountPaise: number;
      date: Date;
      description: string;
      saleNumber: string;
      saleId: string;
      paymentMode?: string;
    }> = [];

    let primaryCust = {
      name: name || "Customer",
      phone: phone || "",
      address: "Visapur",
    };

    for (const s of sales) {
      if (s.customer?.name) primaryCust.name = s.customer.name;
      if (s.customer?.phone) primaryCust.phone = s.customer.phone;
      if (s.customer?.address) primaryCust.address = s.customer.address;

      const saleId = s._id.toString();
      const sNumber = s.saleNumber || "SJ-SALE";
      const sDate = new Date(s.saleDate || s.createdAt);

      // 1. Debit Entry: The bill / udhari given (You Gave)
      rawEvents.push({
        id: `sale_${saleId}`,
        type: "gave",
        amountPaise: s.sellingPricePaise || 0,
        date: sDate,
        description: s.itemName ? `${s.itemName} (${sNumber})` : `Bill ${sNumber}`,
        saleNumber: sNumber,
        saleId,
      });

      // 2. Initial Down Payment (if any) paid at time of sale
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach((p: any, idx: number) => {
          rawEvents.push({
            id: `pay_${saleId}_${idx}`,
            type: "got",
            amountPaise: p.amountPaise || 0,
            date: new Date(p.date || sDate),
            description: p.notes || `Installment • ${p.paymentMode || "Cash"}`,
            saleNumber: sNumber,
            saleId,
            paymentMode: p.paymentMode || "cash",
          });
        });
      } else if (s.paidAmountPaise > 0) {
        // Fallback for sales without explicit payments array
        rawEvents.push({
          id: `pay_${saleId}_initial`,
          type: "got",
          amountPaise: s.paidAmountPaise,
          date: sDate,
          description: `Initial Down Payment • ${s.paymentMode || "Cash"}`,
          saleNumber: sNumber,
          saleId,
          paymentMode: s.paymentMode || "cash",
        });
      }
    }

    // Also look up any Customer profile and associated Girvi/Finance Loans & Payments
    try {
      const custFilter = cleanPhoneDigits
        ? {
            $or: [
              { mobileNumber: { $regex: cleanPhoneDigits.slice(-10) } },
              { mobileNumber: phone },
            ],
          }
        : { fullName: { $regex: name, $options: "i" } };

      const matchingCustomer = await Customer.findOne(custFilter).lean();
      if (matchingCustomer) {
        if (!primaryCust.name || primaryCust.name === "Customer") primaryCust.name = matchingCustomer.fullName;
        if (!primaryCust.phone) primaryCust.phone = matchingCustomer.mobileNumber;
        if (matchingCustomer.address) primaryCust.address = matchingCustomer.address;

        const loans = await FinanceLoan.find({ customerId: matchingCustomer._id }).lean();
        const loanIds = loans.map((l: any) => l._id);
        const payments = await FinancePayment.find({ loanId: { $in: loanIds } }).lean();

        // 1. Loans issued (YOU GAVE)
        for (const loan of loans) {
          const lDate = new Date(loan.mortgageDate || (loan as any).createdAt);
          const lNum = loan.loanNumber || "LOAN";
          const desc = loan.pledgedItems?.[0]?.description
            ? `Girvi Loan (${lNum}) • ${loan.pledgedItems[0].description}`
            : `Girvi Loan (${lNum})`;

          rawEvents.push({
            id: `loan_${loan._id.toString()}`,
            type: "gave",
            amountPaise: loan.originalPrincipalPaise || 0,
            date: lDate,
            description: desc,
            saleNumber: lNum,
            saleId: loan._id.toString(),
          });
        }

        // 2. Payments received on loans (YOU GOT)
        for (const pay of payments) {
          const pDate = new Date(pay.paymentDate || (pay as any).createdAt);
          const pNum = pay.receiptNumber || "RCP";
          const desc = pay.notes
            ? `Girvi Pay (${pNum}): ${pay.notes}`
            : `Girvi Pay (${pNum}) • ${pay.paymentMethod || "Cash"}`;

          rawEvents.push({
            id: `fpay_${pay._id.toString()}`,
            type: "got",
            amountPaise: pay.totalAmountPaise || 0,
            date: pDate,
            description: desc,
            saleNumber: pNum,
            saleId: pay.loanId?.toString() || pay._id.toString(),
            paymentMode: pay.paymentMethod || "cash",
          });
        }
      }
    } catch (financeErr) {
      console.warn("Could not query finance loans for khata:", financeErr);
    }

    // Sort all events chronologically (oldest first)
    rawEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate running balance at each transaction
    let runningBalance = 0;
    const ledgerEntries: LedgerEntry[] = rawEvents.map((ev) => {
      if (ev.type === "gave") {
        runningBalance += ev.amountPaise;
      } else {
        runningBalance = Math.max(0, runningBalance - ev.amountPaise);
      }

      return {
        id: ev.id,
        type: ev.type,
        amountPaise: ev.amountPaise,
        amountRupees: ev.amountPaise / 100,
        date: ev.date.toISOString(),
        description: ev.description,
        saleNumber: ev.saleNumber,
        saleId: ev.saleId,
        paymentMode: ev.paymentMode,
        runningBalancePaise: runningBalance,
        runningBalanceRupees: runningBalance / 100,
      };
    });

    // Reversed for display (newest first, as in Khatabook)
    const displayEntries = [...ledgerEntries].reverse();

    const totalGavePaise = ledgerEntries
      .filter((e) => e.type === "gave")
      .reduce((sum, e) => sum + e.amountPaise, 0);
    const totalGotPaise = ledgerEntries
      .filter((e) => e.type === "got")
      .reduce((sum, e) => sum + e.amountPaise, 0);

    return NextResponse.json({
      success: true,
      customer: primaryCust,
      totalGaveRupees: totalGavePaise / 100,
      totalGotRupees: totalGotPaise / 100,
      balanceDueRupees: runningBalance / 100,
      entries: displayEntries,
      salesCount: sales.length,
    });
  } catch (error: any) {
    console.error("GET /api/udhari/entry error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch ledger" }, { status: 500 });
  }
}

// POST /api/udhari/entry
// Handles recording either:
// - action === "give" (YOU GAVE: create new credit / udhari record)
// - action === "got"  (YOU GOT: record payment received towards dues)
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const body = await req.json();
    const {
      action, // "give" | "got"
      customerName,
      customerPhone,
      customerAddress,
      amountRupees,
      description,
      paymentMode,
      date,
      dueDate,
      notes,
      saleId,
    } = body;

    const numAmount = parseFloat(amountRupees);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Please enter a valid amount greater than ₹0." }, { status: 400 });
    }

    if (!customerPhone) {
      return NextResponse.json({ error: "Customer phone number is required." }, { status: 400 });
    }

    const cleanDigits = customerPhone.replace(/\D/g, "");
    const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const finalCustName = (customerName || "").trim() || "Customer";
    const finalCustAddress = (customerAddress || "").trim() || "Visapur";
    const amountPaise = Math.round(numAmount * 100);
    const txnDate = date ? new Date(date) : new Date();

    // Ensure customer profile exists in Customer collection
    let customerDoc = await Customer.findOne({
      $or: [{ mobileNumber: formattedPhone }, { mobileNumber: customerPhone }],
    });
    if (!customerDoc) {
      const custCount = await Customer.countDocuments();
      customerDoc = await Customer.create({
        customerId: `CUST-${formattedPhone.slice(-6) || String(custCount + 1).padStart(4, "0")}`,
        fullName: finalCustName,
        mobileNumber: formattedPhone,
        address: finalCustAddress,
        isActive: true,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CASE A: YOU GAVE ₹ (Debit / Udhari / Credit Given)
    // ─────────────────────────────────────────────────────────────
    if (action === "give") {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const todayCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const saleNumber = `SJ-UDHARI-${todayCode}-${randomSuffix}`;
      const sku = `UD-${randomSuffix}`;

      const createdSale = await SaleRecord.create({
        saleNumber,
        metalType: "gold",
        itemName: description ? description.trim() : "Udhari Credit (आम्ही दिले)",
        sku,
        purity: "22K",
        quantitySold: 1,
        grossWeightSold: 0,
        netWeightSold: 0,
        costPricePaise: 0,
        sellingPricePaise: amountPaise,
        profitPaise: 0,
        customer: {
          name: finalCustName,
          phone: formattedPhone,
          address: finalCustAddress,
        },
        paymentMode: "cash",
        paidAmountPaise: 0,
        balanceDuePaise: amountPaise,
        paymentStatus: "unpaid",
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes: notes ? notes.trim() : undefined,
        saleDate: txnDate,
        payments: [],
      });

      return NextResponse.json({
        success: true,
        message: `Udhari entry of ₹${numAmount.toLocaleString("en-IN")} recorded successfully (YOU GAVE).`,
        sale: createdSale,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CASE B: YOU GOT ₹ (Credit / Payment Received)
    // ─────────────────────────────────────────────────────────────
    if (action === "got") {
      const resolvedMode: "cash" | "online" = paymentMode === "online" ? "online" : "cash";

      // If specific saleId is provided, apply to that sale
      let targetSale: any = null;
      if (saleId) {
        targetSale = await SaleRecord.findById(saleId);
      }

      // If no targetSale or targetSale has 0 due, find open sales for this customer with balance > 0
      if (!targetSale || targetSale.balanceDuePaise <= 0) {
        targetSale = await SaleRecord.findOne({
          $or: [{ "customer.phone": formattedPhone }, { "customer.phone": customerPhone }],
          balanceDuePaise: { $gt: 0 },
        }).sort({ saleDate: 1 }); // FIFO - oldest pending sale
      }

      // If customer has an open sale, allocate to it
      if (targetSale) {
        const remainingDuePaise = targetSale.balanceDuePaise;
        const clearedDuePaise = Math.min(amountPaise, remainingDuePaise);
        const excessPaise = amountPaise > remainingDuePaise ? amountPaise - remainingDuePaise : 0;

        targetSale.payments.push({
          amountPaise,
          paymentMode: resolvedMode,
          date: txnDate,
          notes: notes
            ? notes.trim()
            : excessPaise > 0
            ? `Paid ₹${(clearedDuePaise / 100).toLocaleString("en-IN")} + ₹${(excessPaise / 100).toLocaleString("en-IN")} Advance Deposit`
            : "Udhari installment payment (YOU GOT)",
        });

        targetSale.paidAmountPaise += clearedDuePaise;
        targetSale.balanceDuePaise = Math.max(0, targetSale.balanceDuePaise - clearedDuePaise);
        targetSale.paymentStatus = targetSale.balanceDuePaise <= 0 ? "paid" : "partial";
        if (dueDate && targetSale.balanceDuePaise > 0) {
          targetSale.dueDate = new Date(dueDate);
        }
        await targetSale.save();

        // If excess was paid, credit to Customer advance balance
        if (excessPaise > 0 && customerDoc) {
          customerDoc.advanceBalancePaise = (customerDoc.advanceBalancePaise || 0) + excessPaise;
          await customerDoc.save();
        }
      } else {
        // No open sale with balance due: record as advance deposit on customer
        if (customerDoc) {
          customerDoc.advanceBalancePaise = (customerDoc.advanceBalancePaise || 0) + amountPaise;
          await customerDoc.save();
        }

        // Also record a zero-balance sale record to preserve this payment in chronological history
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const todayCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        await SaleRecord.create({
          saleNumber: `SJ-RCV-${todayCode}-${randomSuffix}`,
          metalType: "gold",
          itemName: notes ? notes.trim() : "Payment Received (आम्हाला मिळाले)",
          sku: `RCV-${randomSuffix}`,
          purity: "22K",
          quantitySold: 1,
          grossWeightSold: 0,
          netWeightSold: 0,
          costPricePaise: 0,
          sellingPricePaise: amountPaise,
          paidAmountPaise: amountPaise,
          balanceDuePaise: 0,
          profitPaise: 0,
          customer: {
            name: finalCustName,
            phone: formattedPhone,
            address: finalCustAddress,
          },
          paymentMode: resolvedMode,
          paymentStatus: "paid",
          saleDate: txnDate,
          notes: notes ? notes.trim() : "Direct payment received",
          payments: [
            {
              amountPaise,
              paymentMode: resolvedMode,
              date: txnDate,
              notes: notes || "Payment Received (YOU GOT)",
            },
          ],
        });
      }

      // Record in Counter Cash Book (Rojmel Jama) if cash
      if (resolvedMode === "cash") {
        await CashTransaction.create({
          transactionType: "credit",
          category: "udhari_recovery",
          amountPaise,
          purpose: `Udhari Collection (YOU GOT): ${finalCustName} [${customerPhone}]`,
          referenceId: targetSale?.saleNumber || `CUST-${customerPhone}`,
          date: txnDate,
          notes: notes || "Payment collected via Customer Khata Ledger",
        });
      }

      return NextResponse.json({
        success: true,
        message: `Payment of ₹${numAmount.toLocaleString("en-IN")} recorded successfully (YOU GOT).`,
      });
    }

    return NextResponse.json({ error: "Invalid action. Expected 'give' or 'got'." }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/udhari/entry error:", error);
    return NextResponse.json({ error: error.message || "Failed to record ledger entry" }, { status: 500 });
  }
}
