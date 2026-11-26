import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import UsedMetalPurchase from "@/models/UsedMetalPurchase";
import AuditLog from "@/models/AuditLog";

export async function GET(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const metalType = searchParams.get("metalType"); // "gold" | "silver"
  const paymentStatus = searchParams.get("paymentStatus");
  const search = searchParams.get("search");

  const filter: any = {};
  if (metalType) filter.metalType = metalType;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { sellerName: { $regex: q, $options: "i" } },
      { sellerPhone: { $regex: q, $options: "i" } },
      { transactionNumber: { $regex: q, $options: "i" } },
      { itemDescription: { $regex: q, $options: "i" } },
    ];
  }

  try {
    const purchases = await UsedMetalPurchase.find(filter)
      .populate("convertedInventoryItemId", "name sku")
      .sort({ date: -1 })
      .lean();

    const formatted = purchases.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      ratePerGramRupees: p.ratePerGramPaise / 100,
      calculatedValueRupees: p.calculatedValuePaise / 100,
      finalAgreedCostRupees: p.finalAgreedCostPaise / 100,
      amountPaidRupees: p.amountPaidPaise / 100,
      remainingPayableRupees: p.remainingPayablePaise / 100,
    }));

    return NextResponse.json({ success: true, purchases: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  try {
    const body = await req.json();
    const {
      date,
      metalType,
      sellerName,
      sellerPhone,
      sellerAddress,
      itemDescription,
      category,
      purity,
      grossWeight,
      deductionsWeight = 0,
      ratePerGramRupees,
      finalAgreedCostRupees,
      amountPaidRupees = 0,
      paymentMethod = "cash",
      differenceReason,
      notes,
    } = body;

    if (!metalType || !["gold", "silver"].includes(metalType)) {
      return NextResponse.json({ success: false, error: "Valid metalType (gold or silver) is required" }, { status: 400 });
    }
    if (!sellerName || !sellerName.trim()) {
      return NextResponse.json({ success: false, error: "Seller / Customer name is required" }, { status: 400 });
    }
    if (!itemDescription || !itemDescription.trim()) {
      return NextResponse.json({ success: false, error: "Item description is required" }, { status: 400 });
    }
    if (!purity || !purity.trim()) {
      return NextResponse.json({ success: false, error: "Purity is required" }, { status: 400 });
    }

    const numGross = Number(grossWeight);
    const numDeductions = Number(deductionsWeight) || 0;

    if (isNaN(numGross) || numGross <= 0) {
      return NextResponse.json({ success: false, error: "Gross weight must be greater than 0" }, { status: 400 });
    }
    if (isNaN(numDeductions) || numDeductions < 0) {
      return NextResponse.json({ success: false, error: "Deductions cannot be negative" }, { status: 400 });
    }
    if (numDeductions >= numGross) {
      return NextResponse.json({ success: false, error: "Deductions cannot exceed or equal gross weight" }, { status: 400 });
    }

    const netWeight = body.netWeight !== undefined && !isNaN(Number(body.netWeight)) && Number(body.netWeight) > 0
      ? Number(Number(body.netWeight).toFixed(3))
      : Number((numGross - numDeductions).toFixed(3));

    const agreedCostRupees = finalAgreedCostRupees !== undefined ? Number(finalAgreedCostRupees) : 0;
    const finalAgreedCostPaise = Math.round(agreedCostRupees * 100);

    const numRate = Number(ratePerGramRupees) > 0
      ? Number(ratePerGramRupees)
      : (netWeight > 0 && agreedCostRupees > 0 ? Math.round(agreedCostRupees / netWeight) : 0);
    const ratePerGramPaise = Math.round(numRate * 100);
    const calculatedValuePaise = Math.round(netWeight * ratePerGramPaise) || finalAgreedCostPaise;
    const amountPaidPaise = Math.round((Number(amountPaidRupees) || 0) * 100);

    if (amountPaidPaise > finalAgreedCostPaise) {
      return NextResponse.json({ success: false, error: "Amount paid cannot exceed final purchase cost" }, { status: 400 });
    }

    const remainingPayablePaise = finalAgreedCostPaise - amountPaidPaise;
    let paymentStatus: "paid" | "partially_paid" | "pending" = "paid";
    if (amountPaidPaise === 0) {
      paymentStatus = "pending";
    } else if (remainingPayablePaise > 0) {
      paymentStatus = "partially_paid";
    }

    // Auto-generate transaction number
    const currentYear = new Date().getFullYear();
    const countThisYear = await UsedMetalPurchase.countDocuments({
      createdAt: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
      },
    });
    const prefix = metalType === "gold" ? "UMP-G" : "UMP-S";
    const transactionNumber = `${prefix}-${currentYear}-${(countThisYear + 1).toString().padStart(4, "0")}`;

    const purchase = await UsedMetalPurchase.create({
      transactionNumber,
      date: date ? new Date(date) : new Date(),
      metalType,
      sellerName: sellerName.trim(),
      sellerPhone: sellerPhone?.trim(),
      sellerAddress: sellerAddress?.trim(),
      itemDescription: itemDescription.trim(),
      category: category?.trim(),
      purity: purity.trim(),
      grossWeight: Number(numGross.toFixed(3)),
      deductionsWeight: Number(numDeductions.toFixed(3)),
      netWeight,
      ratePerGramPaise,
      calculatedValuePaise,
      finalAgreedCostPaise,
      differenceReason: differenceReason?.trim(),
      amountPaidPaise,
      remainingPayablePaise,
      paymentStatus,
      paymentMethod,
      notes: notes?.trim(),
      isConvertedToInventory: false,
    });

    await AuditLog.create({
      action: "USED_METAL_PURCHASED",
      module: "used_metal",
      description: `Purchased used ${metalType} (${transactionNumber}): ${itemDescription} - Net: ${netWeight}g, Agreed: ₹${agreedCostRupees.toLocaleString("en-IN")}, Status: ${paymentStatus}`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, purchase });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
