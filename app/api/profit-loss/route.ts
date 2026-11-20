import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import SaleRecord from "@/models/SaleRecord";
import Category from "@/models/Category";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range"); // "today", "week", "month", "year", "all"

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const query: any = {};

    if (range === "today") {
      query.saleDate = { $gte: startOfToday };
    } else if (range === "week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query.saleDate = { $gte: oneWeekAgo };
    } else if (range === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.saleDate = { $gte: startOfMonth };
    } else if (range === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      query.saleDate = { $gte: startOfYear };
    }

    const sales = await SaleRecord.find(query).sort({ saleDate: -1 });
    const categories = await Category.find({});
    const categoryMap: Record<string, string> = {};
    categories.forEach((c) => {
      categoryMap[c._id.toString()] = c.name;
    });

    let totalRevenuePaise = 0;
    let totalCostPaise = 0;
    let totalProfitPaise = 0;
    let totalOutstandingUdhariPaise = 0;

    let goldRevenuePaise = 0;
    let goldProfitPaise = 0;
    let silverRevenuePaise = 0;
    let silverProfitPaise = 0;

    const categoryBreakdown: Record<
      string,
      { name: string; metal: string; count: number; revenuePaise: number; profitPaise: number }
    > = {};

    for (const s of sales) {
      totalRevenuePaise += s.sellingPricePaise || 0;
      totalCostPaise += s.costPricePaise || 0;
      totalProfitPaise += s.profitPaise || 0;
      totalOutstandingUdhariPaise += s.balanceDuePaise || 0;

      if (s.metalType === "gold") {
        goldRevenuePaise += s.sellingPricePaise || 0;
        goldProfitPaise += s.profitPaise || 0;
      } else {
        silverRevenuePaise += s.sellingPricePaise || 0;
        silverProfitPaise += s.profitPaise || 0;
      }

      const catId = s.categoryId ? s.categoryId.toString() : "other";
      const catName = categoryMap[catId] || s.itemName || "Uncategorized";

      if (!categoryBreakdown[catId]) {
        categoryBreakdown[catId] = {
          name: catName,
          metal: s.metalType,
          count: 0,
          revenuePaise: 0,
          profitPaise: 0,
        };
      }

      categoryBreakdown[catId].count += s.quantitySold || 1;
      categoryBreakdown[catId].revenuePaise += s.sellingPricePaise || 0;
      categoryBreakdown[catId].profitPaise += s.profitPaise || 0;
    }

    const profitMarginPercent =
      totalRevenuePaise > 0 ? Number(((totalProfitPaise / totalRevenuePaise) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      success: true,
      metrics: {
        totalRevenueRupees: totalRevenuePaise / 100,
        totalCostRupees: totalCostPaise / 100,
        totalProfitRupees: totalProfitPaise / 100,
        totalOutstandingUdhariRupees: totalOutstandingUdhariPaise / 100,
        profitMarginPercent,
        goldRevenueRupees: goldRevenuePaise / 100,
        goldProfitRupees: goldProfitPaise / 100,
        silverRevenueRupees: silverRevenuePaise / 100,
        silverProfitRupees: silverProfitPaise / 100,
        totalItemsSold: sales.reduce((acc, s) => acc + (s.quantitySold || 1), 0),
      },
      categoryAnalysis: Object.values(categoryBreakdown).map((item) => ({
        ...item,
        revenueRupees: item.revenuePaise / 100,
        profitRupees: item.profitPaise / 100,
        marginPercent:
          item.revenuePaise > 0 ? Number(((item.profitPaise / item.revenuePaise) * 100).toFixed(1)) : 0,
      })),
      recentSales: sales.slice(0, 10),
    });
  } catch (error: any) {
    console.error("GET /api/profit-loss error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
