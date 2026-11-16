import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import InventoryItem from "@/models/InventoryItem";
import InventoryTransaction from "@/models/InventoryTransaction";
import AuditLog from "@/models/AuditLog";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { id } = params;

  try {
    const { newQuantity, newGrossWeight, newStoneWeight = 0, reason } = await req.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: "Adjustment reason is mandatory to preserve audit trail." },
        { status: 400 }
      );
    }

    const item = await InventoryItem.findById(id);
    if (!item) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
    }

    const parsedQty = Number(newQuantity);
    const parsedGross = Number(newGrossWeight);
    const parsedStone = Number(newStoneWeight) || 0;

    if (isNaN(parsedQty) || parsedQty < 0) {
      return NextResponse.json({ success: false, error: "Invalid quantity value" }, { status: 400 });
    }
    if (isNaN(parsedGross) || parsedGross < 0) {
      return NextResponse.json({ success: false, error: "Invalid gross weight value" }, { status: 400 });
    }
    if (isNaN(parsedStone) || parsedStone < 0) {
      return NextResponse.json({ success: false, error: "Invalid stone weight value" }, { status: 400 });
    }
    if (parsedGross > 0 && parsedStone >= parsedGross) {
      return NextResponse.json(
        { success: false, error: "Stone weight cannot exceed or equal gross weight" },
        { status: 400 }
      );
    }

    const calculatedNet = parsedGross > 0 ? Number((parsedGross - parsedStone).toFixed(3)) : 0;

    const prevQty = item.quantity;
    const prevGross = item.grossWeight;
    const prevNet = item.netWeight;

    // Apply adjustment
    item.quantity = parsedQty;
    item.grossWeight = Number(parsedGross.toFixed(3));
    item.stoneWeight = Number(parsedStone.toFixed(3));
    item.netWeight = calculatedNet;
    if (parsedQty === 0) {
      // If 0 pieces remaining, keep active or set flag
    }
    await item.save();

    // Create immutable audit transaction
    const txn = await InventoryTransaction.create({
      itemId: item._id,
      metalType: item.metalType,
      categoryId: item.categoryId,
      transactionType: "adjustment",
      previousQuantity: prevQty,
      newQuantity: parsedQty,
      quantityChange: parsedQty - prevQty,
      previousGrossWeight: prevGross,
      newGrossWeight: item.grossWeight,
      previousNetWeight: prevNet,
      newNetWeight: item.netWeight,
      netWeightChange: Number((item.netWeight - prevNet).toFixed(3)),
      reason: reason.trim(),
      performedBy: sessionUser.userId,
      timestamp: new Date(),
    });

    await AuditLog.create({
      action: "STOCK_ADJUSTMENT",
      module: item.metalType === "gold" ? "gold_inventory" : "silver_inventory",
      description: `Stock adjusted for ${item.name} (${item.sku}): Qty ${prevQty} -> ${parsedQty}, Net Wt ${prevNet}g -> ${item.netWeight}g. Reason: ${reason.trim()}`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      item,
      transaction: txn,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
