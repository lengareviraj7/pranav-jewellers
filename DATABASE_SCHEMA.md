# SIDHESHWAR JEWELLERS ERP — DATABASE SCHEMA SPECIFICATION

## 1. Schema Design Principles
1. **Financial Precision**: All monetary values are maintained in **Paise** (`Number` integers, where `₹1.00 = 100`) alongside dual convenience getters or Decimal128 representation to eliminate IEEE-754 floating-point errors.
2. **Weight Precision**: Gold and Silver weights are tracked to **3 decimal places** (milligram precision: `0.001g`).
3. **Auditability & Traceability**: Every primary entity has timestamps (`createdAt`, `updatedAt`), creator references, and explicit status flags (`isActive`, `status`). Soft-deletion and transaction journals are enforced.

---

## 2. Entity-Relationship Overview

```
                      +-------------------+
                      |       users       |
                      +---------+---------+
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
   +-------------------+                 +-------------------+
   |    categories     |                 |     customers     |
   +---------+---------+                 +---------+---------+
             |                                     |
             v                                     v
   +-------------------+                 +-------------------+
   |  inventoryItems   |<----+           |   financeLoans    |
   +---------+---------+     |           +---------+---------+
             |               |                     |
             v               |                     v
   +-------------------+     |           +-------------------+
   | inventoryTrans-   |     |           |  financePayments  |
   |     actions       |     |           +-------------------+
   +-------------------+     |
                             |
             +---------------+
             | (on convert)
   +---------+---------+
   | usedMetalPurchases|
   +-------------------+
```

---

## 3. Detailed Collection Specifications

### 3.1 `users` Collection
Stores staff and administrator authentication and authorization profiles.
```typescript
interface IUser {
  _id: ObjectId;
  name: string;
  email: string; // Unique index
  passwordHash: string; // bcrypt hash
  role: 'admin' | 'staff';
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**: `{ email: 1 }` (unique).

---

### 3.2 `categories` Collection
Dynamic categorization for both Gold and Silver inventory.
```typescript
interface ICategory {
  _id: ObjectId;
  name: string; // e.g. "Rings", "Chains", "Bangles", "Anklets", "Coins"
  metalType: 'gold' | 'silver';
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**: `{ metalType: 1, name: 1 }` (unique compound index), `{ metalType: 1, isActive: 1 }`.

---

### 3.3 `inventoryItems` Collection
Current stock records for showroom-owned gold and silver products.
```typescript
interface IInventoryItem {
  _id: ObjectId;
  metalType: 'gold' | 'silver';
  categoryId: ObjectId; // Ref: 'categories'
  name: string;
  sku: string; // Auto-generated or manual unique identifier (e.g., SJ-G-RNG-001)
  purity: string; // e.g., "24K", "22K", "18K" for gold; "999", "925", "800" for silver
  quantity: number; // Pieces in stock
  grossWeight: number; // Grams (3 decimal places)
  stoneWeight: number; // Grams (3 decimal places)
  netWeight: number; // Grams (grossWeight - stoneWeight)
  hallmarkUid?: string; // Optional HUID (6-character alphanumeric)
  supplierName?: string;
  purchaseDate: Date;
  purchaseCostPaise: number; // Total cost in paise (Rupees * 100)
  unitCostPaise?: number; // Cost per piece
  notes?: string;
  sourceType: 'direct_purchase' | 'used_metal_conversion' | 'opening_stock';
  sourceUsedPurchaseId?: ObjectId; // Ref: 'usedMetalPurchases' (if converted)
  isActive: boolean; // Soft-delete / archive flag
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**: `{ sku: 1 }` (unique), `{ metalType: 1, isActive: 1 }`, `{ categoryId: 1 }`.

---

### 3.4 `inventoryTransactions` Collection
Immutable audit log of all stock movements.
```typescript
interface IInventoryTransaction {
  _id: ObjectId;
  itemId: ObjectId; // Ref: 'inventoryItems'
  metalType: 'gold' | 'silver';
  categoryId: ObjectId; // Ref: 'categories'
  transactionType: 'stock_in' | 'stock_out' | 'adjustment' | 'conversion_in' | 'archive';
  previousQuantity: number;
  newQuantity: number;
  quantityChange: number;
  previousGrossWeight: number;
  newGrossWeight: number;
  previousNetWeight: number;
  newNetWeight: number;
  netWeightChange: number;
  reason: string; // e.g., "Initial stock entry", "Weight re-measurement", "Sale", "Stock audit"
  referenceId?: string; // Receipt / Voucher / Bill number
  performedBy: ObjectId; // Ref: 'users'
  timestamp: Date;
}
```
**Indexes**: `{ itemId: 1, timestamp: -1 }`, `{ metalType: 1, timestamp: -1 }`.

---

### 3.5 `usedMetalPurchases` Collection
Purchases of old jewellery or scrap metal from customers or dealers.
```typescript
interface IUsedMetalPurchase {
  _id: ObjectId;
  transactionNumber: string; // e.g. "UMP-2026-0001" (unique)
  date: Date;
  metalType: 'gold' | 'silver';
  sellerName: string;
  sellerPhone?: string;
  sellerAddress?: string;
  itemDescription: string;
  purity: string; // e.g., "22K", "18K", "916", "80%"
  purityPercentage?: number; // e.g. 91.6
  grossWeight: number; // Grams
  deductionsWeight: number; // Stones, dirt, wax deductions in grams
  netWeight: number; // grossWeight - deductionsWeight
  ratePerGramPaise: number; // Rate per gram applied (in paise)
  calculatedValuePaise: number; // netWeight * ratePerGramPaise
  finalAgreedCostPaise: number; // Final agreed settlement in paise
  differenceReason?: string; // Reason if agreed cost != calculated value
  amountPaidPaise: number; // Amount paid up front
  remainingPayablePaise: number; // finalAgreedCostPaise - amountPaidPaise
  paymentStatus: 'paid' | 'partially_paid' | 'pending';
  paymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'other';
  notes?: string;

  // Conversion into inventory tracking:
  isConvertedToInventory: boolean;
  convertedDate?: Date;
  convertedInventoryItemId?: ObjectId; // Ref: 'inventoryItems'
  convertedNetWeight?: number; // Post-refining tested weight
  convertedPurity?: string;
  conversionNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**: `{ transactionNumber: 1 }` (unique), `{ metalType: 1, paymentStatus: 1 }`, `{ sellerName: 1 }`.

---

### 3.6 `customers` Collection
Finance / Mortgage customers directory.
```typescript
interface ICustomer {
  _id: ObjectId;
  customerId: string; // e.g. "SJ-CUST-001" (unique)
  fullName: string;
  mobileNumber: string; // Index for fast lookup
  secondaryPhone?: string;
  address?: string;
  identificationType?: 'aadhar' | 'pan' | 'voter_id' | 'other';
  identificationNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**: `{ customerId: 1 }` (unique), `{ mobileNumber: 1 }`, `{ fullName: 'text' }`.

---

### 3.7 `financeLoans` Collection
Gold mortgage loans backed by pledged jewellery.
```typescript
interface IPledgedItem {
  description: string; // e.g. "Gold Necklace with Emeralds"
  metalType: 'gold' | 'silver';
  purity: string; // e.g. "22K"
  quantity: number; // Pieces
  grossWeight: number; // Grams
  netWeight: number; // Grams
  identificationMark?: string; // Box number, packet code, or receipt ref
}

interface IFinanceLoan {
  _id: ObjectId;
  loanNumber: string; // e.g. "SJ-LN-2026-0001" (unique)
  customerId: ObjectId; // Ref: 'customers'
  mortgageDate: string; // "YYYY-MM-DD" in Asia/Kolkata timezone
  asOfDateLastCalculated?: string; // "YYYY-MM-DD"
  originalPrincipalPaise: number; // Starting principal in paise
  currentOutstandingPrincipalPaise: number; // Principal remaining after principal payments
  monthlyRate: number; // e.g. 2.0, 2.5, 3.0 or custom
  interestMode: 'yearly_compound' | 'simple';
  dueDate?: string; // "YYYY-MM-DD" optional maturity date

  pledgedItems: IPledgedItem[]; // Strictly isolated from shop inventory
  totalPledgedGrossWeight: number;
  totalPledgedNetWeight: number;

  totalInterestPaidPaise: number; // Cumulative interest payments
  totalPrincipalPaidPaise: number; // Cumulative principal payments
  accruedInterestPaise: number; // Calculated accrued interest up to current as-of date
  totalOutstandingDuePaise: number; // Outstanding principal + accrued interest

  status: 'active' | 'partially_paid' | 'overdue' | 'closed';
  closedDate?: Date;
  closureNotes?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**: `{ loanNumber: 1 }` (unique), `{ customerId: 1 }`, `{ status: 1, mortgageDate: 1 }`.

---

### 3.8 `financePayments` Collection
Payment ledger for loan service.
```typescript
interface IFinancePayment {
  _id: ObjectId;
  receiptNumber: string; // e.g. "SJ-RCP-2026-001" (unique)
  loanId: ObjectId; // Ref: 'financeLoans'
  customerId: ObjectId; // Ref: 'customers'
  paymentDate: string; // "YYYY-MM-DD"
  totalAmountPaise: number; // Total amount received
  principalAppliedPaise: number; // Portion credited against principal
  interestAppliedPaise: number; // Portion credited against accrued interest
  paymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'cheque';
  referenceTransactionId?: string; // UPI ref / Cheque no
  previousOutstandingPrincipalPaise: number;
  newOutstandingPrincipalPaise: number;
  notes?: string;
  createdAt: Date;
}
```
**Indexes**: `{ receiptNumber: 1 }` (unique), `{ loanId: 1, paymentDate: -1 }`, `{ customerId: 1 }`.

---

### 3.9 `metalRates` & `appSettings` Collections
Maintains live gold and silver benchmark market rates and shop configuration.
```typescript
interface IMetalRate {
  _id: ObjectId;
  gold24kRatePaisePerGram: number;
  gold22kRatePaisePerGram: number;
  gold18kRatePaisePerGram: number;
  silverFineRatePaisePerGram: number;
  effectiveDate: Date;
  updatedBy: ObjectId;
}

interface IAppSettings {
  _id: ObjectId;
  shopName: string; // "SIDHESHWAR JEWELLERS"
  phone: string;
  address: string;
  defaultMonthlyInterestRate: number; // 2.0%
  defaultInterestMode: 'yearly_compound' | 'simple';
  timezone: string; // "Asia/Kolkata"
  currency: string; // "INR"
}
```
