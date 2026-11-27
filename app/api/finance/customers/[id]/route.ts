import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import Customer from "@/models/Customer";
import FinanceLoan from "@/models/FinanceLoan";
import FinancePayment from "@/models/FinancePayment";
import { calculateMortgageInterest, getTodayIST } from "@/lib/mortgage-engine";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { id } = params;

  try {
    const customer = await Customer.findById(id).lean();
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const todayIST = getTodayIST();
    const rawLoans = await FinanceLoan.find({ customerId: id }).sort({ createdAt: -1 }).lean();

    let totalOriginalPrincipalPaise = 0;
    let totalOutstandingPrincipalPaise = 0;
    let totalAccruedInterestPaise = 0;
    let totalInterestPaidPaise = 0;
    let totalPrincipalPaidPaise = 0;

    const enrichedLoans = rawLoans.map((loan: any) => {
      totalOriginalPrincipalPaise += loan.originalPrincipalPaise || 0;
      totalInterestPaidPaise += loan.totalInterestPaidPaise || 0;
      totalPrincipalPaidPaise += loan.totalPrincipalPaidPaise || 0;

      const currentPrincipal = loan.currentOutstandingPrincipalPaise ?? loan.originalPrincipalPaise;
      let accruedInterestRupees = 0;
      let totalDueRupees = currentPrincipal / 100;
      let calcEngineDetails: any = null;

      if (loan.status !== "closed") {
        totalOutstandingPrincipalPaise += currentPrincipal;
        try {
          const calc = calculateMortgageInterest({
            mortgageDate: loan.mortgageDate,
            principalRupees: currentPrincipal / 100,
            asOfDate: todayIST,
            monthlyRate: loan.monthlyRate,
            interestMode: loan.interestMode,
          });
          const totalInterestPaidRupees = (loan.totalInterestPaidPaise || 0) / 100;
          accruedInterestRupees = Math.max(0, Math.round(calc.interestRupees - totalInterestPaidRupees));
          totalDueRupees = (currentPrincipal / 100) + accruedInterestRupees;
          calcEngineDetails = calc;
          totalAccruedInterestPaise += Math.round(accruedInterestRupees * 100);
        } catch {
          const totalInterestPaidRupees = (loan.totalInterestPaidPaise || 0) / 100;
          accruedInterestRupees = Math.max(0, ((loan.accruedInterestPaise || 0) / 100) - totalInterestPaidRupees);
          totalDueRupees = (currentPrincipal / 100) + accruedInterestRupees;
          totalAccruedInterestPaise += Math.round(accruedInterestRupees * 100);
        }
      }

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
      };
    });

    const activeLoans = enrichedLoans.filter((l) => l.status !== "closed");
    const closedLoans = enrichedLoans.filter((l) => l.status === "closed");

    const payments = await FinancePayment.find({ customerId: id })
      .populate("loanId", "loanNumber")
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

    const totalPaidRupees = (totalInterestPaidPaise + totalPrincipalPaidPaise) / 100;
    const totalOutstandingDueRupees = (totalOutstandingPrincipalPaise + totalAccruedInterestPaise) / 100;

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        id: customer._id.toString(),
      },
      summary: {
        activeLoansCount: activeLoans.length,
        closedLoansCount: closedLoans.length,
        totalOriginalPrincipalRupees: totalOriginalPrincipalPaise / 100,
        totalOutstandingPrincipalRupees: totalOutstandingPrincipalPaise / 100,
        totalAccruedInterestRupees: totalAccruedInterestPaise / 100,
        totalOutstandingDueRupees,
        totalPaidRupees,
      },
      activeLoans,
      closedLoans,
      payments: formattedPayments,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
