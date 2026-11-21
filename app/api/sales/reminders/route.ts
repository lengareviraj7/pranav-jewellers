import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import UdhariReminder from "@/models/UdhariReminder";
import SaleRecord from "@/models/SaleRecord";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const reminderType = searchParams.get("reminderType");
    const search = searchParams.get("search");

    const query: any = {};
    if (status && ["pending", "sent", "cancelled", "failed"].includes(status)) {
      query.status = status;
    }
    if (reminderType && ["3_days", "due_date", "overdue"].includes(reminderType)) {
      query.reminderType = reminderType;
    }
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { saleNumber: { $regex: search, $options: "i" } },
      ];
    }

    const reminders = await UdhariReminder.find(query).sort({ scheduledDate: 1, createdAt: -1 });

    const pendingCount = await UdhariReminder.countDocuments({ status: "pending" });
    const sentCount = await UdhariReminder.countDocuments({ status: "sent" });
    const overdueCount = await UdhariReminder.countDocuments({
      status: "pending",
      scheduledDate: { $lte: new Date() },
    });

    return NextResponse.json({
      success: true,
      reminders,
      metrics: {
        total: reminders.length,
        pendingCount,
        sentCount,
        overdueCount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/sales/reminders error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch reminders" }, { status: 500 });
  }
}

// Auto-generate reminders for all outstanding sales with due dates
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();

    // Query active sales with outstanding Udhari balance and due dates
    const salesWithUdhari = await SaleRecord.find({
      balanceDuePaise: { $gt: 0 },
      dueDate: { $ne: null },
    });

    let generatedCount = 0;
    let cancelledCount = 0;

    for (const sale of salesWithUdhari) {
      const dDate = new Date(sale.dueDate!);
      const stage1Date = new Date(dDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const stage2Date = dDate;
      const stage3Date = new Date(dDate.getTime() + 1 * 24 * 60 * 60 * 1000);

      const balFormatted = `₹${(sale.balanceDuePaise / 100).toLocaleString("en-IN")}`;
      const dueFormatted = dDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const phone = sale.customer.phone.replace(/\D/g, "");

      const reminderConfigs = [
        {
          type: "3_days",
          date: stage1Date,
          msg: `Namaste ${sale.customer.name} ji,\n\nAapko Sidheshwar Jewellers ki taraf se ek vinamra yaad dilayi ja rahi hai.\n\nAapke bill ${sale.saleNumber} ki ${balFormatted} ki shesh rakam ki bhugtan tithi ${dueFormatted} hai.\n\nKripya apni suvidha ke anusaar nirdharit tithi tak bhugtan karne ki kripa karein.\n\nAapke sahyog ke liye dhanyavaad.\n\nSadar,\nSidheshwar Jewellers`,
        },
        {
          type: "due_date",
          date: stage2Date,
          msg: `Namaste ${sale.customer.name} ji,\n\nSidheshwar Jewellers ki taraf se aapko vinamra yaad dilayi ja rahi hai ki aaj ${dueFormatted} ko aapke bill ${sale.saleNumber} ki ${balFormatted} ki bhugtan tithi hai.\n\nKripya apni suvidha anusaar aaj bhugtan karne ki kripa karein.\n\nAgar aapne pahle hi bhugtan kar diya hai, to kripya is sandesh ko nazarandaaz karein.\n\nDhanyavaad,\nSidheshwar Jewellers`,
        },
        {
          type: "overdue",
          date: stage3Date,
          msg: `Namaste ${sale.customer.name} ji,\n\nSidheshwar Jewellers ki taraf se ek vinamra follow-up sandesh hai.\n\nHamare record ke anusaar aapke bill ${sale.saleNumber} ki ${balFormatted} ki rakam abhi baki dikh rahi hai, aur nirdharit bhugtan tithi ${dueFormatted} beet chuki hai.\n\nKripya apni suvidha ke anusaar baki rakam ka bhugtan karne ya humse sampark karne ki kripa karein.\n\nYadi aapne bhugtan kar diya hai, to kripya humein suchit karein taaki hum apna record update kar saken.\n\nDhanyavaad,\nSidheshwar Jewellers`,
        },
      ];

      for (const r of reminderConfigs) {
        const dedupKey = `${sale._id}_${r.type}_${dDate.toISOString().slice(0, 10)}`;
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(r.msg)}`;

        const res = await UdhariReminder.findOneAndUpdate(
          { dedupKey },
          {
            $setOnInsert: {
              saleId: sale._id,
              saleNumber: sale.saleNumber,
              customerName: sale.customer.name,
              customerPhone: phone,
              dueDate: dDate,
              reminderType: r.type,
              scheduledDate: r.date,
              messageBody: r.msg,
              whatsappUrl: waUrl,
              status: "pending",
              dedupKey,
            },
            $set: {
              outstandingPaise: sale.balanceDuePaise,
            },
          },
          { upsert: true, new: true }
        );
        generatedCount++;
      }
    }

    // Cancel pending reminders for fully settled sales
    const paidSales = await SaleRecord.find({ balanceDuePaise: 0 }).select("_id");
    const paidSaleIds = paidSales.map((s) => s._id);
    const cancelRes = await UdhariReminder.updateMany(
      { saleId: { $in: paidSaleIds }, status: "pending" },
      { $set: { status: "cancelled", errorMessage: "Invoice fully settled" } }
    );
    cancelledCount = cancelRes.modifiedCount;

    return NextResponse.json({
      success: true,
      message: `Processed reminders queue: ${generatedCount} checked/scheduled, ${cancelledCount} cancelled due to full settlement.`,
    });
  } catch (error: any) {
    console.error("POST /api/sales/reminders error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate reminders" }, { status: 500 });
  }
}
