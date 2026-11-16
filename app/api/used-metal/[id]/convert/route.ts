import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import UsedMetalPurchase from "@/models/UsedMetalPurchase";
import InventoryItem from "@/models/InventoryItem";
import InventoryTransaction from "@/models/InventoryTransaction";
import Category from "@/models/Category";
import AuditLog from "@/models/AuditLog";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { id } = params;

  try {
    const purchase = await UsedMetalPurchase.findById(id);
    if (!purchase) {
      return NextResponse.json({ success: false, error: "Used metal purchase record not found" }, { status: 404 });
    }

    if (purchase.isConvertedToInventory) {
      return NextResponse.json(
        {
          success: false,
          error: "This used metal purchase has already been converted to showroom inventory. Duplicate conversions are strictly prohibited.",
        },
        { status: 400 }
      );
    }

    const { targetCategoryId, refinedNetWeight, purity, itemName, notes } = await req.json();

    if (!targetCategoryId) {
      return NextResponse.json({ success: false, error: "Destination inventory category is required" }, { status: 400 });
    }

    const targetCat = await Category.findById(targetCategoryId);
    if (!targetCat) {
      return NextResponse.json({ success: false, error: "Selected category does not exist" }, { status: 404 });
    }

    if (targetCat.metalType !== purchase.metalType) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot convert ${purchase.metalType} purchase into a ${targetCat.metalType} category`,
        },
        { status: 400 }
      );
    }

    const postRefinedWeight = Number(refinedNetWeight);
    if (isNaN(postRefinedWeight) || postRefinedWeight <= 0) {
      return NextResponse.json({ success: false, error: "Refined net weight must be greater than 0" }, { status: 400 });
    }

    const convertedPurity = (purity || purchase.purity).trim();
    const finalItemName = (itemName || `Refined ${purchase.metalType.toUpperCase()} (${purchase.transactionNumber})`).trim();

    // Auto-generate SKU
    const prefix = purchase.metalType === "gold" ? "SJ-G" : "SJ-S";
    const catCode = targetCat.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
    const count = await InventoryItem.countDocuments({ metalType: purchase.metalType });
    const generatedSku = `${prefix}-${catCode}-${(count + 1).toString().padStart(4, "0")}`;

    // Create new inventory item
    const newItem = await InventoryItem.create({
      metalType: purchase.metalType,
      categoryId: targetCat._id,
      name: finalItemName,
      sku: generatedSku,
      purity: convertedPurity,
      quantity: 1,
      grossWeight: Number(postRefinedWeight.toFixed(3)),
      stoneWeight: 0,
      netWeight: Number(postRefinedWeight.toFixed(3)),
      supplierName: `Refined Scrap from ${purchase.sellerName} (${purchase.transactionNumber})`,
      purchaseDate: new Date(),
      purchaseCostPaise: purchase.finalAgreedCostPaise,
      unitCostPaise: purchase.finalAgreedCostPaise,
      notes: notes?.trim() || `Converted from scrap voucher ${purchase.transactionNumber}. Original net wt: ${purchase.netWeight}g, Refined wt: ${postRefinedWeight}g`,
      sourceType: "used_metal_conversion",
      sourceUsedPurchaseId: purchase._id,
      isActive: true,
    });

    // Mark purchase as converted
    purchase.isConvertedToInventory = true;
    purchase.convertedDate = new Date();
    purchase.convertedInventoryItemId = newItem._id as any;
    purchase.convertedNetWeight = Number(postRefinedWeight.toFixed(3));
    purchase.convertedPurity = convertedPurity;
    purchase.conversionNotes = notes?.trim();
    await purchase.save();

    // Append to inventoryTransactions
    await InventoryTransaction.create({
      itemId: newItem._id,
      metalType: purchase.metalType,
      categoryId: targetCat._id,
      transactionType: "conversion_in",
      previousQuantity: 0,
      newQuantity: 1,
      quantityChange: 1,
      previousGrossWeight: 0,
      newGrossWeight: newItem.grossWeight,
      previousNetWeight: 0,
      newNetWeight: newItem.netWeight,
      netWeightChange: newItem.netWeight,
      reason: `Converted from used metal purchase ${purchase.transactionNumber}`,
      referenceId: purchase.transactionNumber,
      performedBy: sessionUser.userId,
      timestamp: new Date(),
    });

    await AuditLog.create({
      action: "USED_METAL_CONVERTED",
      module: "used_metal",
      description: `Converted scrap voucher ${purchase.transactionNumber} into showroom stock ${newItem.name} (${newItem.sku}) - Refined Wt: ${postRefinedWeight}g`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Scrap metal converted to showroom inventory successfully",
      item: newItem,
      purchase,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
