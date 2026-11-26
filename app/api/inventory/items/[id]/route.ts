import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import InventoryItem from "@/models/InventoryItem";
import Category from "@/models/Category";
import InventoryTransaction from "@/models/InventoryTransaction";
import AuditLog from "@/models/AuditLog";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { id } = params;

  try {
    const item = await InventoryItem.findById(id).populate("categoryId", "name metalType").lean();
    if (!item) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    const transactions = await InventoryTransaction.find({ itemId: id })
      .populate("performedBy", "name email")
      .sort({ timestamp: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        id: item._id.toString(),
        purchaseCostRupees: (item.purchaseCostPaise || 0) / 100,
        unitCostRupees: (item.unitCostPaise || 0) / 100,
      },
      transactions,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { id } = params;

  try {
    const item = await InventoryItem.findById(id);
    if (!item || !item.isActive) {
      return NextResponse.json({ success: false, error: "Active inventory item not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      categoryId,
      sku,
      purity,
      size,
      quantity,
      grossWeight,
      stoneWeight,
      netWeight,
      hallmarkUid,
      supplierName,
      notes,
    } = body;

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ success: false, error: "Item name cannot be empty" }, { status: 400 });
    }

    if (categoryId !== undefined) {
      const cat = await Category.findById(categoryId);
      if (!cat) {
        return NextResponse.json({ success: false, error: "Selected category does not exist" }, { status: 404 });
      }
      item.categoryId = categoryId;
    }

    if (sku !== undefined && sku.trim().toUpperCase() !== item.sku) {
      const newSku = sku.trim().toUpperCase();
      const existing = await InventoryItem.findOne({ sku: newSku, _id: { $ne: item._id } });
      if (existing) {
        return NextResponse.json({ success: false, error: `SKU "${newSku}" is already in use by another item` }, { status: 400 });
      }
      item.sku = newSku;
    }

    if (name !== undefined) item.name = name.trim();
    if (purity !== undefined && purity.trim()) item.purity = purity.trim();
    if (size !== undefined) item.size = size ? String(size).trim() : undefined;
    if (hallmarkUid !== undefined) item.hallmarkUid = hallmarkUid ? hallmarkUid.trim().toUpperCase() : undefined;
    if (supplierName !== undefined) item.supplierName = supplierName ? supplierName.trim() : undefined;
    if (notes !== undefined) item.notes = notes ? notes.trim() : undefined;

    const prevQty = item.quantity;
    const prevGross = item.grossWeight;
    const prevNet = item.netWeight;

    let numQty = prevQty;
    if (quantity !== undefined) {
      numQty = Number(quantity);
      if (isNaN(numQty) || numQty < 1) {
        return NextResponse.json({ success: false, error: "Quantity must be at least 1" }, { status: 400 });
      }
      item.quantity = numQty;
    }

    let numGross = prevGross;
    if (grossWeight !== undefined) {
      numGross = Number(grossWeight);
      if (isNaN(numGross) || numGross <= 0) {
        return NextResponse.json({ success: false, error: "Gross weight must be greater than 0" }, { status: 400 });
      }
      item.grossWeight = Number(numGross.toFixed(3));
    }

    let numStone = item.stoneWeight || 0;
    if (stoneWeight !== undefined) {
      numStone = Number(stoneWeight);
      if (isNaN(numStone) || numStone < 0) {
        return NextResponse.json({ success: false, error: "Stone weight cannot be negative" }, { status: 400 });
      }
      if (numStone >= numGross) {
        return NextResponse.json({ success: false, error: "Stone weight cannot exceed or equal gross weight" }, { status: 400 });
      }
      item.stoneWeight = Number(numStone.toFixed(3));
    }

    let calculatedNet = prevNet;
    if (netWeight !== undefined && !isNaN(Number(netWeight)) && Number(netWeight) > 0) {
      calculatedNet = Number(Number(netWeight).toFixed(3));
    } else if (grossWeight !== undefined || stoneWeight !== undefined) {
      calculatedNet = Number(Math.max(0, numGross - numStone).toFixed(3));
    }
    item.netWeight = calculatedNet;

    await item.save();

    // Check if quantity or weights changed to record an inventory adjustment transaction
    const qtyChange = numQty - prevQty;
    const netChange = Number((calculatedNet - prevNet).toFixed(3));
    const grossChange = Number((numGross - prevGross).toFixed(3));

    if (qtyChange !== 0 || netChange !== 0 || grossChange !== 0) {
      await InventoryTransaction.create({
        itemId: item._id,
        metalType: item.metalType,
        categoryId: item.categoryId,
        transactionType: "adjustment",
        previousQuantity: prevQty,
        newQuantity: numQty,
        quantityChange: qtyChange,
        previousGrossWeight: prevGross,
        newGrossWeight: numGross,
        previousNetWeight: prevNet,
        newNetWeight: calculatedNet,
        netWeightChange: netChange,
        reason: `Item details edited (was: ${item.name})`,
        performedBy: sessionUser.userId,
        timestamp: new Date(),
      });
    }

    await AuditLog.create({
      action: "STOCK_UPDATED",
      module: item.metalType === "gold" ? "gold_inventory" : "silver_inventory",
      description: `Updated product details: ${item.name} (${item.sku})`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    const populatedItem = await InventoryItem.findById(item._id).populate("categoryId", "name metalType").lean();

    return NextResponse.json({
      success: true,
      item: populatedItem
        ? {
            ...populatedItem,
            id: populatedItem._id.toString(),
          }
        : {
            ...item.toObject(),
            id: item._id.toString(),
          },
    });
  } catch (error: any) {
    console.error("Item update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { id } = params;

  try {
    const item = await InventoryItem.findById(id);
    if (!item) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    const prevQty = item.quantity;
    const prevGross = item.grossWeight;
    const prevNet = item.netWeight;

    // Soft delete/archive
    item.isActive = false;
    item.quantity = 0;
    await item.save();

    await InventoryTransaction.create({
      itemId: item._id,
      metalType: item.metalType,
      categoryId: item.categoryId,
      transactionType: "archive",
      previousQuantity: prevQty,
      newQuantity: 0,
      quantityChange: -prevQty,
      previousGrossWeight: prevGross,
      newGrossWeight: 0,
      previousNetWeight: prevNet,
      newNetWeight: 0,
      netWeightChange: -prevNet,
      reason: "Item archived / removed from active showroom inventory",
      performedBy: sessionUser.userId,
      timestamp: new Date(),
    });

    await AuditLog.create({
      action: "STOCK_ARCHIVED",
      module: item.metalType === "gold" ? "gold_inventory" : "silver_inventory",
      description: `Archived item: ${item.name} (${item.sku})`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, message: "Item archived successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
