import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStocktakeSession extends Document {
  sessionCode: string; // ST-2026-11-001
  month: number; // 1 - 12
  year: number; // e.g. 2026
  metalType: "all" | "gold" | "silver";
  status: "draft" | "counting" | "under_review" | "finalized" | "reopened";
  snapshotTimestamp: Date;
  finalizedAt?: Date;
  finalizedBy?: string;
  reopenedAt?: Date;
  reopenedBy?: string;
  notes?: string;
  metrics: {
    totalExpectedItems: number;
    totalExpectedGrossWeight: number;
    totalExpectedNetWeight: number;
    totalCountedItems: number;
    totalMatchedItems: number;
    totalMissingItems: number;
    totalExcessItems: number;
    totalWeightMismatchItems: number;
    totalUncountedItems: number;
    netGrossWeightDiff: number;
    netNetWeightDiff: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StocktakeSessionSchema = new Schema<IStocktakeSession>(
  {
    sessionCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2000 },
    metalType: { type: String, enum: ["all", "gold", "silver"], default: "all" },
    status: {
      type: String,
      enum: ["draft", "counting", "under_review", "finalized", "reopened"],
      default: "counting",
    },
    snapshotTimestamp: { type: Date, default: Date.now },
    finalizedAt: { type: Date },
    finalizedBy: { type: String },
    reopenedAt: { type: Date },
    reopenedBy: { type: String },
    notes: { type: String, trim: true },
    metrics: {
      totalExpectedItems: { type: Number, default: 0 },
      totalExpectedGrossWeight: { type: Number, default: 0 },
      totalExpectedNetWeight: { type: Number, default: 0 },
      totalCountedItems: { type: Number, default: 0 },
      totalMatchedItems: { type: Number, default: 0 },
      totalMissingItems: { type: Number, default: 0 },
      totalExcessItems: { type: Number, default: 0 },
      totalWeightMismatchItems: { type: Number, default: 0 },
      totalUncountedItems: { type: Number, default: 0 },
      netGrossWeightDiff: { type: Number, default: 0 },
      netNetWeightDiff: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

StocktakeSessionSchema.index({ year: -1, month: -1, metalType: 1 });
StocktakeSessionSchema.index({ status: 1 });

export const StocktakeSession: Model<IStocktakeSession> =
  mongoose.models.StocktakeSession ||
  mongoose.model<IStocktakeSession>("StocktakeSession", StocktakeSessionSchema);

export default StocktakeSession;
