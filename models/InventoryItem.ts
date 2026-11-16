import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IInventoryItem extends Document {
  metalType: "gold" | "silver";
  categoryId: Types.ObjectId;
  name: string;
  sku: string;
  purity: string;
  quantity: number;
  grossWeight: number; // In grams (3 decimal places)
  stoneWeight: number; // In grams (3 decimal places)
  netWeight: number; // In grams (gross - stone)
  hallmarkUid?: string;
  supplierName?: string;
  purchaseDate: Date;
  purchaseCostPaise: number;
  unitCostPaise?: number;
  notes?: string;
  sourceType: "direct_purchase" | "used_metal_conversion" | "opening_stock";
  sourceUsedPurchaseId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    metalType: { type: String, enum: ["gold", "silver"], required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    purity: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 1 },
    grossWeight: { type: Number, required: true, min: 0 },
    stoneWeight: { type: Number, required: true, min: 0, default: 0 },
    netWeight: { type: Number, required: true, min: 0 },
    hallmarkUid: { type: String, trim: true, uppercase: true },
    supplierName: { type: String, trim: true },
    purchaseDate: { type: Date, default: Date.now },
    purchaseCostPaise: { type: Number, required: true, min: 0, default: 0 },
    unitCostPaise: { type: Number, min: 0 },
    notes: { type: String, trim: true },
    sourceType: {
      type: String,
      enum: ["direct_purchase", "used_metal_conversion", "opening_stock"],
      default: "direct_purchase",
    },
    sourceUsedPurchaseId: { type: Schema.Types.ObjectId, ref: "UsedMetalPurchase" },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

InventoryItemSchema.index({ metalType: 1, isActive: 1 });
InventoryItemSchema.index({ categoryId: 1, isActive: 1 });

export const InventoryItem: Model<IInventoryItem> =
  mongoose.models.InventoryItem || mongoose.model<IInventoryItem>("InventoryItem", InventoryItemSchema);
export default InventoryItem;
