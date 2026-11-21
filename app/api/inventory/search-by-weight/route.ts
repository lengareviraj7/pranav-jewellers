import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import InventoryItem from "@/models/InventoryItem";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const metalType = searchParams.get("metalType"); // "gold", "silver", "all"
    const categoryId = searchParams.get("categoryId");
    const targetWeightParam = searchParams.get("targetWeight");
    const weightBasis = searchParams.get("weightBasis") || "net"; // "net" or "gross"
    const toleranceParam = searchParams.get("tolerance"); // e.g. "0.05", "0.1", "0.5", or "all"
    const purity = searchParams.get("purity");

    const targetWeight = parseFloat(targetWeightParam || "0");
    if (isNaN(targetWeight) || targetWeight <= 0) {
      return NextResponse.json({ error: "Valid target weight in grams is required" }, { status: 400 });
    }

    const query: any = {
      isActive: true,
      quantity: { $gt: 0 },
      status: { $in: ["in_stock", "partial_sold"] },
    };

    if (metalType && ["gold", "silver"].includes(metalType)) {
      query.metalType = metalType;
    }
    if (categoryId) {
      query.categoryId = categoryId;
    }
    if (purity) {
      query.purity = purity;
    }

    const items = await InventoryItem.find(query).populate("categoryId");

    const tolerance = toleranceParam && toleranceParam !== "all" ? parseFloat(toleranceParam) : null;

    // Calculate proximity and format results
    const results = items
      .map((item) => {
        const itemWeight = weightBasis === "gross" ? item.grossWeight : item.netWeight;
        const diffGrams = Number((itemWeight - targetWeight).toFixed(3));
        const absDiffGrams = Math.abs(diffGrams);

        // Format milligram label
        let diffLabel = "";
        const diffMg = Math.round(diffGrams * 1000);
        if (diffMg === 0) {
          diffLabel = "Exact match";
        } else if (diffMg > 0) {
          diffLabel = `+${diffMg} mg`;
        } else {
          diffLabel = `${diffMg} mg`;
        }

        const catName =
          item.categoryId && typeof item.categoryId === "object" && (item.categoryId as any).name
            ? (item.categoryId as any).name
            : "Jewellery";

        return {
          _id: item._id,
          sku: item.sku,
          name: item.name,
          metalType: item.metalType,
          categoryId: item.categoryId?._id || item.categoryId,
          categoryName: catName,
          purity: item.purity,
          size: item.size,
          quantity: item.quantity,
          grossWeight: item.grossWeight,
          netWeight: item.netWeight,
          targetWeight,
          weightBasis,
          diffGrams,
          absDiffGrams,
          diffMg,
          diffLabel,
          purchaseCostPaise: item.purchaseCostPaise,
        };
      })
      .filter((item) => {
        if (tolerance !== null && !isNaN(tolerance)) {
          return item.absDiffGrams <= tolerance + 0.0001;
        }
        return true;
      })
      .sort((a, b) => a.absDiffGrams - b.absDiffGrams);

    return NextResponse.json({
      success: true,
      targetWeight,
      weightBasis,
      tolerance: tolerance ?? "unconstrained",
      count: results.length,
      items: results,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/search-by-weight error:", error);
    return NextResponse.json({ error: error.message || "Failed to search inventory by weight" }, { status: 500 });
  }
}
