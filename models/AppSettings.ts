import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAppSettings extends Document {
  shopName: string;
  phone: string;
  email?: string;
  address: string;
  gstin?: string;
  defaultMonthlyInterestRate: number;
  defaultInterestMode: "yearly_compound" | "simple";
  timezone: string;
  currency: string;
  updatedAt: Date;
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    shopName: { type: String, default: "SIDHESHWAR JEWELLERS" },
    phone: { type: String, default: "+91 8329465301" },
    email: { type: String, default: "contact@sidheshwarjewellers.com" },
    address: { type: String, default: "Main Market, Sarafa Bazaar" },
    gstin: { type: String },
    defaultMonthlyInterestRate: { type: Number, default: 2.0 },
    defaultInterestMode: { type: String, enum: ["yearly_compound", "simple"], default: "yearly_compound" },
    timezone: { type: String, default: "Asia/Kolkata" },
    currency: { type: String, default: "INR" },
  },
  {
    timestamps: true,
  }
);

export const AppSettings: Model<IAppSettings> =
  mongoose.models.AppSettings || mongoose.model<IAppSettings>("AppSettings", AppSettingsSchema);

export interface IMetalRate extends Document {
  gold24kRatePaisePerGram: number;
  gold22kRatePaisePerGram: number;
  gold18kRatePaisePerGram: number;
  silverFineRatePaisePerGram: number;
  effectiveDate: Date;
  updatedBy?: Types.ObjectId;
}

const MetalRateSchema = new Schema<IMetalRate>(
  {
    gold24kRatePaisePerGram: { type: Number, required: true },
    gold22kRatePaisePerGram: { type: Number, required: true },
    gold18kRatePaisePerGram: { type: Number, required: true },
    silverFineRatePaisePerGram: { type: Number, required: true },
    effectiveDate: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

export const MetalRate: Model<IMetalRate> =
  mongoose.models.MetalRate || mongoose.model<IMetalRate>("MetalRate", MetalRateSchema);


export default AppSettings;
