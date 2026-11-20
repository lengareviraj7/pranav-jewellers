import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import FinanceLoan from "@/models/FinanceLoan";
import FinancePayment from "@/models/FinancePayment";
import Customer from "@/models/Customer";
import AuditLog from "@/models/AuditLog";
import { calculateMortgageInterest, getTodayIST } from "@/lib/mortgage-engine";

export async function GET(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const customerId = searchParams.get("customerId");
  const search = searchParams.get("search");

  const filter: any = {};
  if (status && status !== "all") filter.status = status;
  if (customerId) filter.customerId = customerId;

  try {
    let query = FinanceLoan.find(filter).populate("customerId", "fullName mobileNumber customerId address");
    const rawLoans = await query.sort({ createdAt: -1 }).lean();

    const loanIds = rawLoans.map((l: any) => l._id);
    const rawPayments = await FinancePayment.find({ loanId: { $in: loanIds } })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    const todayIST = getTodayIST();

    const enriched = rawLoans.map((loan: any) => {
      const currentPrincipal = loan.currentOutstandingPrincipalPaise ?? loan.originalPrincipalPaise;
      let accruedInterestRupees = 0;
      let totalDueRupees = currentPrincipal / 100;
      let calcEngineDetails: any = null;

      if (loan.status !== "closed") {
        try {
          const calc = calculateMortgageInterest({
            mortgageDate: loan.mortgageDate,
            principalRupees: currentPrincipal / 100,
            asOfDate: todayIST,
            monthlyRate: loan.monthlyRate,
            interestMode: loan.interestMode,
          });
          accruedInterestRupees = calc.interestRupees;
          totalDueRupees = calc.totalDueRupees;
          calcEngineDetails = calc;
        } catch {
          accruedInterestRupees = (loan.accruedInterestPaise || 0) / 100;
          totalDueRupees = (currentPrincipal + (loan.accruedInterestPaise || 0)) / 100;
        }
      }

      const loanPayments = rawPayments
        .filter((p: any) => p.loanId.toString() === loan._id.toString())
        .map((p: any) => ({
          ...p,
          id: p._id.toString(),
          totalAmountRupees: p.totalAmountPaise / 100,
          principalAppliedRupees: p.principalAppliedPaise / 100,
          interestAppliedRupees: p.interestAppliedPaise / 100,
          previousOutstandingPrincipalRupees: p.previousOutstandingPrincipalPaise / 100,
          newOutstandingPrincipalRupees: p.newOutstandingPrincipalPaise / 100,
        }));

      return {
        ...loan,
        id: loan._id.toString(),
        originalPrincipalRupees: (loan.originalPrincipalPaise || 0) / 100,
        currentOutstandingPrincipalRupees: currentPrincipal / 100,
        accruedInterestRupees,
        totalDueRupees,
        totalInterestPaidRupees: (loan.totalInterestPaidPaise || 0) / 100,
        totalPrincipalPaidRupees: (loan.totalPrincipalPaidPaise || 0) / 100,
        calcEngineDetails,
        paymentHistory: loanPayments,
      };
    });

    // If search is provided, filter by loanNumber, customerName or mobile
    let results = enriched;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter((l: any) =>
        l.loanNumber?.toLowerCase().includes(q) ||
        l.customerId?.fullName?.toLowerCase().includes(q) ||
        l.customerId?.mobileNumber?.includes(q)
      );
    }

    return NextResponse.json({ success: true, loans: results });
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
    const {
      customerId,
      mortgageDate,
      principalRupees,
      monthlyRate = 2.0,
      interestMode = "yearly_compound",
      dueDate,
      pledgedItems = [],
      notes,
    } = body;

    if (!customerId) {
      return NextResponse.json({ success: false, error: "Customer selection is required" }, { status: 400 });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const numPrincipal = Number(principalRupees);
    if (isNaN(numPrincipal) || numPrincipal <= 0) {
      return NextResponse.json({ success: false, error: "Principal amount must be greater than ₹0" }, { status: 400 });
    }

    const numRate = Number(monthlyRate);
    if (isNaN(numRate) || numRate <= 0) {
      return NextResponse.json({ success: false, error: "Monthly interest rate must be greater than 0" }, { status: 400 });
    }

    if (!["yearly_compound", "simple"].includes(interestMode)) {
      return NextResponse.json({ success: false, error: "Interest method must be 'yearly_compound' or 'simple'" }, { status: 400 });
    }

    const mDate = (mortgageDate || getTodayIST()).trim();

    // Auto-generate loan number
    const currentYear = new Date().getFullYear();
    const countThisYear = await FinanceLoan.countDocuments({
      createdAt: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
      },
    });
    const loanNumber = `SJ-LN-${currentYear}-${(countThisYear + 1).toString().padStart(4, "0")}`;

    // Process pledged items (strictly stored in this loan record)
    let totalGross = 0;
    let totalNet = 0;
    const cleanPledgedItems = (pledgedItems || []).map((item: any) => {
      const g = Number(item.grossWeight) || 0;
      const n = Number(item.netWeight) || g;
      totalGross += g;
      totalNet += n;
      return {
        description: (item.description || "Gold Ornaments").trim(),
        metalType: item.metalType || "gold",
        purity: (item.purity || "22K").trim(),
        quantity: Math.max(1, Number(item.quantity) || 1),
        grossWeight: Number(g.toFixed(3)),
        netWeight: Number(n.toFixed(3)),
        identificationMark: item.identificationMark?.trim(),
      };
    });

    const principalPaise = Math.round(numPrincipal * 100);

    const loan = await FinanceLoan.create({
      loanNumber,
      customerId,
      mortgageDate: mDate,
      originalPrincipalPaise: principalPaise,
      currentOutstandingPrincipalPaise: principalPaise,
      monthlyRate: numRate,
      interestMode,
      dueDate: dueDate?.trim() || undefined,
      pledgedItems: cleanPledgedItems,
      totalPledgedGrossWeight: Number(totalGross.toFixed(3)),
      totalPledgedNetWeight: Number(totalNet.toFixed(3)),
      totalInterestPaidPaise: 0,
      totalPrincipalPaidPaise: 0,
      accruedInterestPaise: 0,
      totalOutstandingDuePaise: principalPaise,
      status: "active",
      notes: notes?.trim(),
    });

    await AuditLog.create({
      action: "LOAN_CREATED",
      module: "finance",
      description: `Created gold loan ${loan.loanNumber} for ${customer.fullName} - Principal: ₹${numPrincipal.toLocaleString("en-IN")}, Rate: ${numRate}%/mo (${interestMode})`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, loan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
