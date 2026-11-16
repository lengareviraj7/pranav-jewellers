import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import InventoryItem from "@/models/InventoryItem";
import UsedMetalPurchase from "@/models/UsedMetalPurchase";
import FinanceLoan from "@/models/FinanceLoan";
import FinancePayment from "@/models/FinancePayment";
import { calculateMortgageInterest, getTodayIST } from "@/lib/mortgage-engine";

export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { type } = params;
  const { searchParams } = new URL(req.url);
  const metalType = searchParams.get("metalType");

  let csvContent = "";
  let filename = `sidheshwar_${type}_${Date.now()}.csv`;

  try {
    if (type === "inventory") {
      const filter: any = { isActive: true };
      if (metalType) filter.metalType = metalType;
      const items = await InventoryItem.find(filter).populate("categoryId", "name").sort({ createdAt: -1 }).lean();

      csvContent = "SKU,Metal,Category,Item Name,Purity,Quantity,Gross Weight (g),Stone Weight (g),Net Weight (g),HUID,Supplier,Purchase Date,Purchase Cost (INR)\n";
      for (const it of items) {
        const catName = (it.categoryId as any)?.name || "";
        const cost = (it.purchaseCostPaise || 0) / 100;
        csvContent += `"${it.sku}","${it.metalType}","${catName}","${it.name}","${it.purity}",${it.quantity},${it.grossWeight},${it.stoneWeight},${it.netWeight},"${it.hallmarkUid || ""}","${it.supplierName || ""}","${new Date(it.purchaseDate).toISOString().split("T")[0]}",${cost}\n`;
      }
      filename = `sidheshwar_inventory_${metalType || "all"}_${getTodayIST()}.csv`;
    } else if (type === "used-metal") {
      const filter: any = {};
      if (metalType) filter.metalType = metalType;
      const purchases = await UsedMetalPurchase.find(filter).sort({ date: -1 }).lean();

      csvContent = "Transaction No,Date,Metal,Seller Name,Phone,Item Description,Purity,Gross Weight (g),Deductions (g),Net Weight (g),Rate/g (INR),Agreed Cost (INR),Amount Paid (INR),Balance (INR),Status,Converted To Stock\n";
      for (const p of purchases) {
        csvContent += `"${p.transactionNumber}","${new Date(p.date).toISOString().split("T")[0]}","${p.metalType}","${p.sellerName}","${p.sellerPhone || ""}","${p.itemDescription}","${p.purity}",${p.grossWeight},${p.deductionsWeight},${p.netWeight},${p.ratePerGramPaise / 100},${p.finalAgreedCostPaise / 100},${p.amountPaidPaise / 100},${p.remainingPayablePaise / 100},"${p.paymentStatus}","${p.isConvertedToInventory ? "Yes" : "No"}"\n`;
      }
      filename = `sidheshwar_used_metal_${getTodayIST()}.csv`;
    } else if (type === "finance-loans") {
      const loans = await FinanceLoan.find().populate("customerId", "fullName mobileNumber customerId").sort({ createdAt: -1 }).lean();
      const todayIST = getTodayIST();

      csvContent = "Loan No,Customer ID,Customer Name,Mobile,Mortgage Date,Due Date,Monthly Rate (%),Interest Mode,Original Principal (INR),Outstanding Principal (INR),Accrued Interest (INR),Total Due (INR),Total Paid (INR),Pledged Net Weight (g),Status\n";
      for (const l of loans) {
        const c = l.customerId as any;
        const currentPrincipal = l.currentOutstandingPrincipalPaise ?? l.originalPrincipalPaise;
        let accruedInterest = 0;
        let totalDue = currentPrincipal / 100;

        if (l.status !== "closed") {
          try {
            const calc = calculateMortgageInterest({
              mortgageDate: l.mortgageDate,
              principalRupees: currentPrincipal / 100,
              asOfDate: todayIST,
              monthlyRate: l.monthlyRate,
              interestMode: l.interestMode,
            });
            accruedInterest = calc.interestRupees;
            totalDue = calc.totalDueRupees;
          } catch {
            accruedInterest = (l.accruedInterestPaise || 0) / 100;
            totalDue = (currentPrincipal + (l.accruedInterestPaise || 0)) / 100;
          }
        }

        const totalPaid = ((l.totalPrincipalPaidPaise || 0) + (l.totalInterestPaidPaise || 0)) / 100;

        csvContent += `"${l.loanNumber}","${c?.customerId || ""}","${c?.fullName || ""}","${c?.mobileNumber || ""}","${l.mortgageDate}","${l.dueDate || ""}",${l.monthlyRate},"${l.interestMode}",${l.originalPrincipalPaise / 100},${currentPrincipal / 100},${accruedInterest},${totalDue},${totalPaid},${l.totalPledgedNetWeight || 0},"${l.status}"\n`;
      }
      filename = `sidheshwar_finance_loans_${getTodayIST()}.csv`;
    } else if (type === "finance-payments") {
      const payments = await FinancePayment.find()
        .populate("customerId", "fullName mobileNumber customerId")
        .populate("loanId", "loanNumber")
        .sort({ paymentDate: -1, createdAt: -1 })
        .lean();

      csvContent = "Receipt No,Loan No,Customer ID,Customer Name,Mobile,Payment Date,Total Amount (INR),Principal Applied (INR),Interest Applied (INR),Remaining Principal (INR),Payment Method,Transaction Ref,Notes\n";
      for (const p of payments) {
        const c = p.customerId as any;
        const l = p.loanId as any;
        csvContent += `"${p.receiptNumber}","${l?.loanNumber || ""}","${c?.customerId || ""}","${c?.fullName || ""}","${c?.mobileNumber || ""}","${p.paymentDate}",${p.totalAmountPaise / 100},${p.principalAppliedPaise / 100},${p.interestAppliedPaise / 100},${p.newOutstandingPrincipalPaise / 100},"${p.paymentMethod}","${p.referenceTransactionId || ""}","${p.notes || ""}"\n`;
      }
      filename = `sidheshwar_finance_payments_${getTodayIST()}.csv`;
    } else {
      return NextResponse.json({ success: false, error: "Invalid export type" }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
