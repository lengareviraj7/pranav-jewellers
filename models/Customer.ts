import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomer extends Document {
  customerId: string;
  fullName: string;
  mobileNumber: string;
  secondaryPhone?: string;
  address?: string;
  identificationType?: "aadhar" | "pan" | "voter_id" | "other";
  identificationNumber?: string;
  notes?: string;
  advanceBalancePaise?: number; // Advance credit stored for customer (अॅडव्हान्स जमा)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    customerId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    secondaryPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    identificationType: {
      type: String,
      enum: ["aadhar", "pan", "voter_id", "other"],
      default: "aadhar",
    },
    identificationNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    advanceBalancePaise: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

CustomerSchema.index({ mobileNumber: 1 });
CustomerSchema.index({ fullName: "text" });

export const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);
export default Customer;
