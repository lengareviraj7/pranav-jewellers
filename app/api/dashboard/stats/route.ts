import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import InventoryItem from "@/models/InventoryItem";
import Category from "@/models/Category";
import UsedMetalPurchase from "@/models/UsedMetalPurchase";
import FinanceLoan from "@/models/FinanceLoan";
import Customer from "@/models/Customer";
import InventoryTransaction from "@/models/InventoryTransaction";
import FinancePayment from "@/models/FinancePayment";
import { calculateMortgageInterest, getTodayIST } from "@/lib/mortgage-engine";

export async function GET(req: NextRequest) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const todayIST = getTodayIST();

  try {
    // 1. Gold Stock Aggregates
    const goldItems = await InventoryItem.find({ metalType: "gold", isActive: true }).lean();
    const goldPieces = goldItems.reduce((acc, it) => acc + (it.quantity || 0), 0);
    const goldGrossWeight = goldItems.reduce((acc, it) => acc + (it.grossWeight || 0), 0);
    const goldNetWeight = goldItems.reduce((acc, it) => acc + (it.netWeight || 0), 0);
    const goldCategoryCount = await Category.countDocuments({ metalType: "gold", isActive: true });

    // 2. Silver Stock Aggregates
    const silverItems = await InventoryItem.find({ metalType: "silver", isActive: true }).lean();
    const silverPieces = silverItems.reduce((acc, it) => acc + (it.quantity || 0), 0);
    const silverGrossWeight = silverItems.reduce((acc, it) => acc + (it.grossWeight || 0), 0);
    const silverNetWeight = silverItems.reduce((acc, it) => acc + (it.netWeight || 0), 0);
    const silverCategoryCount = await Category.countDocuments({ metalType: "silver", isActive: true });

    // 3. Used Metal Purchases Aggregates
    const usedPurchases = await UsedMetalPurchase.find().lean();
    let usedGoldWeight = 0;
    let usedSilverWeight = 0;
    let usedTotalCostPaise = 0;

    for (const p of usedPurchases) {
      if (p.metalType === "gold") usedGoldWeight += p.netWeight || 0;
      if (p.metalType === "silver") usedSilverWeight += p.netWeight || 0;
      usedTotalCostPaise += p.finalAgreedCostPaise || 0;
    }

    // 4. Gold Finance Aggregates
    const activeLoans = await FinanceLoan.find({
      status: { $in: ["active", "partially_paid", "overdue"] },
    }).lean();

    const activeClientsCount = await Customer.countDocuments({ isActive: true });
    let totalOriginalPrincipalPaise = 0;
    let totalOutstandingPrincipalPaise = 0;
    let totalAccruedInterestPaise = 0;
    let overdueCount = 0;

    for (const loan of activeLoans) {
      totalOriginalPrincipalPaise += loan.originalPrincipalPaise || 0;
      const currentPrincipal = loan.currentOutstandingPrincipalPaise ?? loan.originalPrincipalPaise;
      totalOutstandingPrincipalPaise += currentPrincipal;

      // Calculate accrued interest as of today
      try {
        const calc = calculateMortgageInterest({
          mortgageDate: loan.mortgageDate,
          principalRupees: currentPrincipal / 100,
          asOfDate: todayIST,
          monthlyRate: loan.monthlyRate,
          interestMode: loan.interestMode,
        });
        totalAccruedInterestPaise += calc.interestPaise;

        if (loan.dueDate && loan.dueDate < todayIST) {
          overdueCount++;
        }
      } catch (err) {
        // Fallback to loan saved fields if any error
        totalAccruedInterestPaise += loan.accruedInterestPaise || 0;
      }
    }

    const totalOutstandingDuePaise = totalOutstandingPrincipalPaise + totalAccruedInterestPaise;

    // 5. Recent Activity Feed (Combine stock transactions, used purchases, and finance payments)
    const recentStockTxns = await InventoryTransaction.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .populate("itemId", "name sku")
      .lean();

    const recentUsedPurchases = await UsedMetalPurchase.find()
      .sort({ date: -1 })
      .limit(5)
      .lean();

    const recentPayments = await FinancePayment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("customerId", "fullName mobileNumber")
      .populate("loanId", "loanNumber")
      .lean();

    const recentActivities = [
      ...recentStockTxns.map((tx: any) => ({
        id: tx._id.toString(),
        type: "inventory",
        metalType: tx.metalType,
        title: `Stock ${tx.transactionType.replace("_", " ").toUpperCase()}: ${tx.itemId?.name || "Item"}`,
        subtitle: `${tx.quantityChange > 0 ? "+" : ""}${tx.quantityChange} pcs | Net: ${tx.netWeightChange.toFixed(3)}g | ${tx.reason}`,
        date: tx.timestamp,
      })),
      ...recentUsedPurchases.map((up: any) => ({
        id: up._id.toString(),
        type: "used_purchase",
        metalType: up.metalType,
        title: `Old ${up.metalType.toUpperCase()} Purchased (${up.transactionNumber})`,
        subtitle: `Seller: ${up.sellerName} | Net: ${up.netWeight.toFixed(3)}g | ₹${(up.finalAgreedCostPaise / 100).toLocaleString("en-IN")}`,
        date: up.date || up.createdAt,
      })),
      ...recentPayments.map((pm: any) => ({
        id: pm._id.toString(),
        type: "finance_payment",
        metalType: "gold",
        title: `Loan Payment: ${pm.loanId?.loanNumber || "Loan"}`,
        subtitle: `Client: ${pm.customerId?.fullName || "Client"} | Received: ₹${(pm.totalAmountPaise / 100).toLocaleString("en-IN")} (${pm.paymentMethod.toUpperCase()})`,
        date: pm.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    return NextResponse.json({
      success: true,
      stats: {
        gold: {
          pieces: goldPieces,
          grossWeight: Number(goldGrossWeight.toFixed(3)),
          netWeight: Number(goldNetWeight.toFixed(3)),
          categoryCount: goldCategoryCount,
        },
        silver: {
          pieces: silverPieces,
          grossWeight: Number(silverGrossWeight.toFixed(3)),
          netWeight: Number(silverNetWeight.toFixed(3)),
          categoryCount: silverCategoryCount,
        },
        usedMetal: {
          totalCount: usedPurchases.length,
          goldNetWeight: Number(usedGoldWeight.toFixed(3)),
          silverNetWeight: Number(usedSilverWeight.toFixed(3)),
          totalCostRupees: usedTotalCostPaise / 100,
        },
        finance: {
          activeClients: activeClientsCount,
          activeLoansCount: activeLoans.length,
          originalPrincipalRupees: totalOriginalPrincipalPaise / 100,
          outstandingPrincipalRupees: totalOutstandingPrincipalPaise / 100,
          accruedInterestRupees: totalAccruedInterestPaise / 100,
          totalDueRupees: totalOutstandingDuePaise / 100,
          overdueCount,
        },
        recentActivities,
      },
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
