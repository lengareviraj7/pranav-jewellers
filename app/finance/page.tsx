"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
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
import CustomerKhataModal, { KhataCustomer } from "@/components/CustomerKhataModal";

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

  // Filter Tabs: 'all' | 'overdue' | '3_days' | 'gold' | 'silver' | 'closed' (same concept as Udhari section)
  const [tab, setTab] = useState<"all" | "overdue" | "3_days" | "gold" | "silver" | "closed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Rate filter: null = no filter, number = filter by that monthly rate (e.g. 2.0, 2.5, 3.0)
  const [rateFilter, setRateFilter] = useState<number | null>(null);

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
  const [issueRate, setIssueRate] = useState<number>(2);
  const [issueDate, setIssueDate] = useState(getTodayIST());
  const [issueItemName, setIssueItemName] = useState("");
  const [issueMetal, setIssueMetal] = useState<"gold" | "silver">("gold");
  const [issueGrossWeight, setIssueGrossWeight] = useState("");
  const [issuePromiseDate, setIssuePromiseDate] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [isIssuingLoan, setIsIssuingLoan] = useState(false);

  // Today and 3 days horizon in IST
  const todayIST = getTodayIST();
  const tDate = new Date();
  const threeDaysDate = new Date(tDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const threeDaysLaterStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(threeDaysDate);

  const isLoanOverdue = useCallback((l: FinanceLoan) => {
    if (l.status === "closed") return false;
    if (l.status === "overdue") return true;
    if (!l.dueDate) return false;
    return l.dueDate <= todayIST;
  }, [todayIST]);

  const isLoanDueIn3Days = useCallback((l: FinanceLoan) => {
    if (l.status === "closed") return false;
    if (!l.dueDate) return false;
    return l.dueDate > todayIST && l.dueDate <= threeDaysLaterStr;
  }, [todayIST, threeDaysLaterStr]);

  const isLoanMatchTab = useCallback((l: FinanceLoan, activeTab: string) => {
    if (activeTab === "overdue") return isLoanOverdue(l);
    if (activeTab === "3_days") return isLoanDueIn3Days(l);
    if (activeTab === "gold") return l.status !== "closed" && l.pledgedItems?.some((p) => p.metalType === "gold");
    if (activeTab === "silver") return l.status !== "closed" && l.pledgedItems?.some((p) => p.metalType === "silver");
    if (activeTab === "closed") return l.status === "closed";
    return true;
  }, [isLoanOverdue, isLoanDueIn3Days]);

  const matchesCustomerFilter = useCallback((cust: Customer, activeTab: string) => {
    if (activeTab === "all") return true;
    const custId = (cust.id || cust._id)?.toString();
    const cleanCustPhone = (cust.mobileNumber || "").replace(/\D/g, "").slice(-10);
    const custLoans = loans.filter((l) => {
      const cId = (l.customerId?._id || l.customerId?.id || l.customerId)?.toString();
      const cleanLoanPhone = (l.customerId?.mobileNumber || "").replace(/\D/g, "").slice(-10);
      return cId === custId || (cleanCustPhone && cleanCustPhone === cleanLoanPhone);
    });

    return custLoans.some((l) => isLoanMatchTab(l, activeTab));
  }, [loans, isLoanMatchTab]);

  const overdueAccountsCount = customers.filter((c) => matchesCustomerFilter(c, "overdue")).length;
  const due3DaysAccountsCount = customers.filter((c) => matchesCustomerFilter(c, "3_days")).length;
  const goldAccountsCount = customers.filter((c) => matchesCustomerFilter(c, "gold")).length;
  const silverAccountsCount = customers.filter((c) => matchesCustomerFilter(c, "silver")).length;
  const closedAccountsCount = customers.filter((c) => matchesCustomerFilter(c, "closed")).length;

  // Specific Object Girvi Payment History & Receipts Modal
  const [viewHistoryLoan, setViewHistoryLoan] = useState<FinanceLoan | null>(null);

  // Customer Full Lifetime Statement Modal (Khatabook view - You Gave / You Got)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedKhataCustomer, setSelectedKhataCustomer] = useState<KhataCustomer | null>(null);

  const openHistoryModal = (customer: {
    fullName?: string;
    name?: string;
    mobileNumber?: string;
    phone?: string;
    address?: string;
    saleId?: string;
  }) => {
    setSelectedKhataCustomer({
      name: customer.fullName || customer.name || "Customer",
      phone: customer.mobileNumber || customer.phone || "",
      address: customer.address || "Visapur",
      saleId: customer.saleId,
    });
    setIsHistoryOpen(true);
  };

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
        (c) => (c.mobileNumber || "").replace(/\D/g, "").slice(-10) === (urlPhone || "").replace(/\D/g, "").slice(-10)
      );
      if (match) setSelectedCustomerId(match.id || match._id);
    }
  }, [urlPhone, customers]);

  // Select first customer if in 'all' and none selected, or ensure selection matches active category tab & rate filter
  useEffect(() => {
    const isCustMatching = (c: Customer) => {
      if (!matchesCustomerFilter(c, tab)) return false;
      if (rateFilter !== null) {
        const custId = (c.id || c._id).toString();
        const cleanPhone = (c.mobileNumber || "").replace(/\D/g, "").slice(-10);
        return loans.some((l) => {
          if (l.status === "closed") return false;
          const cId = (l.customerId?._id || l.customerId?.id || l.customerId)?.toString();
          const lPhone = (l.customerId?.mobileNumber || "").replace(/\D/g, "").slice(-10);
          const isMatch = cId === custId || (cleanPhone && cleanPhone === lPhone);
          return isMatch && Math.abs(l.monthlyRate - rateFilter) < 0.05;
        });
      }
      return true;
    };

    const matching = customers.filter(isCustMatching);
    if (matching.length > 0) {
      const stillSelected = matching.some(
        (c) => (c.id || c._id)?.toString() === selectedCustomerId?.toString()
      );
      if (!stillSelected) {
        setSelectedCustomerId(matching[0].id || matching[0]._id);
      }
    } else {
      setSelectedCustomerId(null);
    }
  }, [tab, rateFilter, customers, loans, selectedCustomerId, matchesCustomerFilter]);

  // Selected Customer details & loans
  const selectedCustomer = customers.find(
    (c) => (c.id || c._id) === selectedCustomerId
  );

  const customerLoans = loans.filter((l) => {
    const custId = l.customerId?._id || l.customerId?.id || l.customerId;
    return custId?.toString() === selectedCustomerId?.toString();
  });

  const rateFilteredCustomerLoans = rateFilter !== null
    ? customerLoans.filter((l) => Math.abs(l.monthlyRate - rateFilter) < 0.05)
    : customerLoans;

  const displayCustomerLoans = tab === "overdue"
    ? rateFilteredCustomerLoans.filter(isLoanOverdue)
    : tab === "3_days"
    ? rateFilteredCustomerLoans.filter(isLoanDueIn3Days)
    : tab === "gold"
    ? rateFilteredCustomerLoans.filter((l) => l.pledgedItems?.some((p) => p.metalType === "gold"))
    : tab === "silver"
    ? rateFilteredCustomerLoans.filter((l) => l.pledgedItems?.some((p) => p.metalType === "silver"))
    : tab === "closed"
    ? rateFilteredCustomerLoans.filter((l) => l.status === "closed")
    : rateFilteredCustomerLoans;

  // Filtered loans for dedicated Category Tab Table (Overdue, Due in 3 Days, Gold, Silver, Closed)
  const filteredCategoryLoans = useMemo(() => {
    return loans.filter((l) => {
      if (!isLoanMatchTab(l, tab)) return false;
      // Rate filter
      if (rateFilter !== null && Math.abs(l.monthlyRate - rateFilter) >= 0.05) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const custName = (l.customerId?.fullName || "").toLowerCase();
        const custPhone = (l.customerId?.mobileNumber || "").toLowerCase();
        const itemDesc = (l.pledgedItems?.[0]?.description || "").toLowerCase();
        const loanNum = (l.loanNumber || "").toLowerCase();
        return custName.includes(q) || custPhone.includes(q) || itemDesc.includes(q) || loanNum.includes(q);
      }
      return true;
    });
  }, [loans, tab, rateFilter, searchQuery, isLoanMatchTab]);

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

  const filteredCustomers = customers.filter((cust) => {
    if (!matchesCustomerFilter(cust, tab)) return false;

    // Rate filter — only show customers who have a loan at this monthly rate
    if (rateFilter !== null) {
      const custId = (cust.id || cust._id).toString();
      const cleanPhone = (cust.mobileNumber || "").replace(/\D/g, "").slice(-10);
      const hasMatchingRate = loans.some((l) => {
        if (l.status === "closed") return false;
        const cId = (l.customerId?._id || l.customerId?.id || l.customerId)?.toString();
        const lPhone = (l.customerId?.mobileNumber || "").replace(/\D/g, "").slice(-10);
        const isMatch = cId === custId || (cleanPhone && cleanPhone === lPhone);
        return isMatch && Math.abs(l.monthlyRate - rateFilter) < 0.05;
      });
      if (!hasMatchingRate) return false;
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

  const handleTabChange = (newTab: "all" | "overdue" | "3_days" | "gold" | "silver" | "closed") => {
    setTab(newTab);
    const matched = customers.filter((cust) => {
      if (!matchesCustomerFilter(cust, newTab)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          cust.fullName?.toLowerCase().includes(q) ||
          cust.mobileNumber?.includes(q) ||
          cust.address?.toLowerCase().includes(q)
        );
      }
      return true;
    });
    if (matched.length > 0) {
      setSelectedCustomerId(matched[0].id || matched[0]._id);
    } else {
      setSelectedCustomerId(null);
    }
  };

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
      setIssueRate(2);
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
    const currentPrincipal = loan.currentOutstandingPrincipalRupees ?? loan.originalPrincipalRupees ?? 0;
    const initialAmount = accruedInterest > 0 ? accruedInterest : Math.min(1000, currentPrincipal);
    setPayAmount(initialAmount.toString());
    if (initialAmount <= accruedInterest) {
      setPayInterestPortion(initialAmount.toString());
      setPayPrincipalPortion("0");
    } else {
      setPayInterestPortion(accruedInterest.toString());
      setPayPrincipalPortion(Math.min(initialAmount - accruedInterest, currentPrincipal).toString());
    }
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
    const isOverdue = isLoanOverdue(loan);
    const isDueSoon = isLoanDueIn3Days(loan);

    let statusAlert = "";
    if (isOverdue) {
      statusAlert = `\n⚠️ *PAYMENT OVERDUE NOTICE*: Your agreed mortgage promise date (${loan.dueDate || "overdue"}) has passed. Kindly visit shop or clear dues.`;
    } else if (isDueSoon) {
      statusAlert = `\n⏰ *UPCOMING DUE REMINDER*: Your agreed mortgage promise date is on ${loan.dueDate} (Due within 3 days).`;
    }

    const text = `Namaste ${cust.fullName} ji! 🙏\nGreetings from Siddheshwar Jewellers & Finance.\nYour Gold Loan *${loan.loanNumber}* has a pending due of *₹${totalDue.toLocaleString(
      "en-IN"
    )}*.${statusAlert}\nPledged Item: ${loan.pledgedItems?.[0]?.description || "Ornaments"} (${loan.totalPledgedGrossWeight}g).\n\n📍 Siddheshwar Jewellers, Visapur\n📞 +91 918329465301`;

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
        </div>

        {/* Global Action Status & Excel Report Download */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/export/finance-loans"
            download
            className="flex items-center gap-1.5 rounded-xl border border-luxury-gold/50 bg-luxury-gold/15 px-3 py-1.5 text-xs font-bold text-luxury-gold hover:bg-luxury-gold hover:text-black transition shadow-gold-glow"
            title="Download complete Gold Finance Portfolio Excel spreadsheet"
          >
            <Download className="h-4 w-4" />
            <span>Excel Report (डाउनलोड)</span>
          </a>
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
        {rateCards.map((c, idx) => {
          const isRateActive = c.rate !== undefined && rateFilter !== null && Math.abs(rateFilter - c.rate) < 0.05;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (c.rate !== undefined) {
                  // Toggle: click same card again to clear filter
                  setRateFilter(isRateActive ? null : c.rate);
                } else {
                  // "Total Cash Financed" card → clear any rate filter
                  setRateFilter(null);
                }
              }}
              className={`w-full text-left rounded-2xl p-3 sm:p-3.5 border transition-all focus:outline-none ${
                c.highlight
                  ? "bg-gradient-to-br from-amber-500/20 via-luxury-gold/15 to-transparent border-luxury-gold/50 shadow-gold-glow"
                  : isRateActive
                  ? "bg-luxury-gold/25 border-luxury-gold shadow-gold-glow ring-2 ring-luxury-gold/50 scale-[1.02]"
                  : "bg-luxury-graphite/70 border-white/[0.08] hover:border-luxury-gold/40 hover:bg-luxury-gold/10 cursor-pointer"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-300 truncate">
                  {c.label}
                </span>
                <span className={`text-[10px] font-mono font-bold ${isRateActive ? "text-luxury-gold animate-pulse" : "text-luxury-gold"}`}>
                  {c.count} acc
                </span>
              </div>
              <p
                className={`font-mono text-base sm:text-lg font-bold mt-1.5 truncate ${
                  c.highlight ? "text-luxury-gold-bright" : isRateActive ? "text-luxury-gold" : "text-white"
                }`}
              >
                ₹{Math.round(c.amount).toLocaleString("en-IN")}
              </p>
              <p className="text-[9px] text-neutral-400 mt-0.5">
                {c.rate ? `${c.rate}% per month` : "Overall active capital"}
              </p>
              {isRateActive && (
                <span className="mt-1.5 inline-block rounded bg-luxury-gold/20 border border-luxury-gold/50 px-1.5 py-0.5 text-[9px] font-bold text-luxury-gold">
                  ✓ Filtered
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── RATE FILTER ACTIVE BANNER ── */}
      {rateFilter !== null && (
        <div className="flex items-center justify-between rounded-xl border border-luxury-gold/40 bg-luxury-gold/10 px-4 py-2 text-xs font-bold text-luxury-gold shadow-gold-glow animate-fadeIn">
          <span>🔍 Showing accounts at <strong>{rateFilter}% / month</strong> interest rate</span>
          <button
            type="button"
            onClick={() => setRateFilter(null)}
            className="ml-3 rounded-lg bg-luxury-gold/20 hover:bg-luxury-gold hover:text-black px-2.5 py-1 text-[10px] font-bold transition"
          >
            ✕ Clear Filter
          </button>
        </div>
      )}

      {/* ── FILTER TABS (Same category sections as Udhari) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          {[
            { id: "all", label: "All Customers", count: customers.length, color: "gold" },
            { id: "overdue", label: "🚨 Overdue Accs", count: overdueAccountsCount, color: "red", highlight: true },
            { id: "3_days", label: "⏰ Due in 3 Days", count: due3DaysAccountsCount, color: "amber", highlight: true },
            { id: "gold", label: "🪙 Gold Cust", count: goldAccountsCount, color: "gold" },
            { id: "silver", label: "🥈 Silver Cust", count: silverAccountsCount, color: "silver" },
            { id: "closed", label: "✅ Cleared", count: closedAccountsCount, color: "green" },
          ].map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id as any)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? item.color === "red"
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-950/50"
                      : item.color === "amber"
                      ? "bg-amber-400 text-black shadow-gold-glow"
                      : "bg-luxury-gold text-black shadow-gold-glow"
                    : "bg-white/[0.05] text-neutral-300 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <span>{item.label}</span>
                {item.count !== null && item.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isActive
                        ? "bg-black text-white"
                        : item.color === "red"
                        ? "bg-rose-500 text-white"
                        : item.color === "amber"
                        ? "bg-amber-500 text-black"
                        : "bg-luxury-gold/30 text-luxury-gold"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search customer, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/60 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:outline-none"
          />
        </div>
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
                {tab === "overdue"
                  ? `🚨 Overdue Accs (${filteredCustomers.length})`
                  : tab === "3_days"
                  ? `⏰ Due in 3 Days (${filteredCustomers.length})`
                  : tab === "gold"
                  ? `🪙 Gold Cust (${filteredCustomers.length})`
                  : tab === "silver"
                  ? `🥈 Silver Cust (${filteredCustomers.length})`
                  : tab === "closed"
                  ? `✅ Cleared (${filteredCustomers.length})`
                  : `Customer Directory (${filteredCustomers.length})`}
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
                <div className="py-8 text-center text-xs text-neutral-400 space-y-1">
                  <p className="font-semibold text-white">
                    {tab === "overdue"
                      ? "No overdue customer accounts! 🎉"
                      : tab === "3_days"
                      ? "No accounts due in the next 3 days."
                      : tab === "closed"
                      ? "No cleared/closed accounts found."
                      : "No matching customers found."}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {tab === "overdue"
                      ? "All active mortgaged customers are currently on schedule."
                      : "Try switching filter to 'All Customers' to view full directory."}
                  </p>
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
                  const isOverdue = matchesCustomerFilter(cust, "overdue");
                  const isDueSoon = matchesCustomerFilter(cust, "3_days");

                  return (
                    <div
                      key={custId}
                      onClick={() => setSelectedCustomerId(custId)}
                      className={`w-full text-left rounded-xl p-3 border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-luxury-gold/15 border-luxury-gold text-white shadow-gold-glow"
                          : "bg-black/40 border-white/[0.06] hover:bg-white/[0.04] text-neutral-300"
                      }`}
                    >
                      <div className="min-w-0 pr-2 flex-1">
                        <p className="font-bold text-xs text-white truncate flex items-center gap-1.5 flex-wrap">
                          <span>{cust.fullName}</span>
                          {hasGold && <span title="Gold Loan">🪙</span>}
                          {hasSilver && <span title="Silver Loan">🥈</span>}
                          {isOverdue && (
                            <span className="rounded bg-rose-500/25 border border-rose-500/50 px-1.5 py-0.2 text-[9px] font-bold text-rose-300 animate-pulse">
                              🚨 Overdue
                            </span>
                          )}
                          {isDueSoon && !isOverdue && (
                            <span className="rounded bg-amber-500/25 border border-amber-500/50 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
                              ⏰ Due in 3d
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] font-mono text-neutral-400 truncate mt-0.5">
                          📞 {cust.mobileNumber}
                        </p>
                        <p className="text-[10px] text-neutral-500 truncate">
                          📍 {cust.address || "Visapur"}
                        </p>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-amber-300 block">
                            ₹{Math.round(totalLoanAmt).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {cLoans.length} loan(s)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomerId(custId);
                            openHistoryModal(cust);
                          }}
                          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white transition shadow-xs whitespace-nowrap"
                          title="Open Customer Khatabook Ledger (जमा करा / You Got)"
                        >
                          जमा करा
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT PANEL: SELECTED CUSTOMER LOAN & KHATA OR CATEGORY VIEW
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">
          {tab !== "all" ? (
            /* ── DEDICATED CATEGORY VIEW (Overdue Accs, Due in 3 Days, Gold Cust, Silver Cust, Cleared) ── */
            <div className="space-y-4">
              {/* Category Header Card */}
              <div className="rounded-2xl border border-white/10 bg-luxury-graphite/90 p-4 sm:p-5 shadow-luxury space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-md ${
                        tab === "overdue"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : tab === "3_days"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : tab === "gold"
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                          : tab === "silver"
                          ? "bg-slate-300/20 text-slate-200 border border-slate-400/40"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      }`}
                    >
                      {tab === "overdue" ? "🚨" : tab === "3_days" ? "⏰" : tab === "gold" ? "🪙" : tab === "silver" ? "🥈" : "✅"}
                    </div>
                    <div>
                      <h2 className="font-serif text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>
                          {tab === "overdue"
                            ? "Overdue Accounts • थकबाकी गहाण यादी"
                            : tab === "3_days"
                            ? "Due in Next 3 Days • ३ दिवसांत मुदत संपणारी खाती"
                            : tab === "gold"
                            ? "Gold Loan Customers • सोने गहाण ग्राहक यादी"
                            : tab === "silver"
                            ? "Silver Loan Customers • चांदी गहाण ग्राहक यादी"
                            : "Cleared Accounts • सोडवलेली / पूर्ण जमा खाती"}
                        </span>
                        <span className="rounded-full bg-black/60 border border-white/10 px-2 py-0.5 text-xs font-mono font-bold text-luxury-gold">
                          {filteredCategoryLoans.length}
                        </span>
                      </h2>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {tab === "overdue"
                          ? "Agreed promise dates that have passed — contact customer immediately for recovery"
                          : tab === "3_days"
                          ? "Upcoming loan due dates within the next 3 days — pre-due recovery reminder queue"
                          : tab === "gold"
                          ? "All active mortgaged gold collateral ornaments and accounts"
                          : tab === "silver"
                          ? "All active mortgaged silver collateral ornaments and accounts"
                          : "Fully cleared and redeemed mortgage accounts"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTabChange("all")}
                      className="flex items-center gap-1.5 rounded-xl border border-luxury-gold/50 bg-luxury-gold/15 px-3.5 py-1.5 text-xs font-bold text-luxury-gold hover:bg-luxury-gold hover:text-black transition shadow-gold-glow"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>सर्व ग्राहक / नवीन कर्ज</span>
                    </button>
                  </div>
                </div>

                {/* Category Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="rounded-xl bg-black/40 border border-white/[0.06] p-2.5">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Accounts</span>
                    <span className="font-mono text-sm font-bold text-white">{filteredCategoryLoans.length} items</span>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/[0.06] p-2.5">
                    <span className="text-[10px] uppercase font-bold text-amber-300 block">Total Principal (मुद्दल)</span>
                    <span className="font-mono text-sm font-bold text-amber-300">
                      ₹{Math.round(filteredCategoryLoans.reduce((sum: number, l: any) => sum + (l.currentOutstandingPrincipalRupees || l.originalPrincipalRupees || 0), 0)).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/[0.06] p-2.5">
                    <span className="text-[10px] uppercase font-bold text-rose-300 block">Accrued Interest (व्याज)</span>
                    <span className="font-mono text-sm font-bold text-rose-300">
                      ₹{Math.round(filteredCategoryLoans.reduce((sum: number, l: any) => sum + (l.accruedInterestRupees || 0), 0)).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/[0.06] p-2.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Total Dues (एकूण बाकी)</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      ₹{Math.round(filteredCategoryLoans.reduce((sum: number, l: any) => sum + (l.totalDueRupees || (l.currentOutstandingPrincipalRupees || l.originalPrincipalRupees || 0)), 0)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Accounts Table */}
              <div className="rounded-2xl border border-white/10 bg-luxury-graphite/90 overflow-hidden shadow-luxury">
                <div className="overflow-x-auto touch-scroll">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/[0.08] bg-white/[0.03] text-luxury-gold-champagne uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="px-3.5 py-3">Customer (ग्राहक)</th>
                        <th className="px-3.5 py-3">Pledged Item (वस्तू)</th>
                        <th className="px-3.5 py-3 text-right">वजन (g)</th>
                        <th className="px-3.5 py-3 text-right text-amber-300">Amt (मुद्दल)</th>
                        <th className="px-3.5 py-3 text-right text-rose-300">व्याज</th>
                        <th className="px-3.5 py-3 text-right text-white">एकूण बाकी</th>
                        <th className="px-3.5 py-3 text-center">मुदत तारीख व स्थिती</th>
                        <th className="px-3.5 py-3 text-center">कृती</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredCategoryLoans.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-neutral-400 space-y-3">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xl">
                              {tab === "overdue" ? "🎉" : tab === "3_days" ? "⏰" : "📋"}
                            </div>
                            <p className="font-serif text-sm font-bold text-white">
                              {tab === "overdue"
                                ? "कोणतीही थकबाकी (Overdue) खाती नाहीत 🎉"
                                : tab === "3_days"
                                ? "येत्या ३ दिवसांत कोणतीही मुदत संपणारी खाती नाहीत."
                                : "या फिल्टरसाठी कोणतीही खाती आढळली नाहीत."}
                            </p>
                            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                              {tab === "overdue"
                                ? "सध्या सर्व ग्राहकांची कर्जे वेळेवर चालू आहेत."
                                : "इतर पर्याय निवडा किंवा सर्व ग्राहक यादी पहा."}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleTabChange("all")}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-luxury-gold px-4 py-1.5 text-xs font-bold text-black shadow-gold-glow hover:brightness-105 transition"
                            >
                              सर्व ग्राहक पहा (View All Customers)
                            </button>
                          </td>
                        </tr>
                      ) : (
                        filteredCategoryLoans.map((loan: any) => {
                          const principal = loan.currentOutstandingPrincipalRupees ?? loan.originalPrincipalRupees;
                          let interest = Math.round(loan.accruedInterestRupees || 0);
                          let total = Math.round(loan.totalDueRupees || principal + interest);
                          if (loan.status !== "closed" && principal > 0) {
                            try {
                              const calc = calculateMortgageInterest({
                                mortgageDate: loan.mortgageDate,
                                principalRupees: principal,
                                asOfDate: todayIST,
                                monthlyRate: loan.monthlyRate || 2,
                                interestMode: loan.interestMode || "yearly_compound",
                              });
                              interest = Math.round(calc.interestRupees);
                              total = Math.round(calc.totalDueRupees);
                            } catch {}
                          }

                          const primaryItem = loan.pledgedItems?.[0];
                          const isOverdue = isLoanOverdue(loan);
                          const isDueSoon = isLoanDueIn3Days(loan);
                          const cust = loan.customerId;
                          const custName = cust?.fullName || "Customer";
                          const custPhone = cust?.mobileNumber || "";
                          const custAddr = cust?.address || "Visapur";

                          // Calculate days text
                          let daysText = "";
                          if (loan.dueDate) {
                            const diff = Math.floor(
                              (new Date(todayIST).getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                            );
                            if (diff > 0) {
                              daysText = `${diff} दिवस उशीर`;
                            } else if (diff < 0) {
                              daysText = `${Math.abs(diff)} दिवसांत`;
                            } else {
                              daysText = `आज मुदत`;
                            }
                          }

                          return (
                            <tr key={loan.id || loan._id} className="hover:bg-white/[0.03] transition-colors">
                              {/* Customer */}
                              <td className="px-3.5 py-3">
                                <div>
                                  <span
                                    onClick={() => {
                                      if (cust?._id || cust?.id) {
                                        setSelectedCustomerId(cust._id || cust.id);
                                        handleTabChange("all");
                                      }
                                    }}
                                    className="font-bold text-white hover:text-luxury-gold cursor-pointer block truncate"
                                    title="Click to view customer khata"
                                  >
                                    {custName}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                                    <span className="font-mono">{custPhone}</span>
                                    <span>•</span>
                                    <span className="truncate">{custAddr}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Pledged Item */}
                              <td className="px-3.5 py-3">
                                <div>
                                  <span className="font-medium text-white flex items-center gap-1">
                                    <span>{primaryItem?.description || "Collateral"}</span>
                                    {primaryItem?.metalType === "gold" ? (
                                      <span className="text-[10px] font-bold text-amber-300">🪙 22K</span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-slate-300">🥈 925</span>
                                    )}
                                  </span>
                                  <span className="text-[10px] font-mono text-luxury-gold block">
                                    {loan.loanNumber} • {loan.mortgageDate}
                                  </span>
                                </div>
                              </td>

                              {/* Weight */}
                              <td className="px-3.5 py-3 text-right font-mono text-neutral-300">
                                {primaryItem?.grossWeight ? `${primaryItem.grossWeight.toFixed(3)}g` : "—"}
                              </td>

                              {/* Principal */}
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-amber-300">
                                ₹{Math.round(principal).toLocaleString("en-IN")}
                              </td>

                              {/* Interest */}
                              <td className="px-3.5 py-3 text-right font-mono text-rose-300">
                                ₹{Math.round(interest).toLocaleString("en-IN")}
                              </td>

                              {/* Total Due */}
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-white">
                                ₹{Math.round(total).toLocaleString("en-IN")}
                              </td>

                              {/* Due Date & Status */}
                              <td className="px-3.5 py-3 text-center">
                                <div className="inline-flex flex-col items-center">
                                  {isOverdue ? (
                                    <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300 animate-pulse">
                                      🚨 {daysText} ({loan.dueDate})
                                    </span>
                                  ) : isDueSoon ? (
                                    <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                      ⏰ {daysText} ({loan.dueDate})
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-mono text-neutral-400">
                                      {loan.dueDate || "—"}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-3.5 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {/* Direct Jama Kara button -> opens Khatabook Ledger */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const c = loan.customerId || selectedCustomer;
                                      if (c) {
                                        openHistoryModal({
                                          ...c,
                                          saleId: loan.id || loan._id,
                                        });
                                      }
                                    }}
                                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 text-[11px] transition shadow-xs flex items-center gap-1"
                                    title="Open Customer Khatabook Ledger (जमा करा / You Got)"
                                  >
                                    <span>💵</span>
                                    <span>जमा करा</span>
                                  </button>

                                  {/* Specific Object Statement / History */}
                                  <button
                                    type="button"
                                    onClick={() => setViewHistoryLoan(loan)}
                                    className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold px-2 py-1 text-[11px] transition"
                                    title="या वस्तूचा हिशोब व पावत्या पहा (View Object Receipts & Statement)"
                                  >
                                    तपशील
                                  </button>

                                  {/* WhatsApp */}
                                  {custPhone && (
                                    <a
                                      href={getWhatsAppLoanLink(loan)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-lg bg-[#25D366]/20 border border-[#25D366]/40 p-1 text-[#25D366] hover:bg-[#25D366] hover:text-white transition"
                                      title="Send WhatsApp Reminder"
                                    >
                                      <MessageCircle className="h-3.5 w-3.5" />
                                    </a>
                                  )}

                                  {/* Phone Call */}
                                  {custPhone && (
                                    <a
                                      href={`tel:${custPhone.replace(/\D/g, "")}`}
                                      className="rounded-lg bg-white/10 p-1 text-neutral-300 hover:bg-white/20 hover:text-white transition"
                                      title="Call customer"
                                    >
                                      <Phone className="h-3.5 w-3.5" />
                                    </a>
                                  )}
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
            </div>
          ) : !selectedCustomer ? (
            /* Standard View: No Customer Selected */
            <div className="rounded-2xl border border-white/10 bg-luxury-graphite/60 p-12 text-center text-neutral-400 space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20 text-2xl">
                👑
              </div>
              <p className="font-serif text-base font-bold text-white">
                कोणताही ग्राहक निवडलेला नाही
              </p>
              <p className="text-xs max-w-md mx-auto text-neutral-400">
                डाव्या बाजूच्या ग्राहक यादीमधून ग्राहक निवडा किंवा नवीन ग्राहक जोडा.
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
                  {/* Direct Jama Kara Button -> opens Khatabook Ledger */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCustomer) {
                        openHistoryModal(selectedCustomer);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 border border-emerald-400/60 px-3.5 py-1.5 text-xs font-bold text-white hover:brightness-105 active:scale-95 transition shadow-md shadow-emerald-950/40"
                    title="Open Customer Khatabook Ledger (जमा करा / You Got)"
                  >
                    <span>💵</span>
                    <span>जमा करा</span>
                  </button>

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
                          value={issueRate.toString()}
                          onChange={(e) => setIssueRate(parseFloat(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono font-bold text-white focus:border-luxury-gold focus:outline-none"
                        >
                          <option value="2">2.0% / month (Default)</option>
                          <option value="1.5">1.5% / month</option>
                          <option value="1.75">1.75% / month</option>
                          <option value="2.5">2.5% / month</option>
                          <option value="3">3.0% / month</option>
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

                  {/* Live Calculation Preview (Concept from Siddheshwar Mortgage Calculator) */}
                  {parseFloat(issuePrincipal) > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-luxury-gold/40 bg-gradient-to-r from-amber-950/30 via-luxury-gold/10 to-transparent p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-luxury-gold-champagne">Monthly Interest:</span>
                        <span className="font-mono text-sm font-bold text-amber-300">
                          ₹{Math.round((parseFloat(issuePrincipal) * (issueRate || 2)) / 100).toLocaleString("en-IN")} / month
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">(@ {issueRate || 2}% / month)</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
                        <Sparkles className="h-3.5 w-3.5 text-luxury-gold" />
                        <span>Siddheshwar Mortgage Engine (12 mo compounding)</span>
                      </div>
                    </div>
                  )}

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
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCustomer) {
                          openHistoryModal(selectedCustomer);
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-400 bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-sm"
                      title="Open Customer Khatabook Ledger (जमा करा / You Got)"
                    >
                      <span>💵</span>
                      <span>जमा करा</span>
                    </button>
                    <span className="text-xs text-neutral-400 font-mono">
                      {displayCustomerLoans.length} {tab !== "all" ? `(${tab})` : ""} loan record(s)
                    </span>
                  </div>
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
                      {displayCustomerLoans.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-neutral-400 space-y-2">
                            <p className="font-semibold text-white">
                              या ग्राहकासाठी कोणतीही कर्जे आढळली नाहीत.
                            </p>
                            {tab !== "all" && (
                              <button
                                type="button"
                                onClick={() => handleTabChange("all")}
                                className="mt-2 text-xs font-bold text-luxury-gold underline hover:text-white block mx-auto"
                              >
                                या ग्राहकाची सर्व कर्जे पहा ({customerLoans.length})
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        displayCustomerLoans.map((loan) => {
                          const principal = loan.currentOutstandingPrincipalRupees ?? loan.originalPrincipalRupees;
                          let interest = Math.round(loan.accruedInterestRupees || 0);
                          let total = Math.round(loan.totalDueRupees || principal + interest);
                          let elapsedDesc = "";

                          // Dynamic calculation per Siddheshwar Mortgage Calculator concept
                          if (loan.status !== "closed" && principal > 0) {
                            try {
                              const calc = calculateMortgageInterest({
                                mortgageDate: loan.mortgageDate,
                                principalRupees: principal,
                                asOfDate: todayIST,
                                monthlyRate: loan.monthlyRate || 2,
                                interestMode: loan.interestMode || "yearly_compound",
                              });
                              interest = Math.round(calc.interestRupees);
                              total = Math.round(calc.totalDueRupees);
                              elapsedDesc = calc.elapsedDescription;
                            } catch {
                              // fallback
                            }
                          }

                          const paid = Math.round(
                            (loan.totalInterestPaidRupees || 0) + (loan.totalPrincipalPaidRupees || 0)
                          );
                          const remainingBalance = loan.status === "closed" ? 0 : total;
                          const primaryItem = loan.pledgedItems?.[0];
                          const isOverdue = isLoanOverdue(loan);
                          const isDueSoon = isLoanDueIn3Days(loan);

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
                                {loan.status === "closed" ? (
                                  <span className="inline-block rounded px-1.5 py-0.2 text-[9px] font-bold uppercase mt-0.5 border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                                    Closed ✅
                                  </span>
                                ) : isOverdue ? (
                                  <span className="inline-block rounded px-1.5 py-0.2 text-[9px] font-bold uppercase mt-0.5 border bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse">
                                    🚨 Overdue {loan.dueDate ? `(${loan.dueDate})` : ""}
                                  </span>
                                ) : isDueSoon ? (
                                  <span className="inline-block rounded px-1.5 py-0.2 text-[9px] font-bold uppercase mt-0.5 border bg-amber-500/20 text-amber-300 border-amber-500/40">
                                    ⏰ Due: {loan.dueDate}
                                  </span>
                                ) : (
                                  <span className="inline-block rounded px-1.5 py-0.2 text-[9px] font-bold uppercase mt-0.5 border bg-amber-500/20 text-amber-300 border-amber-500/40">
                                    {loan.monthlyRate}% Active
                                  </span>
                                )}
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
                              <td className="px-3.5 py-3 text-right">
                                <span className="font-mono font-bold text-rose-300 block">
                                  ₹{interest.toLocaleString("en-IN")}
                                </span>
                                {elapsedDesc && (
                                  <span className="text-[9px] font-mono text-neutral-400 block truncate max-w-[120px] ml-auto" title={elapsedDesc}>
                                    {elapsedDesc}
                                  </span>
                                )}
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
                                      onClick={() => {
                                        const c = loan.customerId || selectedCustomer;
                                        if (c) {
                                          openHistoryModal({
                                            ...c,
                                            saleId: loan.id || loan._id,
                                          });
                                        }
                                      }}
                                      className="btn-3d rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-500 transition"
                                      title="Open Customer Khatabook Ledger (जमा करा / You Got)"
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

                                  {/* Specific Object History & Receipts */}
                                  <button
                                    type="button"
                                    onClick={() => setViewHistoryLoan(loan)}
                                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500 hover:text-black transition"
                                    title="View Payment Receipts & Ledger for this object"
                                  >
                                    तपशील
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
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Record Payment (जमा रक्कम)</span>
                  <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    {activeLoanForPay.pledgedItems?.[0]?.description || "Ornaments"}
                  </span>
                </h4>
                <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  Loan: {activeLoanForPay.loanNumber} • Rate: {activeLoanForPay.monthlyRate}% • Wt: {activeLoanForPay.totalPledgedGrossWeight}g
                </p>
              </div>
              <button
                onClick={() => setIsPayOpen(false)}
                className="text-neutral-400 hover:text-white transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Object financial snapshot */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl border border-white/10 bg-black/40 text-center font-mono">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block font-bold">शिल्लक मुद्दल</span>
                <span className="text-xs font-bold text-amber-300">
                  ₹{Math.round(activeLoanForPay.currentOutstandingPrincipalRupees ?? activeLoanForPay.originalPrincipalRupees).toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block font-bold">शिल्लक व्याज</span>
                <span className="text-xs font-bold text-rose-300">
                  ₹{Math.round(activeLoanForPay.accruedInterestRupees || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block font-bold">एकूण बाकी</span>
                <span className="text-xs font-bold text-emerald-400">
                  ₹{Math.round(activeLoanForPay.totalDueRupees || 0).toLocaleString("en-IN")}
                </span>
              </div>
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
                    const currentPrincipal =
                      activeLoanForPay.currentOutstandingPrincipalRupees ?? activeLoanForPay.originalPrincipalRupees ?? 0;
                    if (n <= accrued) {
                      setPayInterestPortion(n.toString());
                      setPayPrincipalPortion("0");
                    } else {
                      setPayInterestPortion(accrued.toString());
                      setPayPrincipalPortion(Math.min(n - accrued, currentPrincipal).toString());
                    }
                  }}
                  className="w-full rounded-xl border border-emerald-500/40 bg-black/60 px-4 py-2.5 text-base font-mono font-bold text-emerald-300 focus:border-emerald-400 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Priority explanation badge */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-3 py-2 text-[11px] text-emerald-300 flex items-center justify-between">
                <span>पहिली वजावट व्याज (₹{payInterestPortion || 0})</span>
                <span className="text-neutral-500 font-bold">→</span>
                <span>उरलेली रक्कम मुद्दल (₹{payPrincipalPortion || 0})</span>
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
          MODAL: OBJECT-SPECIFIC GIRVI HISTORY & RECEIPTS (तपशील)
          ======================================================== */}
      {viewHistoryLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl border border-luxury-gold/40 bg-[#16161c] text-white shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>वस्तू कर्ज पावती व इतिहास (Object Loan Statement)</span>
                </h4>
                <p className="text-[11px] text-neutral-400 font-mono">
                  {viewHistoryLoan.loanNumber} • {viewHistoryLoan.pledgedItems?.[0]?.description || "Ornaments"}
                </p>
              </div>
              <button
                onClick={() => setViewHistoryLoan(null)}
                className="text-neutral-400 hover:text-white transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Object Specs Banner */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block font-bold">वस्तू / धातू</span>
                <span className="text-xs font-bold text-white truncate block">
                  {viewHistoryLoan.pledgedItems?.[0]?.description || "Ornaments"}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {viewHistoryLoan.pledgedItems?.[0]?.metalType === "gold" ? "🪙 Gold 22K" : "🥈 Silver 925"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block font-bold">वजन (Weight)</span>
                <span className="text-xs font-bold text-amber-300">
                  {viewHistoryLoan.totalPledgedGrossWeight.toFixed(3)}g
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block font-bold">व्याज दर (Rate)</span>
                <span className="text-xs font-bold text-luxury-gold">
                  {viewHistoryLoan.monthlyRate}% / mo
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block font-bold">कर्ज तारीख</span>
                <span className="text-xs font-bold text-neutral-300">
                  {viewHistoryLoan.mortgageDate}
                </span>
              </div>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl border border-luxury-gold/20 bg-luxury-gold/5 text-center font-mono">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block font-bold">सुरुवातीची मुद्दल</span>
                <span className="text-xs font-bold text-neutral-300">
                  ₹{Math.round(viewHistoryLoan.originalPrincipalRupees).toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block font-bold">चालू मुद्दल बाकी</span>
                <span className="text-xs font-bold text-amber-300">
                  ₹{Math.round(viewHistoryLoan.currentOutstandingPrincipalRupees ?? viewHistoryLoan.originalPrincipalRupees).toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block font-bold">चालू व्याज बाकी</span>
                <span className="text-xs font-bold text-rose-400">
                  ₹{Math.round(viewHistoryLoan.accruedInterestRupees || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Payment Receipts on THIS loan */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center justify-between">
                <span>या वस्तूवर जमा पावत्या (Receipts for this object)</span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {viewHistoryLoan.paymentHistory?.length || 0} पावत्या
                </span>
              </h5>

              {!viewHistoryLoan.paymentHistory || viewHistoryLoan.paymentHistory.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-500 border border-dashed border-white/10 rounded-xl bg-black/20">
                  या वस्तूवर अजून कोणतीही जमा रक्कम आलेली नाही (No receipts recorded yet for this object).
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {viewHistoryLoan.paymentHistory.map((p: any, idx: number) => (
                    <div
                      key={p.id || idx}
                      className="rounded-xl border border-white/10 bg-black/50 p-2.5 flex items-center justify-between font-mono text-xs"
                    >
                      <div>
                        <div className="font-bold text-emerald-400 flex items-center gap-2">
                          <span>{p.receiptNumber || `RCP-${idx + 1}`}</span>
                          <span className="text-[10px] text-neutral-400 font-normal">
                            {p.paymentDate || (p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "")}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          व्याज: ₹{p.interestAppliedRupees || 0} • मुद्दल: ₹{p.principalAppliedRupees || 0} • पद्धत: {p.paymentMethod || "Cash"}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-emerald-300 block">
                          ₹{Number(p.totalAmountRupees || 0).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[9px] text-neutral-500 block">
                          उरलेली मुद्दल: ₹{p.newOutstandingPrincipalRupees ?? "-"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Jama Kara CTA */}
            {viewHistoryLoan.status !== "closed" && (
              <button
                type="button"
                onClick={() => {
                  const target = viewHistoryLoan;
                  setViewHistoryLoan(null);
                  openPayModal(target);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-2.5 text-xs font-bold text-white hover:brightness-105 active:scale-95 transition shadow-lg shadow-emerald-950/50"
              >
                <span>💵</span>
                <span>या वस्तूवर जमा करा (Pay Due for this Object)</span>
              </button>
            )}
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

      {/* ========================================================
          MODAL: CUSTOMER KHATABOOK LEDGER & STATEMENT (You Gave / You Got)
          ======================================================== */}
      {isHistoryOpen && selectedKhataCustomer && (
        <CustomerKhataModal
          customer={selectedKhataCustomer}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onDataChanged={fetchData}
        />
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
