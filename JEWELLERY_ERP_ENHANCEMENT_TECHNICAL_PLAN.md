# SIDHESHWAR JEWELLERS ERP — ENHANCEMENT TECHNICAL PLAN
## Monthly Stock Audit + Advanced Gold/Silver Counter Billing + Metal Exchange + Udhari + WhatsApp Reminders + Weight-Wise Search

---

## 1. Executive Summary & Architectural Overview
This technical plan outlines the enhancement of the production-ready **Sidheshwar Jewellers ERP** with five core capabilities:
1. **Monthly Stock Checking and Physical Stock Reconciliation** (`INVENTORY -> MONTHLY STOCK CHECKING`).
2. **Advanced Gold and Silver Counter Billing** (Two-column layout, dynamic categories, multi-item line billing).
3. **Old Gold and Silver Exchange (Trade-In) During New Purchases** (Gross/Net weight separation, scrap rate valuation, net payable deduction, strict isolation from mortgage loans).
4. **Cash, Online & Split Payments + Customer Udhari & Promised Payment Dates** (Split payment ledger, dual cash/online recording, synchronized Rojmel cash transactions, optional manual profit).
5. **WhatsApp Payment Reminders (3-Stage Workflow)** (-3 days, due date, +1 day overdue, multilingual templates, URL prefilled manual fallback + queue architecture, duplicate prevention).
6. **Approximate Weight-Wise Jewellery Inventory Search** (Proximity ranking `|itemWeight - targetWeight|`, milligram precision `0.001g`, dynamic tolerance, direct counter billing selection).

---

## 2. Affected Modules & Existing Workflows

### 2.1 Inventory Management
- **Existing**: `models/InventoryItem.ts` and `models/InventoryTransaction.ts`. Tracks individual SKU or batch items with `grossWeight`, `stoneWeight`, `netWeight`, `quantity`, `purity`, `purchaseCostPaise`.
- **Enhancement**: 
  - Add `models/StocktakeSession.ts` to manage monthly physical audit sessions with snapshot cutoffs, discrepancy tracking, and manager finalization.
  - Add `models/StocktakeLine.ts` to store item-level expected vs. physical verification metrics (`MATCHED`, `MISSING`, `EXCESS`, `WEIGHT MISMATCH`, `UNCOUNTED`).
  - Add `app/inventory/monthly-stock/page.tsx` for real-time audit dashboard, barcode/SKU scanning, count submission, and discrepancy reconciliation.

### 2.2 Sales & Counter Billing
- **Existing**: `models/SaleRecord.ts` and `app/api/sales/route.ts`. Handles single-item billing, downpayment, balance due, and cash book entry.
- **Enhancement**:
  - Update `models/SaleRecord.ts` with backward compatibility to support:
    - Multi-item line sales (`items: []`).
    - Old metal trade-in exchange lines (`exchangeMetals: []` and `exchangeCreditsPaise`).
    - Split payments (`splitPayments: { cashPaise: number, onlinePaise: number }`).
    - Explicit `manualProfitRupees` / `profitPaise`.
  - Add dedicated counter billing screen at `app/sales/billing/page.tsx` with two-column product entry, dynamic categories, live weight/purity validation, and instant receipt generation.

### 2.3 Old Metal Exchange (Trade-In)
- **Constraint**: Strict separation from `models/UsedMetalPurchase.ts` and `models/LoanAccount.ts` (mortgage loans).
- **Valuation Formula**:
  - Gold: $\text{Exchange Value} = \text{Net Weight (g)} \times \left(\frac{\text{Purity Karat}}{24}\right) \times \text{Applicable 24K Rate (₹/g)} - \text{Deductions}$.
  - Silver: $\text{Exchange Value} = \text{Net Weight (g)} \times \left(\frac{\text{Purity Fineness}}{999}\right) \times \text{Applicable 999 Rate (₹/g)} - \text{Deductions}$.
- **Net Amount Payable**:
  $$\text{Net Amount Payable} = \text{Total New Purchase Amount} - \text{Total Old Metal Credit}$$
  $$\text{Balance Due (Udhari)} = \max(0, \text{Net Amount Payable} - \text{Total Paid})$$

### 2.4 Customer Udhari & Split Payments
- **Payment Split**: $\text{Total Paid} = \text{Cash Received} + \text{Online Received}$.
- **Cash Book Synchronization**: Only the cash portion is credited to `CashTransaction` (Rojmel), preventing inflated cash drawer tallies.
- **Mandatory Promised Date**: If $\text{Balance Due} > 0$, `dueDate`, customer name, and a valid 10-digit Indian phone are mandatory.

### 2.5 WhatsApp Payment Reminders
- **Entity**: `models/UdhariReminder.ts`.
- **Deduplication Key**: `saleId + "_" + reminderType + "_" + dueDateStr`.
- **Stages**:
  - Stage 1: 3 days before promised due date.
  - Stage 2: On promised due date.
  - Stage 3: 1 day overdue.
- **Templates**: Multilingual (English, Hindi, Marathi) with dynamic tags (`[Customer Name]`, `[Invoice Number]`, `[Outstanding Amount]`, `[Due Date]`).
- **Delivery**: Official API readiness + Instant `https://wa.me/{phone}?text=...` manual dispatch fallback.

### 2.6 Weight-Wise Inventory Search
- **Proximity Metric**:
  $$\Delta w = |w_{\text{item}} - w_{\text{target}}|$$
- **Sorting**: Order by $\Delta w$ ascending, followed by purity descending.
- **Tolerance**: Configurable from exact match ($0.000\text{g}$) to $\pm 50\text{mg}$, $\pm 100\text{mg}$, $\pm 500\text{mg}$, or unconstrained.
- **Action**: One-click "Select for Billing" directly populates the counter invoice line.

---

## 3. Database Schema Updates & New Models

### 3.1 `StocktakeSession` (`models/StocktakeSession.ts`)
```typescript
interface IStocktakeSession {
  sessionCode: string; // e.g. ST-2026-11-001
  month: number; // 1-12
  year: number; // 2026
  metalType: "all" | "gold" | "silver";
  status: "draft" | "counting" | "under_review" | "finalized" | "reopened";
  snapshotTimestamp: Date;
  finalizedAt?: Date;
  finalizedBy?: string;
  notes?: string;
  metrics: {
    totalExpectedItems: number;
    totalExpectedGrossWeight: number;
    totalExpectedNetWeight: number;
    totalCountedItems: number;
    totalMatchedItems: number;
    totalMissingItems: number;
    totalExcessItems: number;
    totalWeightMismatchItems: number;
    totalUncountedItems: number;
    netGrossWeightDiff: number;
    netNetWeightDiff: number;
  };
}
```

### 3.2 `StocktakeLine` (`models/StocktakeLine.ts`)
```typescript
interface IStocktakeLine {
  sessionId: Types.ObjectId;
  itemId?: Types.ObjectId; // null if excess uncataloged item
  sku: string;
  metalType: "gold" | "silver";
  categoryId?: Types.ObjectId;
  categoryName: string;
  itemName: string;
  purity: string;
  expectedQuantity: number;
  expectedGrossWeight: number;
  expectedNetWeight: number;
  physicalQuantity: number;
  physicalGrossWeight: number;
  physicalNetWeight: number;
  qtyDifference: number; // physical - expected
  grossWeightDifference: number;
  netWeightDifference: number;
  status: "uncounted" | "matched" | "missing" | "excess" | "weight_mismatch";
  verifiedAt?: Date;
  verifiedBy?: string;
  notes?: string;
  adjustmentReason?: string;
  adjustmentApproved?: boolean;
}
```

### 3.3 `UdhariReminder` (`models/UdhariReminder.ts`)
```typescript
interface IUdhariReminder {
  saleId: Types.ObjectId;
  saleNumber: string;
  customerId?: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  outstandingPaise: number;
  dueDate: Date;
  reminderType: "3_days" | "due_date" | "overdue";
  scheduledDate: Date;
  status: "pending" | "sent" | "cancelled" | "failed";
  language: "en" | "hi" | "mr";
  messageBody: string;
  whatsappUrl: string;
  sentAt?: Date;
  attemptCount: number;
  dedupKey: string; // saleId_reminderType_date
}
```

### 3.4 Extended `SaleRecord` (`models/SaleRecord.ts`)
- Keep existing fields for single-item backwards compatibility.
- Add optional:
  - `items`: Array of items sold with individual weights, prices, and inventory IDs.
  - `exchangeMetals`: Array of old metal trade-in lines.
  - `totalExchangeCreditPaise`: Total scrap metal trade-in allowance.
  - `netPayablePaise`: Total sale amount minus exchange credit.
  - `splitPayments`: `{ cashPaise: number, onlinePaise: number }`.
  - `manualProfitPaise`: Explicit manual profit recorded by showroom owner.

---

## 4. API Endpoints Specification

### 4.1 Monthly Stocktake APIs
- `GET /api/inventory/stocktake`: List monthly audit sessions.
- `POST /api/inventory/stocktake`: Initialize a new monthly snapshot session.
- `GET /api/inventory/stocktake/[id]`: Retrieve audit session summary, lines, and metrics.
- `PUT /api/inventory/stocktake/[id]/count`: Record physical count for an item (SKU / barcode).
- `POST /api/inventory/stocktake/[id]/finalize`: Finalize stocktake, write non-destructive `InventoryTransaction` adjustments and `AuditLog`.

### 4.2 Counter Billing & Exchange APIs
- `POST /api/sales`: Enhanced to process multi-item carts, old metal exchange deductions, split cash/online payments, Rojmel credit, and customer creation/linkage.
- `GET /api/sales/[id]`: Detailed sale breakdown including exchange lines and split payment records.

### 4.3 Udhari & WhatsApp Reminders APIs
- `GET /api/sales/reminders`: Fetch pending, sent, and overdue reminder queues with filters.
- `POST /api/sales/reminders/generate`: Auto-scan all active Udhari records and generate 3-stage reminders.
- `POST /api/sales/reminders/[id]/send`: Mark reminder sent / generate pre-filled WhatsApp click-to-chat URL.

### 4.4 Weight Search APIs
- `GET /api/inventory/search-by-weight`: Query available inventory with `metalType`, `categoryId`, `targetWeight`, `weightBasis` (gross vs net), and `toleranceGrams`, sorted by proximity.

---

## 5. Security, Concurrency & Data Safety
1. **Concurrent Stock Movement Cutoff**: When stock checking is in progress, any showroom sale records `InventoryTransaction` with its timestamp. Stocktake lines display both snapshot baseline and current live balance so audit differences reflect true physical losses rather than legitimate mid-day sales.
2. **Atomic Financial Updates**: Sales with multiple items and split payments update inventory, create sales records, and credit Rojmel cash transactions in consistent sequences.
3. **Pledged Loan Isolation**: Pledged jewelry in `LoanAccount` is strictly excluded from counter stock and old metal exchange.
4. **Data Protection**: Zero destructive mutations on existing MongoDB documents.

---

## 6. Implementation Sequence
1. Models creation (`StocktakeSession`, `StocktakeLine`, `UdhariReminder`) & update `SaleRecord`.
2. Stocktake APIs & `app/inventory/monthly-stock/page.tsx`.
3. Counter Billing API enhancement & `app/sales/billing/page.tsx`.
4. Udhari Reminders API & WhatsApp dashboard.
5. Weight Search API & UI integration.
6. Automated verification test suite and regression testing.
7. Six final implementation reports.
