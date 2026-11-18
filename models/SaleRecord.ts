import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ISaleRecord extends Document {
  saleNumber: string;
  itemId: Types.ObjectId;
  metalType: "gold" | "silver";
  categoryId: Types.ObjectId;
  itemName: string;
  sku: string;
  purity: string;
  size?: string;
  quantitySold: number;
  grossWeightSold: number; // in grams
  netWeightSold: number; // in grams
  costPricePaise: number;
  sellingPricePaise: number;
  profitPaise: number; // manually entered or calculated profit (can be negative for loss)
  customer: {
    name: string;
    phone: string;
    address?: string;
  };
  paymentMode: "cash" | "online" | "mixed";
  paidAmountPaise: number;
  balanceDuePaise: number;
  dueDate?: Date;
  paymentStatus: "paid" | "partial" | "unpaid";
  payments: Array<{
    amountPaise: number;
    paymentMode: "cash" | "online";
    date: Date;
    notes?: string;
  }>;
  whatsappSent: boolean;
  saleDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleRecordSchema = new Schema<ISaleRecord>(
  {
    saleNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    metalType: { type: String, enum: ["gold", "silver"], required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    itemName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    purity: { type: String, required: true, trim: true },
    size: { type: String, trim: true },
    quantitySold: { type: Number, required: true, min: 1, default: 1 },
    grossWeightSold: { type: Number, required: true, min: 0 },
    netWeightSold: { type: Number, required: true, min: 0 },
    costPricePaise: { type: Number, required: true, min: 0, default: 0 },
    sellingPricePaise: { type: Number, required: true, min: 0 },
    profitPaise: { type: Number, required: true, default: 0 },
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, trim: true },
    },
    paymentMode: {
      type: String,
      enum: ["cash", "online", "mixed"],
      default: "cash",
    },
    paidAmountPaise: { type: Number, required: true, min: 0, default: 0 },
    balanceDuePaise: { type: Number, required: true, min: 0, default: 0 },
    dueDate: { type: Date },
    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "paid",
    },
    payments: [
      {
        amountPaise: { type: Number, required: true, min: 0 },
        paymentMode: { type: String, enum: ["cash", "online"], default: "cash" },
        date: { type: Date, default: Date.now },
        notes: { type: String, trim: true },
      },
    ],
    whatsappSent: { type: Boolean, default: false },
    saleDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

SaleRecordSchema.index({ saleDate: -1 });
SaleRecordSchema.index({ "customer.phone": 1 });
SaleRecordSchema.index({ paymentStatus: 1, dueDate: 1 });
SaleRecordSchema.index({ metalType: 1 });

export const SaleRecord: Model<ISaleRecord> =
  mongoose.models.SaleRecord || mongoose.model<ISaleRecord>("SaleRecord", SaleRecordSchema);
export default SaleRecord;
