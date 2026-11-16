import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import FinanceLoan from "@/models/FinanceLoan";
import FinancePayment from "@/models/FinancePayment";
import { calculateMortgageInterest, getTodayIST } from "@/lib/mortgage-engine";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { id } = params;

  try {
    const loan = await FinanceLoan.findById(id)
      .populate("customerId", "fullName mobileNumber customerId address secondaryPhone")
      .lean();

    if (!loan) {
      return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    }

    const todayIST = getTodayIST();
    const currentPrincipal = loan.currentOutstandingPrincipalPaise ?? loan.originalPrincipalPaise;

    let calcResult: any = null;
    let accruedInterestRupees = 0;
    let totalDueRupees = currentPrincipal / 100;

    if (loan.status !== "closed") {
      try {
        calcResult = calculateMortgageInterest({
          mortgageDate: loan.mortgageDate,
          principalRupees: currentPrincipal / 100,
          asOfDate: todayIST,
          monthlyRate: loan.monthlyRate,
          interestMode: loan.interestMode,
        });
        accruedInterestRupees = calcResult.interestRupees;
        totalDueRupees = calcResult.totalDueRupees;
      } catch {
        accruedInterestRupees = (loan.accruedInterestPaise || 0) / 100;
        totalDueRupees = (currentPrincipal + (loan.accruedInterestPaise || 0)) / 100;
      }
    }

    const payments = await FinancePayment.find({ loanId: id })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    const formattedPayments = payments.map((p: any) => ({
      ...p,
      id: p._id.toString(),
      totalAmountRupees: p.totalAmountPaise / 100,
      principalAppliedRupees: p.principalAppliedPaise / 100,
      interestAppliedRupees: p.interestAppliedPaise / 100,
      previousOutstandingPrincipalRupees: p.previousOutstandingPrincipalPaise / 100,
      newOutstandingPrincipalRupees: p.newOutstandingPrincipalPaise / 100,
    }));

    return NextResponse.json({
      success: true,
      loan: {
        ...loan,
        id: loan._id.toString(),
        originalPrincipalRupees: (loan.originalPrincipalPaise || 0) / 100,
        currentOutstandingPrincipalRupees: currentPrincipal / 100,
        accruedInterestRupees,
        totalDueRupees,
        totalInterestPaidRupees: (loan.totalInterestPaidPaise || 0) / 100,
        totalPrincipalPaidRupees: (loan.totalPrincipalPaidPaise || 0) / 100,
      },
      calcResult,
      payments: formattedPayments,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
