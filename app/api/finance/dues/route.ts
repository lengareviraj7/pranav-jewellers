import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import FinanceLoan from "@/models/FinanceLoan";
import Customer from "@/models/Customer";
import { calculateMortgageInterest, getTodayIST } from "@/lib/mortgage-engine";

export async function GET(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const todayIST = getTodayIST();

  try {
    const activeLoans = await FinanceLoan.find({
      status: { $in: ["active", "partially_paid", "overdue"] },
    })
      .populate("customerId", "fullName mobileNumber customerId address")
      .sort({ mortgageDate: 1 })
      .lean();

    let grandTotalPrincipalPaise = 0;
    let grandTotalInterestPaise = 0;
    let grandTotalDuePaise = 0;
    let grandTotalPaidPaise = 0;

    const dues = activeLoans.map((loan: any) => {
      const currentPrincipal = loan.currentOutstandingPrincipalPaise ?? loan.originalPrincipalPaise;
      let accruedInterestRupees = 0;
      let totalDueRupees = currentPrincipal / 100;
      let elapsedDesc = "";
      let chargeableMonths = 0;

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
        elapsedDesc = calc.elapsedDescription;
        chargeableMonths = calc.chargeableMonths;
        grandTotalInterestPaise += calc.interestPaise;
      } catch {
        accruedInterestRupees = (loan.accruedInterestPaise || 0) / 100;
        totalDueRupees = (currentPrincipal + (loan.accruedInterestPaise || 0)) / 100;
        grandTotalInterestPaise += loan.accruedInterestPaise || 0;
      }

      grandTotalPrincipalPaise += currentPrincipal;
      grandTotalPaidPaise += (loan.totalPrincipalPaidPaise || 0) + (loan.totalInterestPaidPaise || 0);

      const isOverdue = Boolean(loan.dueDate && loan.dueDate < todayIST);

      return {
        id: loan._id.toString(),
        loanNumber: loan.loanNumber,
        customer: {
          id: loan.customerId?._id?.toString(),
          customerId: loan.customerId?.customerId,
          fullName: loan.customerId?.fullName || "Unknown",
          mobileNumber: loan.customerId?.mobileNumber,
          address: loan.customerId?.address,
        },
        mortgageDate: loan.mortgageDate,
        dueDate: loan.dueDate,
        isOverdue,
        monthlyRate: loan.monthlyRate,
        interestMode: loan.interestMode,
        originalPrincipalRupees: loan.originalPrincipalPaise / 100,
        outstandingPrincipalRupees: currentPrincipal / 100,
        accruedInterestRupees,
        totalDueRupees,
        totalPaidRupees: ((loan.totalPrincipalPaidPaise || 0) + (loan.totalInterestPaidPaise || 0)) / 100,
        elapsedDescription: elapsedDesc,
        chargeableMonths,
        pledgedItemsCount: (loan.pledgedItems || []).length,
        totalPledgedNetWeight: loan.totalPledgedNetWeight || 0,
        status: isOverdue ? "overdue" : loan.status,
      };
    });

    grandTotalDuePaise = grandTotalPrincipalPaise + grandTotalInterestPaise;

    return NextResponse.json({
      success: true,
      asOfDate: todayIST,
      summary: {
        totalAccounts: dues.length,
        grandTotalOutstandingPrincipalRupees: grandTotalPrincipalPaise / 100,
        grandTotalAccruedInterestRupees: grandTotalInterestPaise / 100,
        grandTotalDueRupees: grandTotalDuePaise / 100,
        grandTotalPaidRupees: grandTotalPaidPaise / 100,
      },
      dues,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
