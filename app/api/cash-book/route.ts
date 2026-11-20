import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import CashTransaction from "@/models/CashTransaction";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const transactionType = searchParams.get("type"); // "credit" | "debit"
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const dateRange = searchParams.get("range"); // "today", "yesterday", "week", "month", "all"

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const query: any = {};

    if (transactionType && (transactionType === "credit" || transactionType === "debit")) {
      query.transactionType = transactionType;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { purpose: { $regex: search, $options: "i" } },
        { referenceId: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    if (dateRange === "today") {
      query.date = { $gte: startOfToday, $lte: endOfToday };
    } else if (dateRange === "yesterday") {
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      const endOfYesterday = new Date(startOfToday.getTime() - 1);
      query.date = { $gte: startOfYesterday, $lte: endOfYesterday };
    } else if (dateRange === "week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query.date = { $gte: oneWeekAgo };
    } else if (dateRange === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.date = { $gte: startOfMonth };
    }

    const transactions = await CashTransaction.find(query).sort({ date: -1, createdAt: -1 });

    // Aggregate lifetime cash in hand & today's tally
    const allTx = await CashTransaction.find({});
    let totalCreditsPaise = 0;
    let totalDebitsPaise = 0;
    let todayCreditsPaise = 0;
    let todayDebitsPaise = 0;

    for (const tx of allTx) {
      const txDate = new Date(tx.date);
      const isToday = txDate >= startOfToday && txDate <= endOfToday;

      if (tx.transactionType === "credit") {
        totalCreditsPaise += tx.amountPaise || 0;
        if (isToday) todayCreditsPaise += tx.amountPaise || 0;
      } else {
        totalDebitsPaise += tx.amountPaise || 0;
        if (isToday) todayDebitsPaise += tx.amountPaise || 0;
      }
    }

    const totalCashInHandRupees = (totalCreditsPaise - totalDebitsPaise) / 100;

    return NextResponse.json({
      success: true,
      transactions,
      metrics: {
        totalCashInHandRupees,
        todayCreditsRupees: todayCreditsPaise / 100,
        todayDebitsRupees: todayDebitsPaise / 100,
        netTodayRupees: (todayCreditsPaise - todayDebitsPaise) / 100,
        totalTransactionsCount: allTx.length,
      },
    });
  } catch (error: any) {
    console.error("GET /api/cash-book error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await authenticateRequest(req);
    if (!sessionUser) return unauthorizedResponse();

    await connectToDatabase();
    const body = await req.json();

    const { transactionType, amountRupees, category, purpose, notes } = body;

    if (!transactionType || !["credit", "debit"].includes(transactionType)) {
      return NextResponse.json({ error: "Valid transaction type (credit or debit) is required" }, { status: 400 });
    }

    const amount = parseFloat(amountRupees);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valid amount in Rupees is required" }, { status: 400 });
    }

    if (!purpose || !purpose.trim()) {
      return NextResponse.json({ error: "Purpose / Description is required" }, { status: 400 });
    }

    const tx = await CashTransaction.create({
      transactionType,
      amountPaise: Math.round(amount * 100),
      category: category || (transactionType === "credit" ? "other_income" : "shop_expense"),
      purpose: purpose.trim(),
      notes: notes ? notes.trim() : undefined,
      performedBy: sessionUser.userId,
      date: new Date(),
    });

    return NextResponse.json({
      success: true,
      transaction: tx,
    });
  } catch (error: any) {
    console.error("POST /api/cash-book error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
