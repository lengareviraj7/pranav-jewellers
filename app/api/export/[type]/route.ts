import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api-auth";
import connectToDatabase from "@/lib/mongodb";
import InventoryItem from "@/models/InventoryItem";
import InventoryTransaction from "@/models/InventoryTransaction";
import SaleRecord from "@/models/SaleRecord";
import CashTransaction from "@/models/CashTransaction";
import UsedMetalPurchase from "@/models/UsedMetalPurchase";
import FinanceLoan from "@/models/FinanceLoan";
import FinancePayment from "@/models/FinancePayment";
import StocktakeSession from "@/models/StocktakeSession";
import StocktakeLine from "@/models/StocktakeLine";
import { calculateMortgageInterest, getTodayIST } from "@/lib/mortgage-engine";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  const sessionUser = await authenticateRequest(req);
  if (!sessionUser) return unauthorizedResponse();

  await connectToDatabase();
  const { type } = params;
  const { searchParams } = new URL(req.url);
  const metalType = searchParams.get("metalType");
  const format = searchParams.get("format") || "xlsx"; // default xlsx Excel

  const todayStr = getTodayIST();
  let sheetName = "Report";
  let filename = `sidheshwar_${type}_${todayStr}.xlsx`;
  let rows: any[] = [];

  try {
    if (type === "sales") {
      sheetName = "Sales & Billing Ledger";
      filename = `sidheshwar_sales_ledger_${todayStr}.xlsx`;

      const filter: any = {};
      if (metalType && (metalType === "gold" || metalType === "silver")) {
        filter.metalType = metalType;
      }

      const sales = await SaleRecord.find(filter).sort({ saleDate: -1, createdAt: -1 }).lean();

      rows = sales.map((s: any) => {
        const d = s.saleDate ? new Date(s.saleDate).toLocaleDateString("en-IN") : "";
        const dueD = s.dueDate ? new Date(s.dueDate).toLocaleDateString("en-IN") : "";
        const cashRs = (s.splitPayments?.cashPaise || 0) / 100;
        const onlineRs = (s.splitPayments?.onlinePaise || 0) / 100;
        const totalPaidRs = (s.paidAmountPaise || 0) / 100;
        const balDueRs = (s.balanceDuePaise || 0) / 100;
        const billTotalRs = (s.sellingPricePaise || 0) / 100;
        const profitRs = (s.profitPaise || 0) / 100;
        const exchangeCreditRs = (s.totalExchangeCreditPaise || 0) / 100;

        return {
          "Invoice / Sale No": s.saleNumber || "",
          "Sale Date": d,
          "Customer Name": s.customer?.name || "",
          "Customer Phone": s.customer?.phone || "",
          "Customer Address": s.customer?.address || "Visapur",
          "Metal Type": (s.metalType || "gold").toUpperCase(),
          "Item Name": s.itemName || "",
          "SKU": s.sku || "",
          "Purity": s.purity || "",
          "Quantity Sold (pcs)": s.quantitySold || 1,
          "Gross Wt Sold (g)": s.grossWeightSold || 0,
          "Net Metal Wt Sold (g)": s.netWeightSold || 0,
          "Total Bill Value (INR)": billTotalRs,
          "Old Metal Trade-In Credit (INR)": exchangeCreditRs,
          "Cash Received (INR)": cashRs,
          "Online UPI/Bank (INR)": onlineRs,
          "Total Paid (INR)": totalPaidRs,
          "Udhari Balance Due (INR)": balDueRs,
          "Promise Due Date": dueD,
          "Payment Status": (s.paymentStatus || "paid").toUpperCase(),
          "Realized Margin / Profit (INR)": profitRs,
        };
      });
    } else if (type === "inventory") {
      sheetName = metalType ? `${metalType.toUpperCase()} Stock` : "Showroom Inventory";
      filename = `sidheshwar_inventory_${metalType || "all"}_${todayStr}.xlsx`;

      const filter: any = { isActive: true };
      if (metalType) filter.metalType = metalType;

      const items = await InventoryItem.find(filter)
        .populate("categoryId", "name")
        .sort({ createdAt: -1 })
        .lean();

      rows = items.map((it: any) => {
        const catName = (it.categoryId as any)?.name || "Uncategorized";
        const purchaseDateStr = it.purchaseDate
          ? new Date(it.purchaseDate).toLocaleDateString("en-IN")
          : "";

        return {
          "SKU": it.sku || "",
          "Metal": (it.metalType || "gold").toUpperCase(),
          "Category": catName,
          "Item Name": it.name || "",
          "Purity": it.purity || "",
          "Size / Dimensions": it.size || "-",
          "In-Stock Quantity (pcs)": it.quantity || 0,
          "Gross Weight (g)": it.grossWeight || 0,
          "Stone Weight (g)": it.stoneWeight || 0,
          "Net Metal Weight (g)": it.netWeight || 0,
          "HUID / Hallmark": it.hallmarkUid || "-",
          "Supplier Name": it.supplierName || "-",
          "Purchase Date": purchaseDateStr,
          "Status": it.status === "sold" ? "SOLD" : it.status === "partial_sold" ? "PARTIAL" : "IN STOCK",
        };
      });
    } else if (type === "cash-book") {
      sheetName = "Rojmel Cash Book";
      filename = `sidheshwar_cash_book_rojmel_${todayStr}.xlsx`;

      const txs = await CashTransaction.find({}).sort({ date: -1, createdAt: -1 }).lean();

      rows = txs.map((tx: any) => {
        const d = tx.date ? new Date(tx.date).toLocaleDateString("en-IN") : "";
        const amountRs = (tx.amountPaise || 0) / 100;
        const isCredit = tx.transactionType === "credit";

        return {
          "Date": d,
          "Transaction Type": isCredit ? "CASH IN (CREDIT)" : "CASH OUT (DEBIT)",
          "Category": tx.category || "General",
          "Cash In (INR)": isCredit ? amountRs : 0,
          "Cash Out (INR)": !isCredit ? amountRs : 0,
          "Party Name": tx.partyName || "-",
          "Purpose / Description": tx.purpose || "",
          "Reference ID / Invoice": tx.referenceId || "-",
          "Payment Mode": tx.paymentMode || "Cash",
          "Notes": tx.notes || "-",
        };
      });
    } else if (type === "profit-loss") {
      sheetName = "P&L Statement";
      filename = `sidheshwar_profit_loss_${todayStr}.xlsx`;

      const sales = await SaleRecord.find({}).sort({ saleDate: -1 }).lean();

      rows = sales.map((s: any) => {
        const d = s.saleDate ? new Date(s.saleDate).toLocaleDateString("en-IN") : "";
        const revenueRs = (s.sellingPricePaise || 0) / 100;
        const costRs = (s.costPricePaise || 0) / 100;
        const profitRs = (s.profitPaise || 0) / 100;
        const marginPct = revenueRs > 0 ? ((profitRs / revenueRs) * 100).toFixed(2) + "%" : "0%";

        return {
          "Invoice No": s.saleNumber || "",
          "Date": d,
          "Customer": s.customer?.name || "",
          "Metal": (s.metalType || "gold").toUpperCase(),
          "Item Description": s.itemName || "",
          "Net Wt (g)": s.netWeightSold || 0,
          "Selling Revenue (INR)": revenueRs,
          "Estimated Cost (INR)": costRs,
          "Net Margin / Profit (INR)": profitRs,
          "Profit Margin %": marginPct,
          "Payment Status": (s.paymentStatus || "").toUpperCase(),
        };
      });
    } else if (type === "used-metal") {
      sheetName = "Used Metal Scrap";
      filename = `sidheshwar_used_metal_${todayStr}.xlsx`;

      const filter: any = {};
      if (metalType) filter.metalType = metalType;
      const purchases = await UsedMetalPurchase.find(filter).sort({ date: -1 }).lean();

      rows = purchases.map((p: any) => ({
        "Voucher No": p.transactionNumber || "",
        "Date": p.date ? new Date(p.date).toLocaleDateString("en-IN") : "",
        "Metal": (p.metalType || "").toUpperCase(),
        "Seller Name": p.sellerName || "",
        "Seller Mobile": p.sellerPhone || "",
        "Item Description": p.itemDescription || "",
        "Purity": p.purity || "",
        "Gross Wt (g)": p.grossWeight || 0,
        "Deduction Wt (g)": p.deductionsWeight || 0,
        "Net Wt (g)": p.netWeight || 0,
        "Rate/g (INR)": (p.ratePerGramPaise || 0) / 100,
        "Agreed Total (INR)": (p.finalAgreedCostPaise || 0) / 100,
        "Amount Paid (INR)": (p.amountPaidPaise || 0) / 100,
        "Balance Payable (INR)": (p.remainingPayablePaise || 0) / 100,
        "Payment Status": (p.paymentStatus || "").toUpperCase(),
        "Converted to Stock": p.isConvertedToInventory ? "YES" : "NO",
      }));
    } else if (type === "finance-loans") {
      sheetName = "Gold Finance Portfolio";
      filename = `sidheshwar_gold_finance_loans_${todayStr}.xlsx`;

      const loans = await FinanceLoan.find()
        .populate("customerId", "fullName mobileNumber customerId")
        .sort({ createdAt: -1 })
        .lean();

      rows = loans.map((l: any) => {
        const c = l.customerId as any;
        const currentPrincipal = l.currentOutstandingPrincipalPaise ?? l.originalPrincipalPaise;
        let accruedInterest = 0;
        let totalDue = currentPrincipal / 100;

        if (l.status !== "closed") {
          try {
            const calc = calculateMortgageInterest({
              mortgageDate: l.mortgageDate,
              principalRupees: currentPrincipal / 100,
              asOfDate: todayStr,
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

        return {
          "Loan No": l.loanNumber || "",
          "Customer ID": c?.customerId || "",
          "Customer Name": c?.fullName || "",
          "Mobile": c?.mobileNumber || "",
          "Mortgage Date": l.mortgageDate || "",
          "Due Date": l.dueDate || "",
          "Pledged Net Wt (g)": l.totalPledgedNetWeight || 0,
          "Monthly Rate (%)": l.monthlyRate || 0,
          "Interest Mode": (l.interestMode || "simple").toUpperCase(),
          "Original Principal (INR)": (l.originalPrincipalPaise || 0) / 100,
          "Outstanding Principal (INR)": currentPrincipal / 100,
          "Accrued Interest (INR)": accruedInterest,
          "Total Due (INR)": totalDue,
          "Total Repaid (INR)": totalPaid,
          "Loan Status": (l.status || "active").toUpperCase(),
        };
      });
    } else if (type === "finance-payments") {
      sheetName = "Finance Receipts";
      filename = `sidheshwar_finance_payments_${todayStr}.xlsx`;

      const payments = await FinancePayment.find()
        .populate("customerId", "fullName mobileNumber customerId")
        .populate("loanId", "loanNumber")
        .sort({ paymentDate: -1, createdAt: -1 })
        .lean();

      rows = payments.map((p: any) => {
        const c = p.customerId as any;
        const l = p.loanId as any;
        return {
          "Receipt No": p.receiptNumber || "",
          "Loan No": l?.loanNumber || "",
          "Customer Name": c?.fullName || "",
          "Mobile": c?.mobileNumber || "",
          "Payment Date": p.paymentDate || "",
          "Total Amount Paid (INR)": (p.totalAmountPaise || 0) / 100,
          "Applied to Principal (INR)": (p.principalAppliedPaise || 0) / 100,
          "Applied to Interest (INR)": (p.interestAppliedPaise || 0) / 100,
          "Remaining Principal (INR)": (p.newOutstandingPrincipalPaise || 0) / 100,
          "Payment Method": (p.paymentMethod || "Cash").toUpperCase(),
          "Reference ID": p.referenceTransactionId || "-",
          "Notes": p.notes || "-",
        };
      });
    } else if (type === "stocktake" || type === "monthly-stock") {
      sheetName = "Stock Audit Checklist";
      filename = `sidheshwar_stock_audit_${todayStr}.xlsx`;

      const items = await InventoryItem.find({ isActive: true })
        .populate("categoryId", "name")
        .sort({ metalType: 1, name: 1 })
        .lean();

      rows = items.map((it: any) => ({
        "SKU": it.sku || "",
        "Metal": (it.metalType || "gold").toUpperCase(),
        "Category": (it.categoryId as any)?.name || "General",
        "Item Name": it.name || "",
        "Purity": it.purity || "",
        "System Quantity (pcs)": it.quantity || 0,
        "System Net Wt (g)": it.netWeight || 0,
        "System Gross Wt (g)": it.grossWeight || 0,
        "HUID / Hallmark": it.hallmarkUid || "-",
        "Audit Status": "In Stock",
        "Physical Count Check": "[ Verified ]",
      }));
    } else if (type === "inventory-transactions") {
      sheetName = "Stock Movement History";
      filename = `sidheshwar_stock_movements_${todayStr}.xlsx`;

      const txs = await InventoryTransaction.find({})
        .populate("itemId", "sku name")
        .sort({ timestamp: -1 })
        .lean();

      rows = txs.map((tx: any) => {
        const it = tx.itemId as any;
        return {
          "Date & Time": tx.timestamp ? new Date(tx.timestamp).toLocaleString("en-IN") : "",
          "Transaction Type": (tx.transactionType || "").toUpperCase(),
          "Metal": (tx.metalType || "").toUpperCase(),
          "Item Name": it?.name || "-",
          "SKU": it?.sku || "-",
          "Quantity Change": tx.quantityChange || 0,
          "New Quantity": tx.newQuantity || 0,
          "Net Wt Change (g)": tx.netWeightChange || 0,
          "New Net Wt (g)": tx.newNetWeight || 0,
          "Reason / Remarks": tx.reason || "",
        };
      });
    } else {
      return NextResponse.json({ success: false, error: "Invalid export type" }, { status: 400 });
    }

    // Build Excel Workbook using SheetJS
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Status: "No records found" }]);

    // Auto-fit column widths
    if (rows.length > 0) {
      const keys = Object.keys(rows[0]);
      ws["!cols"] = keys.map((key) => {
        let maxLen = key.length;
        for (const row of rows) {
          const val = row[key];
          if (val !== null && val !== undefined) {
            maxLen = Math.max(maxLen, String(val).length);
          }
        }
        return { wch: Math.min(Math.max(maxLen + 3, 14), 45) };
      });
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

    if (format === "csv") {
      const csvData = "\uFEFF" + XLSX.utils.sheet_to_csv(ws);
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename.replace('.xlsx', '.csv')}"`,
        },
      });
    }

    // Default: Native .xlsx Binary Excel
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
