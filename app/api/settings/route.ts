import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import AppSettings from "@/models/AppSettings";
import { MetalRate } from "@/models/AppSettings";
import AuditLog from "@/models/AuditLog";

export async function GET(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  try {
    let settings: any = await AppSettings.findOne().lean();
    if (!settings) {
      const created = await AppSettings.create({
        shopName: "SIDHESHWAR JEWELLERS",
        phone: "+91 8329465301",
        address: "Sarafa Bazaar, Main Road",
        timezone: "Asia/Kolkata",
        currency: "INR",
      });
      settings = created.toObject();
    }

    const latestRates = await MetalRate.findOne().sort({ effectiveDate: -1 }).lean();
    const auditLogs = await AuditLog.find().sort({ timestamp: -1 }).limit(50).lean();

    return NextResponse.json({
      success: true,
      settings,
      rates: latestRates
        ? {
            gold24kRateRupeesPerGram: latestRates.gold24kRatePaisePerGram / 100,
            gold22kRateRupeesPerGram: latestRates.gold22kRatePaisePerGram / 100,
            gold18kRateRupeesPerGram: latestRates.gold18kRatePaisePerGram / 100,
            silverFineRateRupeesPerGram: latestRates.silverFineRatePaisePerGram / 100,
            effectiveDate: latestRates.effectiveDate,
          }
        : null,
      auditLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "update_rates") {
      const { gold24k, gold22k, gold18k, silverFine } = body;
      const g24 = Number(gold24k) || 0;
      const g22 = Number(gold22k) || 0;
      const g18 = Number(gold18k) || 0;
      const sFine = Number(silverFine) || 0;

      const newRates = await MetalRate.create({
        gold24kRatePaisePerGram: Math.round(g24 * 100),
        gold22kRatePaisePerGram: Math.round(g22 * 100),
        gold18kRatePaisePerGram: Math.round(g18 * 100),
        silverFineRatePaisePerGram: Math.round(sFine * 100),
        effectiveDate: new Date(),
        updatedBy: sessionUser.userId,
      });

      await AuditLog.create({
        action: "RATES_UPDATED",
        module: "settings",
        description: `Updated daily benchmark rates: 24K: ₹${g24}/g, 22K: ₹${g22}/g, Silver: ₹${sFine}/g`,
        performedBy: sessionUser.userId,
        performedByName: sessionUser.name,
        timestamp: new Date(),
      });

      return NextResponse.json({ success: true, message: "Benchmark rates updated", rates: newRates });
    }

    if (action === "update_shop_settings") {
      const { shopName, phone, email, address, defaultMonthlyInterestRate, defaultInterestMode } = body;
      const updated = await AppSettings.findOneAndUpdate(
        {},
        {
          $set: {
            shopName: shopName?.trim(),
            phone: phone?.trim(),
            email: email?.trim(),
            address: address?.trim(),
            defaultMonthlyInterestRate: Number(defaultMonthlyInterestRate) || 2.0,
            defaultInterestMode: defaultInterestMode || "yearly_compound",
            updatedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      await AuditLog.create({
        action: "SETTINGS_UPDATED",
        module: "settings",
        description: `Shop profile settings updated by ${sessionUser.name}`,
        performedBy: sessionUser.userId,
        performedByName: sessionUser.name,
        timestamp: new Date(),
      });

      return NextResponse.json({ success: true, message: "Shop settings updated", settings: updated });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
