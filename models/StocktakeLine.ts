import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IStocktakeLine extends Document {
  sessionId: Types.ObjectId;
  itemId?: Types.ObjectId;
  sku: string;
  metalType: "gold" | "silver";
  categoryId?: Types.ObjectId;
  categoryName: string;
  itemName: string;
  purity: string;
  expectedQuantity: number;
  expectedGrossWeight: number; // in grams
  expectedNetWeight: number; // in grams
  physicalQuantity: number;
  physicalGrossWeight: number;
  physicalNetWeight: number;
  qtyDifference: number; // physical - expected
  grossWeightDifference: number;
  netWeightDifference: number;
  status: "uncounted" | "matched" | "missing" | "excess" | "weight_mismatch";
  verifiedAt?: Date;
  verifiedBy?: string;
  notes?: string;
  adjustmentReason?: string;
  adjustmentApproved?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StocktakeLineSchema = new Schema<IStocktakeLine>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "StocktakeSession", required: true },
    itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
    sku: { type: String, required: true, uppercase: true, trim: true },
    metalType: { type: String, enum: ["gold", "silver"], required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    categoryName: { type: String, default: "General", trim: true },
    itemName: { type: String, required: true, trim: true },
    purity: { type: String, required: true, trim: true },
    expectedQuantity: { type: Number, required: true, min: 0, default: 0 },
    expectedGrossWeight: { type: Number, required: true, min: 0, default: 0 },
    expectedNetWeight: { type: Number, required: true, min: 0, default: 0 },
    physicalQuantity: { type: Number, default: 0 },
    physicalGrossWeight: { type: Number, default: 0 },
    physicalNetWeight: { type: Number, default: 0 },
    qtyDifference: { type: Number, default: 0 },
    grossWeightDifference: { type: Number, default: 0 },
    netWeightDifference: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["uncounted", "matched", "missing", "excess", "weight_mismatch"],
      default: "uncounted",
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: String },
    notes: { type: String, trim: true },
    adjustmentReason: { type: String, trim: true },
    adjustmentApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

StocktakeLineSchema.index({ sessionId: 1, sku: 1 }, { unique: true });
StocktakeLineSchema.index({ sessionId: 1, status: 1 });
StocktakeLineSchema.index({ sessionId: 1, metalType: 1 });

export const StocktakeLine: Model<IStocktakeLine> =
  mongoose.models.StocktakeLine ||
  mongoose.model<IStocktakeLine>("StocktakeLine", StocktakeLineSchema);

export default StocktakeLine;
