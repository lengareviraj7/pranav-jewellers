import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import InventoryItem from "@/models/InventoryItem";
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
