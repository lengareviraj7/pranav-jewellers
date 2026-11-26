"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { TiltCard, AnimatedNumber } from "@/components/Motion";

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
  const [tab, setTab] = useState<"all" | "pending_udhari" | "paid" | "3_days" | "overdue">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [metalFilter, setMetalFilter] = useState<string>("all");

  // Collect Payment Modal
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

  // Customer Full Lifetime Statement Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySale, setHistorySale] = useState<SaleRecord | null>(null);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = "/api/sales?";
      if (metalFilter !== "all") url += `&metalType=${metalFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      if (tab === "pending_udhari") {
        url += "&paymentStatus=partial";
      } else if (tab === "paid") {
        url += "&paymentStatus=paid";
      } else if (tab === "3_days") {
        url += "&dueFilter=3_days";
      } else if (tab === "overdue") {
        url += "&dueFilter=overdue";
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

  // Handle open customer lifetime history modal
  const openHistoryModal = (sale: SaleRecord) => {
    setHistorySale(sale);
    setIsHistoryOpen(true);
  };

  // Submit Collect Payment
  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSale) return;

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
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center animate-fadeInUp">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-luxury-gold-champagne">
            Customer Ledger &amp; Counter Billing
          </span>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Sales &amp; Customer Udhari Khata
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">
            Live showroom sales tracking, owner profit analysis, and due date WhatsApp reminders
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/export/sales"
            download
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all border border-emerald-400/30"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Download Sales Report (Excel)</span>
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
            {metrics.totalSalesCount} transactions completed
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
            Manual owner margin recorded
          </span>
        </TiltCard>

        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-amber-500/30 bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            Total Outstanding Udhari
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-amber-300">
            <AnimatedNumber value={metrics.totalOutstandingUdhariRupees} prefix="₹" />
          </p>
          <span className="text-[11px] text-amber-400/80 mt-1 block font-medium">
            Customer dues to be collected
          </span>
        </TiltCard>

        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Due Date Alerts
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-xs font-bold text-amber-300">
              {metrics.due3DaysCount} in 3 Days
            </span>
            <span className="rounded-lg bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-xs font-bold text-red-300">
              {metrics.overdueCount} Overdue
            </span>
          </div>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">Scheduled reminders</span>
        </TiltCard>
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
          onClick={() => setTab("pending_udhari")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "pending_udhari"
              ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] font-bold"
              : "border border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Pending Udhari Dues</span>
        </button>

        <button
          onClick={() => setTab("3_days")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "3_days"
              ? "bg-amber-400 text-black shadow-xs font-bold"
              : "border border-white/[0.08] bg-white/[0.03] text-luxury-muted hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          <span>🟡 Due in 3 Days</span>
          <span className="rounded-full bg-amber-500/30 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
            {metrics.due3DaysCount}
          </span>
        </button>

        <button
          onClick={() => setTab("overdue")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "overdue"
              ? "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)] font-bold"
              : "border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-950/40"
          }`}
        >
          <span>🔴 Overdue Accounts</span>
          <span className="rounded-full bg-red-500/30 px-1.5 py-0.2 text-[10px] font-bold text-red-200">
            {metrics.overdueCount}
          </span>
        </button>

        <button
          onClick={() => setTab("paid")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
            tab === "paid"
              ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)] font-bold"
              : "border border-white/[0.08] bg-white/[0.03] text-luxury-muted hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          Fully Settled
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

      {/* Sales & Udhari Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl shadow-luxury">
        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-luxury-gold-champagne bg-luxury-gold/10 border-b border-white/[0.08] md:hidden">
          <span>👈 Swipe horizontally to view all sales &amp; udhari 👉</span>
          <span className="font-mono text-[10px] text-luxury-muted">Actions</span>
        </div>
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-luxury-gold-champagne uppercase font-semibold">
              <tr>
                <th className="px-4 py-3.5">Sale # / Date</th>
                <th className="px-4 py-3.5">Customer Details</th>
                <th className="px-4 py-3.5">Item &amp; Spec</th>
                <th className="px-4 py-3.5 text-right">Sold Qty / Wt</th>
                <th className="px-4 py-3.5 text-right">Sale Price</th>
                <th className="px-4 py-3.5 text-right">Profit Earned</th>
                <th className="px-4 py-3.5 text-right">Paid</th>
                <th className="px-4 py-3.5 text-right">Udhari Due</th>
                <th className="px-4 py-3.5 text-center">Due Date / Status</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-luxury-muted">
                    <div className="inline-block h-6 w-6 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-2"></div>
                    <p>Loading sales records...</p>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-luxury-muted">
                    <p className="font-serif text-sm font-semibold text-white">No sales records found</p>
                    <p className="text-[11px] mt-1 text-luxury-muted">
                      Use the &apos;Sell&apos; button in Gold or Silver inventory to record customer sales.
                    </p>
                  </td>
                </tr>
              ) : (
                sales.map((s) => {
                  const sp = s.sellingPricePaise / 100;
                  const profit = s.profitPaise / 100;
                  const paid = s.paidAmountPaise / 100;
                  const balance = s.balanceDuePaise / 100;

                  const now = new Date();
                  const isOverdue = balance > 0 && s.dueDate && new Date(s.dueDate) < new Date(now.setHours(0, 0, 0, 0));
                  const isDueSoon =
                    balance > 0 &&
                    s.dueDate &&
                    !isOverdue &&
                    new Date(s.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

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
                        <p className="font-bold text-white">{s.customer.name}</p>
                        <p className="text-[10px] font-mono text-luxury-gold-champagne">{s.customer.phone}</p>
                        {s.customer.address && (
                          <p className="text-[10px] text-luxury-muted truncate max-w-[140px]">{s.customer.address}</p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-white/90">{s.itemName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="rounded bg-luxury-gold/15 px-1.5 py-0.2 text-[10px] font-bold text-luxury-gold-bright border border-luxury-gold/30">
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

                      <td className="px-4 py-3 text-right text-white/80 font-medium font-mono tabular-nums">
                        ₹{paid.toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {balance > 0 ? (
                          <span className="font-mono tabular-nums font-bold text-amber-400">
                            ₹{balance.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                            Cleared ✅
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {balance > 0 ? (
                          <div>
                            {s.dueDate ? (
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                  isOverdue
                                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                                    : isDueSoon
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                    : "bg-white/[0.05] text-luxury-muted border-white/[0.08]"
                                }`}
                              >
                                {isOverdue ? "⚠️ Overdue: " : isDueSoon ? "⏳ Due Soon: " : "Due: "}
                                {new Date(s.dueDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            ) : (
                              <span className="text-luxury-muted text-[10px]">No due date set</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400">Settled</span>
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

                          {/* Collect Payment Button */}
                          {balance > 0 && (
                            <button
                              onClick={() => openCollectModal(s)}
                              title="Collect Udhari Payment"
                              className="flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500 hover:text-black transition-all btn-3d"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span>Collect</span>
                            </button>
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
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark px-6 py-2.5 text-xs font-bold text-black shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm Recovery Payment</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: DEDICATED CUSTOMER LIFETIME STATEMENT & HISTORY
          ======================================================== */}
      {isHistoryOpen && historySale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto modal-backdrop">
          <div className="relative w-full max-w-2xl rounded-2xl border border-luxury-gold/40 bg-luxury-graphite text-white shadow-2xl p-4 sm:p-6 my-2 sm:my-8 max-h-[92dvh] overflow-y-auto space-y-4 sm:space-y-5 modal-content">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-luxury-gold" />
                  <span>Customer Account Statement &amp; History</span>
                </h3>
                <p className="text-xs text-luxury-muted">
                  Complete chronological ledger of purchases, due dates &amp; payment installments
                </p>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-luxury-muted hover:text-white transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Customer Details Strip */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-luxury-gold/20 border border-luxury-gold/40 text-luxury-gold font-serif font-bold text-base">
                    {historySale.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{historySale.customer.name}</h4>
                    <p className="text-xs text-luxury-gold font-mono mt-0.5">📞 {historySale.customer.phone}</p>
                    <p className="text-[11px] text-luxury-muted">📍 {historySale.customer.address || "Visapur"}</p>
                  </div>
                </div>

                <a
                  href={getWhatsAppLink(historySale)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white hover:brightness-105 transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp Statement</span>
                </a>
              </div>

              {/* Account Financials */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white/5 p-2.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-luxury-muted block">Total Purchase</span>
                  <p className="font-mono text-xs font-bold text-white mt-1">
                    ₹{(historySale.sellingPricePaise / 100).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-950/30 p-2.5 border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block">Total Paid</span>
                  <p className="font-mono text-xs font-bold text-emerald-400 mt-1">
                    ₹{(historySale.paidAmountPaise / 100).toLocaleString("en-IN")}
                  </p>
                </div>
                <div
                  className={`rounded-xl p-2.5 border ${
                    historySale.balanceDuePaise > 0
                      ? "bg-rose-950/30 border-rose-500/30 text-rose-300"
                      : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block">Current Balance</span>
                  <p className="font-mono text-xs font-bold mt-1">
                    ₹{(historySale.balanceDuePaise / 100).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-xl bg-luxury-gold/15 p-2.5 border border-luxury-gold/30">
                  <span className="text-[10px] uppercase font-bold text-luxury-gold-champagne block">Status</span>
                  <p className="font-bold text-xs text-luxury-gold-bright mt-1 uppercase">
                    {historySale.paymentStatus}
                  </p>
                </div>
              </div>
            </div>

            {/* Complete Chronological History Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-luxury-gold-champagne flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-luxury-gold" />
                <span>Chronological Transaction Ledger</span>
              </h4>

              <div className="space-y-2.5">
                {/* 1. Date of Purchase */}
                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/40 p-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-luxury-gold/20 text-luxury-gold font-bold text-xs">
                    🛍️
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <p className="font-bold text-white text-xs">
                        Purchased: {historySale.itemName} ({historySale.quantitySold} pc, {historySale.netWeightSold.toFixed(3)}g net)
                      </p>
                      <span className="text-[10px] text-luxury-muted font-mono">
                        {new Date(historySale.saleDate).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-luxury-muted mt-1">
                      Invoice No: <span className="font-mono text-luxury-gold">{historySale.saleNumber}</span> • Purity: {historySale.purity} • Total Bill: <span className="text-white font-bold">₹{(historySale.sellingPricePaise / 100).toLocaleString("en-IN")}</span>
                    </p>
                    {historySale.dueDate && (
                      <p className="text-[11px] text-amber-300 font-semibold mt-1">
                        📅 Original Promised Due Date: {new Date(historySale.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Initial Down Payment if any */}
                {historySale.splitPayments && (historySale.splitPayments.cashPaise > 0 || historySale.splitPayments.onlinePaise > 0 || (historySale.splitPayments.advancePaise && historySale.splitPayments.advancePaise > 0)) && (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                      💵
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <p className="font-bold text-emerald-300 text-xs">
                          Initial Counter Down Payment
                        </p>
                        <span className="text-[10px] text-luxury-muted font-mono">
                          {new Date(historySale.saleDate).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <p className="text-[11px] text-white mt-1 font-mono">
                        {historySale.splitPayments.cashPaise > 0 && (
                          <span>Cash: ₹{(historySale.splitPayments.cashPaise / 100).toLocaleString("en-IN")} </span>
                        )}
                        {historySale.splitPayments.onlinePaise > 0 && (
                          <span>• Online UPI: ₹{(historySale.splitPayments.onlinePaise / 100).toLocaleString("en-IN")} </span>
                        )}
                        {historySale.splitPayments.advancePaise && historySale.splitPayments.advancePaise > 0 && (
                          <span>• Advance: ₹{(historySale.splitPayments.advancePaise / 100).toLocaleString("en-IN")}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Subsequent Installment Payments */}
                {historySale.payments && historySale.payments.length > 0 ? (
                  historySale.payments.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                        💳
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <p className="font-bold text-emerald-300 text-xs">
                            Installment #{idx + 1}: +₹{(p.amountPaise / 100).toLocaleString("en-IN")}
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
                        <p className="text-[11px] text-luxury-muted mt-1">
                          Payment Mode: <strong className="text-white">{p.paymentMode === "advance" ? "Advance Payment (अॅडव्हान्स जमा)" : p.paymentMode === "online" ? "Online / UPI" : "Cash (Counter Rojmel)"}</strong>
                          {p.notes && ` • Notes: ${p.notes}`}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center text-xs text-luxury-muted">
                    No recovery installments paid yet towards this account.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <span className="text-[11px] text-luxury-muted">
                Sidheshwar Jewellers &amp; Finance • Since 2009 • 📞 Contact: 8329465301
              </span>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="rounded-xl bg-white/[0.08] px-5 py-2 text-xs font-bold text-white hover:bg-white/[0.12] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
