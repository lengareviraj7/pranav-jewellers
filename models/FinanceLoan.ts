import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPledgedItem {
  description: string;
  metalType: "gold" | "silver";
  purity: string;
  quantity: number;
  grossWeight: number; // in grams
  netWeight: number; // in grams
  identificationMark?: string; // Box/pouch tag, packet number, receipt ref
}

export interface IFinanceLoan extends Document {
  loanNumber: string;
  customerId: Types.ObjectId;
  mortgageDate: string; // YYYY-MM-DD
  asOfDateLastCalculated?: string;
  originalPrincipalPaise: number;
  currentOutstandingPrincipalPaise: number;
  monthlyRate: number; // e.g. 2.0, 2.5, 3.0
  interestMode: "yearly_compound" | "simple";
  dueDate?: string; // YYYY-MM-DD

  // Pledged jewellery strictly isolated from shop inventory
  pledgedItems: IPledgedItem[];
  totalPledgedGrossWeight: number;
  totalPledgedNetWeight: number;

  totalInterestPaidPaise: number;
  totalPrincipalPaidPaise: number;
  accruedInterestPaise: number;
  totalOutstandingDuePaise: number;

  status: "active" | "partially_paid" | "overdue" | "closed";
  closedDate?: Date;
  closureNotes?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const PledgedItemSchema = new Schema<IPledgedItem>(
  {
    description: { type: String, required: true, trim: true },
    metalType: { type: String, enum: ["gold", "silver"], default: "gold" },
    purity: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    grossWeight: { type: Number, required: true, min: 0 },
    netWeight: { type: Number, required: true, min: 0 },
    identificationMark: { type: String, trim: true },
  },
  { _id: false }
);

const FinanceLoanSchema = new Schema<IFinanceLoan>(
  {
    loanNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    mortgageDate: { type: String, required: true, trim: true },
    asOfDateLastCalculated: { type: String, trim: true },
    originalPrincipalPaise: { type: Number, required: true, min: 0 },
    currentOutstandingPrincipalPaise: { type: Number, required: true, min: 0 },
    monthlyRate: { type: Number, required: true, min: 0, default: 2.0 },
    interestMode: {
      type: String,
      enum: ["yearly_compound", "simple"],
      default: "yearly_compound",
    },
    dueDate: { type: String, trim: true },
    pledgedItems: [PledgedItemSchema],
    totalPledgedGrossWeight: { type: Number, default: 0 },
    totalPledgedNetWeight: { type: Number, default: 0 },

    totalInterestPaidPaise: { type: Number, default: 0 },
    totalPrincipalPaidPaise: { type: Number, default: 0 },
    accruedInterestPaise: { type: Number, default: 0 },
    totalOutstandingDuePaise: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["active", "partially_paid", "overdue", "closed"],
      default: "active",
    },
    closedDate: { type: Date },
    closureNotes: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

FinanceLoanSchema.index({ customerId: 1, status: 1 });
FinanceLoanSchema.index({ status: 1, mortgageDate: 1 });

export const FinanceLoan: Model<IFinanceLoan> =
  mongoose.models.FinanceLoan || mongoose.model<IFinanceLoan>("FinanceLoan", FinanceLoanSchema);
export default FinanceLoan;
