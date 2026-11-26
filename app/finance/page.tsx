"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Landmark,
  Calculator,
  Users,
  CreditCard,
  Plus,
  Search,
  Download,
  AlertCircle,
  Check,
  X,
  Printer,
  ChevronRight,
  ShieldCheck,
  Clock,
  Sparkles,
  Calendar,
  AlertTriangle,
  History,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  MessageCircle,
  Phone,
  Coins,
  Gem,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  calculateMortgageInterest,
  getTodayIST,
  MortgageResult,
  formatINR,
} from "@/lib/mortgage-engine";
import { TiltCard, AnimatedNumber } from "@/components/Motion";

interface Customer {
  id: string;
  _id: string;
  customerId: string;
  fullName: string;
  mobileNumber: string;
  address?: string;
}

interface PledgedItem {
  description: string;
  metalType: "gold" | "silver";
  purity: string;
  quantity: number;
  grossWeight: number;
  netWeight: number;
}

interface FinanceLoan {
  id: string;
  _id: string;
  loanNumber: string;
  customerId: any;
  mortgageDate: string;
  originalPrincipalRupees: number;
  currentOutstandingPrincipalRupees: number;
  monthlyRate: number;
  interestMode: "yearly_compound" | "simple";
  dueDate?: string;
  pledgedItems: PledgedItem[];
  totalPledgedGrossWeight: number;
  totalPledgedNetWeight: number;
  accruedInterestRupees: number;
  totalDueRupees: number;
  totalInterestPaidRupees: number;
  totalPrincipalPaidRupees: number;
  status: "active" | "partially_paid" | "overdue" | "closed";
  notes?: string;
  createdAt: string;
  paymentHistory?: any[];
}

function FinanceDashboardContent() {
  const searchParams = useSearchParams();
  const urlPhone = searchParams.get("phone");

  // State
  const [loans, setLoans] = useState<FinanceLoan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter Tabs: 'all' | 'gold' | 'silver' (from Image 3 sketch)
  const [metalTab, setMetalTab] = useState<"all" | "gold" | "silver">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected customer for Image 2 view
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Left Panel Form: Add Customer (Customer add)
  const [addCustName, setAddCustName] = useState("");
  const [addCustPhone, setAddCustPhone] = useState("");
  const [addCustAddress, setAddCustAddress] = useState("");
  const [addCustDate, setAddCustDate] = useState(getTodayIST());
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  // Main Right Panel Form: Issue New Loan (from Image 2 sketch)
  const [issuePrincipal, setIssuePrincipal] = useState("");
  const [issueRate, setIssueRate] = useState<number>(2.0);
  const [issueDate, setIssueDate] = useState(getTodayIST());
  const [issueItemName, setIssueItemName] = useState("");
  const [issueMetal, setIssueMetal] = useState<"gold" | "silver">("gold");
  const [issueGrossWeight, setIssueGrossWeight] = useState("");
  const [issuePromiseDate, setIssuePromiseDate] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [isIssuingLoan, setIsIssuingLoan] = useState(false);

  // Payment Modal (व्याज / मुद्दल जमा)
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [activeLoanForPay, setActiveLoanForPay] = useState<FinanceLoan | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payInterestPortion, setPayInterestPortion] = useState("");
  const [payPrincipalPortion, setPayPrincipalPortion] = useState("");
  const [payMode, setPayMode] = useState<"cash" | "online">("cash");
  const [payDate, setPayDate] = useState(getTodayIST());
  const [payNotes, setPayNotes] = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Printable Loan Receipt Modal
  const [printLoan, setPrintLoan] = useState<FinanceLoan | null>(null);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Fetch loans and customers
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [loansRes, custRes] = await Promise.all([
        fetch("/api/finance/loans"),
        fetch("/api/finance/customers"),
      ]);

      const loansData = await loansRes.json();
      const custData = await custRes.json();

      if (loansData.success) {
        setLoans(loansData.loans || []);
      }
      if (custData.success) {
        setCustomers(custData.customers || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle URL param selection
  useEffect(() => {
    if (urlPhone && customers.length > 0) {
      const match = customers.find(
        (c) => c.mobileNumber.replace(/\D/g, "") === urlPhone.replace(/\D/g, "")
      );
      if (match) setSelectedCustomerId(match.id || match._id);
    }
  }, [urlPhone, customers]);

  // Select first customer by default if available and none selected
  useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id || customers[0]._id);
    }
  }, [customers, selectedCustomerId]);

  // Selected Customer details & loans
  const selectedCustomer = customers.find(
    (c) => (c.id || c._id) === selectedCustomerId
  );

  const customerLoans = loans.filter((l) => {
    const custId = l.customerId?._id || l.customerId?.id || l.customerId;
    return custId?.toString() === selectedCustomerId?.toString();
  });

  // Calculate Rate Breakdown Metrics (from Image 3 sketch)
  // Cards: Total cash Financed, 2%, 2.5%, 3%, 1.5%, 1.75%
  const activeLoans = loans.filter((l) => l.status !== "closed");
  const totalCashFinanced = activeLoans.reduce(
    (sum, l) => sum + (l.currentOutstandingPrincipalRupees || l.originalPrincipalRupees || 0),
    0
  );

  const getRateTotal = (rate: number) => {
    return activeLoans
      .filter((l) => Math.abs(l.monthlyRate - rate) < 0.05)
      .reduce(
        (sum, l) => sum + (l.currentOutstandingPrincipalRupees || l.originalPrincipalRupees || 0),
        0
      );
  };

  const getRateCount = (rate: number) => {
    return activeLoans.filter((l) => Math.abs(l.monthlyRate - rate) < 0.05).length;
  };

  const rateCards = [
    { label: "Total Cash Financed", amount: totalCashFinanced, count: activeLoans.length, highlight: true },
    { label: "2% Finance Cash", rate: 2.0, amount: getRateTotal(2.0), count: getRateCount(2.0) },
    { label: "2.5% Finance Cash", rate: 2.5, amount: getRateTotal(2.5), count: getRateCount(2.5) },
    { label: "3% Finance Cash", rate: 3.0, amount: getRateTotal(3.0), count: getRateCount(3.0) },
    { label: "1.5% Cash", rate: 1.5, amount: getRateTotal(1.5), count: getRateCount(1.5) },
    { label: "1.75% Cash", rate: 1.75, amount: getRateTotal(1.75), count: getRateCount(1.75) },
  ];

  // Filter customers based on Metal Tab and Search Query
  const filteredCustomers = customers.filter((cust) => {
    const custId = (cust.id || cust._id).toString();
    const custLoans = loans.filter((l) => {
      const cId = l.customerId?._id || l.customerId?.id || l.customerId;
      return cId?.toString() === custId;
    });

    // Metal tab filter
    if (metalTab === "gold") {
      const hasGold = custLoans.some((l) =>
        l.pledgedItems?.some((p) => p.metalType === "gold")
      );
      if (!hasGold && custLoans.length > 0) return false;
    } else if (metalTab === "silver") {
      const hasSilver = custLoans.some((l) =>
        l.pledgedItems?.some((p) => p.metalType === "silver")
      );
      if (!hasSilver) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = cust.fullName?.toLowerCase().includes(q);
      const matchPhone = cust.mobileNumber?.includes(q);
      const matchAddr = cust.address?.toLowerCase().includes(q);
      return matchName || matchPhone || matchAddr;
    }

    return true;
  });

  // Handle Add Customer (Left Panel)
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCustName.trim() || !addCustPhone.trim()) {
      alert("Customer Name and Mobile Number are required.");
      return;
    }

    try {
      setIsAddingCustomer(true);
      setError(null);

      const res = await fetch("/api/finance/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: addCustName.trim(),
          mobileNumber: addCustPhone.trim(),
          address: addCustAddress.trim() || "Visapur",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add customer");
      }

      showToast(`Customer ${addCustName} added successfully ✅`);
      setAddCustName("");
      setAddCustPhone("");
      setAddCustAddress("");
      setAddCustDate(getTodayIST());

      await fetchData();
      if (data.customer) {
        setSelectedCustomerId(data.customer.id || data.customer._id);
      }
    } catch (err: any) {
      alert(err.message || "Failed to add customer");
    } finally {
      setIsAddingCustomer(false);
    }
  };

  // Handle Issue Loan (from Image 2 sketch)
  const handleIssueLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select or add a customer first.");
      return;
    }
    const numPrincipal = parseFloat(issuePrincipal);
    if (isNaN(numPrincipal) || numPrincipal <= 0) {
      alert("Please enter a valid loan amount.");
      return;
    }

    try {
      setIsIssuingLoan(true);
      setError(null);

      const res = await fetch("/api/finance/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          mortgageDate: issueDate || getTodayIST(),
          principalRupees: numPrincipal,
          monthlyRate: issueRate,
          interestMode: "yearly_compound",
          dueDate: issuePromiseDate || undefined,
          pledgedItems: [
            {
              description: issueItemName.trim() || (issueMetal === "gold" ? "Gold Ornament" : "Silver Ornament"),
              metalType: issueMetal,
              purity: issueMetal === "gold" ? "22K" : "925",
              quantity: 1,
              grossWeight: parseFloat(issueGrossWeight) || 0,
              netWeight: parseFloat(issueGrossWeight) || 0,
            },
          ],
          notes: issueNotes.trim() || undefined,
          disburseCash: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to issue loan");
      }

      showToast(`Loan of ₹${numPrincipal.toLocaleString("en-IN")} issued successfully ✅`);
      setIssuePrincipal("");
      setIssueItemName("");
      setIssueGrossWeight("");
      setIssuePromiseDate("");
      setIssueNotes("");

      await fetchData();
      window.dispatchEvent(new CustomEvent("sj-refresh-data"));
    } catch (err: any) {
      alert(err.message || "Failed to issue loan");
    } finally {
      setIsIssuingLoan(false);
    }
  };

  // Open Payment Modal
  const openPayModal = (loan: FinanceLoan) => {
    setActiveLoanForPay(loan);
    const accruedInterest = Math.round(loan.accruedInterestRupees || 0);
    setPayInterestPortion(accruedInterest.toString());
    setPayPrincipalPortion("0");
    setPayAmount(accruedInterest > 0 ? accruedInterest.toString() : "1000");
    setPayMode("cash");
    setPayDate(getTodayIST());
    setPayNotes("");
    setIsPayOpen(true);
  };

  // Handle Payment Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoanForPay || isSubmittingPay) return;

    const numTotal = parseFloat(payAmount);
    const numInterest = parseFloat(payInterestPortion) || 0;
    const numPrincipal = parseFloat(payPrincipalPortion) || 0;

    if (isNaN(numTotal) || numTotal <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    if (Math.abs(numInterest + numPrincipal - numTotal) > 0.01) {
      alert(`Split mismatch: Interest (₹${numInterest}) + Principal (₹${numPrincipal}) must equal Total Received (₹${numTotal}).`);
      return;
    }

    try {
      setIsSubmittingPay(true);
      setError(null);

      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: activeLoanForPay.id || activeLoanForPay._id,
          paymentDate: payDate || getTodayIST(),
          totalAmountRupees: numTotal,
          interestAppliedRupees: numInterest,
          principalAppliedRupees: numPrincipal,
          paymentMethod: payMode,
          notes: payNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record payment");
      }

      showToast(`Payment of ₹${numTotal.toLocaleString("en-IN")} recorded successfully ✅`);
      setIsPayOpen(false);
      await fetchData();
      window.dispatchEvent(new CustomEvent("sj-refresh-data"));
    } catch (err: any) {
      alert(err.message || "Failed to record payment");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // WhatsApp Reminder Link
  const getWhatsAppLoanLink = (loan: FinanceLoan) => {
    const cust = loan.customerId || selectedCustomer;
    if (!cust || !cust.mobileNumber) return "#";
    const cleanPhone = cust.mobileNumber.replace(/\D/g, "");
    const totalDue = Math.round(loan.totalDueRupees || 0);

    const text = `Namaste ${cust.fullName} ji! 🙏\nGreetings from Siddheshwar Jewellers & Finance.\nYour Gold Loan *${loan.loanNumber}* has a pending due of *₹${totalDue.toLocaleString(
      "en-IN"
    )}*.\nPledged Item: ${loan.pledgedItems?.[0]?.description || "Ornaments"} (${loan.totalPledgedGrossWeight}g).\n\nKindly visit shop or contact us to make payment.\n\n📍 Siddheshwar Jewellers, Visapur\n📞 +91 918329465301`;

    return `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-5 pb-12">
      {/* ── TOP BANNER & STATS CARDS (Exact Layout from Image 3 sketch) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Landmark className="h-6 w-6 text-luxury-gold" />
            <span>Finance Dashboard</span>
          </h1>
          <p className="text-xs text-luxury-muted mt-0.5">
            कर्ज व गहाण खाते पुस्तक • Real-time capital financing &amp; customer mortgage ledger
          </p>
        </div>

        {/* Global Action Status */}
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-luxury-gold/30 bg-luxury-gold/10 px-3.5 py-1.5 text-xs font-mono font-bold text-luxury-gold-champagne">
            {activeLoans.length} Active Loans • {customers.length} Grahaks
          </div>
        </div>
      </div>

      {/* Toast */}
      {successMsg && (
        <div className="bg-emerald-600/90 text-white text-xs font-bold py-2 px-4 rounded-xl text-center flex items-center justify-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── 6 RATE BREAKDOWN CARDS (Total Cash Financed, 2%, 2.5%, 3%, 1.5%, 1.75%) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {rateCards.map((c, idx) => (
          <div
            key={idx}
            className={`rounded-2xl p-3 sm:p-3.5 border transition-all ${
              c.highlight
                ? "bg-gradient-to-br from-amber-500/20 via-luxury-gold/15 to-transparent border-luxury-gold/50 shadow-gold-glow"
                : "bg-luxury-graphite/70 border-white/[0.08] hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-300 truncate">
                {c.label}
              </span>
              <span className="text-[10px] font-mono text-luxury-gold font-bold">
                {c.count} acc
              </span>
            </div>
            <p
              className={`font-mono text-base sm:text-lg font-bold mt-1.5 truncate ${
                c.highlight ? "text-luxury-gold-bright" : "text-white"
              }`}
            >
              ₹{Math.round(c.amount).toLocaleString("en-IN")}
            </p>
            <p className="text-[9px] text-neutral-400 mt-0.5">
              {c.rate ? `${c.rate}% per month` : "Overall active capital"}
            </p>
          </div>
        ))}
      </div>

      {/* ── FILTER TABS (All customer, Gold cust, Silver cust) ── */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
        <span className="text-xs font-bold uppercase text-neutral-400 mr-2">Filter:</span>
        <button
          onClick={() => setMetalTab("all")}
          className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${
            metalTab === "all"
              ? "bg-luxury-gold text-black shadow-gold-glow"
              : "bg-white/[0.05] text-neutral-300 hover:bg-white/[0.08]"
          }`}
        >
          All Customer ({customers.length})
        </button>
        <button
          onClick={() => setMetalTab("gold")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition ${
            metalTab === "gold"
              ? "bg-amber-400 text-black shadow-gold-glow"
              : "bg-white/[0.05] text-amber-300 hover:bg-white/[0.08]"
          }`}
        >
          <span>🪙 Gold Cust</span>
        </button>
        <button
          onClick={() => setMetalTab("silver")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition ${
            metalTab === "silver"
              ? "bg-slate-200 text-black shadow-md"
              : "bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]"
          }`}
        >
          <span>🥈 Silver Cust</span>
        </button>
      </div>

      {/* ── MAIN TWO-PANEL LAYOUT (LEFT: CUSTOMER ADD & DIRECTORY | RIGHT: LOAN FORM & KHATA) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ─────────────────────────────────────────────────────────────
            LEFT PANEL: ADD CUSTOMER & CUSTOMER DIRECTORY (approx 4 cols)
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          {/* Section A: Customer Add (Customer add from sketch Image 3) */}
          <div className="rounded-2xl border border-white/10 bg-luxury-graphite/80 p-4 space-y-3 shadow-luxury">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-luxury-gold flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>Add Customer (ग्राहक नोंद)</span>
              </h3>
              <span className="text-[10px] text-neutral-400">Quick Entry</span>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-2.5">
              {/* Customer Name */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={addCustName}
                  onChange={(e) => setAddCustName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-luxury-gold focus:outline-none"
                />
              </div>

              {/* Mobile No */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-300 mb-1">
                  Mobile No *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9822112233"
                  value={addCustPhone}
                  onChange={(e) => setAddCustPhone(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-mono text-white placeholder:text-neutral-600 focus:border-luxury-gold focus:outline-none"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-300 mb-1">
                  Address (गाव / शहर)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Visapur, Tasgaon"
                  value={addCustAddress}
                  onChange={(e) => setAddCustAddress(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-luxury-gold focus:outline-none"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={addCustDate}
                  onChange={(e) => setAddCustDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white focus:border-luxury-gold focus:outline-none"
                />
              </div>

              {/* Add Customer Button */}
              <button
                type="submit"
                disabled={isAddingCustomer}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark py-2 text-xs font-bold text-black shadow-gold-glow hover:brightness-105 active:scale-95 transition disabled:opacity-50 mt-1"
              >
                <Plus className="h-4 w-4" />
                <span>{isAddingCustomer ? "Adding..." : "+ Add Customer"}</span>
              </button>
            </form>
          </div>

          {/* Section B: Customer Directory List */}
          <div className="rounded-2xl border border-white/10 bg-luxury-graphite/80 p-3.5 space-y-3 shadow-luxury">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-neutral-300">
                Customer Directory ({filteredCustomers.length})
              </span>
              <span className="text-[10px] text-neutral-400">Tap to view Khata</span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search name or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/60 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:outline-none"
              />
            </div>

            {/* Customer List */}
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No matching customers found.
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const custId = (cust.id || cust._id).toString();
                  const isSelected = custId === selectedCustomerId;
                  const cLoans = loans.filter((l) => {
                    const id = l.customerId?._id || l.customerId?.id || l.customerId;
                    return id?.toString() === custId;
                  });
                  const totalLoanAmt = cLoans.reduce(
                    (sum, l) => sum + (l.currentOutstandingPrincipalRupees || l.originalPrincipalRupees || 0),
                    0
                  );
                  const hasGold = cLoans.some((l) =>
                    l.pledgedItems?.some((p) => p.metalType === "gold")
                  );
                  const hasSilver = cLoans.some((l) =>
                    l.pledgedItems?.some((p) => p.metalType === "silver")
                  );

                  return (
                    <button
                      key={custId}
                      onClick={() => setSelectedCustomerId(custId)}
                      className={`w-full text-left rounded-xl p-3 border transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-luxury-gold/15 border-luxury-gold text-white shadow-gold-glow"
                          : "bg-black/40 border-white/[0.06] hover:bg-white/[0.04] text-neutral-300"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                          <span>{cust.fullName}</span>
                          {hasGold && <span title="Gold Loan">🪙</span>}
                          {hasSilver && <span title="Silver Loan">🥈</span>}
                        </p>
                        <p className="text-[11px] font-mono text-neutral-400 truncate mt-0.5">
                          📞 {cust.mobileNumber}
                        </p>
                        <p className="text-[10px] text-neutral-500 truncate">
                          📍 {cust.address || "Visapur"}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-amber-300 block">
                          ₹{Math.round(totalLoanAmt).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {cLoans.length} loan(s)
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT PANEL: SELECTED CUSTOMER LOAN & KHATA (Image 2 sketch)
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedCustomer ? (
            <div className="rounded-2xl border border-white/10 bg-luxury-graphite/60 p-12 text-center text-neutral-400 space-y-2">
              <Landmark className="h-10 w-10 text-luxury-gold mx-auto opacity-40" />
              <p className="font-serif text-sm font-bold text-white">No Customer Selected</p>
              <p className="text-xs">
                Select a customer from the left directory or add a new customer to open their Khata &amp; Loan ledger.
              </p>
            </div>
          ) : (
            <>
              {/* Customer Header Strip */}
              <div className="rounded-2xl border border-white/10 bg-luxury-graphite/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-luxury">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-lg shadow-md">
                    {selectedCustomer.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-serif text-base sm:text-lg font-bold text-white">
                      {selectedCustomer.fullName}
                    </h2>
                    <p className="text-xs text-luxury-gold font-mono">
                      📞 {selectedCustomer.mobileNumber} • 📍 {selectedCustomer.address || "Visapur"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedCustomer.mobileNumber.replace(/\D/g, "")}`}
                    className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Call</span>
                  </a>
                  <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-right">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold block">Active Loans</span>
                    <span className="font-mono font-bold text-amber-300">
                      {customerLoans.filter((l) => l.status !== "closed").length} active
                    </span>
                  </div>
                </div>
              </div>

              {/* ── TOP SECTION: ISSUE NEW LOAN FORM (from Image 2 sketch) ── */}
              <div className="rounded-2xl border border-white/10 bg-luxury-graphite/90 p-4 sm:p-5 space-y-4 shadow-luxury">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                  <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-luxury-gold flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Issue Loan / गहाण ठेवा</span>
                  </h3>
                  <span className="text-[11px] text-neutral-400">New Mortgage Entry</span>
                </div>

                <form onSubmit={handleIssueLoanSubmit} className="space-y-3.5">
                  {/* Row 1: Pre-filled Customer Details (Name, No, Address) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        disabled
                        value={selectedCustomer.fullName}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/90"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                        Mobile No
                      </label>
                      <input
                        type="text"
                        disabled
                        value={selectedCustomer.mobileNumber}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-mono text-white/90"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        disabled
                        value={selectedCustomer.address || "Visapur"}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/90"
                      />
                    </div>
                  </div>

                  {/* Row 2: Amt (मुद्दल), Interest/व्याज, Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Amt (Principal) */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-amber-300 mb-1">
                        Amt (मुद्दल रक्कम ₹) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        required
                        placeholder="e.g. 15000"
                        value={issuePrincipal}
                        onChange={(e) => setIssuePrincipal(e.target.value)}
                        className="w-full rounded-xl border border-amber-500/40 bg-black/60 px-3 py-2 text-sm font-mono font-bold text-amber-300 placeholder:text-neutral-600 focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    {/* Interest / व्याज (% / महिना) */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-300 mb-1">
                        Interest / व्याज (%/mo) *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={issueRate}
                          onChange={(e) => setIssueRate(parseFloat(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono font-bold text-white focus:border-luxury-gold focus:outline-none"
                        >
                          <option value="1.5">1.5% / month</option>
                          <option value="1.75">1.75% / month</option>
                          <option value="2.0">2.0% / month</option>
                          <option value="2.5">2.5% / month</option>
                          <option value="3.0">3.0% / month</option>
                        </select>
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-300 mb-1">
                        Date (कर्ज तारीख) *
                      </label>
                      <input
                        type="date"
                        required
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: वस्तू (Item Name), Metal Type, वजन gm (Weight), Promise Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    {/* Item Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase text-neutral-300 mb-1">
                        वस्तू (Item Name) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 22K Gold Chain, Angthi, Patlya"
                        value={issueItemName}
                        onChange={(e) => setIssueItemName(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-luxury-gold focus:outline-none"
                      />
                    </div>

                    {/* Metal Type */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-300 mb-1">
                        Metal
                      </label>
                      <select
                        value={issueMetal}
                        onChange={(e) => setIssueMetal(e.target.value as any)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:outline-none"
                      >
                        <option value="gold">🪙 Gold (सोने)</option>
                        <option value="silver">🥈 Silver (चांदी)</option>
                      </select>
                    </div>

                    {/* वजन gm (Weight) */}
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-300 mb-1">
                        वजन gm (Weight) *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        required
                        placeholder="0.000g"
                        value={issueGrossWeight}
                        onChange={(e) => setIssueGrossWeight(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono font-bold text-white focus:border-luxury-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 4: Promise Date & Valuation Guide (minimum & maximum from sketch) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-amber-300 mb-1">
                        Promise Date (मुदत तारीख)
                      </label>
                      <input
                        type="date"
                        value={issuePromiseDate}
                        onChange={(e) => setIssuePromiseDate(e.target.value)}
                        className="w-full rounded-xl border border-amber-500/30 bg-black/60 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-black/40 border border-white/[0.08] p-2.5 text-[11px]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                          Valuation Guide (कमाल / किमान)
                        </span>
                        <span className="text-neutral-300">
                          Est. value: ~₹
                          {Math.round(
                            (parseFloat(issueGrossWeight) || 0) * (issueMetal === "gold" ? 6500 : 80)
                          ).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400 font-mono">
                        Safe LTV: 75%
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2 border-t border-white/[0.08]">
                    <button
                      type="submit"
                      disabled={isIssuingLoan}
                      className="btn-3d flex items-center gap-2 rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark px-6 py-2.5 text-xs font-bold text-black shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isIssuingLoan ? "Issuing Loan..." : "+ Issue Loan (गहाण ठेवा व कर्ज द्या)"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* ── BOTTOM SECTION: CUSTOMER KHATA LEDGER TABLE (from Image 2 sketch) ── */}
              <div className="rounded-2xl border border-white/10 bg-luxury-graphite/90 overflow-hidden shadow-luxury">
                <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-black/30">
                  <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-luxury-gold" />
                    <span>Customer Khata Ledger (कर्ज खातेवही)</span>
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono">
                    {customerLoans.length} total loan record(s)
                  </span>
                </div>

                <div className="overflow-x-auto touch-scroll">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/[0.08] bg-white/[0.03] text-luxury-gold-champagne uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="px-3.5 py-3">Date / स्थिती</th>
                        <th className="px-3.5 py-3">वस्तू</th>
                        <th className="px-3.5 py-3 text-right">वजन (g)</th>
                        <th className="px-3.5 py-3 text-right text-amber-300">Amt (मुद्दल)</th>
                        <th className="px-3.5 py-3 text-right text-rose-300">व्याज</th>
                        <th className="px-3.5 py-3 text-right text-white">Total</th>
                        <th className="px-3.5 py-3 text-right text-emerald-400">जमा</th>
                        <th className="px-3.5 py-3 text-right text-rose-400">बाकी</th>
                        <th className="px-3.5 py-3 text-center">कृती</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {customerLoans.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-neutral-500">
                            No loan accounts recorded for this customer yet.
                          </td>
                        </tr>
                      ) : (
                        customerLoans.map((loan) => {
                          const principal = loan.currentOutstandingPrincipalRupees ?? loan.originalPrincipalRupees;
                          const interest = Math.round(loan.accruedInterestRupees || 0);
                          const total = Math.round(loan.totalDueRupees || principal + interest);
                          const paid = Math.round(
                            (loan.totalInterestPaidRupees || 0) + (loan.totalPrincipalPaidRupees || 0)
                          );
                          const remainingBalance = loan.status === "closed" ? 0 : total;

                          const primaryItem = loan.pledgedItems?.[0];

                          return (
                            <tr key={loan.id || loan._id} className="hover:bg-white/[0.03] transition-colors">
                              {/* Date & Sthitee */}
                              <td className="px-3.5 py-3">
                                <p className="font-mono font-bold text-white text-xs">{loan.loanNumber}</p>
                                <p className="text-[10px] text-neutral-400">
                                  {new Date(loan.mortgageDate).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "2-digit",
                                  })}
                                </p>
                                <span
                                  className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold uppercase mt-0.5 border ${
                                    loan.status === "closed"
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                      : loan.status === "overdue"
                                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                  }`}
                                >
                                  {loan.status === "closed" ? "Closed ✅" : `${loan.monthlyRate}% Active`}
                                </span>
                              </td>

                              {/* वस्तू (Item Name) */}
                              <td className="px-3.5 py-3">
                                <span className="font-semibold text-white truncate max-w-[120px] block">
                                  {primaryItem?.description || "Ornaments"}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  {primaryItem?.metalType === "gold" ? "🪙 Gold 22K" : "🥈 Silver 925"}
                                </span>
                              </td>

                              {/* वजन (Weight) */}
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-white">
                                {loan.totalPledgedGrossWeight.toFixed(3)}g
                              </td>

                              {/* Amt (मुद्दल) */}
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-amber-300">
                                ₹{Math.round(loan.originalPrincipalRupees).toLocaleString("en-IN")}
                              </td>

                              {/* व्याज (Interest) */}
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-rose-300">
                                ₹{interest.toLocaleString("en-IN")}
                              </td>

                              {/* Total (मुद्दल + व्याज) */}
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-white">
                                ₹{total.toLocaleString("en-IN")}
                              </td>

                              {/* जमा (Paid so far) */}
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-400">
                                ₹{paid.toLocaleString("en-IN")}
                              </td>

                              {/* बाकी (Net Balance Due) */}
                              <td className="px-3.5 py-3 text-right">
                                {remainingBalance > 0 ? (
                                  <span className="font-mono text-sm font-bold text-rose-400">
                                    ₹{remainingBalance.toLocaleString("en-IN")}
                                  </span>
                                ) : (
                                  <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                    Cleared ✅
                                  </span>
                                )}
                              </td>

                              {/* कृती (Actions) */}
                              <td className="px-3.5 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Receive Payment */}
                                  {loan.status !== "closed" && (
                                    <button
                                      onClick={() => openPayModal(loan)}
                                      className="btn-3d rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-500 transition"
                                      title="Record payment received"
                                    >
                                      जमा करा
                                    </button>
                                  )}

                                  {/* Print Voucher */}
                                  <button
                                    onClick={() => setPrintLoan(loan)}
                                    className="rounded-lg border border-white/10 bg-white/5 p-1 text-neutral-300 hover:text-white hover:bg-white/10 transition"
                                    title="Print Girvi Mortgage Voucher"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </button>

                                  {/* WhatsApp */}
                                  <a
                                    href={getWhatsAppLoanLink(loan)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg bg-[#25D366]/20 border border-[#25D366]/40 p-1 text-[#25D366] hover:bg-[#25D366] hover:text-white transition"
                                    title="Send WhatsApp notice"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================
          MODAL: RECORD PAYMENT (व्याज / मुद्दल जमा)
          ======================================================== */}
      {isPayOpen && activeLoanForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/40 bg-[#16161c] text-white shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h4 className="font-bold text-sm text-white">Record Payment (जमा रक्कम)</h4>
                <p className="text-[11px] text-neutral-400 font-mono">
                  Loan: {activeLoanForPay.loanNumber} • Rate: {activeLoanForPay.monthlyRate}%
                </p>
              </div>
              <button
                onClick={() => setIsPayOpen(false)}
                className="text-neutral-400 hover:text-white transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              {/* Total Amount Received */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase text-emerald-300">
                    Total Amount Received (₹) *
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Accrued Interest: ₹{Math.round(activeLoanForPay.accruedInterestRupees || 0)}
                  </span>
                </div>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="e.g. 3000"
                  value={payAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPayAmount(val);
                    const n = parseFloat(val) || 0;
                    const accrued = Math.round(activeLoanForPay.accruedInterestRupees || 0);
                    if (n <= accrued) {
                      setPayInterestPortion(n.toString());
                      setPayPrincipalPortion("0");
                    } else {
                      setPayInterestPortion(accrued.toString());
                      setPayPrincipalPortion((n - accrued).toString());
                    }
                  }}
                  className="w-full rounded-xl border border-emerald-500/40 bg-black/60 px-4 py-2.5 text-base font-mono font-bold text-emerald-300 focus:border-emerald-400 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Allocation Split (Interest vs Principal) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-rose-300 mb-1">
                    Interest Paid (व्याज ₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={payInterestPortion}
                    onChange={(e) => setPayInterestPortion(e.target.value)}
                    className="w-full rounded-xl border border-rose-500/30 bg-black/60 px-3 py-1.5 text-xs font-mono text-white focus:border-rose-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-amber-300 mb-1">
                    Principal Paid (मुद्दल ₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={payPrincipalPortion}
                    onChange={(e) => setPayPrincipalPortion(e.target.value)}
                    className="w-full rounded-xl border border-amber-500/30 bg-black/60 px-3 py-1.5 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Mode (Cash vs Online) */}
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-300 mb-1.5">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMode("cash")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold transition border ${
                      payMode === "cash"
                        ? "bg-emerald-600 text-white border-emerald-400 shadow-md"
                        : "bg-black/50 text-neutral-400 border-white/10 hover:text-white"
                    }`}
                  >
                    <span>💵</span>
                    <span>Cash (Rojmel Jama)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode("online")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold transition border ${
                      payMode === "online"
                        ? "bg-cyan-600 text-white border-cyan-400 shadow-md"
                        : "bg-black/50 text-neutral-400 border-white/10 hover:text-white"
                    }`}
                  >
                    <span>📲</span>
                    <span>Online (UPI)</span>
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {payMode === "cash"
                    ? "✓ Cash payment automatically recorded into today's Cash Counter Book."
                    : "✓ Online UPI / Bank transfer."}
                </p>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-300 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white focus:border-luxury-gold focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-300 mb-1">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  placeholder="Optional remarks"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white focus:border-luxury-gold focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="btn-3d rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                >
                  {isSubmittingPay ? "Saving..." : "Save Payment (जमा करा)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PRINTABLE MORTGAGE VOUCHER / RECEIPT (गहाण पावती)
          ======================================================== */}
      {printLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-xl max-h-[92dvh] flex flex-col rounded-2xl border border-white/10 bg-white text-black shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-neutral-900">
                  SIDDHESHWAR JEWELLERS &amp; FINANCE
                </h3>
                <p className="text-xs text-neutral-600">गहाण / कर्ज पावती (Mortgage Voucher)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-neutral-800 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button onClick={() => setPrintLoan(null)} className="text-neutral-500 hover:text-black p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Receipt Info Grid */}
              <div className="grid grid-cols-2 gap-3 bg-neutral-100 p-3 rounded-xl">
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">कर्ज क्र. (Loan No)</p>
                  <p className="font-mono font-bold text-sm text-neutral-900">{printLoan.loanNumber}</p>
                  <p className="text-[11px] text-neutral-600 mt-1">तारीख: {printLoan.mortgageDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">व्याज दर (Monthly Rate)</p>
                  <p className="font-mono font-bold text-sm text-rose-600">{printLoan.monthlyRate}% प्रति महा</p>
                  <p className="text-[11px] text-neutral-600 mt-1">
                    मुदत तारीख: {printLoan.dueDate || "N/A"}
                  </p>
                </div>
              </div>

              {/* Customer */}
              <div className="border p-3 rounded-xl">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">ग्राहकाचे नाव (Customer)</p>
                <p className="font-bold text-sm text-neutral-900">
                  {printLoan.customerId?.fullName || selectedCustomer?.fullName}
                </p>
                <p className="text-neutral-600 font-mono">
                  मोबाईल: {printLoan.customerId?.mobileNumber || selectedCustomer?.mobileNumber}
                </p>
                <p className="text-neutral-600">
                  पत्ता: {printLoan.customerId?.address || selectedCustomer?.address || "Visapur"}
                </p>
              </div>

              {/* Pledged Items */}
              <div className="border p-3 rounded-xl space-y-2">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">गहाण ठेवलेले दागिने (Pledged Collateral)</p>
                <table className="w-full text-left">
                  <thead className="bg-neutral-100 text-[10px] font-bold">
                    <tr>
                      <th className="p-1.5">वस्तू (Item)</th>
                      <th className="p-1.5">प्रकार</th>
                      <th className="p-1.5 text-right">वजन (Weight)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printLoan.pledgedItems?.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-1.5 font-semibold">{item.description}</td>
                        <td className="p-1.5 uppercase">{item.metalType} {item.purity}</td>
                        <td className="p-1.5 text-right font-mono font-bold">{item.grossWeight.toFixed(3)}g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financials */}
              <div className="flex justify-between items-center bg-neutral-900 text-white p-3 rounded-xl font-bold">
                <div>
                  <span className="text-[10px] uppercase font-bold block text-neutral-400">मुद्दल रक्कम (Principal)</span>
                  <span className="font-mono text-base">₹{Math.round(printLoan.originalPrincipalRupees).toLocaleString("en-IN")}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold block text-neutral-400">सध्या बाकी (Total Due)</span>
                  <span className="font-mono text-base text-amber-300">₹{Math.round(printLoan.totalDueRupees || printLoan.originalPrincipalRupees).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-8 text-center text-[10px] text-neutral-600">
                <div className="border-t pt-1 font-semibold">ग्राहकाची सही / अंगठा</div>
                <div className="border-t pt-1 font-semibold">सिद्धेश्वर ज्वेलर्स व फायनान्स (अधिकृत सही)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinanceDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-luxury-muted">
          <div className="inline-block h-8 w-8 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-3" />
          <p className="font-serif text-sm">Loading Finance Dashboard...</p>
        </div>
      }
    >
      <FinanceDashboardContent />
    </Suspense>
  );
}
