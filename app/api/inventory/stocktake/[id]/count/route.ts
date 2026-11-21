import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import StocktakeSession from "@/models/StocktakeSession";
import StocktakeLine from "@/models/StocktakeLine";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
      return NextResponse.json(
        { error: "Cannot modify counts on a finalized stocktake session." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { lineId, sku, checked, action, lineIds, physicalQuantity, physicalGrossWeight, physicalNetWeight, notes } = body;

    // Bulk check action
    if (action === "bulk_check" && Array.isArray(lineIds) && lineIds.length > 0) {
      const targetLines = await StocktakeLine.find({ _id: { $in: lineIds }, sessionId: session._id });
      for (const tl of targetLines) {
        tl.physicalQuantity = tl.expectedQuantity || 1;
        tl.physicalGrossWeight = tl.expectedGrossWeight;
        tl.physicalNetWeight = tl.expectedNetWeight;
        tl.qtyDifference = 0;
        tl.grossWeightDifference = 0;
        tl.netWeightDifference = 0;
        tl.status = "matched";
        tl.verifiedAt = new Date();
        tl.verifiedBy = sessionUser.userId;
        await tl.save();
      }
      await recalculateSessionMetrics(session);
      return NextResponse.json({ success: true, count: targetLines.length });
    }

    // Reset all checks
    if (action === "reset_all") {
      const allLines = await StocktakeLine.find({ sessionId: session._id });
      for (const tl of allLines) {
        tl.physicalQuantity = 0;
        tl.physicalGrossWeight = 0;
        tl.physicalNetWeight = 0;
        tl.qtyDifference = -tl.expectedQuantity;
        tl.grossWeightDifference = -tl.expectedGrossWeight;
        tl.netWeightDifference = -tl.expectedNetWeight;
        tl.status = "uncounted";
        tl.verifiedAt = undefined;
        tl.verifiedBy = undefined;
        await tl.save();
      }
      await recalculateSessionMetrics(session);
      return NextResponse.json({ success: true, message: "All items reset to uncounted" });
    }

    let line = null;
    if (lineId) {
      line = await StocktakeLine.findOne({ _id: lineId, sessionId: session._id });
    } else if (sku) {
      line = await StocktakeLine.findOne({ sku: sku.toUpperCase().trim(), sessionId: session._id });
    }

    if (!line) {
      return NextResponse.json({ error: "Stocktake line item not found for this session" }, { status: 404 });
    }

    // Handle 1-Click Untick
    if (action === "uncheck" || checked === false) {
      line.physicalQuantity = 0;
      line.physicalGrossWeight = 0;
      line.physicalNetWeight = 0;
      line.qtyDifference = -line.expectedQuantity;
      line.grossWeightDifference = -line.expectedGrossWeight;
      line.netWeightDifference = -line.expectedNetWeight;
      line.status = "uncounted";
      line.verifiedAt = undefined;
      line.verifiedBy = undefined;
      if (notes !== undefined) line.notes = notes;
      await line.save();

      await recalculateSessionMetrics(session);

      return NextResponse.json({
        success: true,
        line,
        sessionMetrics: session.metrics,
      });
    }

    // Handle 1-Click Tick (Match expected)
    if (action === "check" || checked === true || (physicalQuantity === undefined && physicalGrossWeight === undefined)) {
      const physQty = line.expectedQuantity || 1;
      const physGross = line.expectedGrossWeight;
      const physNet = line.expectedNetWeight;

      line.physicalQuantity = physQty;
      line.physicalGrossWeight = physGross;
      line.physicalNetWeight = physNet;
      line.qtyDifference = 0;
      line.grossWeightDifference = 0;
      line.netWeightDifference = 0;
      line.status = "matched";
      line.verifiedAt = new Date();
      line.verifiedBy = sessionUser.userId;
      if (notes !== undefined) line.notes = notes;
      await line.save();

      await recalculateSessionMetrics(session);

      return NextResponse.json({
        success: true,
        line,
        sessionMetrics: session.metrics,
      });
    }

    // Handle custom physical quantity & weights (Discrepancy / manual scale verification)
    const physQty = parseInt(physicalQuantity, 10);
    const physGross = parseFloat(physicalGrossWeight);
    const physNet = parseFloat(physicalNetWeight);

    if (isNaN(physQty) || physQty < 0) {
      return NextResponse.json({ error: "Valid physical quantity is required" }, { status: 400 });
    }
    if (isNaN(physGross) || physGross < 0) {
      return NextResponse.json({ error: "Valid physical gross weight is required" }, { status: 400 });
    }
    if (isNaN(physNet) || physNet < 0) {
      return NextResponse.json({ error: "Valid physical net weight is required" }, { status: 400 });
    }
    if (physNet > physGross + 0.001) {
      return NextResponse.json({ error: "Physical net weight cannot exceed physical gross weight" }, { status: 400 });
    }

    const qtyDiff = physQty - line.expectedQuantity;
    const grossDiff = Number((physGross - line.expectedGrossWeight).toFixed(3));
    const netDiff = Number((physNet - line.expectedNetWeight).toFixed(3));

    // Weight tolerance: 5mg (0.005g) for gold, 20mg (0.02g) for silver
    const weightTolerance = line.metalType === "gold" ? 0.005 : 0.02;

    let status: "matched" | "missing" | "excess" | "weight_mismatch" = "matched";

    if (physQty === 0 && line.expectedQuantity > 0) {
      status = "missing";
    } else if (physQty > line.expectedQuantity) {
      status = "excess";
    } else if (physQty < line.expectedQuantity) {
      status = "missing";
    } else {
      const grossMatch = Math.abs(grossDiff) <= weightTolerance;
      const netMatch = Math.abs(netDiff) <= weightTolerance;

      if (grossMatch && netMatch) {
        status = "matched";
      } else {
        status = "weight_mismatch";
      }
    }

    line.physicalQuantity = physQty;
    line.physicalGrossWeight = physGross;
    line.physicalNetWeight = physNet;
    line.qtyDifference = qtyDiff;
    line.grossWeightDifference = grossDiff;
    line.netWeightDifference = netDiff;
    line.status = status;
    line.verifiedAt = new Date();
    line.verifiedBy = sessionUser.userId;
    if (notes !== undefined) line.notes = notes;
    await line.save();

    await recalculateSessionMetrics(session);

    return NextResponse.json({
      success: true,
      line,
      sessionMetrics: session.metrics,
    });
  } catch (error: any) {
    console.error("PUT /api/inventory/stocktake/[id]/count error:", error);
    return NextResponse.json({ error: error.message || "Failed to record physical count" }, { status: 500 });
  }
}

async function recalculateSessionMetrics(session: any) {
  const allLines = await StocktakeLine.find({ sessionId: session._id });
  let totalCounted = 0;
  let totalMatched = 0;
  let totalMissing = 0;
  let totalExcess = 0;
  let totalWeightMismatch = 0;
  let totalUncounted = 0;
  let netGrossDiff = 0;
  let netNetDiff = 0;

  for (const l of allLines) {
    if (l.status === "uncounted") {
      totalUncounted++;
    } else {
      totalCounted++;
      netGrossDiff += l.grossWeightDifference || 0;
      netNetDiff += l.netWeightDifference || 0;
      if (l.status === "matched") totalMatched++;
      else if (l.status === "missing") totalMissing++;
      else if (l.status === "excess") totalExcess++;
      else if (l.status === "weight_mismatch") totalWeightMismatch++;
    }
  }

  session.metrics.totalCountedItems = totalCounted;
  session.metrics.totalMatchedItems = totalMatched;
  session.metrics.totalMissingItems = totalMissing;
  session.metrics.totalExcessItems = totalExcess;
  session.metrics.totalWeightMismatchItems = totalWeightMismatch;
  session.metrics.totalUncountedItems = totalUncounted;
  session.metrics.netGrossWeightDiff = Number(netGrossDiff.toFixed(3));
  session.metrics.netNetWeightDiff = Number(netNetDiff.toFixed(3));
  await session.save();
}
