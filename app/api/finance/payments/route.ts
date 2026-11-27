import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import FinanceLoan from "@/models/FinanceLoan";
import FinancePayment from "@/models/FinancePayment";
import Customer from "@/models/Customer";
import AuditLog from "@/models/AuditLog";
import { getTodayIST, calculateMortgageInterest } from "@/lib/mortgage-engine";

export async function POST(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  try {
    const body = await req.json();
    const {
      loanId,
      paymentDate = getTodayIST(),
      totalAmountRupees,
      principalAppliedRupees = 0,
      interestAppliedRupees = 0,
      paymentMethod = "cash",
      referenceTransactionId,
      notes,
    } = body;

    if (!loanId) {
      return NextResponse.json({ success: false, error: "Loan ID is required" }, { status: 400 });
    }

    const loan = await FinanceLoan.findById(loanId).populate("customerId");
    if (!loan) {
      return NextResponse.json({ success: false, error: "Loan account not found" }, { status: 404 });
    }

    if (loan.status === "closed") {
      return NextResponse.json(
        { success: false, error: "This loan is already closed and fully settled." },
        { status: 400 }
      );
    }

    const numTotal = Number(totalAmountRupees);
    if (isNaN(numTotal) || numTotal <= 0) {
      return NextResponse.json({ success: false, error: "Total payment amount must be greater than ₹0" }, { status: 400 });
    }

    const currentPrincipalPaise = loan.currentOutstandingPrincipalPaise ?? loan.originalPrincipalPaise;
    const currentPrincipalRupees = currentPrincipalPaise / 100;
    const totalInterestPaidRupees = (loan.totalInterestPaidPaise || 0) / 100;

    // Calculate accrued interest as of paymentDate using Mortgage Engine
    let totalAccruedInterestRupees = 0;
    try {
      const calc = calculateMortgageInterest({
        mortgageDate: loan.mortgageDate,
        principalRupees: currentPrincipalRupees,
        asOfDate: paymentDate || getTodayIST(),
        monthlyRate: loan.monthlyRate || 2,
        interestMode: loan.interestMode || "yearly_compound",
      });
      totalAccruedInterestRupees = calc.interestRupees;
    } catch {
      totalAccruedInterestRupees = (loan.accruedInterestPaise || 0) / 100;
    }

    const unpaidInterestRupees = Math.max(0, totalAccruedInterestRupees - totalInterestPaidRupees);

    // RULE: Return amount first deducts interest (व्याज), then remaining deducts mudal (मुद्दल)
    let autoInterestRupees = 0;
    let autoPrincipalRupees = 0;

    if (numTotal <= unpaidInterestRupees) {
      autoInterestRupees = numTotal;
      autoPrincipalRupees = 0;
    } else {
      autoInterestRupees = unpaidInterestRupees;
      autoPrincipalRupees = Math.min(numTotal - unpaidInterestRupees, currentPrincipalRupees);
    }

    // Determine final split: use client provided values if explicitly supplied, else use auto rule
    const hasExplicitSplit =
      principalAppliedRupees !== undefined &&
      interestAppliedRupees !== undefined &&
      (Number(principalAppliedRupees) > 0 || Number(interestAppliedRupees) > 0);

    const numPrincipal = hasExplicitSplit ? Number(principalAppliedRupees) : autoPrincipalRupees;
    const numInterest = hasExplicitSplit ? Number(interestAppliedRupees) : autoInterestRupees;

    if (isNaN(numPrincipal) || numPrincipal < 0) {
      return NextResponse.json({ success: false, error: "Principal applied cannot be negative" }, { status: 400 });
    }
    if (isNaN(numInterest) || numInterest < 0) {
      return NextResponse.json({ success: false, error: "Interest applied cannot be negative" }, { status: 400 });
    }

    const totalPaise = Math.round(numTotal * 100);
    const principalPaise = Math.round(numPrincipal * 100);
    const interestPaise = Math.round(numInterest * 100);

    if (Math.abs(principalPaise + interestPaise - totalPaise) > 1) {
      return NextResponse.json(
        {
          success: false,
          error: `Principal applied (₹${numPrincipal}) + Interest applied (₹${numInterest}) must exactly equal total amount received (₹${numTotal}).`,
        },
        { status: 400 }
      );
    }

    if (principalPaise > currentPrincipalPaise) {
      return NextResponse.json(
        {
          success: false,
          error: `Principal applied (₹${numPrincipal}) cannot exceed outstanding principal (₹${currentPrincipalPaise / 100}).`,
        },
        { status: 400 }
      );
    }

    const newOutstandingPrincipalPaise = currentPrincipalPaise - principalPaise;

    // Generate receipt number
    const currentYear = new Date().getFullYear();
    const countThisYear = await FinancePayment.countDocuments({
      createdAt: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
      },
    });
    const receiptNumber = `SJ-RCP-${currentYear}-${(countThisYear + 1).toString().padStart(4, "0")}`;

    const payment = await FinancePayment.create({
      receiptNumber,
      loanId: loan._id,
      customerId: loan.customerId._id || loan.customerId,
      paymentDate: paymentDate.trim(),
      totalAmountPaise: totalPaise,
      principalAppliedPaise: principalPaise,
      interestAppliedPaise: interestPaise,
      paymentMethod,
      referenceTransactionId: referenceTransactionId?.trim(),
      previousOutstandingPrincipalPaise: currentPrincipalPaise,
      newOutstandingPrincipalPaise: newOutstandingPrincipalPaise,
      notes: notes?.trim(),
    });

    // Update loan record
    loan.currentOutstandingPrincipalPaise = newOutstandingPrincipalPaise;
    loan.totalInterestPaidPaise = (loan.totalInterestPaidPaise || 0) + interestPaise;
    loan.totalPrincipalPaidPaise = (loan.totalPrincipalPaidPaise || 0) + principalPaise;

    if (newOutstandingPrincipalPaise === 0) {
      loan.status = "closed";
      loan.closedDate = new Date();
      loan.closureNotes = `Settled fully via receipt ${receiptNumber} on ${paymentDate}`;
    } else {
      loan.status = "partially_paid";
    }

    await loan.save();

    const customerDoc: any = loan.customerId;
    const customerName = customerDoc?.fullName || "Client";

    await AuditLog.create({
      action: "PAYMENT_RECORDED",
      module: "finance",
      description: `Payment ${receiptNumber} of ₹${numTotal.toLocaleString("en-IN")} received for loan ${loan.loanNumber} (${customerName}). Principal applied: ₹${numPrincipal}, Interest applied: ₹${numInterest}. Remaining Principal: ₹${newOutstandingPrincipalPaise / 100}`,
      performedBy: sessionUser.userId,
      performedByName: sessionUser.name,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      payment: {
        ...payment.toObject(),
        id: payment._id.toString(),
        totalAmountRupees: totalPaise / 100,
        principalAppliedRupees: principalPaise / 100,
        interestAppliedRupees: interestPaise / 100,
        previousOutstandingPrincipalRupees: currentPrincipalPaise / 100,
        newOutstandingPrincipalRupees: newOutstandingPrincipalPaise / 100,
      },
      loan: {
        id: loan._id.toString(),
        loanNumber: loan.loanNumber,
        status: loan.status,
        newOutstandingPrincipalRupees: newOutstandingPrincipalPaise / 100,
      },
      customer: {
        id: customerDoc?._id?.toString(),
        fullName: customerName,
        mobileNumber: customerDoc?.mobileNumber,
        address: customerDoc?.address,
      },
    });
  } catch (error: any) {
    console.error("Payment error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
