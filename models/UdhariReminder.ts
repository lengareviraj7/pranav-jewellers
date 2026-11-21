import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IUdhariReminder extends Document {
  saleId: Types.ObjectId;
  saleNumber: string;
  customerId?: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  outstandingPaise: number;
  dueDate: Date;
  reminderType: "3_days" | "due_date" | "overdue";
  scheduledDate: Date;
  status: "pending" | "sent" | "cancelled" | "failed";
  language: "en" | "hi" | "mr";
  messageBody: string;
  whatsappUrl: string;
  sentAt?: Date;
  attemptCount: number;
  lastAttemptAt?: Date;
  errorMessage?: string;
  dedupKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const UdhariReminderSchema = new Schema<IUdhariReminder>(
  {
    saleId: { type: Schema.Types.ObjectId, ref: "SaleRecord", required: true },
    saleNumber: { type: String, required: true, uppercase: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    outstandingPaise: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    reminderType: {
      type: String,
      enum: ["3_days", "due_date", "overdue"],
      required: true,
    },
    scheduledDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "sent", "cancelled", "failed"],
      default: "pending",
    },
    language: { type: String, enum: ["en", "hi", "mr"], default: "hi" },
    messageBody: { type: String, required: true },
    whatsappUrl: { type: String, required: true },
    sentAt: { type: Date },
    attemptCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    errorMessage: { type: String, trim: true },
    dedupKey: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

UdhariReminderSchema.index({ status: 1, scheduledDate: 1 });
UdhariReminderSchema.index({ saleId: 1, reminderType: 1 });
UdhariReminderSchema.index({ customerPhone: 1 });

export const UdhariReminder: Model<IUdhariReminder> =
  mongoose.models.UdhariReminder ||
  mongoose.model<IUdhariReminder>("UdhariReminder", UdhariReminderSchema);

export default UdhariReminder;
