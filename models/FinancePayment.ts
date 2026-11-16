import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IFinancePayment extends Document {
  receiptNumber: string;
  loanId: Types.ObjectId;
  customerId: Types.ObjectId;
  paymentDate: string; // YYYY-MM-DD
  totalAmountPaise: number;
  principalAppliedPaise: number;
  interestAppliedPaise: number;
  paymentMethod: "cash" | "bank_transfer" | "upi" | "cheque";
  referenceTransactionId?: string;
  previousOutstandingPrincipalPaise: number;
  newOutstandingPrincipalPaise: number;
  notes?: string;
  createdAt: Date;
}

const FinancePaymentSchema = new Schema<IFinancePayment>(
  {
    receiptNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    loanId: { type: Schema.Types.ObjectId, ref: "FinanceLoan", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    paymentDate: { type: String, required: true, trim: true },
    totalAmountPaise: { type: Number, required: true, min: 1 },
    principalAppliedPaise: { type: Number, required: true, min: 0, default: 0 },
    interestAppliedPaise: { type: Number, required: true, min: 0, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "upi", "cheque"],
      default: "cash",
    },
    referenceTransactionId: { type: String, trim: true },
    previousOutstandingPrincipalPaise: { type: Number, required: true, min: 0 },
    newOutstandingPrincipalPaise: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

FinancePaymentSchema.index({ loanId: 1, paymentDate: -1 });
FinancePaymentSchema.index({ customerId: 1 });

export const FinancePayment: Model<IFinancePayment> =
  mongoose.models.FinancePayment ||
  mongoose.model<IFinancePayment>("FinancePayment", FinancePaymentSchema);
export default FinancePayment;
