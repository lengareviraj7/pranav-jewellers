import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import UdhariReminder from "@/models/UdhariReminder";
import SaleRecord from "@/models/SaleRecord";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { id } = params;

    const reminder = await UdhariReminder.findById(id);
    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    // Refresh balance from original sale
    const sale = await SaleRecord.findById(reminder.saleId);
    if (!sale || sale.balanceDuePaise === 0) {
      reminder.status = "cancelled";
      reminder.errorMessage = "Sale is already fully settled";
      await reminder.save();
      return NextResponse.json({
        success: false,
        error: "Cannot send reminder: Sale invoice is already fully settled.",
        reminder,
      });
    }

    // Update reminder as sent
    reminder.status = "sent";
    reminder.sentAt = new Date();
    reminder.attemptCount = (reminder.attemptCount || 0) + 1;
    reminder.lastAttemptAt = new Date();
    await reminder.save();

    return NextResponse.json({
      success: true,
      message: "Reminder dispatched / marked sent successfully",
      reminder,
      whatsappUrl: reminder.whatsappUrl,
    });
  } catch (error: any) {
    console.error("POST /api/sales/reminders/[id]/send error:", error);
    return NextResponse.json({ error: error.message || "Failed to process reminder send" }, { status: 500 });
  }
}
