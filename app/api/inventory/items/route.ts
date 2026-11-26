import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import InventoryItem from "@/models/InventoryItem";
import InventoryTransaction from "@/models/InventoryTransaction";
import Category from "@/models/Category";
import AuditLog from "@/models/AuditLog";

export async function GET(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const metalType = searchParams.get("metalType"); // "gold" | "silver"
  const categoryId = searchParams.get("categoryId");
  const purity = searchParams.get("purity");
  const size = searchParams.get("size");
  const minWeight = searchParams.get("minWeight");
  const maxWeight = searchParams.get("maxWeight");
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") || "latest";

  const filter: any = { isActive: true };
  if (metalType) filter.metalType = metalType;
  if (categoryId) filter.categoryId = categoryId;
  if (purity) filter.purity = purity;
  if (size && size !== "all") filter.size = size;

  if (minWeight || maxWeight) {
    filter.netWeight = {};
    if (minWeight) filter.netWeight.$gte = parseFloat(minWeight);
    if (maxWeight) filter.netWeight.$lte = parseFloat(maxWeight);
  }
  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { sku: { $regex: q, $options: "i" } },
      { hallmarkUid: { $regex: q, $options: "i" } },
      { supplierName: { $regex: q, $options: "i" } },
    ];
  }

  let sortQuery: any = { createdAt: -1 };
  if (sortBy === "weight_desc") sortQuery = { netWeight: -1 };
  else if (sortBy === "weight_asc") sortQuery = { netWeight: 1 };
  else if (sortBy === "name") sortQuery = { name: 1 };

  try {
    const items = await InventoryItem.find(filter)
      .populate("categoryId", "name metalType")
      .sort(sortQuery)
      .lean();

    const formatted = items.map((item: any) => ({
      ...item,
      id: item._id.toString(),
      purchaseCostRupees: item.purchaseCostPaise ? item.purchaseCostPaise / 100 : 0,
      unitCostRupees: item.unitCostPaise ? item.unitCostPaise / 100 : 0,
    }));

    return NextResponse.json({ success: true, items: formatted });
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
      metalType,
      categoryId,
      name,
      sku,
      purity,
      size,
      quantity = 1,
      grossWeight,
      stoneWeight = 0,
      hallmarkUid,
      supplierName,
      purchaseDate,
      purchaseCostRupees = 0,
      unitCostRupees,
      notes,
    } = body;

    // Validation
    if (!metalType || !["gold", "silver"].includes(metalType)) {
      return NextResponse.json({ success: false, error: "Valid metalType (gold or silver) is required" }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ success: false, error: "Category is required" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Item name is required" }, { status: 400 });
    }
    if (!purity || !purity.trim()) {
      return NextResponse.json({ success: false, error: "Purity is required" }, { status: 400 });
    }

    const numQty = Number(quantity);
    const numGross = Number(grossWeight);
    const numStone = Number(stoneWeight) || 0;

    if (isNaN(numQty) || numQty < 1) {
      return NextResponse.json({ success: false, error: "Quantity must be at least 1" }, { status: 400 });
    }
    if (isNaN(numGross) || numGross <= 0) {
      return NextResponse.json({ success: false, error: "Gross weight must be greater than 0" }, { status: 400 });
    }
    if (isNaN(numStone) || numStone < 0) {
      return NextResponse.json({ success: false, error: "Stone weight cannot be negative" }, { status: 400 });
    }
    if (numStone >= numGross) {
      return NextResponse.json({ success: false, error: "Stone weight cannot exceed or equal gross weight" }, { status: 400 });
    }

    const calculatedNet = (body.netWeight !== undefined && !isNaN(Number(body.netWeight)) && Number(body.netWeight) > 0)
      ? Number(Number(body.netWeight).toFixed(3))
      : Number((numGross - numStone).toFixed(3));

    if (calculatedNet > numGross) {
      return NextResponse.json({ success: false, error: `Net weight (${calculatedNet}g) cannot exceed gross weight (${numGross}g). Gross weight must be greater than or equal to net weight.` }, { status: 400 });
    }

    // Category check
    const cat = await Category.findById(categoryId);
    if (!cat) {
      return NextResponse.json({ success: false, error: "Category does not exist" }, { status: 404 });
    }

    // Backend Double-Click & Rapid Re-submission Prevention (Idempotency)
    const recentDuplicate = await InventoryItem.findOne({
      metalType,
      categoryId,
      name: name.trim(),
      grossWeight: Number(numGross.toFixed(3)),
      netWeight: calculatedNet,
      quantity: numQty,
      isActive: true,
      createdAt: { $gte: new Date(Date.now() - 4000) },
    });
    if (recentDuplicate) {
      return NextResponse.json({ success: true, item: recentDuplicate, duplicatePrevented: true });
    }

    // SKU Generation / Check
    let itemSku = (sku || "").trim().toUpperCase();
    if (!itemSku) {
      const prefix = metalType === "gold" ? "SJ-G" : "SJ-S";
      const catCode = cat.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
      const count = await InventoryItem.countDocuments({ metalType });
      itemSku = `${prefix}-${catCode}-${(count + 1).toString().padStart(4, "0")}`;
    }

    const existingSku = await InventoryItem.findOne({ sku: itemSku });
    if (existingSku) {
      return NextResponse.json({ success: false, error: `SKU "${itemSku}" already exists. Please provide a unique SKU.` }, { status: 400 });
    }

    const purchaseCostPaise = Math.round(Number(purchaseCostRupees) * 100);
    const unitCostPaise = unitCostRupees !== undefined ? Math.round(Number(unitCostRupees) * 100) : Math.round(purchaseCostPaise / numQty);

    const newItem = await InventoryItem.create({
      metalType,
      categoryId,
      name: name.trim(),
      sku: itemSku,
      purity: purity.trim(),
      size: size ? String(size).trim() : undefined,
      quantity: numQty,
      grossWeight: Number(numGross.toFixed(3)),
      stoneWeight: Number(numStone.toFixed(3)),
      netWeight: calculatedNet,
      hallmarkUid: hallmarkUid ? hallmarkUid.trim().toUpperCase() : undefined,
      supplierName: supplierName ? supplierName.trim() : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      purchaseCostPaise,
      unitCostPaise,
      notes: notes ? notes.trim() : undefined,
      sourceType: "direct_purchase",
      isActive: true,
    });

    // Immutable transaction record
    await InventoryTransaction.create({
      itemId: newItem._id,
      metalType,
      categoryId,
      transactionType: "stock_in",
      previousQuantity: 0,
      newQuantity: numQty,
      quantityChange: numQty,
      previousGrossWeight: 0,
      newGrossWeight: newItem.grossWeight,
      previousNetWeight: 0,
      newNetWeight: newItem.netWeight,
      netWeightChange: newItem.netWeight,
      reason: "Initial stock addition",
      performedBy: sessionUser.userId,
      timestamp: new Date(),
    });

    await AuditLog.create({
      action: "STOCK_ADDED",
      module: metalType === "gold" ? "gold_inventory" : "silver_inventory",
      description: `Added stock: ${newItem.name} (${newItem.sku}) - Qty: ${numQty}, Net: ${calculatedNet}g`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    console.error("Item creation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
