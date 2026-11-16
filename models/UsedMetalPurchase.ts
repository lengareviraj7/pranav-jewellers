import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IUsedMetalPurchase extends Document {
  transactionNumber: string;
  date: Date;
  metalType: "gold" | "silver";
  sellerName: string;
  sellerPhone?: string;
  sellerAddress?: string;
  itemDescription: string;
  category?: string;
  purity: string;
  grossWeight: number; // in grams
  deductionsWeight: number; // stone, wax, dirt deductions in grams
  netWeight: number; // gross - deductions
  ratePerGramPaise: number; // in paise
  calculatedValuePaise: number; // netWeight * ratePerGramPaise
  finalAgreedCostPaise: number; // in paise
  differenceReason?: string;
  amountPaidPaise: number;
  remainingPayablePaise: number;
  paymentStatus: "paid" | "partially_paid" | "pending";
  paymentMethod: "cash" | "bank_transfer" | "upi" | "cheque" | "other";
  notes?: string;

  // Convert to Inventory attributes:
  isConvertedToInventory: boolean;
  convertedDate?: Date;
  convertedInventoryItemId?: Types.ObjectId;
  convertedNetWeight?: number;
  convertedPurity?: string;
  conversionNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const UsedMetalPurchaseSchema = new Schema<IUsedMetalPurchase>(
  {
    transactionNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    date: { type: Date, default: Date.now },
    metalType: { type: String, enum: ["gold", "silver"], required: true },
    sellerName: { type: String, required: true, trim: true },
    sellerPhone: { type: String, trim: true },
    sellerAddress: { type: String, trim: true },
    itemDescription: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    purity: { type: String, required: true, trim: true },
    grossWeight: { type: Number, required: true, min: 0 },
    deductionsWeight: { type: Number, required: true, min: 0, default: 0 },
    netWeight: { type: Number, required: true, min: 0 },
    ratePerGramPaise: { type: Number, required: true, min: 0 },
    calculatedValuePaise: { type: Number, required: true, min: 0 },
    finalAgreedCostPaise: { type: Number, required: true, min: 0 },
    differenceReason: { type: String, trim: true },
    amountPaidPaise: { type: Number, required: true, min: 0, default: 0 },
    remainingPayablePaise: { type: Number, required: true, min: 0, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["paid", "partially_paid", "pending"],
      default: "paid",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "upi", "cheque", "other"],
      default: "cash",
    },
    notes: { type: String, trim: true },

    isConvertedToInventory: { type: Boolean, default: false },
    convertedDate: { type: Date },
    convertedInventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem" },
    convertedNetWeight: { type: Number },
    convertedPurity: { type: String },
    conversionNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

UsedMetalPurchaseSchema.index({ metalType: 1, paymentStatus: 1 });
UsedMetalPurchaseSchema.index({ date: -1 });
UsedMetalPurchaseSchema.index({ sellerName: "text" });

export const UsedMetalPurchase: Model<IUsedMetalPurchase> =
  mongoose.models.UsedMetalPurchase ||
  mongoose.model<IUsedMetalPurchase>("UsedMetalPurchase", UsedMetalPurchaseSchema);
export default UsedMetalPurchase;
