import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import InventoryItem from "@/models/InventoryItem";
import InventoryTransaction from "@/models/InventoryTransaction";
import SaleRecord from "@/models/SaleRecord";
import CashTransaction from "@/models/CashTransaction";
import Customer from "@/models/Customer";
import UdhariReminder from "@/models/UdhariReminder";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const metalType = searchParams.get("metalType");
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");
    const dueAlert = searchParams.get("dueAlert");

    const query: any = {};

    if (metalType && (metalType === "gold" || metalType === "silver")) {
      query.metalType = metalType;
    }

    if (paymentStatus && ["paid", "partial", "unpaid"].includes(paymentStatus)) {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      query.$or = [
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.phone": { $regex: search, $options: "i" } },
        { itemName: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { saleNumber: { $regex: search, $options: "i" } },
      ];
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    if (dueAlert === "today") {
      query.paymentStatus = { $in: ["partial", "unpaid"] };
      query.dueDate = { $gte: startOfToday, $lte: endOfToday };
    } else if (dueAlert === "3_days") {
      query.paymentStatus = { $in: ["partial", "unpaid"] };
      query.dueDate = { $gt: endOfToday, $lte: threeDaysLater };
    } else if (dueAlert === "overdue") {
      query.paymentStatus = { $in: ["partial", "unpaid"] };
      query.dueDate = { $lt: startOfToday };
    }

    const sales = await SaleRecord.find(query).sort({ saleDate: -1, createdAt: -1 });

    // Calculate aggregated metrics
    const allSales = await SaleRecord.find({});
    let totalSalesCount = allSales.length;
    let totalRevenuePaise = 0;
    let totalProfitPaise = 0;
    let totalOutstandingUdhariPaise = 0;
    let dueTodayCount = 0;
    let due3DaysCount = 0;
    let overdueCount = 0;

    for (const s of allSales) {
      totalRevenuePaise += s.sellingPricePaise || 0;
      totalProfitPaise += s.profitPaise || 0;
      totalOutstandingUdhariPaise += s.balanceDuePaise || 0;

      if (s.balanceDuePaise > 0 && s.dueDate) {
        const d = new Date(s.dueDate);
        if (d < startOfToday) {
          overdueCount++;
        } else if (d >= startOfToday && d <= endOfToday) {
          dueTodayCount++;
        } else if (d > endOfToday && d <= threeDaysLater) {
          due3DaysCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      sales,
      metrics: {
        totalSalesCount,
        totalRevenueRupees: totalRevenuePaise / 100,
        totalProfitRupees: totalProfitPaise / 100,
        totalOutstandingUdhariRupees: totalOutstandingUdhariPaise / 100,
        dueTodayCount,
        due3DaysCount,
        overdueCount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/sales error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const body = await req.json();

    const {
      // Legacy single-item fields
      itemId,
      quantitySold,
      netWeightSold: customNetWeightSold,
      sellingPriceRupees,
      manualProfitRupees,
      paidAmountRupees,
      paymentMode,
      // Enhanced multi-item array
      items: rawItems,
      // Old metal exchange lines
      exchangeMetals: rawExchangeMetals,
      // Split payments
      cashAmountRupees,
      onlineAmountRupees,
      // Customer
      customerName,
      customerPhone,
      customerAddress,
      dueDate,
      notes,
    } = body;

    if (!customerName || !customerPhone) {
      return NextResponse.json({ error: "Customer name and phone number are required" }, { status: 400 });
    }

    const cleanCustName = customerName.trim();
    let cleanCustPhone = customerPhone.replace(/\D/g, "");
    if (cleanCustPhone.length < 10) {
      return NextResponse.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
    }
    if (cleanCustPhone.length === 10) {
      cleanCustPhone = `91${cleanCustPhone}`;
    }

    // Upsert Customer
    let customerDoc = await Customer.findOne({ mobileNumber: cleanCustPhone });
    if (!customerDoc) {
      const custCount = await Customer.countDocuments();
      const customerId = `CUST-${String(custCount + 1).padStart(4, "0")}`;
      customerDoc = await Customer.create({
        customerId,
        fullName: cleanCustName,
        mobileNumber: cleanCustPhone,
        address: customerAddress ? customerAddress.trim() : undefined,
        isActive: true,
      });
    }

    // Derive selling price if omitted (Cash + Online + Udhari)
    const cashVal = parseFloat(cashAmountRupees) || 0;
    const onlineVal = parseFloat(onlineAmountRupees) || 0;
    const manualUdhariVal = parseFloat(body.udhariAmountRupees || body.udhariRupees) || 0;
    const autoSellPrice = (!sellingPriceRupees || isNaN(parseFloat(sellingPriceRupees)))
      ? (cashVal + onlineVal + manualUdhariVal)
      : parseFloat(sellingPriceRupees);

    // Build Cart Items (Multi-item support + legacy single-item adapter)
    let cartItems: any[] = [];
    if (rawItems && Array.isArray(rawItems) && rawItems.length > 0) {
      cartItems = rawItems;
    } else if (itemId) {
      cartItems = [
        {
          itemId,
          quantitySold: quantitySold || 1,
          sellingPriceRupees: autoSellPrice,
          netWeightSold: (customNetWeightSold !== undefined && !isNaN(parseFloat(customNetWeightSold)) && parseFloat(customNetWeightSold) > 0)
            ? parseFloat(customNetWeightSold)
            : undefined,
        },
      ];
    } else {
      return NextResponse.json({ error: "At least one jewellery item is required for billing." }, { status: 400 });
    }

    // Process each cart item: validate stock & deduct non-destructively
    let totalNewPurchasePaise = 0;
    let totalCostPricePaise = 0;
    let totalGrossWeightSold = 0;
    let totalNetWeightSold = 0;
    let totalQtySold = 0;
    const processedLineItems: any[] = [];
    let primaryItem: any = null;

    for (const line of cartItems) {
      const invItem = await InventoryItem.findById(line.itemId);
      if (!invItem) {
        return NextResponse.json({ error: `Inventory item ${line.itemId} not found` }, { status: 404 });
      }

      const qSold = parseInt(line.quantitySold, 10);
      if (isNaN(qSold) || qSold <= 0) {
        return NextResponse.json({ error: `Invalid quantity for ${invItem.name}` }, { status: 400 });
      }

      if (invItem.quantity < qSold) {
        return NextResponse.json(
          { error: `Insufficient stock for ${invItem.name}. Only ${invItem.quantity} pc(s) available in shop.` },
          { status: 400 }
        );
      }

      const grossWeightSold = Number(((invItem.grossWeight / invItem.quantity) * qSold).toFixed(3));
      const netWeightSold = (line.netWeightSold !== undefined && !isNaN(parseFloat(line.netWeightSold)) && parseFloat(line.netWeightSold) > 0)
        ? Number(parseFloat(line.netWeightSold).toFixed(3))
        : Number(((invItem.netWeight / invItem.quantity) * qSold).toFixed(3));
      const itemCostPaise = Math.round(((invItem.purchaseCostPaise || 0) / invItem.quantity) * qSold);

      const lineSellPriceRupees = parseFloat(line.sellingPriceRupees);
      if (isNaN(lineSellPriceRupees) || lineSellPriceRupees < 0) {
        return NextResponse.json({ error: `Valid selling price required for ${invItem.name}` }, { status: 400 });
      }
      const lineSellPaise = Math.round(lineSellPriceRupees * 100);

      // Inventory mutation
      const prevQty = invItem.quantity;
      const prevGross = invItem.grossWeight;
      const prevNet = invItem.netWeight;

      const newQty = prevQty - qSold;
      const newGross = Math.max(0, Number((prevGross - grossWeightSold).toFixed(3)));
      const newNet = Math.max(0, Number((prevNet - netWeightSold).toFixed(3)));

      invItem.quantity = newQty;
      invItem.grossWeight = newGross;
      invItem.netWeight = newNet;
      if (newQty === 0) {
        invItem.isActive = false;
        invItem.status = "sold";
      } else {
        invItem.status = "partial_sold";
      }
      await invItem.save();

      await InventoryTransaction.create({
        itemId: invItem._id,
        metalType: invItem.metalType,
        categoryId: invItem.categoryId,
        transactionType: "sale",
        previousQuantity: prevQty,
        newQuantity: newQty,
        quantityChange: -qSold,
        previousGrossWeight: prevGross,
        newGrossWeight: newGross,
        previousNetWeight: prevNet,
        newNetWeight: newNet,
        netWeightChange: -netWeightSold,
        reason: `Sold ${qSold} pc(s) to ${cleanCustName} (${cleanCustPhone})`,
        performedBy: sessionUser.userId,
        timestamp: new Date(),
      });

      totalNewPurchasePaise += lineSellPaise;
      totalCostPricePaise += itemCostPaise;
      totalGrossWeightSold += grossWeightSold;
      totalNetWeightSold += netWeightSold;
      totalQtySold += qSold;

      const processedLine = {
        itemId: invItem._id,
        metalType: invItem.metalType,
        categoryId: invItem.categoryId,
        itemName: invItem.name,
        sku: invItem.sku,
        purity: invItem.purity,
        size: invItem.size || undefined,
        quantitySold: qSold,
        grossWeightSold,
        netWeightSold,
        costPricePaise: itemCostPaise,
        sellingPricePaise: lineSellPaise,
      };
      processedLineItems.push(processedLine);

      if (!primaryItem) {
        primaryItem = invItem;
      }
    }

    // Process Old Metal Exchange / Trade-In lines
    let totalExchangeCreditPaise = 0;
    const processedExchangeLines: any[] = [];

    if (rawExchangeMetals && Array.isArray(rawExchangeMetals)) {
      for (const ex of rawExchangeMetals) {
        const grossW = parseFloat(ex.grossWeight) || 0;
        const netW = parseFloat(ex.netWeight) || 0;
        if (netW <= 0 && grossW <= 0) continue;
        if (grossW > 0 && netW > grossW + 0.001) {
          return NextResponse.json({ error: "Old metal net weight cannot exceed gross weight." }, { status: 400 });
        }

        const rate = parseFloat(ex.rateRupeesPerGram) || 0;
        const deductionRs = parseFloat(ex.deductionRupees || 0);

        // Exchange valuation: Net Weight * Rate - Deductions (rate is optional)
        const lineCreditRupees = Math.max(0, netW * rate - deductionRs);
        const lineCreditPaise = Math.round(lineCreditRupees * 100);

        totalExchangeCreditPaise += lineCreditPaise;
        processedExchangeLines.push({
          metalType: ex.metalType === "silver" ? "silver" : "gold",
          grossWeight: grossW > 0 ? grossW : netW,
          netWeight: netW > 0 ? netW : grossW,
          purity: ex.purity || "Standard Scrap",
          rateRupeesPerGram: rate,
          deductionPaise: Math.round(deductionRs * 100),
          exchangeValuePaise: lineCreditPaise,
          notes: ex.notes,
        });
      }
    }

    // Net Amount Payable = Total New Purchase - Total Old Metal Exchange Credit
    const netPayablePaise = Math.max(0, totalNewPurchasePaise - totalExchangeCreditPaise);

    // Split Payments calculation
    let cashPaise = 0;
    let onlinePaise = 0;

    if (cashAmountRupees !== undefined || onlineAmountRupees !== undefined) {
      cashPaise = Math.max(0, Math.round((parseFloat(cashAmountRupees) || 0) * 100));
      onlinePaise = Math.max(0, Math.round((parseFloat(onlineAmountRupees) || 0) * 100));
    } else if (paidAmountRupees !== undefined) {
      const pPaise = Math.round((parseFloat(paidAmountRupees) || 0) * 100);
      if (paymentMode === "online") {
        onlinePaise = pPaise;
      } else {
        cashPaise = pPaise;
      }
    }

    // Check for explicit manual Udhari amount
    const manualUdhariPaise = (body.udhariAmountRupees !== undefined && body.udhariAmountRupees !== "" && !isNaN(parseFloat(body.udhariAmountRupees)))
      ? Math.max(0, Math.round(parseFloat(body.udhariAmountRupees) * 100))
      : (body.udhariRupees !== undefined && body.udhariRupees !== "" && !isNaN(parseFloat(body.udhariRupees)))
      ? Math.max(0, Math.round(parseFloat(body.udhariRupees) * 100))
      : null;

    let balanceDuePaise = 0;
    let totalPaidPaise = 0;

    if (manualUdhariPaise !== null) {
      balanceDuePaise = manualUdhariPaise;
      totalPaidPaise = cashPaise + onlinePaise;
      if (totalNewPurchasePaise === 0) {
        totalNewPurchasePaise = totalPaidPaise + balanceDuePaise;
      }
    } else {
      totalPaidPaise = Math.min(netPayablePaise, cashPaise + onlinePaise);
      balanceDuePaise = Math.max(0, netPayablePaise - totalPaidPaise);
    }

    let paymentStatus: "paid" | "partial" | "unpaid" = "paid";
    if (balanceDuePaise === 0) {
      paymentStatus = "paid";
    } else if (totalPaidPaise > 0) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "unpaid";
    }

    // Validation: If balance is due (Udhari > 0), promised payment date is required
    if (balanceDuePaise > 0 && !dueDate) {
      return NextResponse.json(
        { error: "Promised payment due date is mandatory when there is an outstanding Udhari balance." },
        { status: 400 }
      );
    }

    // Manual Profit Calculation
    let profitPaise = 0;
    if (manualProfitRupees !== undefined && manualProfitRupees !== null && manualProfitRupees !== "") {
      profitPaise = Math.round(parseFloat(manualProfitRupees) * 100);
    } else {
      profitPaise = totalNewPurchasePaise - totalCostPricePaise;
    }

    // Payment Mode flag
    let resolvedPaymentMode: "cash" | "online" | "mixed" = "cash";
    if (cashPaise > 0 && onlinePaise > 0) {
      resolvedPaymentMode = "mixed";
    } else if (onlinePaise > 0) {
      resolvedPaymentMode = "online";
    } else {
      resolvedPaymentMode = "cash";
    }

    // Generate unique sale number
    const count = await SaleRecord.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const saleNumber = `SJ-SALE-${dateStr}-${String(count + 1).padStart(4, "0")}`;

    const paymentsLedger: any[] = [];
    if (cashPaise > 0) {
      paymentsLedger.push({
        amountPaise: cashPaise,
        paymentMode: "cash",
        date: new Date(),
        notes: "Counter Cash down-payment",
      });
    }
    if (onlinePaise > 0) {
      paymentsLedger.push({
        amountPaise: onlinePaise,
        paymentMode: "online",
        date: new Date(),
        notes: "UPI / Bank Online payment",
      });
    }

    const saleRecord = await SaleRecord.create({
      saleNumber,
      itemId: primaryItem ? primaryItem._id : undefined,
      metalType: primaryItem ? primaryItem.metalType : "gold",
      categoryId: primaryItem ? primaryItem.categoryId : undefined,
      itemName:
        processedLineItems.length === 1
          ? processedLineItems[0].itemName
          : `${processedLineItems[0].itemName} + ${processedLineItems.length - 1} item(s)`,
      sku: processedLineItems.length === 1 ? processedLineItems[0].sku : "MULTI-ITEM",
      purity: primaryItem ? primaryItem.purity : "Multi-Purity",
      size: processedLineItems.length === 1 ? processedLineItems[0].size : undefined,
      quantitySold: totalQtySold,
      grossWeightSold: Number(totalGrossWeightSold.toFixed(3)),
      netWeightSold: Number(totalNetWeightSold.toFixed(3)),
      costPricePaise: totalCostPricePaise,
      sellingPricePaise: totalNewPurchasePaise,
      profitPaise,
      customer: {
        name: cleanCustName,
        phone: cleanCustPhone,
        address: customerAddress ? customerAddress.trim() : undefined,
      },
      paymentMode: resolvedPaymentMode,
      paidAmountPaise: totalPaidPaise,
      balanceDuePaise,
      dueDate: balanceDuePaise > 0 && dueDate ? new Date(dueDate) : undefined,
      paymentStatus,
      payments: paymentsLedger,
      items: processedLineItems,
      exchangeMetals: processedExchangeLines,
      totalExchangeCreditPaise,
      netPayablePaise,
      splitPayments: {
        cashPaise,
        onlinePaise,
      },
      manualProfitRupees:
        manualProfitRupees !== undefined && manualProfitRupees !== null && manualProfitRupees !== ""
          ? parseFloat(manualProfitRupees)
          : undefined,
      notes,
      saleDate: new Date(),
    });

    // Rojmel Cash Book synchronization: ONLY cash portion is credited into counter drawer
    if (cashPaise > 0) {
      await CashTransaction.create({
        transactionType: "credit",
        amountPaise: cashPaise,
        category: "sale_cash",
        purpose: `Cash Sale: ${saleRecord.itemName} (${cleanCustName})`,
        referenceId: saleNumber,
        performedBy: sessionUser.userId,
        date: new Date(),
        notes: `Counter Cash: ₹${(cashPaise / 100).toLocaleString("en-IN")}`,
      });
    }

    // Auto-generate 3-stage Udhari WhatsApp Reminders if balance remains
    if (balanceDuePaise > 0 && saleRecord.dueDate) {
      const dDate = new Date(saleRecord.dueDate);
      const stage1Date = new Date(dDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const stage2Date = dDate;
      const stage3Date = new Date(dDate.getTime() + 1 * 24 * 60 * 60 * 1000);

      const balFormatted = `₹${(balanceDuePaise / 100).toLocaleString("en-IN")}`;
      const dueFormatted = dDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const remindersToCreate = [
        {
          reminderType: "3_days",
          scheduledDate: stage1Date,
          messageBody: `Namaste ${cleanCustName} ji,\n\nAapko Sidheshwar Jewellers ki taraf se ek vinamra yaad dilayi ja rahi hai.\n\nAapke bill ${saleNumber} ki ${balFormatted} ki shesh rakam ki bhugtan tithi ${dueFormatted} hai.\n\nKripya apni suvidha ke anusaar nirdharit tithi tak bhugtan karne ki kripa karein.\n\nAapke sahyog ke liye dhanyavaad.\n\nSadar,\nSidheshwar Jewellers`,
        },
        {
          reminderType: "due_date",
          scheduledDate: stage2Date,
          messageBody: `Namaste ${cleanCustName} ji,\n\nSidheshwar Jewellers ki taraf se aapko vinamra yaad dilayi ja rahi hai ki aaj ${dueFormatted} ko aapke bill ${saleNumber} ki ${balFormatted} ki bhugtan tithi hai.\n\nKripya apni suvidha anusaar aaj bhugtan karne ki kripa karein.\n\nAgar aapne pahle hi bhugtan kar diya hai, to kripya is sandesh ko nazarandaaz karein.\n\nDhanyavaad,\nSidheshwar Jewellers`,
        },
        {
          reminderType: "overdue",
          scheduledDate: stage3Date,
          messageBody: `Namaste ${cleanCustName} ji,\n\nSidheshwar Jewellers ki taraf se ek vinamra follow-up sandesh hai.\n\nHamare record ke anusaar aapke bill ${saleNumber} ki ${balFormatted} ki rakam abhi baki dikh rahi hai, aur nirdharit bhugtan tithi ${dueFormatted} beet chuki hai.\n\nKripya apni suvidha ke anusaar baki rakam ka bhugtan karne ya humse sampark karne ki kripa karein.\n\nYadi aapne bhugtan kar diya hai, to kripya humein suchit karein taaki hum apna record update kar saken.\n\nDhanyavaad,\nSidheshwar Jewellers`,
        },
      ];

      for (const r of remindersToCreate) {
        const dedupKey = `${saleRecord._id}_${r.reminderType}_${dDate.toISOString().slice(0, 10)}`;
        const waLink = `https://wa.me/${cleanCustPhone}?text=${encodeURIComponent(r.messageBody)}`;
        await UdhariReminder.findOneAndUpdate(
          { dedupKey },
          {
            saleId: saleRecord._id,
            saleNumber,
            customerId: customerDoc._id,
            customerName: cleanCustName,
            customerPhone: cleanCustPhone,
            outstandingPaise: balanceDuePaise,
            dueDate: dDate,
            reminderType: r.reminderType,
            scheduledDate: r.scheduledDate,
            messageBody: r.messageBody,
            whatsappUrl: waLink,
            status: "pending",
            dedupKey,
          },
          { upsert: true, new: true }
        );
      }
    }

    // Format WhatsApp invoice confirmation URL
    const totalRs = (totalNewPurchasePaise / 100).toLocaleString("en-IN");
    const exchangeRs = (totalExchangeCreditPaise / 100).toLocaleString("en-IN");
    const netRs = (netPayablePaise / 100).toLocaleString("en-IN");
    const paidRs = (totalPaidPaise / 100).toLocaleString("en-IN");
    const balRs = (balanceDuePaise / 100).toLocaleString("en-IN");
    const formattedDueDate = saleRecord.dueDate
      ? new Date(saleRecord.dueDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Full Payment Received";

    let waText = `Namaste ${cleanCustName} ji! 🙏\n\nThank you for shopping at *SIDHESHWAR JEWELLERS*.\n\n✨ *Invoice: ${saleNumber}*\n- Items: ${saleRecord.itemName}\n- New Purchase: ₹${totalRs}\n`;
    if (totalExchangeCreditPaise > 0) {
      waText += `- Old Metal Credit: -₹${exchangeRs}\n- Net Payable: ₹${netRs}\n`;
    }
    waText += `- Amount Paid: ₹${paidRs} (${resolvedPaymentMode.toUpperCase()})\n`;
    if (balanceDuePaise > 0) {
      waText += `- *Remaining Udhari: ₹${balRs}*\n- *Promised Due Date: ${formattedDueDate}*\n\n`;
    } else {
      waText += `- Status: Fully Settled ✅\n\n`;
    }
    waText += `We deeply value your trust and patronage! 🙏\n*Sidheshwar Jewellers*`;

    const whatsappUrl = `https://wa.me/${cleanCustPhone}?text=${encodeURIComponent(waText)}`;

    return NextResponse.json({
      success: true,
      sale: saleRecord,
      whatsappUrl,
      whatsappText: waText,
    });
  } catch (error: any) {
    console.error("POST /api/sales error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
