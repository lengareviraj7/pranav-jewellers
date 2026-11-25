"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
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
  Trash2,
  Lock,
} from "lucide-react";
import {
  calculateMortgageInterest,
  getTodayIST,
  MortgageResult,
  formatINR,
} from "@/lib/mortgage-engine";
import ReceiptModal from "@/components/ReceiptModal";
import { TiltCard, AnimatedNumber } from "@/components/Motion";

interface Customer {
  id: string;
  _id: string;
  customerId: string;
  fullName: string;
  mobileNumber: string;
  secondaryPhone?: string;
  address?: string;
  identificationType?: string;
  identificationNumber?: string;
  activeLoansCount?: number;
  totalOutstandingPrincipalRupees?: number;
  totalAccruedInterestRupees?: number;
  totalDueRupees?: number;
}

interface PledgedItem {
  description: string;
  metalType: "gold" | "silver";
  purity: string;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  identificationMark?: string;
}

interface Loan {
  id: string;
  _id: string;
  loanNumber: string;
  customerId: Customer;
  mortgageDate: string;
  dueDate?: string;
  originalPrincipalRupees: number;
  currentOutstandingPrincipalRupees: number;
  monthlyRate: number;
  interestMode: "yearly_compound" | "simple";
  accruedInterestRupees: number;
  totalDueRupees: number;
  totalInterestPaidRupees: number;
  totalPrincipalPaidRupees: number;
  status: "active" | "partially_paid" | "overdue" | "closed";
  pledgedItems: PledgedItem[];
  totalPledgedGrossWeight: number;
  totalPledgedNetWeight: number;
  calcEngineDetails?: any;
  paymentHistory?: any[];
}

function GoldFinancePageInner() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const [activeTab, setActiveTab] = useState<"khatabook" | "loans" | "dues" | "customers" | "calculator">("khatabook");
  const [selectedKhataCustomerId, setSelectedKhataCustomerId] = useState<string | null>(null);
  const [khataFilter, setKhataFilter] = useState<"all" | "pending" | "overdue">("all");
  const [khataSearch, setKhataSearch] = useState("");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [duesSummary, setDuesSummary] = useState<any>(null);
  const [duesList, setDuesList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [loanStatusFilter, setLoanStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);
  const [selectedCustomerForView, setSelectedCustomerForView] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // --- Calculator Tab State (Siddheshwar Engine Native) ---
  const [calcInputs, setCalcInputs] = useState({
    mortgageDate: getTodayIST(),
    asOfDate: getTodayIST(),
    principalRupees: "20000",
    monthlyRate: "2.0",
    interestMode: "yearly_compound" as "yearly_compound" | "simple",
  });
  const [calcResult, setCalcResult] = useState<MortgageResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  // --- New Loan Form State ---
  const [newLoanForm, setNewLoanForm] = useState({
    customerId: "",
    mortgageDate: getTodayIST(),
    principalRupees: "",
    monthlyRate: "2.0",
    interestMode: "yearly_compound" as "yearly_compound" | "simple",
    dueDate: "",
    notes: "",
    pledgedItems: [
      {
        description: "Gold Ornaments",
        metalType: "gold" as "gold" | "silver",
        purity: "22K",
        quantity: 1,
        grossWeight: "",
        netWeight: "",
        identificationMark: "",
      },
    ],
  });

  // --- Payment Form State ---
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: getTodayIST(),
    totalAmountRupees: "",
    principalAppliedRupees: "",
    interestAppliedRupees: "",
    paymentMethod: "cash" as "cash" | "bank_transfer" | "upi" | "cheque",
    referenceTransactionId: "",
    notes: "",
  });

  // --- Customer Form State ---
  const [customerForm, setCustomerForm] = useState({
    fullName: "",
    mobileNumber: "",
    secondaryPhone: "",
    address: "",
    identificationType: "aadhar",
    identificationNumber: "",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Loans
      let loansUrl = `/api/finance/loans?status=${loanStatusFilter}`;
      if (searchQuery.trim()) loansUrl += `&search=${encodeURIComponent(searchQuery.trim())}`;
      const loansRes = await fetch(loansUrl);
      const loansData = await loansRes.json();
      if (loansData.success) {
        setLoans(loansData.loans);
      }

      // 2. Fetch Customers
      const custRes = await fetch(`/api/finance/customers`);
      const custData = await custRes.json();
      if (custData.success) {
        setCustomers(custData.customers);
        setSelectedKhataCustomerId((prev) =>
          prev || (custData.customers.length > 0 ? (custData.customers[0].id || custData.customers[0]._id) : null)
        );
      }

      // 3. Fetch Dues
      const duesRes = await fetch(`/api/finance/dues`);
      const duesData = await duesRes.json();
      if (duesData.success) {
        setDuesSummary(duesData.summary);
        setDuesList(duesData.dues);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loanStatusFilter, searchQuery]);

  useEffect(() => {
    fetchData();
    const handleRefresh = () => fetchData();
    window.addEventListener("sj-refresh-data", handleRefresh);
    return () => window.removeEventListener("sj-refresh-data", handleRefresh);
  }, [fetchData]);

  // Run Calculator locally whenever inputs change
  useEffect(() => {
    try {
      setCalcError(null);
      const p = Number(calcInputs.principalRupees);
      const r = Number(calcInputs.monthlyRate);
      if (p > 0 && r >= 0 && calcInputs.mortgageDate && calcInputs.asOfDate) {
        const res = calculateMortgageInterest({
          mortgageDate: calcInputs.mortgageDate,
          principalRupees: p,
          asOfDate: calcInputs.asOfDate,
          monthlyRate: r,
          interestMode: calcInputs.interestMode,
        });
        setCalcResult(res);
      } else {
        setCalcResult(null);
      }
    } catch (err: any) {
      setCalcError(err.message);
      setCalcResult(null);
    }
  }, [calcInputs]);

  // --- Handlers ---
  const handleOpenLoanInCalculator = (loan: Loan) => {
    setCalcInputs({
      mortgageDate: loan.mortgageDate,
      asOfDate: getTodayIST(),
      principalRupees: String(loan.currentOutstandingPrincipalRupees),
      monthlyRate: String(loan.monthlyRate),
      interestMode: loan.interestMode,
    });
    setActiveTab("calculator");
  };

  const handleOpenPaymentModal = (loan: Loan) => {
    setSelectedLoanForPayment(loan);
    setPaymentForm({
      paymentDate: getTodayIST(),
      totalAmountRupees: String(loan.accruedInterestRupees || ""),
      interestAppliedRupees: String(loan.accruedInterestRupees || ""),
      principalAppliedRupees: "0",
      paymentMethod: "cash",
      referenceTransactionId: "",
      notes: "",
    });
    setIsPaymentOpen(true);
  };

  const handleViewCustomerProfile = async (customerId: string) => {
    try {
      const res = await fetch(`/api/finance/customers/${customerId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCustomerForView(data);
        setIsCustomerModalOpen(true);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit New Loan
  const handleNewLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/finance/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLoanForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create loan");

      setSuccessMsg(`Gold loan "${data.loan.loanNumber}" issued successfully!`);
      setIsNewLoanOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForPayment) return;

    try {
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentForm,
          loanId: selectedLoanForPayment.id || selectedLoanForPayment._id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Payment recording failed");

      setIsPaymentOpen(false);
      fetchData();

      // Show receipt modal
      setReceiptData({
        receiptNumber: data.payment.receiptNumber,
        paymentDate: data.payment.paymentDate,
        loanNumber: data.loan.loanNumber,
        customerName: data.customer.fullName,
        customerMobile: data.customer.mobileNumber,
        customerAddress: data.customer.address,
        totalAmountRupees: data.payment.totalAmountRupees,
        principalAppliedRupees: data.payment.principalAppliedRupees,
        interestAppliedRupees: data.payment.interestAppliedRupees,
        previousOutstandingPrincipalRupees: data.payment.previousOutstandingPrincipalRupees,
        newOutstandingPrincipalRupees: data.payment.newOutstandingPrincipalRupees,
        paymentMethod: data.payment.paymentMethod,
        referenceTransactionId: data.payment.referenceTransactionId,
        notes: data.payment.notes,
      });
      setIsReceiptOpen(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit New Customer
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/finance/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to register customer");

      setSuccessMsg(`Customer "${data.customer.fullName}" (${data.customer.customerId}) registered!`);
      setCustomerForm({
        fullName: "",
        mobileNumber: "",
        secondaryPhone: "",
        address: "",
        identificationType: "aadhar",
        identificationNumber: "",
        notes: "",
      });
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Add pledged item row in new loan form
  const addPledgedItemRow = () => {
    setNewLoanForm({
      ...newLoanForm,
      pledgedItems: [
        ...newLoanForm.pledgedItems,
        {
          description: "Gold Ornaments",
          metalType: "gold",
          purity: "22K",
          quantity: 1,
          grossWeight: "",
          netWeight: "",
          identificationMark: "",
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-luxury-gold">
            Secured Gold Lending & Mortgage Engine
          </span>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-luxury-onyx sm:text-3xl">
            Gold Finance & Mortgage Management
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">
            Strict isolation of customer pledged gold, native compound mortgage calculator, payment allocations, and customer dues ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/export/finance-loans"
            download
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition border border-emerald-400/30"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Loans (Excel)</span>
          </a>

          <button
            onClick={() => setIsNewLoanOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-4 py-2 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 active:scale-95 transition btn-3d"
          >
            <Plus className="h-4 w-4 text-black" />
            <span>Issue New Gold Loan</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-red-950/40 p-3 text-xs text-red-300 border border-red-500/40 backdrop-blur-md animate-slideDown">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center justify-between rounded-xl bg-luxury-gold-subtle/50 p-3 text-xs text-luxury-gold-bright border border-luxury-gold/40 backdrop-blur-md font-medium animate-slideDown">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-luxury-gold" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Finance Navigation Tabs */}
      <div className="flex rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 p-1.5 shadow-sm max-w-3xl overflow-x-auto backdrop-blur-md">
        <button
          onClick={() => setActiveTab("khatabook")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 shrink-0 ${
            activeTab === "khatabook"
              ? "bg-luxury-gold text-black shadow-gold-glow font-bold border border-luxury-gold-bright"
              : "text-luxury-muted hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Grahak Khata Book (खाते पुस्तक)</span>
        </button>

        <button
          onClick={() => setActiveTab("loans")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 shrink-0 ${
            activeTab === "loans"
              ? "bg-luxury-gold text-black shadow-gold-glow font-bold border border-luxury-gold-bright"
              : "text-luxury-muted hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <Landmark className="h-4 w-4" />
          <span>Active Loans ({loans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("dues")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 shrink-0 ${
            activeTab === "dues"
              ? "bg-luxury-gold text-black shadow-gold-glow font-bold border border-luxury-gold-bright"
              : "text-luxury-muted hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Outstanding Dues</span>
        </button>

        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 shrink-0 ${
            activeTab === "customers"
              ? "bg-luxury-gold text-black shadow-gold-glow font-bold border border-luxury-gold-bright"
              : "text-luxury-muted hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Customer Profiles ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("calculator")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 shrink-0 ${
            activeTab === "calculator"
              ? "bg-luxury-gold text-black shadow-gold-glow font-bold border border-luxury-gold-bright"
              : "text-luxury-muted hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <Calculator className="h-4 w-4" />
          <span>Mortgage Calculator</span>
        </button>
      </div>

      {/* TAB 0: AUTHENTIC KHATABOOK GIRVI LEDGER */}
      {activeTab === "khatabook" && (() => {
        // Compute master Khatabook figures
        const totalYouWillGet = loans.reduce((acc, l) => acc + (l.totalDueRupees || 0), 0);
        const totalPledgedGoldGrams = loans.reduce((acc, l) => acc + (l.totalPledgedNetWeight || 0), 0);
        const totalOrnamentsCount = loans.reduce((acc, l) => acc + (l.pledgedItems?.length || 0), 0);

        // Filter customers
        const filteredCustomers = customers.filter((c) => {
          const matchSearch =
            !khataSearch.trim() ||
            c.fullName.toLowerCase().includes(khataSearch.toLowerCase()) ||
            c.mobileNumber.includes(khataSearch);

          if (!matchSearch) return false;
          if (khataFilter === "pending") return (c.totalDueRupees || 0) > 0;
          if (khataFilter === "overdue") {
            const hasOverdue = loans.some(
              (l) => (l.customerId?._id || l.customerId) === (c.id || c._id) && l.status === "overdue"
            );
            return hasOverdue;
          }
          return true;
        });

        const activeCustomer =
          customers.find((c) => (c.id || c._id) === selectedKhataCustomerId) ||
          customers[0] ||
          null;

        const custLoans = activeCustomer
          ? loans.filter(
              (l) => (l.customerId?._id || l.customerId) === (activeCustomer.id || activeCustomer._id)
            )
          : [];

        const custTotalDue = custLoans.reduce((sum, l) => sum + (l.totalDueRupees || 0), 0);
        const custOutstandingPrincipal = custLoans.reduce(
          (sum, l) => sum + (l.currentOutstandingPrincipalRupees || 0),
          0
        );
        const custAccruedInterest = custLoans.reduce((sum, l) => sum + (l.accruedInterestRupees || 0), 0);
        const custPledgedNetWeight = custLoans.reduce((sum, l) => sum + (l.totalPledgedNetWeight || 0), 0);
        const custPledgedItems = custLoans.flatMap((l) => l.pledgedItems || []);

        // Passbook entries flattened & sorted
        type KhataEntry = {
          id: string;
          date: string;
          type: "gave" | "got";
          title: string;
          subtitle: string;
          amount: number;
          loanId: string;
          loanNumber: string;
          loanObj: Loan;
        };

        const entries: KhataEntry[] = [];
        custLoans.forEach((l) => {
          // Loan Disbursed / "You Gave"
          entries.push({
            id: `loan-${l.id || l._id}`,
            date: l.mortgageDate,
            type: "gave",
            title: `Gold Girvi Advance (${l.loanNumber})`,
            subtitle: `${l.pledgedItems?.map((p) => p.description).join(", ") || "Pledged Items"} • ${l.totalPledgedNetWeight.toFixed(3)}g @ ${l.monthlyRate}%/mo`,
            amount: l.originalPrincipalRupees,
            loanId: l.id || l._id,
            loanNumber: l.loanNumber,
            loanObj: l,
          });

          // Payments / "You Got"
          if (l.paymentHistory && l.paymentHistory.length > 0) {
            l.paymentHistory.forEach((p, pIdx) => {
              entries.push({
                id: `pay-${p._id || pIdx}`,
                date: p.paymentDate,
                type: "got",
                title: `Rakam Jama (${p.receiptNumber || "RCPT"})`,
                subtitle: `Principal: ₹${p.principalAppliedRupees.toLocaleString("en-IN")} • Interest: ₹${p.interestAppliedRupees.toLocaleString("en-IN")} • ${p.paymentMethod.toUpperCase()}`,
                amount: p.totalAmountRupees,
                loanId: l.id || l._id,
                loanNumber: l.loanNumber,
                loanObj: l,
              });
            });
          }
        });

        // Sort chronologically
        entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // WhatsApp message generator
        const sendKhataWhatsApp = () => {
          if (!activeCustomer || !activeCustomer.mobileNumber) return;
          const cleanPhone = activeCustomer.mobileNumber.replace(/\D/g, "");
          const msg = `नमस्कार ${activeCustomer.fullName} जी,\n\nसिद्धेश्वर ज्वेलर्स (सोने-चांदी व गहाण पेढी) कडून सस्नेह नमस्कार.\n\nआपल्या गहाण खात्याचा तपशील खालीलप्रमाणे:\n• एकूण बाकी रक्कम: ₹${custTotalDue.toLocaleString("en-IN")}\n• मुद्दल बाकी: ₹${custOutstandingPrincipal.toLocaleString("en-IN")}\n• व्याज बाकी: ₹${custAccruedInterest.toLocaleString("en-IN")}\n• गहाण दागिने: ${custPledgedItems.length} दागिने (${custPledgedNetWeight.toFixed(3)} ग्रॅम)\n\nकृपया रक्कम वेळेवर भरून पावती घ्यावी.\n\nधन्यवाद!\nसिद्धेश्वर ज्वेलर्स, मुख्य चौक.`;
          window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
        };

        return (
          <div className="space-y-6">
            {/* Master Khatabook Banner */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* You'll Get Card */}
              <TiltCard
                maxTilt={8}
                glare={true}
                className="rounded-2xl border-2 border-luxury-gold/50 bg-gradient-to-br from-luxury-onyx via-luxury-graphite to-luxury-onyx p-5 shadow-gold-glow text-white card-3d-gold"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-luxury-gold-champagne">
                    You&apos;ll Get (घेणे बाकी)
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/40">
                    <ArrowDownLeft className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 font-mono text-3xl font-bold text-luxury-gold-bright tabular-nums">
                  <AnimatedNumber value={totalYouWillGet} prefix="₹" />
                </p>
                <span className="text-[11px] text-white/70 mt-1 block">
                  Total outstanding from {customers.length} grahaks
                </span>
              </TiltCard>

              {/* Collateral Held Card */}
              <TiltCard
                maxTilt={8}
                glare={true}
                className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-luxury-gold-champagne">
                    Vault Gold Collateral (गहाण सोने)
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-luxury-gold/15 text-luxury-gold border border-luxury-gold/30">
                    <Lock className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                  <AnimatedNumber value={totalPledgedGoldGrams} decimals={3} suffix="g" />
                </p>
                <span className="text-[11px] text-luxury-muted/80 mt-1 block">
                  {totalOrnamentsCount} ornaments secured in shop safe
                </span>
              </TiltCard>

              {/* You'll Give Card */}
              <TiltCard
                maxTilt={8}
                glare={true}
                className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-luxury-muted">
                    You&apos;ll Give (देणे बाकी)
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-luxury-muted border border-white/[0.1]">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-white/90 tabular-nums">
                  ₹0
                </p>
                <span className="text-[11px] text-luxury-muted/80 mt-1 block">
                  Zero client credit advance balances
                </span>
              </TiltCard>
            </div>

            {/* Khatabook Split Screen */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* LEFT: Customer Directory (4 Cols) */}
              <div className="lg:col-span-4 rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl shadow-luxury overflow-hidden">
                {/* Search & Filter Header */}
                <div className="p-4 border-b border-white/[0.08] bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-sm font-bold text-white flex items-center gap-2">
                      <Users className="h-4 w-4 text-luxury-gold" />
                      <span>Grahak Directory ({filteredCustomers.length})</span>
                    </h3>
                    <button
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="rounded-lg bg-luxury-gold/15 border border-luxury-gold/30 px-2.5 py-1 text-[11px] font-bold text-luxury-gold hover:bg-luxury-gold hover:text-black transition"
                    >
                      + New Grahak
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-luxury-muted" />
                    <input
                      type="text"
                      placeholder="Search name or mobile..."
                      value={khataSearch}
                      onChange={(e) => setKhataSearch(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.1] bg-luxury-obsidian/60 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-luxury-muted focus:border-luxury-gold focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {[
                      { id: "all", label: "All" },
                      { id: "pending", label: "Dues Pending" },
                      { id: "overdue", label: "Overdue" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setKhataFilter(f.id as any)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                          khataFilter === f.id
                            ? "bg-luxury-gold text-black font-bold shadow-gold-glow"
                            : "bg-white/[0.04] text-luxury-muted border border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer List */}
                <div className="divide-y divide-white/[0.06] max-h-[600px] overflow-y-auto scrollbar-thin">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-luxury-muted">
                      No matching customers found.
                    </div>
                  ) : (
                    filteredCustomers.map((cust) => {
                      const isSelected =
                        (cust.id || cust._id) === (activeCustomer?.id || activeCustomer?._id);
                      const cLoans = loans.filter(
                        (l) => (l.customerId?._id || l.customerId) === (cust.id || cust._id)
                      );
                      const cDue = cLoans.reduce((sum, l) => sum + (l.totalDueRupees || 0), 0);
                      const cWt = cLoans.reduce((sum, l) => sum + (l.totalPledgedNetWeight || 0), 0);

                      const initials = cust.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <div
                          key={cust.id || cust._id}
                          onClick={() => setSelectedKhataCustomerId(cust.id || cust._id)}
                          className={`p-3.5 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-luxury-gold/15 border-l-4 border-l-luxury-gold"
                              : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-xl font-serif text-xs font-bold shrink-0 ${
                                isSelected
                                  ? "bg-luxury-gold text-black font-bold shadow-gold-glow"
                                  : "bg-white/[0.06] text-luxury-gold-champagne border border-white/[0.1]"
                              }`}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-white truncate">
                                {cust.fullName}
                              </p>
                              <p className="text-[10px] text-luxury-muted truncate font-mono">
                                {cust.mobileNumber} {cust.address ? `• ${cust.address}` : ""}
                              </p>
                              {cWt > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-luxury-gold mt-0.5">
                                  <Lock className="h-2.5 w-2.5" />
                                  {cWt.toFixed(2)}g Pledged
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={`font-mono text-xs font-bold tabular-nums ${
                                cDue > 0 ? "text-amber-400" : "text-luxury-muted"
                              }`}
                            >
                              {cDue > 0 ? `₹${cDue.toLocaleString("en-IN")}` : "Settled"}
                            </p>
                            <span className="text-[9px] uppercase tracking-wider text-luxury-muted font-medium">
                              {cDue > 0 ? "You'll Get" : "No Due"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT: Selected Customer Khata Ledger (8 Cols) */}
              <div className="lg:col-span-8 space-y-4">
                {!activeCustomer ? (
                  <div className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl p-12 text-center text-luxury-muted shadow-luxury">
                    <BookOpen className="h-10 w-10 mx-auto text-luxury-gold/60 mb-2" />
                    <p className="font-serif text-sm font-bold text-white">
                      No Grahak Selected
                    </p>
                    <p className="text-xs mt-1 text-luxury-muted">
                      Choose a customer from the left directory to view their complete Khatabook ledger.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Customer Header Card */}
                    <div className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/40 font-serif text-base font-bold shadow-xs">
                            {activeCustomer.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                              {activeCustomer.fullName}
                              <span className="rounded bg-luxury-gold/15 px-2 py-0.5 font-mono text-[10px] font-bold text-luxury-gold-bright border border-luxury-gold/30">
                                {activeCustomer.customerId}
                              </span>
                            </h2>
                            <p className="text-xs text-luxury-muted flex items-center gap-2 mt-0.5">
                              <span>📱 {activeCustomer.mobileNumber}</span>
                              {activeCustomer.address && <span>• 📍 {activeCustomer.address}</span>}
                            </p>
                          </div>
                        </div>

                        {/* Direct Communication & Statement Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={sendKhataWhatsApp}
                            className="flex items-center gap-1.5 rounded-xl bg-luxury-gold px-3 py-1.5 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 transition btn-3d"
                            title="Send Khatabook WhatsApp Reminder"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-black" />
                            <span>WhatsApp Statement</span>
                          </button>

                          <a
                            href={`tel:${activeCustomer.mobileNumber}`}
                            className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.08] transition"
                          >
                            <Phone className="h-3.5 w-3.5 text-luxury-gold" />
                            <span>Call</span>
                          </a>

                          <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.08] transition"
                          >
                            <Printer className="h-3.5 w-3.5 text-luxury-gold" />
                            <span>Print</span>
                          </button>
                        </div>
                      </div>

                      {/* Grahak Financial Snapshot */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div className="rounded-xl bg-white/[0.03] p-3 border border-white/[0.08]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-muted">
                            Total You&apos;ll Get
                          </span>
                          <p className="font-mono text-base font-bold text-amber-400 tabular-nums mt-0.5">
                            ₹{custTotalDue.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/[0.03] p-3 border border-white/[0.08]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-muted">
                            Principal Due
                          </span>
                          <p className="font-mono text-base font-bold text-white tabular-nums mt-0.5">
                            ₹{custOutstandingPrincipal.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/[0.03] p-3 border border-white/[0.08]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-muted">
                            Accrued Interest
                          </span>
                          <p className="font-mono text-base font-bold text-luxury-gold-bright tabular-nums mt-0.5">
                            +₹{custAccruedInterest.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/[0.03] p-3 border border-white/[0.08]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-muted">
                            Pledged Ornaments
                          </span>
                          <p className="font-mono text-base font-bold text-white tabular-nums mt-0.5">
                            {custPledgedNetWeight.toFixed(3)}g ({custPledgedItems.length} pcs)
                          </p>
                        </div>
                      </div>

                      {/* Pledged Ornaments Detail Strip */}
                      {custPledgedItems.length > 0 && (
                        <div className="rounded-xl bg-luxury-gold/10 p-3 border border-luxury-gold/25 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-luxury-gold flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5" />
                            Vault Collateral:
                          </span>
                          {custPledgedItems.map((item, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white border border-white/[0.1] shadow-2xs"
                            >
                              {item.description} ({item.purity} • {Number(item.netWeight).toFixed(3)}g)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Khatabook Passbook Ledger Table */}
                    <div className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl shadow-luxury overflow-hidden">
                      <div className="p-3.5 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
                        <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-white">
                          Transaction Ledger (खाते वही / पासबुक)
                        </h3>
                        <span className="text-[11px] text-luxury-muted">
                          {entries.length} entries recorded
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-white/[0.08] bg-white/[0.03] text-luxury-gold-champagne uppercase font-semibold">
                            <tr>
                              <th className="px-4 py-3">Date &amp; Voucher</th>
                              <th className="px-4 py-3">Particulars &amp; Collateral</th>
                              <th className="px-4 py-3 text-right text-red-400">
                                You Gave (दिले / Udhaar)
                              </th>
                              <th className="px-4 py-3 text-right text-emerald-400">
                                You Got (मिळाले / Jama)
                              </th>
                              <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06]">
                            {entries.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-luxury-muted">
                                  No loans or payments recorded for this customer yet.
                                </td>
                              </tr>
                            ) : (
                              entries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-white/[0.04] transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-white">{entry.date}</p>
                                    <p className="font-mono text-[10px] text-luxury-gold font-bold">
                                      {entry.loanNumber}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-white/90">{entry.title}</p>
                                    <p className="text-[10px] text-luxury-muted">{entry.subtitle}</p>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-red-400 tabular-nums">
                                    {entry.type === "gave"
                                      ? `₹${entry.amount.toLocaleString("en-IN")}`
                                      : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400 tabular-nums">
                                    {entry.type === "got"
                                      ? `₹${entry.amount.toLocaleString("en-IN")}`
                                      : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {entry.type === "gave" && (
                                      <button
                                        onClick={() => handleOpenPaymentModal(entry.loanObj)}
                                        className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1 text-[10px] font-bold text-black transition shadow-xs btn-3d"
                                      >
                                        Receive Payment
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Sticky Bottom Khatabook Action Bar */}
                      <div className="p-3 bg-luxury-obsidian/90 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setNewLoanForm((prev) => ({
                                ...prev,
                                customerId: activeCustomer.id || activeCustomer._id,
                              }));
                              setIsNewLoanOpen(true);
                            }}
                            className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 btn-3d"
                          >
                            <Plus className="h-4 w-4" />
                            <span>+ You Gave (नवीन गहाण / कर्ज द्या)</span>
                          </button>

                          <button
                            onClick={() => {
                              const activeLoan =
                                custLoans.find(
                                  (l) =>
                                    l.status === "active" ||
                                    l.status === "partially_paid" ||
                                    l.status === "overdue"
                                ) || custLoans[0];
                              if (activeLoan) handleOpenPaymentModal(activeLoan);
                            }}
                            disabled={custLoans.length === 0}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-4 py-2.5 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 transition active:scale-95 disabled:opacity-50 btn-3d"
                          >
                            <ArrowDownLeft className="h-4 w-4" />
                            <span>+ You Got (रक्कम जमा करा)</span>
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-luxury-muted uppercase font-bold tracking-wider">
                            Net Balance
                          </span>
                          <p className="font-mono text-sm font-bold text-white tabular-nums">
                            ₹{custTotalDue.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 1: ACTIVE LOANS TABLE */}
      {activeTab === "loans" && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col gap-3 rounded-2xl border border-luxury-beige bg-white p-4 shadow-luxury md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-luxury-muted" />
              <input
                type="text"
                placeholder="Search by Loan No, Customer Name, or Mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-luxury-beige bg-luxury-ivory/30 py-2 pl-9 pr-4 text-xs text-luxury-charcoal placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:bg-white focus:outline-none transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={loanStatusFilter}
                onChange={(e) => setLoanStatusFilter(e.target.value)}
                className="rounded-xl border border-luxury-beige bg-white px-3 py-2 text-xs text-luxury-charcoal focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
              >
                <option value="all">All Loan Statuses</option>
                <option value="active">Active</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="overdue">Overdue Only</option>
                <option value="closed">Closed / Settled</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-luxury-beige bg-white shadow-luxury">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-luxury-beige bg-luxury-ivory/80 text-luxury-onyx uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3.5">Loan No / Date</th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Rate & Mode</th>
                    <th className="px-4 py-3.5 text-right">Principal</th>
                    <th className="px-4 py-3.5 text-right">Accrued Interest</th>
                    <th className="px-4 py-3.5 text-right">Total Due</th>
                    <th className="px-4 py-3.5 text-center">Pledged Net Wt</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-luxury-beige/60">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-luxury-muted">
                        <div className="inline-block h-6 w-6 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-2"></div>
                        <p>Calculating mortgage interest...</p>
                      </td>
                    </tr>
                  ) : loans.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-luxury-muted">
                        <p className="font-serif text-sm font-semibold text-luxury-charcoal">No finance loans found</p>
                        <p className="text-[11px] mt-1">Click &apos;Issue New Gold Loan&apos; above to record a mortgage agreement.</p>
                      </td>
                    </tr>
                  ) : (
                    loans.map((loan) => (
                      <tr key={loan.id || loan._id} className="hover:bg-luxury-ivory/40 transition">
                        <td className="px-4 py-3 font-medium">
                          <p className="font-mono font-bold text-luxury-gold-dark">{loan.loanNumber}</p>
                          <p className="text-[10px] text-luxury-muted">
                            {loan.mortgageDate} {loan.dueDate ? `• Due: ${loan.dueDate}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleViewCustomerProfile(loan.customerId?._id || (loan.customerId as any))}
                            className="font-semibold text-luxury-charcoal hover:text-luxury-gold-dark text-left"
                          >
                            {loan.customerId?.fullName || "Client"}
                          </button>
                          <p className="text-[10px] text-luxury-muted">{loan.customerId?.mobileNumber}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-luxury-gold">{loan.monthlyRate}% / mo</span>
                          <span className="block text-[10px] text-luxury-muted capitalize">
                            {loan.interestMode === "yearly_compound" ? "Yearly Compound" : "Simple"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-luxury-charcoal font-mono tabular-nums">
                          ₹{loan.currentOutstandingPrincipalRupees.toLocaleString("en-IN")}
                          {loan.currentOutstandingPrincipalRupees < loan.originalPrincipalRupees && (
                            <span className="block text-[9px] text-luxury-muted line-through font-mono tabular-nums">
                              ₹{loan.originalPrincipalRupees.toLocaleString("en-IN")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-amber-800 font-mono tabular-nums">
                          +₹{(loan.accruedInterestRupees || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-luxury-gold-dark font-mono tabular-nums">
                          ₹{(loan.totalDueRupees || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="rounded bg-luxury-ivory px-2 py-0.5 text-[11px] font-medium border border-luxury-beige font-mono tabular-nums">
                              {loan.totalPledgedNetWeight.toFixed(3)}g ({loan.pledgedItems.length} items)
                            </span>
                            <div className="flex items-center gap-1 text-[9px]">
                              {loan.pledgedItems?.some((p) => (p.metalType || "gold") === "gold") && (
                                <span className="rounded bg-amber-100 px-1 text-amber-900 font-bold border border-amber-300">
                                  Gold
                                </span>
                              )}
                              {loan.pledgedItems?.some((p) => p.metalType === "silver") && (
                                <span className="rounded bg-slate-200 px-1 text-slate-800 font-bold border border-slate-300">
                                  Silver
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              loan.status === "active"
                                ? "bg-luxury-gold-subtle text-luxury-gold-dark border border-luxury-gold/30"
                                : loan.status === "partially_paid"
                                ? "bg-blue-50 text-blue-800 border border-blue-200"
                                : loan.status === "overdue"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {loan.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {loan.status !== "closed" && (
                              <button
                                onClick={() => handleOpenPaymentModal(loan)}
                                title="Record Loan Payment"
                                className="rounded-lg bg-gradient-to-r from-luxury-gold-dark to-luxury-gold px-2.5 py-1 text-[11px] font-semibold text-white hover:brightness-105 transition shadow-xs"
                              >
                                Pay
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenLoanInCalculator(loan)}
                              title="Calculate in Mortgage Engine"
                              className="rounded-lg p-1.5 text-luxury-charcoal hover:bg-luxury-ivory hover:text-luxury-gold-dark transition"
                            >
                              <Calculator className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OUTSTANDING DUES VIEW */}
      {activeTab === "dues" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
                Outstanding Principal
              </span>
              <p className="mt-2 font-serif text-2xl font-bold text-luxury-onyx">
                ₹{(duesSummary?.grandTotalOutstandingPrincipalRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <span className="text-[11px] text-luxury-muted">Capital locked in gold loans</span>
            </div>

            <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
                Total Accrued Interest
              </span>
              <p className="mt-2 font-serif text-2xl font-bold text-amber-800">
                ₹{(duesSummary?.grandTotalAccruedInterestRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <span className="text-[11px] text-luxury-muted">Accumulated to date</span>
            </div>

            <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
                Total Outstanding Receivables
              </span>
              <p className="mt-2 font-serif text-2xl font-bold text-luxury-gold-dark">
                ₹{(duesSummary?.grandTotalDueRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <span className="text-[11px] text-luxury-gold font-semibold">Principal + Interest</span>
            </div>

            <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
                Total Repaid So Far
              </span>
              <p className="mt-2 font-serif text-2xl font-bold text-luxury-onyx">
                ₹{(duesSummary?.grandTotalPaidRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
              <span className="text-[11px] text-luxury-muted">Cumulative payments received</span>
            </div>
          </div>

          {/* Dues Detailed Ledger */}
          <div className="overflow-hidden rounded-2xl border border-luxury-beige bg-white shadow-luxury">
            <div className="flex items-center justify-between border-b border-luxury-beige bg-luxury-ivory/60 px-6 py-4">
              <div>
                <h3 className="font-serif text-base font-bold text-luxury-onyx">Client Outstanding Dues Ledger</h3>
                <p className="text-xs text-luxury-muted">
                  Direct breakdown of all active debtors as of today ({getTodayIST()})
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl border border-luxury-beige bg-white px-3 py-1.5 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory transition"
              >
                <Printer className="h-3.5 w-3.5 text-luxury-gold" />
                <span>Print Statement</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-luxury-beige bg-luxury-ivory/80 text-luxury-onyx uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3.5">Customer / Mobile</th>
                    <th className="px-4 py-3.5">Loan No</th>
                    <th className="px-4 py-3.5">Duration Elapsed</th>
                    <th className="px-4 py-3.5 text-right">Principal Due</th>
                    <th className="px-4 py-3.5 text-right">Accrued Interest</th>
                    <th className="px-4 py-3.5 text-right">Net Due</th>
                    <th className="px-4 py-3.5 text-right">Total Paid</th>
                    <th className="px-4 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-luxury-beige/60">
                  {duesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-luxury-muted">
                        No outstanding dues currently. All loans are fully settled!
                      </td>
                    </tr>
                  ) : (
                    duesList.map((d: any) => (
                      <tr key={d.id} className="hover:bg-luxury-ivory/40 transition">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-luxury-charcoal">{d.customer.fullName}</p>
                          <p className="text-[10px] text-luxury-muted">{d.customer.mobileNumber}</p>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-luxury-gold-dark">{d.loanNumber}</td>
                        <td className="px-4 py-3 text-luxury-muted">
                          {d.elapsedDescription || "0 days"} ({d.chargeableMonths} mo charged)
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-luxury-charcoal font-mono tabular-nums">
                          ₹{d.outstandingPrincipalRupees.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-800 font-medium font-mono tabular-nums">
                          +₹{d.accruedInterestRupees.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-luxury-gold-dark font-mono tabular-nums">
                          ₹{d.totalDueRupees.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right text-luxury-charcoal font-medium font-mono tabular-nums">
                          ₹{d.totalPaidRupees.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              const matchLoan = loans.find((l) => (l.id || l._id) === d.id);
                              if (matchLoan) handleOpenPaymentModal(matchLoan);
                            }}
                            className="rounded-lg bg-gradient-to-r from-luxury-gold-dark to-luxury-gold px-2.5 py-1 text-[11px] font-semibold text-white hover:brightness-105 transition shadow-xs"
                          >
                            Receive Payment
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER PROFILES */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Customer Registration Form */}
            <div className="rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury h-fit">
              <h3 className="font-serif text-base font-bold text-luxury-onyx">Register New Client</h3>
              <p className="text-xs text-luxury-muted mt-0.5">Add finance & mortgage customer profile</p>

              <form onSubmit={handleCustomerSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Kulkarni"
                    value={customerForm.fullName}
                    onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="10-digit mobile"
                    value={customerForm.mobileNumber}
                    onChange={(e) => setCustomerForm({ ...customerForm, mobileNumber: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Secondary Contact</label>
                  <input
                    type="text"
                    placeholder="Alternate phone number"
                    value={customerForm.secondaryPhone}
                    onChange={(e) => setCustomerForm({ ...customerForm, secondaryPhone: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Residential Address</label>
                  <textarea
                    rows={2}
                    placeholder="Full street address and city"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-luxury-charcoal mb-1">ID Type</label>
                    <select
                      value={customerForm.identificationType}
                      onChange={(e) => setCustomerForm({ ...customerForm, identificationType: e.target.value })}
                      className="w-full rounded-xl border border-luxury-beige px-2.5 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                    >
                      <option value="aadhar">Aadhaar</option>
                      <option value="pan">PAN</option>
                      <option value="voter_id">Voter ID</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-luxury-charcoal mb-1">ID Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 1234-5678"
                      value={customerForm.identificationNumber}
                      onChange={(e) => setCustomerForm({ ...customerForm, identificationNumber: e.target.value })}
                      className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark py-2.5 text-xs font-semibold text-white shadow-luxury hover:brightness-105 transition"
                >
                  Save Customer Record
                </button>
              </form>
            </div>

            {/* Customers List */}
            <div className="rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury lg:col-span-2">
              <div className="flex items-center justify-between border-b border-luxury-beige pb-4">
                <div>
                  <h3 className="font-serif text-base font-bold text-luxury-onyx">Client Directory</h3>
                  <p className="text-xs text-luxury-muted">Registered customers with active loan summary</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {customers.length === 0 ? (
                  <p className="py-8 text-center text-xs text-luxury-muted">No customers registered yet.</p>
                ) : (
                  customers.map((c) => (
                    <div
                      key={c.id || c._id}
                      className="flex items-center justify-between rounded-xl border border-luxury-beige bg-luxury-ivory/20 p-4 hover:bg-luxury-ivory/50 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-luxury-charcoal">{c.fullName}</span>
                          <span className="font-mono text-[10px] text-luxury-muted bg-white px-2 py-0.5 rounded border border-luxury-beige">
                            {c.customerId}
                          </span>
                        </div>
                        <p className="text-xs text-luxury-muted mt-0.5">Mobile: {c.mobileNumber} {c.address ? `• ${c.address}` : ""}</p>
                        <div className="mt-1 flex items-center gap-3 text-[11px]">
                          <span className="text-luxury-charcoal">
                            Active Loans: <strong>{c.activeLoansCount || 0}</strong>
                          </span>
                          <span className="text-luxury-gold-dark font-semibold">
                            Total Due: ₹{(c.totalDueRupees || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleViewCustomerProfile(c.id || c._id)}
                        className="flex items-center gap-1 rounded-xl border border-luxury-gold/40 bg-luxury-gold-subtle px-3 py-1.5 text-xs font-semibold text-luxury-gold-dark hover:bg-luxury-gold hover:text-white transition shadow-xs"
                      >
                        <span>Profile & Ledger</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NATIVE SIDHESHWAR MORTGAGE CALCULATOR WORKBENCH */}
      {activeTab === "calculator" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Input Form (5 cols) */}
            <div className="rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury lg:col-span-5 h-fit space-y-4">
              <div className="flex items-center justify-between border-b border-luxury-beige pb-3">
                <div>
                  <h3 className="font-serif text-base font-bold text-luxury-onyx">
                    Mortgage Interest Engine
                  </h3>
                  <p className="text-xs text-luxury-muted">
                    Siddheshwar Jewellers Calibration (Engine v2)
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-luxury-gold">
                  <Calculator className="h-4 w-4" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Mortgage Date</label>
                <input
                  type="date"
                  value={calcInputs.mortgageDate}
                  onChange={(e) => setCalcInputs({ ...calcInputs, mortgageDate: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Calculation As-Of Date</label>
                <input
                  type="date"
                  value={calcInputs.asOfDate}
                  onChange={(e) => setCalcInputs({ ...calcInputs, asOfDate: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Principal Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={calcInputs.principalRupees}
                  onChange={(e) => setCalcInputs({ ...calcInputs, principalRupees: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs font-bold text-luxury-gold-dark focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              {/* Rate Presets */}
              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Monthly Interest Rate (%)</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {["2.0", "2.5", "3.0"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCalcInputs({ ...calcInputs, monthlyRate: r })}
                      className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                        calcInputs.monthlyRate === r
                          ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-xs"
                          : "border border-luxury-beige bg-luxury-ivory/60 hover:bg-white text-luxury-charcoal hover:text-luxury-gold-dark"
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCalcInputs({ ...calcInputs, monthlyRate: "1.5" })}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                      !["2.0", "2.5", "3.0"].includes(calcInputs.monthlyRate)
                        ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-xs"
                        : "border border-luxury-beige bg-luxury-ivory/60 hover:bg-white text-luxury-charcoal hover:text-luxury-gold-dark"
                    }`}
                  >
                    Custom
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={calcInputs.monthlyRate}
                  onChange={(e) => setCalcInputs({ ...calcInputs, monthlyRate: e.target.value })}
                  placeholder="Custom monthly rate"
                  className="w-full rounded-xl border border-luxury-beige px-3 py-1.5 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              {/* Method Selection */}
              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Calculation Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalcInputs({ ...calcInputs, interestMode: "yearly_compound" })}
                    className={`rounded-xl p-2.5 text-left text-xs transition border ${
                      calcInputs.interestMode === "yearly_compound"
                        ? "border-luxury-gold bg-luxury-onyx text-luxury-gold shadow-xs font-semibold"
                        : "border-luxury-beige bg-luxury-ivory/50 text-luxury-charcoal hover:bg-white hover:text-luxury-gold-dark"
                    }`}
                  >
                    <p className="font-bold">Yearly Compound</p>
                    <p className="text-[10px] opacity-80 mt-0.5">Capitalizes every 12 months</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalcInputs({ ...calcInputs, interestMode: "simple" })}
                    className={`rounded-xl p-2.5 text-left text-xs transition border ${
                      calcInputs.interestMode === "simple"
                        ? "border-luxury-gold bg-luxury-onyx text-luxury-gold shadow-xs font-semibold"
                        : "border-luxury-beige bg-luxury-ivory/50 text-luxury-charcoal hover:bg-white hover:text-luxury-gold-dark"
                    }`}
                  >
                    <p className="font-bold">Simple Interest</p>
                    <p className="text-[10px] opacity-80 mt-0.5">Original principal only</p>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewLoanForm({
                      ...newLoanForm,
                      mortgageDate: calcInputs.mortgageDate,
                      principalRupees: calcInputs.principalRupees,
                      monthlyRate: calcInputs.monthlyRate,
                      interestMode: calcInputs.interestMode,
                    });
                    setIsNewLoanOpen(true);
                  }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark py-2.5 text-xs font-semibold text-white shadow-luxury hover:brightness-105 transition"
                >
                  Save as Finance Loan
                </button>
              </div>
            </div>

            {/* Results Display & Yearly Breakdown (7 cols) */}
            <div className="space-y-4 lg:col-span-7">
              {calcError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-xs text-red-700">
                  <p className="font-bold">Engine Calculation Notice:</p>
                  <p className="mt-1">{calcError}</p>
                </div>
              ) : !calcResult ? (
                <div className="rounded-2xl border border-luxury-beige bg-white p-12 text-center text-luxury-muted">
                  <Calculator className="h-8 w-8 text-luxury-gold mx-auto mb-2 opacity-60" />
                  <p className="font-serif text-sm font-semibold">Enter mortgage parameters to compute interest</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Box */}
                  <div className="rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury space-y-4">
                    <div className="flex items-center justify-between border-b border-luxury-beige pb-3">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
                          Duration & Chargeable Period
                        </span>
                        <p className="font-serif text-lg font-bold text-luxury-onyx">
                          {calcResult.elapsedDescription}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-luxury-muted uppercase tracking-wider">
                          Chargeable Months
                        </span>
                        <p className="font-serif text-lg font-bold text-luxury-gold">
                          {calcResult.chargeableMonths.toFixed(1)} mo
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="rounded-xl border border-luxury-beige bg-luxury-ivory/50 p-3">
                        <span className="text-[10px] uppercase font-semibold text-luxury-muted">
                          Principal Amount
                        </span>
                        <p className="font-serif text-lg font-bold text-luxury-charcoal mt-1">
                          ₹{calcResult.principalRupees.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="rounded-xl border border-luxury-beige bg-amber-50/60 p-3">
                        <span className="text-[10px] uppercase font-semibold text-amber-800">
                          Accrued Interest
                        </span>
                        <p className="font-serif text-lg font-bold text-amber-900 mt-1">
                          ₹{calcResult.interestRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="rounded-xl border border-luxury-gold/30 bg-luxury-gold-subtle p-3">
                        <span className="text-[10px] uppercase font-semibold text-luxury-gold-dark">
                          Total Payable Due
                        </span>
                        <p className="font-serif text-lg font-bold text-luxury-gold-dark mt-1">
                          ₹{calcResult.totalDueRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Year Breakdown Table */}
                  <div className="rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury">
                    <h4 className="font-serif text-sm font-bold text-luxury-onyx mb-3">
                      Year-by-Year Capitalization Ledger
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-luxury-ivory text-luxury-onyx uppercase font-semibold">
                          <tr>
                            <th className="px-3 py-2">Period</th>
                            <th className="px-3 py-2 text-right">Months</th>
                            <th className="px-3 py-2 text-right">Opening Capital</th>
                            <th className="px-3 py-2 text-right">Interest Accrued</th>
                            <th className="px-3 py-2 text-right">Ending Capital</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-luxury-beige">
                          {calcResult.yearlyBreakdown.map((item) => (
                            <tr key={item.year}>
                              <td className="px-3 py-2 font-semibold text-luxury-charcoal">Year {item.year}</td>
                              <td className="px-3 py-2 text-right text-luxury-muted">{item.months} mo</td>
                              <td className="px-3 py-2 text-right font-medium font-mono tabular-nums">
                                ₹{item.startingPrincipalRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-amber-800 font-mono tabular-nums">
                                ₹{item.interestRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-luxury-gold-dark font-mono tabular-nums">
                                ₹{item.endingAmountRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE NEW GOLD LOAN */}
      {isNewLoanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/[0.12] bg-luxury-graphite text-white shadow-2xl p-6 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Issue New Gold Loan</h3>
                <p className="text-xs text-luxury-muted">Pledge ornaments securely and configure mortgage agreement</p>
              </div>
              <button onClick={() => setIsNewLoanOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleNewLoanSubmit} className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Customer *</label>
                  <select
                    required
                    value={newLoanForm.customerId}
                    onChange={(e) => setNewLoanForm({ ...newLoanForm, customerId: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  >
                    <option value="">Select Borrower Client...</option>
                    {customers.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.fullName} ({c.customerId} - {c.mobileNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Mortgage Date *</label>
                  <input
                    type="date"
                    required
                    value={newLoanForm.mortgageDate}
                    onChange={(e) => setNewLoanForm({ ...newLoanForm, mortgageDate: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Principal Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="₹ Principal loaned"
                    value={newLoanForm.principalRupees}
                    onChange={(e) => setNewLoanForm({ ...newLoanForm, principalRupees: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs font-bold text-luxury-gold-dark focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Monthly Interest Rate (%) *</label>
                  <select
                    value={newLoanForm.monthlyRate}
                    onChange={(e) => setNewLoanForm({ ...newLoanForm, monthlyRate: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  >
                    <option value="2.0">2.0% / month</option>
                    <option value="2.5">2.5% / month</option>
                    <option value="3.0">3.0% / month</option>
                    <option value="1.5">1.5% / month</option>
                    <option value="4.0">4.0% / month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Interest Calculation Mode *</label>
                  <select
                    value={newLoanForm.interestMode}
                    onChange={(e) => setNewLoanForm({ ...newLoanForm, interestMode: e.target.value as any })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  >
                    <option value="yearly_compound">Yearly Compound (Adds to capital every 12 months)</option>
                    <option value="simple">Simple Interest (Original principal only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Maturity Due Date (Optional)</label>
                  <input
                    type="date"
                    value={newLoanForm.dueDate}
                    onChange={(e) => setNewLoanForm({ ...newLoanForm, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              {/* PLEDGED ORNAMENTS SECTION - STRICT ISOLATION */}
              <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      Pledged Jewellery Items (Strictly Segregated from Showroom Stock)
                    </h4>
                    <p className="text-[10px] text-amber-700">
                      These items remain custody pledges and will NEVER enter shop inventory.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addPledgedItemRow}
                    className="rounded-lg bg-amber-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-800"
                  >
                    + Add Item
                  </button>
                </div>

                {newLoanForm.pledgedItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-3 rounded-lg border border-amber-200 text-xs items-end">
                    {/* Metal Type: Gold or Silver */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-luxury-muted mb-0.5">Metal Type *</label>
                      <select
                        value={item.metalType}
                        onChange={(e) => {
                          const m = e.target.value as "gold" | "silver";
                          const updated = [...newLoanForm.pledgedItems];
                          updated[idx].metalType = m;
                          updated[idx].purity = m === "gold" ? "22K" : "925";
                          updated[idx].description = m === "gold" ? "Gold Ornaments" : "Silver Ornaments / Payal";
                          setNewLoanForm({ ...newLoanForm, pledgedItems: updated });
                        }}
                        className={`w-full rounded border px-2 py-1 text-xs font-bold ${
                          item.metalType === "gold"
                            ? "bg-amber-50 text-amber-900 border-amber-300"
                            : "bg-slate-50 text-slate-900 border-slate-300"
                        }`}
                      >
                        <option value="gold">Gold (सोने)</option>
                        <option value="silver">Silver (चांदी)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-semibold text-luxury-muted mb-0.5">Description *</label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...newLoanForm.pledgedItems];
                          updated[idx].description = e.target.value;
                          setNewLoanForm({ ...newLoanForm, pledgedItems: updated });
                        }}
                        className="w-full rounded border border-luxury-beige px-2 py-1 text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-luxury-muted mb-0.5">Purity</label>
                      <input
                        type="text"
                        value={item.purity}
                        onChange={(e) => {
                          const updated = [...newLoanForm.pledgedItems];
                          updated[idx].purity = e.target.value;
                          setNewLoanForm({ ...newLoanForm, pledgedItems: updated });
                        }}
                        className="w-full rounded border border-luxury-beige px-2 py-1 text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-luxury-muted mb-0.5">Gross Wt (g) *</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={item.grossWeight}
                        onChange={(e) => {
                          const updated = [...newLoanForm.pledgedItems];
                          updated[idx].grossWeight = e.target.value;
                          if (!updated[idx].netWeight) updated[idx].netWeight = e.target.value;
                          setNewLoanForm({ ...newLoanForm, pledgedItems: updated });
                        }}
                        className="w-full rounded border border-luxury-beige px-2 py-1 text-xs font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-luxury-muted mb-0.5">Net Wt (g) *</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={item.netWeight}
                        onChange={(e) => {
                          const updated = [...newLoanForm.pledgedItems];
                          updated[idx].netWeight = e.target.value;
                          setNewLoanForm({ ...newLoanForm, pledgedItems: updated });
                        }}
                        className="w-full rounded border border-luxury-beige px-2 py-1 text-xs font-mono font-bold text-amber-900"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-center pb-1">
                      {newLoanForm.pledgedItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = newLoanForm.pledgedItems.filter((_, i) => i !== idx);
                            setNewLoanForm({ ...newLoanForm, pledgedItems: updated });
                          }}
                          className="text-rose-500 hover:text-rose-700"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Dynamic Gold vs Silver Weight Totals */}
                {(() => {
                  let goldGross = 0,
                    goldNet = 0,
                    goldCount = 0;
                  let silverGross = 0,
                    silverNet = 0,
                    silverCount = 0;
                  newLoanForm.pledgedItems.forEach((pi) => {
                    const g = parseFloat(pi.grossWeight) || 0;
                    const n = parseFloat(pi.netWeight) || 0;
                    if (pi.metalType === "silver") {
                      silverGross += g;
                      silverNet += n;
                      silverCount++;
                    } else {
                      goldGross += g;
                      goldNet += n;
                      goldCount++;
                    }
                  });

                  return (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 text-xs flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 font-semibold text-amber-900">
                          <Coins className="h-3.5 w-3.5 text-amber-700" />
                          Gold: <strong>{goldNet.toFixed(3)}g net</strong> ({goldCount} pc{goldCount === 1 ? "" : "s"})
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-800">
                          <Gem className="h-3.5 w-3.5 text-slate-600" />
                          Silver: <strong>{silverNet.toFixed(3)}g net</strong> ({silverCount} pc{silverCount === 1 ? "" : "s"})
                        </span>
                      </div>
                      <div className="font-bold text-amber-950">
                        Combined Net: {(goldNet + silverNet).toFixed(3)}g
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Mortgage Agreement Notes</label>
                <textarea
                  rows={2}
                  value={newLoanForm.notes}
                  onChange={(e) => setNewLoanForm({ ...newLoanForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-luxury-beige">
                <button
                  type="button"
                  onClick={() => setIsNewLoanOpen(false)}
                  className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition"
                >
                  Create Mortgage Agreement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD LOAN PAYMENT */}
      {isPaymentOpen && selectedLoanForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.12] bg-luxury-graphite text-white shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Record Loan Payment</h3>
                <p className="text-xs text-luxury-muted">
                  Loan {selectedLoanForPayment.loanNumber} • {selectedLoanForPayment.customerId?.fullName}
                </p>
              </div>
              <button onClick={() => setIsPaymentOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted hover:text-white" />
              </button>
            </div>

            <div className="my-3 rounded-xl border border-luxury-beige bg-luxury-ivory/50 p-3 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-luxury-muted">Current Principal:</span>
                <p className="font-bold text-luxury-charcoal">
                  ₹{selectedLoanForPayment.currentOutstandingPrincipalRupees.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <span className="text-luxury-muted">Accrued Interest:</span>
                <p className="font-bold text-amber-800">
                  ₹{(selectedLoanForPayment.accruedInterestRupees || 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Total Received (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={paymentForm.totalAmountRupees}
                    onChange={(e) => setPaymentForm({ ...paymentForm, totalAmountRupees: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs font-bold text-luxury-gold-dark focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Interest Applied (₹)</label>
                  <input
                    type="number"
                    value={paymentForm.interestAppliedRupees}
                    onChange={(e) => setPaymentForm({ ...paymentForm, interestAppliedRupees: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs text-amber-900 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Principal Applied (₹)</label>
                  <input
                    type="number"
                    value={paymentForm.principalAppliedRupees}
                    onChange={(e) => setPaymentForm({ ...paymentForm, principalAppliedRupees: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs text-luxury-charcoal font-semibold focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Transaction Ref / Notes</label>
                <input
                  type="text"
                  placeholder="UPI transaction ID / Cheque number"
                  value={paymentForm.referenceTransactionId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceTransactionId: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition"
                >
                  Acknowledge Payment & Print Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER PROFILE & LEDGER DRAWER */}
      {isCustomerModalOpen && selectedCustomerForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-3xl rounded-2xl border border-white/[0.12] bg-luxury-graphite text-white shadow-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">
                  {selectedCustomerForView.customer.fullName}
                </h3>
                <p className="text-xs text-luxury-muted">
                  Client ID: {selectedCustomerForView.customer.customerId} • Mobile: {selectedCustomerForView.customer.mobileNumber}
                </p>
              </div>
              <button onClick={() => setIsCustomerModalOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted hover:text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl border border-luxury-beige bg-luxury-ivory/50 p-2.5">
                  <span className="text-luxury-muted text-[10px] uppercase">Active Loans</span>
                  <p className="font-serif text-base font-bold text-luxury-onyx mt-0.5">
                    {selectedCustomerForView.summary.activeLoansCount}
                  </p>
                </div>
                <div className="rounded-xl border border-luxury-beige bg-luxury-ivory/50 p-2.5">
                  <span className="text-luxury-muted text-[10px] uppercase">Outstanding Due</span>
                  <p className="font-serif text-base font-bold text-luxury-gold-dark mt-0.5">
                    ₹{selectedCustomerForView.summary.totalOutstandingDueRupees.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-xl border border-luxury-beige bg-luxury-ivory/50 p-2.5">
                  <span className="text-luxury-muted text-[10px] uppercase">Total Repaid</span>
                  <p className="font-serif text-base font-bold text-luxury-onyx mt-0.5">
                    ₹{selectedCustomerForView.summary.totalPaidRupees.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Active Loans */}
              <div>
                <h4 className="font-bold text-xs text-luxury-onyx uppercase tracking-wider mb-2">Active Loans</h4>
                {selectedCustomerForView.activeLoans.length === 0 ? (
                  <p className="text-xs text-luxury-muted italic">No active loans.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomerForView.activeLoans.map((l: any) => (
                      <div key={l._id} className="rounded-xl border border-luxury-beige p-3 text-xs flex justify-between items-center bg-luxury-ivory/20">
                        <div>
                          <span className="font-mono font-bold text-luxury-gold-dark">{l.loanNumber}</span>
                          <span className="text-luxury-muted ml-2">Date: {l.mortgageDate}</span>
                          <p className="text-luxury-charcoal mt-0.5">
                            Principal: ₹{l.currentOutstandingPrincipalRupees.toLocaleString("en-IN")} • Rate: {l.monthlyRate}%/mo
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-serif font-bold text-luxury-gold-dark">₹{l.totalDueRupees.toLocaleString("en-IN")}</p>
                          <span className="text-[10px] text-amber-800">(+₹{l.accruedInterestRupees.toLocaleString("en-IN")} int)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-bold text-xs text-luxury-onyx uppercase tracking-wider mb-2">Repayment History</h4>
                {selectedCustomerForView.payments.length === 0 ? (
                  <p className="text-xs text-luxury-muted italic">No payments recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomerForView.payments.map((p: any) => (
                      <div key={p.id} className="rounded-xl border border-luxury-beige p-3 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-luxury-charcoal">{p.receiptNumber}</span>
                          <span className="text-luxury-muted ml-2">{p.paymentDate}</span>
                          <p className="text-[11px] text-luxury-muted mt-0.5">
                            Interest: ₹{p.interestAppliedRupees} | Principal: ₹{p.principalAppliedRupees} | Mode: {p.paymentMethod.toUpperCase()}
                          </p>
                        </div>
                        <div className="text-right font-serif font-bold text-luxury-gold-dark">
                          ₹{p.totalAmountRupees.toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-luxury-beige pt-3 flex justify-end">
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="rounded-xl bg-luxury-onyx px-4 py-2 text-xs font-semibold text-luxury-gold border border-luxury-gold/30 hover:bg-luxury-onyx-surface transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        data={receiptData}
      />
    </div>
  );
}

export default function GoldFinancePage() {
  return (
    <Suspense fallback={
      <div className="flex h-80 items-center justify-center">
        <div className="h-9 w-9 rounded-full border-2 border-luxury-gold/20 border-t-luxury-gold animate-spin" />
      </div>
    }>
      <GoldFinancePageInner />
    </Suspense>
  );
}
