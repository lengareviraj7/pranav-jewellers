import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import StocktakeSession from "@/models/StocktakeSession";
import StocktakeLine from "@/models/StocktakeLine";
import InventoryItem from "@/models/InventoryItem";
import Category from "@/models/Category";
import InventoryTransaction from "@/models/InventoryTransaction";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    // Ensure Mongoose models are registered
    void Category;
    void InventoryItem;
    void StocktakeLine;
    const { id } = params;

    const session = await StocktakeSession.findById(id);
    if (!session) {
      return NextResponse.json({ error: "Stocktake session not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const metalType = searchParams.get("metalType");
    const status = searchParams.get("status");
    const shouldSync = searchParams.get("sync") === "true";

    // Synchronize newly added showroom inventory if requested
    if (shouldSync && session.status !== "finalized") {
      const existingItemIds = await StocktakeLine.find({ sessionId: session._id }).distinct("itemId");
      const missingItems = await InventoryItem.find({
        _id: { $nin: existingItemIds },
        isActive: true,
        quantity: { $gt: 0 },
      }).populate("categoryId");

      if (missingItems.length > 0) {
        const newLines = missingItems.map((item) => {
          const catName =
            item.categoryId && typeof item.categoryId === "object" && (item.categoryId as any).name
              ? (item.categoryId as any).name
              : "General";

          return {
            sessionId: session._id,
            itemId: item._id,
            sku: item.sku,
            metalType: item.metalType,
            categoryId: item.categoryId?._id || item.categoryId,
            categoryName: catName,
            itemName: item.name,
            purity: item.purity,
            expectedQuantity: item.quantity || 1,
            expectedGrossWeight: item.grossWeight || 0,
            expectedNetWeight: item.netWeight || 0,
            physicalQuantity: 0,
            physicalGrossWeight: 0,
            physicalNetWeight: 0,
            qtyDifference: -(item.quantity || 1),
            grossWeightDifference: -(item.grossWeight || 0),
            netWeightDifference: -(item.netWeight || 0),
            status: "uncounted",
          };
        });

        await StocktakeLine.insertMany(newLines);

        // Recalculate session totals
        const allSessionLines = await StocktakeLine.find({ sessionId: session._id });
        let totalExpItems = 0;
        let totalExpGross = 0;
        let totalExpNet = 0;
        let totalUncounted = 0;
        let totalCounted = 0;
        let totalMatched = 0;

        for (const l of allSessionLines) {
          totalExpItems += l.expectedQuantity || 1;
          totalExpGross += l.expectedGrossWeight || 0;
          totalExpNet += l.expectedNetWeight || 0;
          if (l.status === "uncounted") totalUncounted++;
          else totalCounted++;
          if (l.status === "matched") totalMatched++;
        }

        session.metrics.totalExpectedItems = totalExpItems;
        session.metrics.totalExpectedGrossWeight = Number(totalExpGross.toFixed(3));
        session.metrics.totalExpectedNetWeight = Number(totalExpNet.toFixed(3));
        session.metrics.totalUncountedItems = totalUncounted;
        session.metrics.totalCountedItems = totalCounted;
        session.metrics.totalMatchedItems = totalMatched;
        await session.save();
      }
    }

    const query: any = { sessionId: session._id };
    if (metalType && ["gold", "silver"].includes(metalType)) {
      query.metalType = metalType;
    }
    if (status && ["uncounted", "matched", "missing", "excess", "weight_mismatch"].includes(status)) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { categoryName: { $regex: search, $options: "i" } },
        { purity: { $regex: search, $options: "i" } },
      ];
    }

    const lines = await StocktakeLine.find(query).populate("itemId").sort({ status: 1, itemName: 1 });

    // Check for concurrent transactions since snapshot cutoff
    // This allows the showroom to inspect if an item was legitimately sold after the snapshot was taken
    const itemIds = lines.map((l) => l.itemId).filter(Boolean);
    const concurrentTxns = await InventoryTransaction.find({
      itemId: { $in: itemIds },
      timestamp: { $gte: session.snapshotTimestamp },
    });

    const movementsByItem: Record<string, { qtySold: number; netWeightSold: number }> = {};
    for (const tx of concurrentTxns) {
      const idStr = tx.itemId.toString();
      if (!movementsByItem[idStr]) {
        movementsByItem[idStr] = { qtySold: 0, netWeightSold: 0 };
      }
      if (tx.transactionType === "sale") {
        movementsByItem[idStr].qtySold += Math.abs(tx.quantityChange || 0);
        movementsByItem[idStr].netWeightSold += Math.abs(tx.netWeightChange || 0);
      }
    }

    const enrichedLines = lines.map((line) => {
      const lineObj = line.toObject();
      if (line.itemId && movementsByItem[line.itemId.toString()]) {
        (lineObj as any).concurrentSale = movementsByItem[line.itemId.toString()];
      }
      return lineObj;
    });

    return NextResponse.json({
      success: true,
      session,
      lines: enrichedLines,
      totalCount: lines.length,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/stocktake/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch stocktake details" }, { status: 500 });
  }
}
