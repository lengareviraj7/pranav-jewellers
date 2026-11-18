import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import InventoryItem from "@/models/InventoryItem";
import InventoryTransaction from "@/models/InventoryTransaction";
import SaleRecord from "@/models/SaleRecord";
import CashTransaction from "@/models/CashTransaction";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const metalType = searchParams.get("metalType");
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");
    const dueAlert = searchParams.get("dueAlert"); // "3_days", "today", "overdue"

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
      itemId,
      quantitySold,
      sellingPriceRupees,
      manualProfitRupees,
      paidAmountRupees,
      customerName,
      customerPhone,
      customerAddress,
      dueDate,
      paymentMode,
      notes,
    } = body;

    if (!itemId) {
      return NextResponse.json({ error: "Inventory item ID is required" }, { status: 400 });
    }

    const qtySold = parseInt(quantitySold, 10);
    if (isNaN(qtySold) || qtySold <= 0) {
      return NextResponse.json({ error: "Valid quantity sold is required" }, { status: 400 });
    }

    const sellPrice = parseFloat(sellingPriceRupees);
    if (isNaN(sellPrice) || sellPrice <= 0) {
      return NextResponse.json({ error: "Valid selling price is required" }, { status: 400 });
    }

    if (!customerName || !customerPhone) {
      return NextResponse.json({ error: "Customer name and phone number are required" }, { status: 400 });
    }

    const item = await InventoryItem.findById(itemId);
    if (!item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
    }

    if (item.quantity < qtySold) {
      return NextResponse.json(
        { error: `Insufficient stock. Only ${item.quantity} available in shop.` },
        { status: 400 }
      );
    }

    // Weights calculation proportionate to quantity sold
    const grossWeightSold = Number(((item.grossWeight / item.quantity) * qtySold).toFixed(3));
    const netWeightSold = Number(((item.netWeight / item.quantity) * qtySold).toFixed(3));
    const costPricePaise = Math.round(((item.purchaseCostPaise || 0) / item.quantity) * qtySold);

    const prevQuantity = item.quantity;
    const prevGrossWeight = item.grossWeight;
    const prevNetWeight = item.netWeight;

    const newQuantity = prevQuantity - qtySold;
    const newGrossWeight = Math.max(0, Number((prevGrossWeight - grossWeightSold).toFixed(3)));
    const newNetWeight = Math.max(0, Number((prevNetWeight - netWeightSold).toFixed(3)));

    // Update inventory item
    item.quantity = newQuantity;
    item.grossWeight = newGrossWeight;
    item.netWeight = newNetWeight;
    if (newQuantity === 0) {
      item.isActive = false;
      item.status = "sold";
    } else {
      item.status = "partial_sold";
    }
    await item.save();

    // Log non-destructive inventory transaction
    await InventoryTransaction.create({
      itemId: item._id,
      metalType: item.metalType,
      categoryId: item.categoryId,
      transactionType: "sale",
      previousQuantity: prevQuantity,
      newQuantity: newQuantity,
      quantityChange: -qtySold,
      previousGrossWeight: prevGrossWeight,
      newGrossWeight: newGrossWeight,
      previousNetWeight: prevNetWeight,
      newNetWeight: newNetWeight,
      netWeightChange: -netWeightSold,
      reason: `Sold ${qtySold} pc(s) to ${customerName} (${customerPhone})`,
      performedBy: sessionUser.userId,
      timestamp: new Date(),
    });

    // Calculate profit
    // If owner explicitly provided manual profit, use it; otherwise (sellingPrice - costPrice)
    let profitPaise = 0;
    if (manualProfitRupees !== undefined && manualProfitRupees !== null && manualProfitRupees !== "") {
      profitPaise = Math.round(parseFloat(manualProfitRupees) * 100);
    } else {
      profitPaise = Math.round(sellPrice * 100) - costPricePaise;
    }

    const sellingPricePaise = Math.round(sellPrice * 100);
    const paidPaise = Math.round(Math.min(sellPrice, Math.max(0, parseFloat(paidAmountRupees || 0))) * 100);
    const balanceDuePaise = Math.max(0, sellingPricePaise - paidPaise);

    let paymentStatus: "paid" | "partial" | "unpaid" = "paid";
    if (balanceDuePaise === 0) {
      paymentStatus = "paid";
    } else if (paidPaise > 0) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "unpaid";
    }

    // Generate unique sale number
    const count = await SaleRecord.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const saleNumber = `SJ-SALE-${dateStr}-${String(count + 1).padStart(4, "0")}`;

    const saleRecord = await SaleRecord.create({
      saleNumber,
      itemId: item._id,
      metalType: item.metalType,
      categoryId: item.categoryId,
      itemName: item.name,
      sku: item.sku,
      purity: item.purity,
      size: item.size || undefined,
      quantitySold: qtySold,
      grossWeightSold,
      netWeightSold,
      costPricePaise,
      sellingPricePaise,
      profitPaise,
      customer: {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress ? customerAddress.trim() : undefined,
      },
      paymentMode: paymentMode || "cash",
      paidAmountPaise: paidPaise,
      balanceDuePaise,
      dueDate: balanceDuePaise > 0 && dueDate ? new Date(dueDate) : undefined,
      paymentStatus,
      payments:
        paidPaise > 0
          ? [
              {
                amountPaise: paidPaise,
                paymentMode: paymentMode === "online" ? "online" : "cash",
                date: new Date(),
                notes: "Initial down-payment at time of purchase",
              },
            ]
          : [],
      notes,
      saleDate: new Date(),
    });

    // Auto-record into Cash Book (Rojmel) if cash received
    if (paidPaise > 0 && (paymentMode === "cash" || !paymentMode)) {
      await CashTransaction.create({
        transactionType: "credit",
        amountPaise: paidPaise,
        category: "sale_cash",
        purpose: `Cash Sale: ${item.name} (${customerName.trim()})`,
        referenceId: saleNumber,
        performedBy: sessionUser.userId,
        date: new Date(),
        notes: `Sale of ${qtySold} pc(s) [SKU: ${item.sku}]`,
      });
    }

    // Format WhatsApp message URL
    const totalRs = (sellingPricePaise / 100).toLocaleString("en-IN");
    const paidRs = (paidPaise / 100).toLocaleString("en-IN");
    const balRs = (balanceDuePaise / 100).toLocaleString("en-IN");
    const formattedDueDate = saleRecord.dueDate
      ? new Date(saleRecord.dueDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "As discussed";

    let cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const waText =
      balanceDuePaise > 0
        ? `Namaste ${customerName.trim()} ji! 🙏\n\nThank you for shopping at *SIDHESHWAR JEWELLERS*.\n\n✨ *Purchase Details:*\n- Item: ${item.name} (${item.purity})\n- Total Amount: ₹${totalRs}\n- Amount Paid: ₹${paidRs}\n- *Remaining Balance: ₹${balRs}*\n- *Promised Due Date: ${formattedDueDate}*\n\nWe deeply appreciate your patronage! For any queries or assistance, please reach out to us at +91 98765 43210.\n\nHave a wonderful day! 🌟`
        : `Namaste ${customerName.trim()} ji! 🙏\n\nThank you for shopping at *SIDHESHWAR JEWELLERS*.\n\n✨ *Purchase Summary:*\n- Item: ${item.name} (${item.purity})\n- Total Paid: ₹${paidRs} (Full Payment Received ✅)\n\nWe deeply value your trust and patronage! For any queries, please contact us.\n\nHave a blessed day! 🌟`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

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
