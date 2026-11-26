"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  MessageCircle,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Filter,
  X,
  CreditCard,
  User,
  ReceiptText,
  FileSpreadsheet,
  Download,
  History,
  FileText,
  BookOpen,
} from "lucide-react";
import { TiltCard, AnimatedNumber } from "@/components/Motion";
import CustomerKhataModal, { KhataCustomer } from "@/components/CustomerKhataModal";

interface SaleRecord {
  _id: string;
  saleNumber: string;
  itemName: string;
  sku: string;
  metalType: "gold" | "silver";
  purity: string;
  size?: string;
  quantitySold: number;
  grossWeightSold: number;
  netWeightSold: number;
  costPricePaise: number;
  sellingPricePaise: number;
  profitPaise: number;
  customer: {
    name: string;
    phone: string;
    address?: string;
  };
  paymentMode: string;
  paidAmountPaise: number;
  balanceDuePaise: number;
  dueDate?: string;
  paymentStatus: "paid" | "partial" | "unpaid";
  saleDate: string;
  splitPayments?: {
    cashPaise: number;
    onlinePaise: number;
    advancePaise?: number;
  };
  totalExchangeCreditPaise?: number;
  payments: Array<{
    amountPaise: number;
    paymentMode: string;
    date: string;
    notes?: string;
  }>;
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [metrics, setMetrics] = useState({
    totalSalesCount: 0,
    totalRevenueRupees: 0,
    totalProfitRupees: 0,
    totalOutstandingUdhariRupees: 0,
    dueTodayCount: 0,
    due3DaysCount: 0,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [tab, setTab] = useState<"all" | "gold" | "silver" | "paid" | "partial" | "cash" | "online" | "advance">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [metalFilter, setMetalFilter] = useState<string>("all");

  // Collect Payment Modal
  const isSubmittingRef = useRef(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [activeSale, setActiveSale] = useState<SaleRecord | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMode, setCollectMode] = useState<"cash" | "online" | "advance">("cash");
  const [collectNotes, setCollectNotes] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [showHistoryInCollect, setShowHistoryInCollect] = useState(true);
  const [collectSuccessData, setCollectSuccessData] = useState<{
    whatsappUrl: string;
    customerName: string;
  } | null>(null);

  // Customer Full Lifetime Statement Modal (Khatabook view)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedKhataCustomer, setSelectedKhataCustomer] = useState<KhataCustomer | null>(null);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = "/api/sales?";
      if (metalFilter !== "all") {
        url += `&metalType=${metalFilter}`;
      } else if (tab === "gold") {
        url += "&metalType=gold";
      } else if (tab === "silver") {
        url += "&metalType=silver";
      }

      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      if (tab === "partial") {
        url += "&paymentStatus=partial";
      } else if (tab === "paid") {
        url += "&paymentStatus=paid";
      } else if (tab === "cash") {
        url += "&paymentMode=cash";
      } else if (tab === "online") {
        url += "&paymentMode=online";
      } else if (tab === "advance") {
        url += "&paymentMode=advance";
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load sales");

      setSales(data.sales || []);
      if (data.metrics) setMetrics(data.metrics);
    } catch (err: any) {
      setError(err.message || "Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, [tab, metalFilter, searchQuery]);

  useEffect(() => {
    fetchSales();
    const handleRefresh = () => fetchSales();
    window.addEventListener("sj-refresh-data", handleRefresh);
    return () => window.removeEventListener("sj-refresh-data", handleRefresh);
  }, [fetchSales]);

  // Handle open collect modal
  const openCollectModal = (sale: SaleRecord) => {
    setActiveSale(sale);
    setCollectAmount(""); // Leave empty so user specifies exact installment amount
    setCollectMode("cash");
    setCollectNotes("");
    setNextDueDate(sale.dueDate ? new Date(sale.dueDate).toISOString().split("T")[0] : "");
    setCollectSuccessData(null);
    setShowHistoryInCollect(true);
    setIsCollectOpen(true);
  };

  // Handle open customer lifetime history modal (Khatabook view)
  const openHistoryModal = (sale: SaleRecord) => {
    setSelectedKhataCustomer({
      name: sale.customer.name,
      phone: sale.customer.phone,
      address: sale.customer.address,
      saleId: sale._id,
    });
    setIsHistoryOpen(true);
  };

  // Submit Collect Payment
  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSale || isSubmittingRef.current || submittingPayment) return;
    isSubmittingRef.current = true;
    setSubmittingPayment(true);

    try {
      const amountNum = parseFloat(collectAmount);
      const maxPendingRs = activeSale.balanceDuePaise / 100;

      if (isNaN(amountNum) || amountNum <= 0) {
        setError("Please enter a valid recovery amount greater than ₹0.");
        return;
      }

      if (amountNum > maxPendingRs) {
        setError(`Payment amount cannot exceed the pending balance of ₹${maxPendingRs.toLocaleString("en-IN")}.`);
        return;
      }

      const res = await fetch(`/api/sales/${activeSale._id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountRupees: amountNum,
          paymentMode: collectMode,
          notes: collectNotes.trim(),
          nextDueDate: nextDueDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record payment");

      setCollectSuccessData({
        whatsappUrl: data.whatsappUrl,
        customerName: activeSale.customer.name,
      });

      setSuccessMsg(`Payment installment of ₹${amountNum.toLocaleString("en-IN")} recorded successfully!`);
      fetchSales();
      window.dispatchEvent(new Event("sj-refresh-data"));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to record recovery payment");
    } finally {
      isSubmittingRef.current = false;
      setSubmittingPayment(false);
    }
  };

  // Helper for WhatsApp link
  const getWhatsAppLink = (sale: SaleRecord) => {
    let cleanPhone = sale.customer.phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const totalRs = (sale.sellingPricePaise / 100).toLocaleString("en-IN");
    const balRs = (sale.balanceDuePaise / 100).toLocaleString("en-IN");
    const dueDateStr = sale.dueDate
      ? new Date(sale.dueDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "As discussed";

    const text =
      sale.balanceDuePaise > 0
        ? `Namaste ${sale.customer.name} ji! 🙏\n\nGreetings from *SIDHESHWAR JEWELLERS*.\n\nThis is a gentle reminder regarding your purchase of *${sale.itemName}*.\n- Total Amount: ₹${totalRs}\n- *Pending Balance: ₹${balRs}*\n- *Promised Due Date: ${dueDateStr}*\n\nPlease arrange the payment at your earliest convenience. For any queries, contact us at +91 8329465301.\n\nThank you for choosing Sidheshwar Jewellers! 🌟`
        : `Namaste ${sale.customer.name} ji! 🙏\n\nThank you for shopping at *SIDHESHWAR JEWELLERS*! Your account for *${sale.itemName}* is fully settled. For any queries, contact us at +91 8329465301. We look forward to serving you again! 🌟`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      {/* ── Section Switcher Tabs (Sales vs Udhari) ── */}
      <div className="flex items-center gap-1.5 p-1 bg-luxury-obsidian/90 border border-white/10 rounded-2xl w-fit">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-luxury-gold/20 border border-luxury-gold text-luxury-gold-bright text-xs font-bold shadow-sm">
          <ShoppingBag className="h-3.5 w-3.5 text-luxury-gold" />
          <span>Showroom Sales</span>
        </div>
        <Link
          href="/udhari"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.05] text-xs font-medium transition-all"
        >
          <BookOpen className="h-3.5 w-3.5 text-luxury-muted" />
          <span>Customer Udhari Khata</span>
          {metrics.totalOutstandingUdhariRupees > 0 && (
            <span className="rounded-full bg-amber-500/25 px-1.5 py-0.2 text-[10px] font-bold text-amber-300 border border-amber-500/40">
              ₹{metrics.totalOutstandingUdhariRupees.toLocaleString("en-IN")}
            </span>
          )}
        </Link>
      </div>

      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center animate-fadeInUp">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Showroom Sales
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Direct Link to Udhari Khata */}
          <Link
            href="/udhari"
            className="btn-3d flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-950/60 hover:border-amber-400 transition"
          >
            <BookOpen className="h-4 w-4 text-amber-400" />
            <span>Customer Udhari →</span>
          </Link>

          {/* Export Sales Excel */}
          <a
            href="/api/export/sales"
            download
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all border border-emerald-400/30"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Download Excel</span>
          </a>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-red-950/40 p-4 border border-red-500/40 text-xs text-red-300 backdrop-blur-md animate-slideDown">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center justify-between rounded-xl bg-luxury-gold-subtle/50 p-4 border border-luxury-gold/40 text-xs text-luxury-gold-bright font-semibold backdrop-blur-md animate-slideDown">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Sales Volume
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-white">
            <AnimatedNumber value={metrics.totalRevenueRupees} prefix="₹" />
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">
            {metrics.totalSalesCount} invoices completed
          </span>
        </TiltCard>

        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-emerald-500/30 bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Total Realized Profit
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-emerald-400">
            +<AnimatedNumber value={metrics.totalProfitRupees} prefix="₹" />
          </p>
          <span className="text-[11px] text-emerald-300/80 mt-1 block">
            Direct showroom margin earned
          </span>
        </TiltCard>

        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-sky-500/30 bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
            Total Inflow Collected
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-sky-300">
            <AnimatedNumber value={Math.max(0, metrics.totalRevenueRupees - metrics.totalOutstandingUdhariRupees)} prefix="₹" />
          </p>
          <span className="text-[11px] text-sky-300/80 mt-1 block">
            Cash, Online &amp; Advance realized
          </span>
        </TiltCard>

        <Link href="/udhari" className="block group">
          <TiltCard
            maxTilt={8}
            glare={true}
            className="rounded-2xl border border-amber-500/30 bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury group-hover:border-amber-400/60 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                Customer Udhari Linked
              </span>
              <ArrowUpRight className="h-4 w-4 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-amber-300">
              <AnimatedNumber value={metrics.totalOutstandingUdhariRupees} prefix="₹" />
            </p>
            <span className="text-[11px] text-amber-400/80 mt-1 block font-medium">
              Click to manage &amp; recover in Udhari Khata →
            </span>
          </TiltCard>
        </Link>
      </div>

      {/* Filter Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => setTab("all")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "all"
              ? "bg-luxury-gold text-black shadow-gold-glow font-bold border border-luxury-gold-bright"
              : "border border-white/[0.08] bg-white/[0.03] text-luxury-muted hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          All Sales ({metrics.totalSalesCount})
        </button>

        <button
          onClick={() => setTab("gold")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "gold"
              ? "bg-luxury-gold text-black font-bold shadow-xs"
              : "border border-white/[0.08] bg-white/[0.03] text-luxury-gold hover:bg-white/[0.06]"
          }`}
        >
          🪙 Gold Items
        </button>

        <button
          onClick={() => setTab("silver")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "silver"
              ? "bg-slate-300 text-black font-bold shadow-xs"
              : "border border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
          }`}
        >
          🥈 Silver Items
        </button>

        <button
          onClick={() => setTab("paid")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "paid"
              ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)] font-bold"
              : "border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40"
          }`}
        >
          ✅ Fully Settled
        </button>

        <button
          onClick={() => setTab("partial")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "partial"
              ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] font-bold"
              : "border border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>⏳ With Udhari Dues</span>
        </button>

        <button
          onClick={() => setTab("cash")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "cash"
              ? "bg-emerald-400 text-black font-bold shadow-xs"
              : "border border-white/[0.08] bg-white/[0.03] text-luxury-muted hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          💵 Cash
        </button>

        <button
          onClick={() => setTab("online")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "online"
              ? "bg-sky-400 text-black font-bold shadow-xs"
              : "border border-white/[0.08] bg-white/[0.03] text-luxury-muted hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          📲 Online UPI
        </button>

        <button
          onClick={() => setTab("advance")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "advance"
              ? "bg-purple-400 text-black font-bold shadow-xs"
              : "border border-white/[0.08] bg-white/[0.03] text-purple-300 hover:bg-white/[0.06]"
          }`}
        >
          💎 Advance Used
        </button>
      </div>

      {/* Search & Metal Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl p-4 shadow-luxury md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-luxury-muted" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, sale #, SKU, or item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.1] bg-luxury-obsidian/60 py-2 pl-9 pr-4 text-xs text-white placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={metalFilter}
            onChange={(e) => setMetalFilter(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="all" className="bg-luxury-obsidian text-white">All Metals (Gold &amp; Silver)</option>
            <option value="gold" className="bg-luxury-obsidian text-white">Gold Only</option>
            <option value="silver" className="bg-luxury-obsidian text-white">Silver Only</option>
          </select>
        </div>
      </div>

      {/* Sales Register Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl shadow-luxury">
        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-luxury-gold-champagne bg-luxury-gold/10 border-b border-white/[0.08] md:hidden">
          <span>👈 Swipe horizontally to view all sales invoices 👉</span>
          <span className="font-mono text-[10px] text-luxury-muted">Actions</span>
        </div>
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-luxury-gold-champagne uppercase font-semibold">
              <tr>
                <th className="px-4 py-3.5">Invoice # / Date</th>
                <th className="px-4 py-3.5">Customer Details</th>
                <th className="px-4 py-3.5">Item &amp; Spec</th>
                <th className="px-4 py-3.5 text-right">Sold Qty / Net Wt</th>
                <th className="px-4 py-3.5 text-right">Invoice Amount</th>
                <th className="px-4 py-3.5 text-right">Profit Earned</th>
                <th className="px-4 py-3.5 text-center">Payment Method</th>
                <th className="px-4 py-3.5 text-center">Settlement Status</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-luxury-muted">
                    <div className="inline-block h-6 w-6 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-2"></div>
                    <p>Loading showroom sales records...</p>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-luxury-muted">
                    <p className="font-serif text-sm font-semibold text-white">No sales records found</p>
                    <p className="text-[11px] mt-1 text-luxury-muted">
                      Use the &apos;Sell&apos; button in Gold or Silver inventory to record showroom sales.
                    </p>
                  </td>
                </tr>
              ) : (
                sales.map((s) => {
                  const sp = s.sellingPricePaise / 100;
                  const profit = s.profitPaise / 100;
                  const paid = s.paidAmountPaise / 100;
                  const balance = s.balanceDuePaise / 100;

                  return (
                    <tr key={s._id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <p className="text-white font-semibold">{s.saleNumber}</p>
                        <p className="text-[10px] text-luxury-muted font-mono">
                          {new Date(s.saleDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => openHistoryModal(s)}
                          className="text-left group"
                          title="Click to view customer Khata ledger"
                        >
                          <p className="font-bold text-white group-hover:text-luxury-gold transition-colors flex items-center gap-1">
                            <span>{s.customer.name}</span>
                            <span className="text-[10px] text-luxury-gold-champagne font-mono">↗</span>
                          </p>
                          <p className="text-[10px] font-mono text-luxury-gold-champagne">{s.customer.phone}</p>
                          {s.customer.address && (
                            <p className="text-[10px] text-luxury-muted truncate max-w-[140px]">{s.customer.address}</p>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-white/90">{s.itemName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold border ${
                            s.metalType === "gold"
                              ? "bg-luxury-gold/15 text-luxury-gold-bright border-luxury-gold/30"
                              : "bg-slate-400/15 text-slate-300 border-slate-400/30"
                          }`}>
                            {s.purity}
                          </span>
                          {s.size && (
                            <span className="text-[10px] text-luxury-muted">Sz: {s.size}</span>
                          )}
                          <span className="text-[10px] font-mono text-luxury-muted">({s.sku})</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-white font-mono tabular-nums">{s.quantitySold} pc</span>
                        <p className="text-[10px] font-mono tabular-nums text-luxury-gold-champagne">{s.netWeightSold.toFixed(3)}g net</p>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-white font-mono tabular-nums">
                        ₹{sp.toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono tabular-nums font-bold ${
                            profit >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {profit >= 0 ? `+₹${profit.toLocaleString("en-IN")}` : `-₹${Math.abs(profit).toLocaleString("en-IN")}`}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {s.paymentMode === "split" ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/40">
                              Split
                            </span>
                            <span className="text-[9px] text-luxury-muted font-mono">
                              {s.splitPayments?.cashPaise ? `C:₹${(s.splitPayments.cashPaise / 100).toLocaleString("en-IN")} ` : ""}
                              {s.splitPayments?.onlinePaise ? `O:₹${(s.splitPayments.onlinePaise / 100).toLocaleString("en-IN")} ` : ""}
                              {s.splitPayments?.advancePaise ? `Adv:₹${(s.splitPayments.advancePaise / 100).toLocaleString("en-IN")}` : ""}
                            </span>
                          </div>
                        ) : s.paymentMode === "advance" ? (
                          <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/40">
                            💎 Advance
                          </span>
                        ) : s.paymentMode === "online" ? (
                          <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-500/40">
                            📲 Online UPI
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                            💵 Cash (Rojmel)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {balance > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                              Udhari: ₹{balance.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[9px] text-emerald-400 font-mono">
                              Paid: ₹{paid.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                            Cleared ✅
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* WhatsApp Button */}
                          <a
                            href={getWhatsAppLink(s)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Send WhatsApp Greeting & Payment Summary"
                            className="rounded-lg bg-[#25D366]/20 p-1.5 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all duration-200"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>

                          {/* Direct Call Button */}
                          <a
                            href={`tel:${s.customer.phone}`}
                            title={`Call ${s.customer.name}`}
                            className="rounded-lg p-1.5 text-luxury-muted hover:bg-white/[0.08] hover:text-white transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                          </a>

                          {/* Full Customer History Statement Button */}
                          <button
                            onClick={() => openHistoryModal(s)}
                            title="View Full Customer Purchase & Payment History"
                            className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/15 hover:text-white transition-all"
                          >
                            <History className="h-3 w-3 text-luxury-gold" />
                            <span>History</span>
                          </button>

                          {/* Open in Udhari Khata if balance > 0 */}
                          {balance > 0 && (
                            <Link
                              href={`/udhari?search=${encodeURIComponent(s.customer.name)}`}
                              title="Open Customer in Udhari Khata"
                              className="flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500 hover:text-black transition-all btn-3d"
                            >
                              <BookOpen className="h-3 w-3" />
                              <span>Udhari Khata →</span>
                            </Link>
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

      {/* ========================================================
          MODAL 1: COLLECT UDHARI PAYMENT WITH LIVE DUE CALCULATOR
          ======================================================== */}
      {isCollectOpen && activeSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto modal-backdrop">
          <div className="relative w-full max-w-2xl rounded-2xl border border-luxury-gold/40 bg-luxury-graphite text-white shadow-2xl p-4 sm:p-6 my-2 sm:my-8 max-h-[92dvh] overflow-y-auto modal-content">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-luxury-gold" />
                  <span>Collect Udhari Payment</span>
                </h3>
                <p className="text-xs text-luxury-muted">
                  Record partial or full recovery towards pending balance &amp; auto-sync cash till
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCollectOpen(false);
                  setCollectSuccessData(null);
                }}
                className="text-luxury-muted hover:text-white transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {collectSuccessData ? (
              <div className="my-6 space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <h4 className="font-serif text-lg font-bold text-white">Payment Recorded!</h4>
                <p className="text-xs text-luxury-muted">
                  Cash counter updated automatically. Send updated WhatsApp receipt to customer:
                </p>
                <a
                  href={collectSuccessData.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-105 transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Send WhatsApp Confirmation</span>
                </a>
                <button
                  onClick={() => {
                    setIsCollectOpen(false);
                    setCollectSuccessData(null);
                  }}
                  className="w-full rounded-xl bg-white/[0.08] px-4 py-2 text-xs font-bold text-white hover:bg-white/[0.12] transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCollectSubmit} className="mt-4 space-y-4">
                {/* Customer & Sale Overview Card */}
                <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <User className="h-4 w-4 text-luxury-gold" />
                        <span>{activeSale.customer.name}</span>
                      </p>
                      <p className="text-[11px] text-luxury-muted font-mono mt-0.5">
                        📞 {activeSale.customer.phone} • 📍 {activeSale.customer.address || "Visapur"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-luxury-muted block">Sale Number</span>
                      <span className="font-mono text-xs font-bold text-luxury-gold">{activeSale.saleNumber}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-luxury-muted block text-[10px] uppercase">Purchased Item</span>
                      <span className="font-semibold text-white truncate block">{activeSale.itemName}</span>
                    </div>
                    <div>
                      <span className="text-luxury-muted block text-[10px] uppercase">Purchase Date</span>
                      <span className="font-semibold text-white">
                        {new Date(activeSale.saleDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-luxury-muted block text-[10px] uppercase">Total Bill Value</span>
                      <span className="font-mono font-bold text-white">
                        ₹{(activeSale.sellingPricePaise / 100).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-luxury-muted block text-[10px] uppercase">Total Paid So Far</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₹{(activeSale.paidAmountPaise / 100).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ========================================================
                    LIVE DUE BREAKDOWN CALCULATOR
                    ======================================================== */}
                {(() => {
                  const pendingDue = activeSale.balanceDuePaise / 100;
                  const payingNow = parseFloat(collectAmount) || 0;
                  const remainingDue = Math.max(0, pendingDue - payingNow);
                  const isOverpaying = payingNow > pendingDue;
                  const isFull = payingNow > 0 && payingNow === pendingDue;
                  const excessAdvance = isOverpaying ? payingNow - pendingDue : 0;

                  return (
                    <div className="rounded-2xl border border-white/10 bg-luxury-obsidian/95 p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                          <span className="text-[10px] uppercase font-bold text-luxury-muted block">
                            Current Pending Due
                          </span>
                          <p className="font-mono text-base font-bold text-amber-300 mt-1">
                            ₹{pendingDue.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-xl bg-luxury-gold/15 p-3 border border-luxury-gold/30">
                          <span className="text-[10px] uppercase font-bold text-luxury-gold-champagne block">
                            Amount Paying Today
                          </span>
                          <p className="font-mono text-base font-bold text-luxury-gold-bright mt-1">
                            ₹{payingNow.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div
                          className={`rounded-xl p-3 border transition-all ${
                            isOverpaying
                              ? "bg-purple-950/40 border-purple-500/50"
                              : isFull
                              ? "bg-emerald-950/40 border-emerald-500/50"
                              : "bg-rose-950/20 border-rose-500/30"
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold text-luxury-muted block">
                            {isOverpaying ? "Advance Credit" : "Remaining Due After"}
                          </span>
                          <p
                            className={`font-mono text-base font-bold mt-1 ${
                              isOverpaying
                                ? "text-purple-300"
                                : isFull
                                ? "text-emerald-400"
                                : "text-rose-300"
                            }`}
                          >
                            {isOverpaying
                              ? `+₹${excessAdvance.toLocaleString("en-IN")}`
                              : `₹${remainingDue.toLocaleString("en-IN")}`}
                          </p>
                        </div>
                      </div>

                      {isOverpaying && (
                        <div className="flex items-center gap-2 rounded-xl bg-purple-500/15 border border-purple-500/30 px-3.5 py-2 text-xs text-purple-300 font-semibold">
                          <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                          <span>
                            Due cleared (₹0 Due) ✅. Excess ₹{excessAdvance.toLocaleString("en-IN")} will be credited as Customer Advance Deposit (अॅडव्हान्स जमा) 💰
                          </span>
                        </div>
                      )}

                      {isFull && !isOverpaying && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 text-xs text-emerald-300 font-semibold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span>This payment will completely settle the remaining balance (₹0 Due) ✅</span>
                        </div>
                      )}

                      {!isFull && !isOverpaying && remainingDue > 0 && payingNow > 0 && (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 text-xs text-amber-300 font-semibold">
                          <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                          <span>
                            ₹{remainingDue.toLocaleString("en-IN")} will remain as pending customer Udhari.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Amount Paying Input with Quick Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-white uppercase tracking-wider">
                      Payment Amount (₹) *
                    </label>
                    <span className="text-[11px] text-luxury-muted font-mono">
                      Current Due: ₹{(activeSale.balanceDuePaise / 100).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="Enter amount customer is paying today (e.g. 2000)"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="w-full rounded-xl border border-luxury-gold/40 bg-black/60 px-4 py-2.5 text-sm font-mono font-bold text-luxury-gold-bright placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />

                  {/* Quick Shortcut Percentage Chips */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] text-luxury-muted uppercase font-bold">Quick:</span>
                    {(() => {
                      const bal = activeSale.balanceDuePaise / 100;
                      return [
                        { label: "25%", val: Math.round(bal * 0.25) },
                        { label: "50%", val: Math.round(bal * 0.5) },
                        { label: "75%", val: Math.round(bal * 0.75) },
                        { label: `Pay Full (₹${bal.toLocaleString("en-IN")})`, val: bal },
                        { label: `+₹5,000 Adv`, val: bal + 5000 },
                      ].map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => setCollectAmount(chip.val.toString())}
                          className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/90 hover:text-luxury-gold hover:bg-luxury-gold/15 border border-white/10 transition"
                        >
                          {chip.label}
                        </button>
                      ));
                    })()}
                  </div>
                </div>

                {/* Payment Mode: 3D Buttons (Cash, Online, Advance) */}
                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">
                    Payment Mode *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCollectMode("cash")}
                      className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition-all border ${
                        collectMode === "cash"
                          ? "bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/50 scale-[1.02]"
                          : "bg-black/50 text-neutral-400 border-white/10 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span className="text-base">💵</span>
                      <span>Cash (Counter)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCollectMode("online")}
                      className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition-all border ${
                        collectMode === "online"
                          ? "bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 text-white border-cyan-400 shadow-lg shadow-cyan-950/50 scale-[1.02]"
                          : "bg-black/50 text-neutral-400 border-white/10 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span className="text-base">📲</span>
                      <span>Online (UPI)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCollectMode("advance")}
                      className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold transition-all border ${
                        collectMode === "advance"
                          ? "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-white border-amber-400 shadow-lg shadow-amber-950/50 scale-[1.02]"
                          : "bg-black/50 text-neutral-400 border-white/10 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span className="text-base">💰</span>
                      <span>Advance Pay</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-luxury-muted mt-1.5">
                    {collectMode === "cash"
                      ? "✓ Cash payment is automatically recorded into today's Cash Counter Book (Rojmel Jama)."
                      : collectMode === "online"
                      ? "✓ Online payment is recorded without altering physical drawer cash."
                      : "✓ Recorded as Advance Payment from customer deposit / booking advance (अॅडव्हान्स जमा)."}
                  </p>
                </div>

                {/* Next Promised Due Date (Only if remaining balance > 0) */}
                {(() => {
                  const bal = (activeSale.balanceDuePaise / 100) - (parseFloat(collectAmount) || 0);
                  if (bal <= 0) return null;

                  return (
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                          Next Promised Due Date (Optional)
                        </label>
                        <span className="text-[10px] text-luxury-muted font-mono">
                          Remaining: ₹{bal.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <input
                        type="date"
                        value={nextDueDate}
                        onChange={(e) => setNextDueDate(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white focus:border-luxury-gold focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-luxury-muted">Quick Dates:</span>
                        {[
                          { label: "+7 Days", days: 7 },
                          { label: "+15 Days", days: 15 },
                          { label: "+1 Month", days: 30 },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + chip.days);
                              setNextDueDate(d.toISOString().split("T")[0]);
                            }}
                            className="rounded-lg bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-luxury-muted hover:text-luxury-gold hover:bg-luxury-gold/15 border border-white/5 transition"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Received via GPay, handed by customer brother, etc."
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs text-white focus:border-luxury-gold focus:outline-none"
                  />
                </div>

                {/* ========================================================
                    CUSTOMER PAST PURCHASE & PAYMENT HISTORY ACCORDION
                    ======================================================== */}
                <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowHistoryInCollect(!showHistoryInCollect)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.03] transition"
                  >
                    <span className="text-xs font-bold text-luxury-gold-champagne flex items-center gap-2">
                      <History className="h-4 w-4 text-luxury-gold" />
                      <span>
                        Customer History &amp; Installments ({activeSale.payments?.length || 0})
                      </span>
                    </span>
                    <span className="text-[11px] text-luxury-muted">
                      {showHistoryInCollect ? "▲ Hide" : "▼ View Timeline"}
                    </span>
                  </button>

                  {showHistoryInCollect && (
                    <div className="p-3 border-t border-white/[0.08] space-y-2.5 text-xs max-h-48 overflow-y-auto">
                      {/* Step 1: Initial Purchase */}
                      <div className="flex items-start gap-2.5 rounded-lg bg-white/[0.02] p-2.5 border border-white/[0.05]">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-luxury-gold/20 text-luxury-gold text-[11px] font-bold">
                          1
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-white">Initial Purchase &amp; Billing</p>
                            <span className="text-[10px] text-luxury-muted font-mono">
                              {new Date(activeSale.saleDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-luxury-muted mt-0.5">
                            Total Bill: <strong className="text-white">₹{(activeSale.sellingPricePaise / 100).toLocaleString("en-IN")}</strong>
                            {activeSale.splitPayments && (
                              <span> • Down Payment: ₹{((activeSale.splitPayments.cashPaise + activeSale.splitPayments.onlinePaise) / 100).toLocaleString("en-IN")}</span>
                            )}
                          </p>
                          {activeSale.dueDate && (
                            <p className="text-[10px] text-amber-300 mt-0.5">
                              Promised Due Date: {new Date(activeSale.dueDate).toLocaleDateString("en-IN")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Step 2+: All Subsequent Installments */}
                      {activeSale.payments && activeSale.payments.length > 0 ? (
                        activeSale.payments.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 rounded-lg bg-emerald-950/20 p-2.5 border border-emerald-500/20"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                              {idx + 2}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-emerald-300">
                                  +₹{(p.amountPaise / 100).toLocaleString("en-IN")} Paid
                                </p>
                                <span className="text-[10px] text-luxury-muted font-mono">
                                  {new Date(p.date).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-[10px] text-luxury-muted mt-0.5">
                                Mode: <strong className="text-white">{p.paymentMode === "online" ? "Online / UPI" : "Cash (Counter)"}</strong>
                                {p.notes && ` • Notes: ${p.notes}`}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-center text-[11px] text-luxury-muted">
                          No previous recovery installments recorded yet. This will be Installment #1.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.1]">
                  <button
                    type="button"
                    onClick={() => setIsCollectOpen(false)}
                    className="rounded-xl border border-white/20 px-5 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark px-6 py-2.5 text-xs font-bold text-black shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingPayment ? (
                      <>
                        <span className="inline-block h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Recording Recovery...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Confirm Recovery Payment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: CUSTOMER KHATABOOK LEDGER & STATEMENT
          ======================================================== */}
      {isHistoryOpen && selectedKhataCustomer && (
        <CustomerKhataModal
          customer={selectedKhataCustomer}
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onDataChanged={fetchSales}
        />
      )}
    </div>
  );
}
