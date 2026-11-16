import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import Category from "@/models/Category";
import InventoryItem from "@/models/InventoryItem";
import AuditLog from "@/models/AuditLog";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { id } = params;

  try {
    const { name, description, displayOrder, isActive } = await req.json();
    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }

    if (name && name.trim()) {
      const trimmedName = name.trim();
      const existing = await Category.findOne({
        _id: { $ne: id },
        metalType: category.metalType,
        name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Category "${trimmedName}" already exists for ${category.metalType}` },
          { status: 400 }
        );
      }
      category.name = trimmedName;
    }

    if (description !== undefined) category.description = description.trim();
    if (displayOrder !== undefined) category.displayOrder = Number(displayOrder);
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    await AuditLog.create({
      action: "CATEGORY_UPDATED",
      module: category.metalType === "gold" ? "gold_inventory" : "silver_inventory",
      description: `Updated category "${category.name}" (Status: ${category.isActive ? "Active" : "Disabled"})`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, category });
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
    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }

    const itemCount = await InventoryItem.countDocuments({ categoryId: id });
    if (itemCount > 0) {
      // Safe disable instead of hard deleting
      category.isActive = false;
      await category.save();
      return NextResponse.json({
        success: true,
        message: `Category "${category.name}" has ${itemCount} associated items. It has been disabled rather than permanently deleted.`,
        category,
      });
    }

    await Category.findByIdAndDelete(id);

    await AuditLog.create({
      action: "CATEGORY_DELETED",
      module: category.metalType === "gold" ? "gold_inventory" : "silver_inventory",
      description: `Deleted empty category "${category.name}"`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
