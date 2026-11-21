# UDHARI & WHATSAPP PAYMENT REMINDERS IMPLEMENTATION REPORT
## Sidheshwar Jewellers ERP — Customer Credit, Split Payments & 3-Stage WhatsApp Automation

---

## 1. Executive Summary
The Udhari, Split Payments, and WhatsApp Payment Reminders module establishes end-to-end customer debt management with automated, polite payment reminders. It supports split cash/online payments, dual ledger entries synchronized with the Cash Book (Rojmel), mandatory promised due dates for credit transactions, and a 3-stage WhatsApp messaging queue.

- **Routes**: `/sales/billing`, `/sales` (with Udhari Ledger), `/api/sales/reminders`.
- **Database Entities**: `SaleRecord`, `UdhariReminder`, `Customer`, `CashTransaction`.
- **Status**: Completed & 100% Verified.

---

## 2. Key Architecture & Features Implemented

### 2.1 Split Payments & Cash Book (Rojmel) Synchronization
- **Payment Inputs**:
  - Cash Received (₹)
  - Online Received (₹) (UPI, Google Pay, PhonePe, NEFT, Card)
- **Validation**:
  $$\text{Total Paid} = \text{Cash Received} + \text{Online Received}$$
  $$\text{Udhari Outstanding} = \max\Big(0,\; \text{Net Amount Payable} - \text{Total Paid}\Big)$$
- **Cash Book (Rojmel) Synchronization**:
  - Only the `Cash Received` portion is credited to `CashTransaction` under category `"sale_cash"`.
  - The online bank portion is recorded in the sale payments ledger without creating phantom cash in the counter drawer.

### 2.2 Customer Ledger & Mandatory Promised Due Dates
- **Validation Rule**: If $\text{Udhari Outstanding} > 0$:
  - Customer Name is mandatory.
  - Valid 10-digit Indian Mobile Number is mandatory (normalized to `91XXXXXXXXXX`).
  - **Promised Payment Date is strictly required** before invoice submission.
- **Optional Manual Profit**:
  - Showroom owner can enter internal realized profit in ₹.
  - Recorded securely in database (`manualProfitRupees`, `profitPaise`).
  - Strictly excluded from customer-facing invoices, printable bills, and WhatsApp reminders.

### 2.3 3-Stage WhatsApp Reminder System
When an invoice has an unpaid Udhari balance and a promised due date, three distinct reminder stages are scheduled:

1. **Stage 1 — 3 Days Before Due Date**:
   - *Trigger*: $\text{Promised Due Date} - 3\text{ calendar days}$.
   - *Message*: Polite heads-up notification of upcoming due date.
2. **Stage 2 — On Promised Due Date**:
   - *Trigger*: On the exact promised payment date.
   - *Message*: Same-day payment reminder with invoice and balance summary.
3. **Stage 3 — After Due Date / Overdue**:
   - *Trigger*: $\text{Promised Due Date} + 1\text{ calendar day}$.
   - *Message*: Gentle overdue follow-up requesting settlement or store contact.

### 2.4 Queue Architecture & Duplicate Prevention
- **Unique Deduplication Key**:
  $$\text{dedupKey} = \text{saleId} + \text{"\_"} + \text{reminderType} + \text{"\_"} + \text{dueDateStr}$$
  Enforced by a unique MongoDB index on `UdhariReminder.dedupKey` to prevent duplicate reminders.
- **Live Settlement Check**:
  - When a customer makes a partial or full payment via `/api/sales/[id]/payment`, pending reminders update their `outstandingPaise`.
  - If the sale balance reaches ₹0, all pending reminders are automatically cancelled with status `"cancelled"` and reason `"Invoice fully settled"`.
- **Manual Click-to-Chat Fallback**:
  - Automatically generates URL-encoded WhatsApp web/app links:
    `https://wa.me/91XXXXXXXXXX?text=...`
  - Allows instant 1-click customer notification without requiring external paid WhatsApp Business API credentials.

---

## 3. API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sales/reminders` | Fetches reminder queue with filters (pending, sent, overdue) |
| `POST` | `/api/sales/reminders` | Scans all active Udhari records and schedules 3-stage reminders |
| `POST` | `/api/sales/reminders/[id]/send` | Dispatches reminder / marks sent / provides click-to-chat URL |

---

## 4. Verification & Automated Test Results
- Automated test script: `scripts/test-advanced-billing.js`.
- Result: **100% Passed**.
  - Split payment: Cash ₹10,000 + Online ₹7,500 = ₹17,500 total paid.
  - Cash counter correctly credited ₹10,000; online portion isolated.
  - Outstanding Udhari ₹10,000 with due date generated all 3 stages with unique dedup keys.
  - Duplicate insertion rejected by unique database index.
