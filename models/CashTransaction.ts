import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICashTransaction extends Document {
  transactionType: "credit" | "debit"; // credit = Jama (inflow), debit = Kharach / Udhar (outflow)
  amountPaise: number;
  category:
    | "sale_cash"
    | "udhari_recovery"
    | "customer_advance"
    | "loan_interest"
    | "loan_principal"
    | "opening_cash"
    | "scrap_purchase"
    | "loan_disbursement"
    | "shop_expense"
    | "karigar_wages"
    | "cash_withdrawal"
    | "other_income"
    | "other_expense";
  purpose: string;
  referenceId?: string; // e.g. Sale number, Loan number, Purchase ID
  performedBy?: Types.ObjectId;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashTransactionSchema = new Schema<ICashTransaction>(
  {
    transactionType: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amountPaise: { type: Number, required: true, min: 1 },
    category: {
      type: String,
      enum: [
        "sale_cash",
        "udhari_recovery",
        "customer_advance",
        "loan_interest",
        "loan_principal",
        "opening_cash",
        "scrap_purchase",
        "loan_disbursement",
        "shop_expense",
        "karigar_wages",
        "cash_withdrawal",
        "other_income",
        "other_expense",
      ],
      required: true,
    },
    purpose: { type: String, required: true, trim: true },
    referenceId: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

CashTransactionSchema.index({ date: -1 });
CashTransactionSchema.index({ transactionType: 1, date: -1 });
CashTransactionSchema.index({ category: 1 });

export const CashTransaction: Model<ICashTransaction> =
  mongoose.models.CashTransaction ||
  mongoose.model<ICashTransaction>("CashTransaction", CashTransactionSchema);
export default CashTransaction;
