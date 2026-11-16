import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import Category from "@/models/Category";
import InventoryItem from "@/models/InventoryItem";
import AuditLog from "@/models/AuditLog";

export async function GET(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const metalType = searchParams.get("metalType"); // "gold" | "silver"

  const filter: any = {};
  if (metalType) filter.metalType = metalType;

  try {
    const categories = await Category.find(filter).sort({ displayOrder: 1, name: 1 }).lean();

    // Attach real-time pieces and weights per category
    const categoryStats = await InventoryItem.aggregate([
      { $match: { isActive: true, ...(metalType ? { metalType } : {}) } },
      {
        $group: {
          _id: "$categoryId",
          totalPieces: { $sum: "$quantity" },
          totalGrossWeight: { $sum: "$grossWeight" },
          totalNetWeight: { $sum: "$netWeight" },
          itemCount: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map();
    categoryStats.forEach((s) => statsMap.set(s._id.toString(), s));

    const enrichedCategories = categories.map((cat: any) => {
      const s = statsMap.get(cat._id.toString()) || {
        totalPieces: 0,
        totalGrossWeight: 0,
        totalNetWeight: 0,
        itemCount: 0,
      };
      return {
        ...cat,
        id: cat._id.toString(),
        totalPieces: s.totalPieces,
        totalGrossWeight: Number(s.totalGrossWeight.toFixed(3)),
        totalNetWeight: Number(s.totalNetWeight.toFixed(3)),
        itemCount: s.itemCount,
      };
    });

    return NextResponse.json({ success: true, categories: enrichedCategories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  try {
    const { name, metalType, description, displayOrder } = await req.json();

    if (!name || !metalType || !["gold", "silver"].includes(metalType)) {
      return NextResponse.json(
        { success: false, error: "Name and valid metalType ('gold' or 'silver') are required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({
      metalType,
      name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Category "${trimmedName}" already exists for ${metalType}` },
        { status: 400 }
      );
    }

    const maxOrderCat = await Category.findOne({ metalType }).sort({ displayOrder: -1 });
    const nextOrder = displayOrder ?? (maxOrderCat ? maxOrderCat.displayOrder + 1 : 1);

    const category = await Category.create({
      name: trimmedName,
      metalType,
      description: description?.trim(),
      displayOrder: nextOrder,
      isActive: true,
    });

    await AuditLog.create({
      action: "CATEGORY_CREATED",
      module: metalType === "gold" ? "gold_inventory" : "silver_inventory",
      description: `Created new ${metalType} category "${trimmedName}"`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
