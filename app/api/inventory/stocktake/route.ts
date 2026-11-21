import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import StocktakeSession from "@/models/StocktakeSession";
import StocktakeLine from "@/models/StocktakeLine";
import InventoryItem from "@/models/InventoryItem";
import Category from "@/models/Category";
import AuditLog from "@/models/AuditLog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    // Ensure Mongoose models are registered
    void Category;
    void InventoryItem;
    void StocktakeLine;
    const { searchParams } = new URL(req.url);
    const metalType = searchParams.get("metalType");
    const status = searchParams.get("status");
    const autoInit = searchParams.get("autoInit") !== "false";

    const query: any = {};
    if (metalType && ["gold", "silver"].includes(metalType)) {
      query.metalType = { $in: [metalType, "all"] };
    }
    if (status) {
      query.status = status;
    }

    let sessions = await StocktakeSession.find(query).sort({ year: -1, month: -1, createdAt: -1 });

    // Auto-initialize stocktake session for current month if none active exists
    const hasActiveSession = sessions.some((s) => ["draft", "counting", "under_review"].includes(s.status));
    if (autoInit && !hasActiveSession) {
      const now = new Date();
      const curMonth = now.getMonth() + 1;
      const curYear = now.getFullYear();

      // Check if session for this month already exists
      let activeSession = await StocktakeSession.findOne({
        month: curMonth,
        year: curYear,
        status: { $in: ["draft", "counting", "under_review"] },
      });

      if (!activeSession) {
        const count = await StocktakeSession.countDocuments();
        const sessionCode = `ST-${curYear}-${String(curMonth).padStart(2, "0")}-${String(count + 1).padStart(3, "0")}`;

        const items = await InventoryItem.find({ isActive: true, quantity: { $gt: 0 } }).populate("categoryId");

        let totalExpectedItems = 0;
        let totalExpectedGrossWeight = 0;
        let totalExpectedNetWeight = 0;

        activeSession = await StocktakeSession.create({
          sessionCode,
          month: curMonth,
          year: curYear,
          metalType: "all",
          status: "counting",
          snapshotTimestamp: now,
          notes: "Monthly Showroom Stock Audit",
          metrics: {
            totalExpectedItems: 0,
            totalExpectedGrossWeight: 0,
            totalExpectedNetWeight: 0,
            totalCountedItems: 0,
            totalMatchedItems: 0,
            totalMissingItems: 0,
            totalExcessItems: 0,
            totalWeightMismatchItems: 0,
            totalUncountedItems: items.length,
            netGrossWeightDiff: 0,
            netNetWeightDiff: 0,
          },
        });

        const activeSessionId = activeSession._id;
        const linesToInsert = items.map((item) => {
          totalExpectedItems += item.quantity || 1;
          totalExpectedGrossWeight += item.grossWeight || 0;
          totalExpectedNetWeight += item.netWeight || 0;

          const catName =
            item.categoryId && typeof item.categoryId === "object" && (item.categoryId as any).name
              ? (item.categoryId as any).name
              : "General";

          return {
            sessionId: activeSessionId,
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

        if (linesToInsert.length > 0) {
          await StocktakeLine.insertMany(linesToInsert);
        }

        activeSession.metrics.totalExpectedItems = totalExpectedItems;
        activeSession.metrics.totalExpectedGrossWeight = Number(totalExpectedGrossWeight.toFixed(3));
        activeSession.metrics.totalExpectedNetWeight = Number(totalExpectedNetWeight.toFixed(3));
        activeSession.metrics.totalUncountedItems = items.length;
        await activeSession.save();
      }

      sessions = await StocktakeSession.find(query).sort({ year: -1, month: -1, createdAt: -1 });
    }

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/stocktake error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch stocktake sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const body = await req.json();
    const { month, year, metalType = "all", notes } = body;

    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);

    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return NextResponse.json({ error: "Valid month (1-12) is required" }, { status: 400 });
    }
    if (isNaN(parsedYear) || parsedYear < 2000) {
      return NextResponse.json({ error: "Valid year is required" }, { status: 400 });
    }

    // Duplicate check: check if an active session exists for this month/year/metalType
    const existing = await StocktakeSession.findOne({
      month: parsedMonth,
      year: parsedYear,
      metalType,
      status: { $in: ["draft", "counting", "under_review"] },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `An active stocktake session (${existing.sessionCode}) already exists for ${parsedMonth}/${parsedYear}. Complete or finalize it before creating a new one.`,
          session: existing,
        },
        { status: 409 }
      );
    }

    // Build unique session code: ST-YYYY-MM-###
    const count = await StocktakeSession.countDocuments();
    const sessionCode = `ST-${parsedYear}-${String(parsedMonth).padStart(2, "0")}-${String(count + 1).padStart(3, "0")}`;

    const snapshotTimestamp = new Date();

    // Query eligible inventory items
    const invQuery: any = {
      isActive: true,
      quantity: { $gt: 0 },
    };
    if (metalType === "gold" || metalType === "silver") {
      invQuery.metalType = metalType;
    }

    const items = await InventoryItem.find(invQuery).populate("categoryId");

    let totalExpectedItems = 0;
    let totalExpectedGrossWeight = 0;
    let totalExpectedNetWeight = 0;

    const session = await StocktakeSession.create({
      sessionCode,
      month: parsedMonth,
      year: parsedYear,
      metalType,
      status: "counting",
      snapshotTimestamp,
      notes,
      metrics: {
        totalExpectedItems: 0,
        totalExpectedGrossWeight: 0,
        totalExpectedNetWeight: 0,
        totalCountedItems: 0,
        totalMatchedItems: 0,
        totalMissingItems: 0,
        totalExcessItems: 0,
        totalWeightMismatchItems: 0,
        totalUncountedItems: items.length,
        netGrossWeightDiff: 0,
        netNetWeightDiff: 0,
      },
    });

    // Create line items in bulk
    const linesToInsert = items.map((item) => {
      totalExpectedItems += item.quantity || 1;
      totalExpectedGrossWeight += item.grossWeight || 0;
      totalExpectedNetWeight += item.netWeight || 0;

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

    if (linesToInsert.length > 0) {
      await StocktakeLine.insertMany(linesToInsert);
    }

    session.metrics.totalExpectedItems = totalExpectedItems;
    session.metrics.totalExpectedGrossWeight = Number(totalExpectedGrossWeight.toFixed(3));
    session.metrics.totalExpectedNetWeight = Number(totalExpectedNetWeight.toFixed(3));
    session.metrics.totalUncountedItems = items.length;
    await session.save();

    await AuditLog.create({
      userId: sessionUser.userId,
      userEmail: sessionUser.email,
      action: "STOCKTAKE_STARTED",
      targetCollection: "StocktakeSession",
      targetId: session._id,
      notes: `Started stock check ${sessionCode} for ${parsedMonth}/${parsedYear} with ${items.length} expected inventory pieces.`,
    });

    return NextResponse.json({
      success: true,
      session,
      totalLines: linesToInsert.length,
    });
  } catch (error: any) {
    console.error("POST /api/inventory/stocktake error:", error);
    return NextResponse.json({ error: error.message || "Failed to create stocktake session" }, { status: 500 });
  }
}
