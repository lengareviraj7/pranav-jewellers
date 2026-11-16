import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  module: "gold_inventory" | "silver_inventory" | "used_metal" | "finance" | "auth" | "settings";
  description: string;
  details?: Record<string, any>;
  performedBy?: Types.ObjectId;
  performedByName?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, trim: true },
    module: {
      type: String,
      enum: ["gold_inventory", "silver_inventory", "used_metal", "finance", "auth", "settings"],
      required: true,
    },
    description: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    performedByName: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ module: 1, timestamp: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
export default AuditLog;
