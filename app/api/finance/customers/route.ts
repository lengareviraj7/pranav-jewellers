import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import Customer from "@/models/Customer";
import FinanceLoan from "@/models/FinanceLoan";
import AuditLog from "@/models/AuditLog";
import { calculateMortgageInterest, getTodayIST } from "@/lib/mortgage-engine";

export async function GET(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const filter: any = { isActive: true };
  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { fullName: { $regex: q, $options: "i" } },
      { mobileNumber: { $regex: q, $options: "i" } },
      { customerId: { $regex: q, $options: "i" } },
    ];
  }

  try {
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
    const todayIST = getTodayIST();

    // Attach loan aggregates per customer
    const loans = await FinanceLoan.find({
      status: { $in: ["active", "partially_paid", "overdue"] },
    }).lean();

    const customerSummaryMap = new Map();
    for (const loan of loans) {
      const cId = loan.customerId.toString();
      const current = customerSummaryMap.get(cId) || {
        activeLoansCount: 0,
        totalOutstandingPrincipalPaise: 0,
        totalAccruedInterestPaise: 0,
        totalDuePaise: 0,
      };

      current.activeLoansCount++;
      const currentPrincipal = loan.currentOutstandingPrincipalPaise ?? loan.originalPrincipalPaise;
      current.totalOutstandingPrincipalPaise += currentPrincipal;

      try {
        const calc = calculateMortgageInterest({
          mortgageDate: loan.mortgageDate,
          principalRupees: currentPrincipal / 100,
          asOfDate: todayIST,
          monthlyRate: loan.monthlyRate,
          interestMode: loan.interestMode,
        });
        const totalInterestPaidRupees = (loan.totalInterestPaidPaise || 0) / 100;
        const unpaidInterestRupees = Math.max(0, Math.round(calc.interestRupees - totalInterestPaidRupees));
        current.totalAccruedInterestPaise += Math.round(unpaidInterestRupees * 100);
      } catch {
        const totalInterestPaidRupees = (loan.totalInterestPaidPaise || 0) / 100;
        const unpaidInterestRupees = Math.max(0, Math.round(((loan.accruedInterestPaise || 0) / 100) - totalInterestPaidRupees));
        current.totalAccruedInterestPaise += Math.round(unpaidInterestRupees * 100);
      }

      current.totalDuePaise = current.totalOutstandingPrincipalPaise + current.totalAccruedInterestPaise;
      customerSummaryMap.set(cId, current);
    }

    const formatted = customers.map((c: any) => {
      const summary = customerSummaryMap.get(c._id.toString()) || {
        activeLoansCount: 0,
        totalOutstandingPrincipalPaise: 0,
        totalAccruedInterestPaise: 0,
        totalDuePaise: 0,
      };

      return {
        ...c,
        id: c._id.toString(),
        activeLoansCount: summary.activeLoansCount,
        totalOutstandingPrincipalRupees: summary.totalOutstandingPrincipalPaise / 100,
        totalAccruedInterestRupees: summary.totalAccruedInterestPaise / 100,
        totalDueRupees: summary.totalDuePaise / 100,
      };
    });

    return NextResponse.json({ success: true, customers: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  try {
    const {
      fullName,
      mobileNumber,
      secondaryPhone,
      address,
      identificationType = "aadhar",
      identificationNumber,
      notes,
    } = await req.json();

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ success: false, error: "Customer full name is required" }, { status: 400 });
    }
    if (!mobileNumber || !mobileNumber.trim()) {
      return NextResponse.json({ success: false, error: "Mobile number is required" }, { status: 400 });
    }

    const cleanPhone = mobileNumber.replace(/\D/g, "");
    const last10 = cleanPhone.slice(-10);

    // Prevent duplicate customer profiles by checking last 10 digits or exact name
    const existingCust = await Customer.findOne({
      $or: [
        { mobileNumber: { $regex: last10 + "$" } },
        { mobileNumber: mobileNumber.trim() },
        { fullName: { $regex: `^${fullName.trim()}$`, $options: "i" } },
      ],
      isActive: true,
    });

    if (existingCust) {
      if (address?.trim() && !existingCust.address) existingCust.address = address.trim();
      if (fullName?.trim() && existingCust.fullName !== fullName.trim()) existingCust.fullName = fullName.trim();
      await existingCust.save();
      return NextResponse.json({ success: true, customer: existingCust, alreadyExisted: true });
    }

    const count = await Customer.countDocuments();
    const customerId = `SJ-CUST-${(count + 1).toString().padStart(4, "0")}`;

    const customer = await Customer.create({
      customerId,
      fullName: fullName.trim(),
      mobileNumber: last10 || mobileNumber.trim(),
      secondaryPhone: secondaryPhone?.trim(),
      address: address?.trim(),
      identificationType,
      identificationNumber: identificationNumber?.trim(),
      notes: notes?.trim(),
      isActive: true,
    });

    await AuditLog.create({
      action: "CUSTOMER_CREATED",
      module: "finance",
      description: `Registered finance client: ${customer.fullName} (${customer.customerId}, ${customer.mobileNumber})`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
