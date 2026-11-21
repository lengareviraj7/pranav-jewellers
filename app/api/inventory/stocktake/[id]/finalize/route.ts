import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import StocktakeSession from "@/models/StocktakeSession";
import StocktakeLine from "@/models/StocktakeLine";
import InventoryItem from "@/models/InventoryItem";
import InventoryTransaction from "@/models/InventoryTransaction";
import AuditLog from "@/models/AuditLog";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { id } = params;

    const session = await StocktakeSession.findById(id);
    if (!session) {
      return NextResponse.json({ error: "Stocktake session not found" }, { status: 404 });
    }

    if (session.status === "finalized") {
      return NextResponse.json({ error: "Session is already finalized" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { applyAdjustments = false, adjustmentReason } = body;

    const lines = await StocktakeLine.find({ sessionId: session._id });
    const discrepancies = lines.filter(
      (l) => l.status === "missing" || l.status === "excess" || l.status === "weight_mismatch"
    );

    if (discrepancies.length > 0 && applyAdjustments && !adjustmentReason) {
      return NextResponse.json(
        { error: "A clear adjustment reason is required to reconcile stock discrepancies." },
        { status: 400 }
      );
    }

    let adjustedItemsCount = 0;

    if (applyAdjustments && discrepancies.length > 0) {
      for (const line of discrepancies) {
        if (!line.itemId) continue;

        const item = await InventoryItem.findById(line.itemId);
        if (!item) continue;

        const prevQty = item.quantity;
        const prevGross = item.grossWeight;
        const prevNet = item.netWeight;

        const newQty = line.physicalQuantity;
        const newGross = line.physicalGrossWeight;
        const newNet = line.physicalNetWeight;

        item.quantity = newQty;
        item.grossWeight = newGross;
        item.netWeight = newNet;
        if (newQty === 0) {
          item.isActive = false;
          item.status = "sold";
        }
        await item.save();

        await InventoryTransaction.create({
          itemId: item._id,
          metalType: item.metalType,
          categoryId: item.categoryId,
          transactionType: "adjustment",
          previousQuantity: prevQty,
          newQuantity: newQty,
          quantityChange: newQty - prevQty,
          previousGrossWeight: prevGross,
          newGrossWeight: newGross,
          previousNetWeight: prevNet,
          newNetWeight: newNet,
          netWeightChange: Number((newNet - prevNet).toFixed(3)),
          reason: `Monthly Stocktake ${session.sessionCode} Adjustment: ${adjustmentReason} (Physical count: ${newQty} pcs, ${newNet}g net)`,
          performedBy: sessionUser.userId,
          timestamp: new Date(),
        });

        line.adjustmentApproved = true;
        line.adjustmentReason = adjustmentReason;
        await line.save();

        adjustedItemsCount++;
      }
    }

    session.status = "finalized";
    session.finalizedAt = new Date();
    session.finalizedBy = sessionUser.name || sessionUser.email;
    await session.save();

    await AuditLog.create({
      userId: sessionUser.userId,
      userEmail: sessionUser.email,
      action: "STOCKTAKE_FINALIZED",
      targetCollection: "StocktakeSession",
      targetId: session._id,
      notes: `Finalized monthly stocktake ${session.sessionCode}. Total discrepancies: ${discrepancies.length}, Applied adjustments: ${adjustedItemsCount}.`,
    });

    return NextResponse.json({
      success: true,
      message: `Stocktake ${session.sessionCode} successfully finalized.`,
      session,
      discrepanciesCount: discrepancies.length,
      adjustedItemsCount,
    });
  } catch (error: any) {
    console.error("POST /api/inventory/stocktake/[id]/finalize error:", error);
    return NextResponse.json({ error: error.message || "Failed to finalize stocktake" }, { status: 500 });
  }
}
