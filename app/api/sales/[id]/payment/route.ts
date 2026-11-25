import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import SaleRecord from "@/models/SaleRecord";
import CashTransaction from "@/models/CashTransaction";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { id } = params;

    const sale = await SaleRecord.findById(id).lean();
    if (!sale) {
      return NextResponse.json({ error: "Sale record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, sale });
  } catch (error: any) {
    console.error("GET /api/sales/[id]/payment error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { id } = params;
    const body = await req.json();

    const { amountRupees, amountPaise: rawPaise, paymentMode, notes, nextDueDate } = body;
    const amount = amountRupees !== undefined && amountRupees !== ""
      ? parseFloat(amountRupees)
      : rawPaise !== undefined ? parseFloat(rawPaise) / 100 : 0;

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
    }

    const sale = await SaleRecord.findById(id);
    if (!sale) {
      return NextResponse.json({ error: "Sale record not found" }, { status: 404 });
    }

    const amountPaise = Math.round(amount * 100);
    if (amountPaise > sale.balanceDuePaise) {
      return NextResponse.json(
        {
          error: `Payment amount (₹${amount.toLocaleString("en-IN")}) exceeds remaining balance of ₹${(sale.balanceDuePaise / 100).toLocaleString("en-IN")}.`,
        },
        { status: 400 }
      );
    }

    // Record the installment in the payments array
    sale.payments.push({
      amountPaise,
      paymentMode: paymentMode === "online" ? "online" : "cash",
      date: new Date(),
      notes: notes || "Udhari installment payment",
    });

    sale.paidAmountPaise += amountPaise;
    sale.balanceDuePaise -= amountPaise;

    if (sale.balanceDuePaise === 0) {
      sale.paymentStatus = "paid";
    } else {
      sale.paymentStatus = "partial";
    }

    // Update next promised due date if partial balance remains
    if (nextDueDate && sale.balanceDuePaise > 0) {
      sale.dueDate = new Date(nextDueDate);
    }

    await sale.save();

    // Auto-record in Cash Book if cash payment
    if (paymentMode === "cash" || !paymentMode) {
      await CashTransaction.create({
        transactionType: "credit",
        amountPaise,
        category: "udhari_recovery",
        purpose: `Udhari Collection: ${sale.customer.name} [${sale.saleNumber}]`,
        referenceId: sale.saleNumber,
        performedBy: sessionUser.userId,
        date: new Date(),
        notes: notes || `Installment recovery towards ${sale.itemName}`,
      });
    }

    // Format WhatsApp receipt URL
    let cleanPhone = sale.customer.phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const paidRs = (amountPaise / 100).toLocaleString("en-IN");
    const newBalRs = (sale.balanceDuePaise / 100).toLocaleString("en-IN");
    const modeLabel = paymentMode === "online" ? "Online / UPI" : "Cash (Counter)";
    const dueDateStr = sale.dueDate && sale.balanceDuePaise > 0
      ? new Date(sale.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "";

    const waText =
      sale.balanceDuePaise > 0
        ? `Namaste ${sale.customer.name} ji! 🙏\n\nWe have received your installment payment of *₹${paidRs}* (${modeLabel}) at *SIDHESHWAR JEWELLERS*.\n\n✨ *Updated Account Summary:*\n- Item: ${sale.itemName} (${sale.saleNumber})\n- Amount Paid Today: ₹${paidRs}\n- *Remaining Balance Due: ₹${newBalRs}*${dueDateStr ? `\n- *Next Promise Due Date: ${dueDateStr}*` : ""}\n\nThank you for your timely payment! For any questions, please contact us at +91 98765 43210.\n\nHave a blessed day! 🌟`
        : `Namaste ${sale.customer.name} ji! 🙏\n\nWe have received your final payment of *₹${paidRs}* (${modeLabel}) at *SIDHESHWAR JEWELLERS*.\n\n✨ *Congratulations!* Your balance for ${sale.itemName} (${sale.saleNumber}) is *FULLY CLEARED (₹0 remaining)* ✅.\n\nThank you for your valuable patronage and trust in Sidheshwar Jewellers!\n\nHave a blessed day! 🌟`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

    return NextResponse.json({
      success: true,
      sale,
      whatsappUrl,
      whatsappText: waText,
    });
  } catch (error: any) {
    console.error("POST /api/sales/[id]/payment error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
