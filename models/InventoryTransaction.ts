import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IInventoryTransaction extends Document {
  itemId: Types.ObjectId;
  metalType: "gold" | "silver";
  categoryId: Types.ObjectId;
  transactionType: "stock_in" | "stock_out" | "adjustment" | "conversion_in" | "archive" | "sale";
  previousQuantity: number;
  newQuantity: number;
  quantityChange: number;
  previousGrossWeight: number;
  newGrossWeight: number;
  previousNetWeight: number;
  newNetWeight: number;
  netWeightChange: number;
  reason: string;
  referenceId?: string;
  performedBy?: Types.ObjectId;
  timestamp: Date;
}

const InventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    metalType: { type: String, enum: ["gold", "silver"], required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    transactionType: {
      type: String,
      enum: ["stock_in", "stock_out", "adjustment", "conversion_in", "archive", "sale"],
      required: true,
    },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    quantityChange: { type: Number, required: true },
    previousGrossWeight: { type: Number, required: true },
    newGrossWeight: { type: Number, required: true },
    previousNetWeight: { type: Number, required: true },
    newNetWeight: { type: Number, required: true },
    netWeightChange: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    referenceId: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

InventoryTransactionSchema.index({ itemId: 1, timestamp: -1 });
InventoryTransactionSchema.index({ metalType: 1, timestamp: -1 });

export const InventoryTransaction: Model<IInventoryTransaction> =
  mongoose.models.InventoryTransaction ||
  mongoose.model<IInventoryTransaction>("InventoryTransaction", InventoryTransactionSchema);
export default InventoryTransaction;
