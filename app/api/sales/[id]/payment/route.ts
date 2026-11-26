import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import SaleRecord from "@/models/SaleRecord";
import CashTransaction from "@/models/CashTransaction";
import Customer from "@/models/Customer";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { id } = params;

    const sale = await SaleRecord.findById(id).lean();
    if (!sale) {
      return NextResponse.json({ error: "Sale record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, sale });
  } catch (error: any) {
    console.error("GET /api/sales/[id]/payment error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { id } = params;
    const body = await req.json();

    const { amountRupees, amountPaise: rawPaise, paymentMode, notes, nextDueDate } = body;
    const amount = amountRupees !== undefined && amountRupees !== ""
      ? parseFloat(amountRupees)
      : rawPaise !== undefined ? parseFloat(rawPaise) / 100 : 0;

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
    }

    const sale = await SaleRecord.findById(id);
    if (!sale) {
      return NextResponse.json({ error: "Sale record not found" }, { status: 404 });
    }

    const amountPaise = Math.round(amount * 100);

    // Duplicate payment prevention within 4 seconds
    const lastPayment = sale.payments && sale.payments.length > 0 ? sale.payments[sale.payments.length - 1] : null;
    if (lastPayment && lastPayment.amountPaise === amountPaise && (Date.now() - new Date(lastPayment.date).getTime()) < 4000) {
      return NextResponse.json({
        success: true,
        sale,
        duplicatePrevented: true,
      });
    }

    const remainingDuePaise = sale.balanceDuePaise;
    let clearedDuePaise = amountPaise;
    let excessAdvancePaise = 0;

    if (amountPaise > remainingDuePaise) {
      clearedDuePaise = remainingDuePaise;
      excessAdvancePaise = amountPaise - remainingDuePaise;
    }

    const resolvedMode: "cash" | "online" | "advance" =
      paymentMode === "online" ? "online" : paymentMode === "advance" ? "advance" : "cash";

    const paymentNote = notes
      ? excessAdvancePaise > 0
        ? `${notes} (₹${(clearedDuePaise / 100).toLocaleString("en-IN")} cleared due + ₹${(excessAdvancePaise / 100).toLocaleString("en-IN")} Advance Deposit)`
        : notes
      : excessAdvancePaise > 0
      ? `Udhari cleared + ₹${(excessAdvancePaise / 100).toLocaleString("en-IN")} Advance Deposit recorded`
      : paymentMode === "advance"
      ? "Adjusted from Customer Advance"
      : "Udhari installment payment";

    // Record the installment in the payments array
    sale.payments.push({
      amountPaise,
      paymentMode: resolvedMode,
      date: new Date(),
      notes: paymentNote,
    });

    sale.paidAmountPaise += amountPaise;
    sale.balanceDuePaise = Math.max(0, sale.balanceDuePaise - clearedDuePaise);

    if (sale.balanceDuePaise === 0) {
      sale.paymentStatus = "paid";
    } else {
      sale.paymentStatus = "partial";
    }

    // Update next promised due date if partial balance remains
    if (nextDueDate && sale.balanceDuePaise > 0) {
      sale.dueDate = new Date(nextDueDate);
    }

    await sale.save();

    // If there is excess advance or advance payment, update Customer advance balance
    let cleanPhone = sale.customer.phone.replace(/\D/g, "");
    if (excessAdvancePaise > 0 && cleanPhone) {
      const normalizedPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
      await Customer.findOneAndUpdate(
        { mobileNumber: { $regex: new RegExp(normalizedPhone + "$") } },
        { $inc: { advanceBalancePaise: excessAdvancePaise } }
      );
    }

    // Auto-record in Cash Book if cash payment
    if (resolvedMode === "cash") {
      await CashTransaction.create({
        transactionType: "credit",
        amountPaise,
        category: excessAdvancePaise > 0 ? "customer_advance" : "udhari_recovery",
        purpose: excessAdvancePaise > 0
          ? `Udhari Cleared + ₹${(excessAdvancePaise / 100).toLocaleString("en-IN")} Advance Deposit: ${sale.customer.name} [${sale.saleNumber}]`
          : `Udhari Collection: ${sale.customer.name} [${sale.saleNumber}]`,
        referenceId: sale.saleNumber,
        performedBy: sessionUser.userId,
        date: new Date(),
        notes: paymentNote,
      });
    }

    // Format WhatsApp receipt URL
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const paidRs = (amountPaise / 100).toLocaleString("en-IN");
    const newBalRs = (sale.balanceDuePaise / 100).toLocaleString("en-IN");
    const excessRs = (excessAdvancePaise / 100).toLocaleString("en-IN");
    const modeLabel =
      resolvedMode === "advance"
        ? "Advance Payment (अॅडव्हान्स जमा)"
        : resolvedMode === "online"
        ? "Online / UPI"
        : "Cash (Counter Rojmel)";
    const dueDateStr = sale.dueDate && sale.balanceDuePaise > 0
      ? new Date(sale.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "";

    let waText = "";
    if (excessAdvancePaise > 0) {
      waText = `Namaste ${sale.customer.name} ji! 🙏\n\nWe have received your payment of *₹${paidRs}* (${modeLabel}) at *SIDHESHWAR JEWELLERS*.\n\n✨ *Payment Breakdown:*\n- Item: ${sale.itemName} (${sale.saleNumber})\n- Udhari Balance: *FULLY CLEARED (₹0 Remaining)* ✅\n- *Advance Credit Deposited: ₹${excessRs}* (Safely recorded for your future purchase) 💰\n\nThank you for your valuable patronage and trust in Sidheshwar Jewellers! For any queries, contact us at +91 8329465301.\n\nHave a blessed day! 🌟`;
    } else if (sale.balanceDuePaise > 0) {
      waText = `Namaste ${sale.customer.name} ji! 🙏\n\nWe have received your installment payment of *₹${paidRs}* (${modeLabel}) at *SIDHESHWAR JEWELLERS*.\n\n✨ *Updated Account Summary:*\n- Item: ${sale.itemName} (${sale.saleNumber})\n- Amount Paid Today: ₹${paidRs}\n- *Remaining Balance Due: ₹${newBalRs}*${dueDateStr ? `\n- *Next Promise Due Date: ${dueDateStr}*` : ""}\n\nThank you for your timely payment! For any questions, please contact us at +91 8329465301.\n\nHave a blessed day! 🌟`;
    } else {
      waText = `Namaste ${sale.customer.name} ji! 🙏\n\nWe have received your final payment of *₹${paidRs}* (${modeLabel}) at *SIDHESHWAR JEWELLERS*.\n\n✨ *Congratulations!* Your balance for ${sale.itemName} (${sale.saleNumber}) is *FULLY CLEARED (₹0 remaining)* ✅.\n\nThank you for your valuable patronage and trust in Sidheshwar Jewellers! For any inquiries, contact us at +91 8329465301.\n\nHave a blessed day! 🌟`;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

    return NextResponse.json({
      success: true,
      sale,
      excessAdvanceRupees: excessAdvancePaise / 100,
      whatsappUrl,
      whatsappText: waText,
    });
  } catch (error: any) {
    console.error("POST /api/sales/[id]/payment error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
