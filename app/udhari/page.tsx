"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
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
  Filter,
  X,
  CreditCard,
  User,
  FileSpreadsheet,
  Download,
  History,
  ShoppingBag,
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

export default function UdhariPage() {
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

  // Filters - default to pending udhari
  const [tab, setTab] = useState<"pending_udhari" | "overdue" | "3_days" | "paid" | "all">("pending_udhari");
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
  const [collectSuccessData, setCollectSuccessData] = useState<{
    whatsappUrl: string;
    customerName: string;
  } | null>(null);

  // Customer Full Lifetime Statement Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySale, setHistorySale] = useState<SaleRecord | null>(null);

  const fetchUdhari = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = "/api/sales?";
      if (metalFilter !== "all") url += `&metalType=${metalFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      if (tab === "pending_udhari") {
        url += "&paymentStatus=partial";
      } else if (tab === "overdue") {
        url += "&dueFilter=overdue";
      } else if (tab === "3_days") {
        url += "&dueFilter=3_days";
      } else if (tab === "paid") {
        url += "&paymentStatus=paid";
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load udhari ledger");

      setSales(data.sales || []);
      if (data.metrics) setMetrics(data.metrics);
    } catch (err: any) {
      setError(err.message || "Failed to load udhari ledger");
    } finally {
      setLoading(false);
    }
  }, [tab, metalFilter, searchQuery]);

  useEffect(() => {
    fetchUdhari();
    const handleRefresh = () => fetchUdhari();
    window.addEventListener("sj-refresh-data", handleRefresh);
    return () => window.removeEventListener("sj-refresh-data", handleRefresh);
  }, [fetchUdhari]);

  // Open Collect Modal
  const openCollectModal = (sale: SaleRecord) => {
    setActiveSale(sale);
    setCollectAmount("");
    setCollectMode("cash");
    setCollectNotes("");
    setNextDueDate("");
    setCollectSuccessData(null);
    setIsCollectOpen(true);
  };

  // Open History Statement Modal
  const openHistoryModal = (sale: SaleRecord) => {
    setHistorySale(sale);
    setIsHistoryOpen(true);
  };

  // Submit Collect Payment
  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSale || isSubmittingRef.current || submittingPayment) return;
    isSubmittingRef.current = true;
    setSubmittingPayment(true);

    try {
      setError(null);
      const res = await fetch(`/api/sales/${activeSale._id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountRupees: collectAmount,
          paymentMode: collectMode,
          notes: collectNotes,
          nextDueDate: nextDueDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record payment");

      setCollectSuccessData({
        whatsappUrl: data.whatsappUrl,
        customerName: activeSale.customer.name,
      });

      fetchUdhari();
      window.dispatchEvent(new Event("sj-refresh-data"));
    } catch (err: any) {
      setError(err.message || "Failed to record payment");
    } finally {
      isSubmittingRef.current = false;
      setSubmittingPayment(false);
    }
  };

  // WhatsApp reminder generator with contact phone 8329465301
  const getWhatsAppReminderLink = (sale: SaleRecord) => {
    const balRs = (sale.balanceDuePaise / 100).toLocaleString("en-IN");
    const dueStr = sale.dueDate
      ? new Date(sale.dueDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "लवकरच";

    let phone = sale.customer.phone.replace(/\D/g, "");
    if (phone.length === 10) phone = `91${phone}`;

    const text = `नमस्कार *${sale.customer.name}* जी! 🙏%0A%0A*सिद्धेश्वर ज्वेलर्स (SIDHESHWAR JEWELLERS)* कडून विनम्र आठवण:%0Aआपल्या दागिन्यांच्या खरेदीचे (*${sale.itemName}* - बिल क्र. *${sale.saleNumber}*) शिल्लक उधारीचे देणे बाकी आहे.%0A%0A💰 *शिल्लक रक्कम: ₹${balRs}*%0A📅 *वचन दिलेली तारीख: ${dueStr}*%0A%0Aकृपया वेळेवर भरणा करून सहकार्य करावे ही नम्र विनंती.%0Aकाही अडचण किंवा प्रश्न असल्यास आमच्याशी संपर्क साधा:%0A📞 *संपर्क क्र.: +91 8329465301*%0A%0Aआपला दिवस शुभ जावो! 👑✨`;

    return `https://wa.me/${phone}?text=${text}`;
  };

  return (
    <div className="space-y-6">
      {/* ── Section Switcher Tabs (Sales vs Udhari) ── */}
      <div className="flex items-center gap-1.5 p-1 bg-luxury-obsidian/90 border border-white/10 rounded-2xl w-fit">
        <Link
          href="/sales"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.05] text-xs font-medium transition-all"
        >
          <ShoppingBag className="h-3.5 w-3.5 text-luxury-muted" />
          <span>Showroom Sales</span>
        </Link>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold shadow-sm">
          <BookOpen className="h-3.5 w-3.5 text-amber-400" />
          <span>Customer Udhari Khata</span>
        </div>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center animate-fadeInUp">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-luxury-gold-champagne">
              CUSTOMER CREDIT &amp; RECOVERY KHATA • उधारी खातेवही
            </span>
            <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[9px] font-bold text-rose-300">
              Recovery Hub
            </span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Customer Udhari Khata
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">
            Track pending customer balances, overdue alerts, 3-stage WhatsApp reminders, and record partial/full installment recoveries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick link to Sales */}
          <Link
            href="/sales"
            className="btn-3d flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition"
          >
            <ShoppingBag className="h-4 w-4 text-luxury-gold" />
            <span>Go to Sales Ledger</span>
          </Link>

          {/* Export Udhari Excel */}
          <a
            href="/api/export/udhari"
            className="btn-3d flex items-center gap-1.5 rounded-xl border border-luxury-gold/40 bg-luxury-obsidian px-3.5 py-2 text-xs font-semibold text-luxury-gold-champagne shadow-xs hover:border-luxury-gold hover:text-white transition-all backdrop-blur-md"
          >
            <Download className="h-3.5 w-3.5 text-luxury-gold" />
            <span>Download Udhari Excel</span>
          </a>
        </div>
      </div>

      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Outstanding Udhari */}
        <TiltCard>
          <div className="stat-card border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-rose-300/80 font-bold">
                Total Pending Udhari
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-rose-400">
              <AnimatedNumber value={metrics.totalOutstandingUdhariRupees} prefix="₹" />
            </p>
            <p className="mt-1 text-[11px] text-luxury-muted">
              Market credit to recover across all customers
            </p>
          </div>
        </TiltCard>

        {/* Overdue Accounts */}
        <TiltCard>
          <div className="stat-card border-l-4 border-l-red-600">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-red-300/80 font-bold">
                Overdue Customers
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-red-400">
              <AnimatedNumber value={metrics.overdueCount} /> <span className="text-sm font-sans font-normal text-luxury-muted">accounts</span>
            </p>
            <p className="mt-1 text-[11px] text-luxury-muted">
              Missed promised payment due date
            </p>
          </div>
        </TiltCard>

        {/* Due in 3 Days */}
        <TiltCard>
          <div className="stat-card border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-amber-300/80 font-bold">
                Due Soon (3 Days)
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-amber-300">
              <AnimatedNumber value={metrics.due3DaysCount} /> <span className="text-sm font-sans font-normal text-luxury-muted">due soon</span>
            </p>
            <p className="mt-1 text-[11px] text-luxury-muted">
              Pre-due WhatsApp reminder queue
            </p>
          </div>
        </TiltCard>

        {/* Total Recovered / Fully Paid */}
        <TiltCard>
          <div className="stat-card border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-emerald-300/80 font-bold">
                Lifetime Billed
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-emerald-400">
              <AnimatedNumber value={metrics.totalRevenueRupees} prefix="₹" />
            </p>
            <p className="mt-1 text-[11px] text-luxury-muted">
              Total transaction volume billed
            </p>
          </div>
        </TiltCard>
      </div>

      {/* ── Status Alerts ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-950/40 p-3.5 text-xs text-red-300 border border-red-500/30">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-luxury-obsidian/90 p-3.5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between shadow-luxury">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
          {[
            { id: "pending_udhari", label: "Pending Udhari", count: null },
            { id: "overdue", label: "🚨 Overdue", count: metrics.overdueCount },
            { id: "3_days", label: "⏰ Due in 3 Days", count: metrics.due3DaysCount },
            { id: "paid", label: "✅ Cleared Khata", count: null },
            { id: "all", label: "All Accounts", count: null },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                tab === item.id
                  ? "bg-luxury-gold text-black shadow-gold-glow font-bold"
                  : "text-luxury-muted hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <span>{item.label}</span>
              {item.count !== null && item.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    tab === item.id ? "bg-black text-luxury-gold" : "bg-rose-500 text-white"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Metal Filter */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-luxury-muted" />
            <input
              type="text"
              placeholder="Search customer, phone, village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/60 pl-8 pr-3 py-1.5 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:outline-none"
            />
          </div>

          <select
            value={metalFilter}
            onChange={(e) => setMetalFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-medium text-white focus:border-luxury-gold focus:outline-none"
          >
            <option value="all" className="bg-luxury-obsidian text-white">All Metals</option>
            <option value="gold" className="bg-luxury-obsidian text-white">Gold Only</option>
            <option value="silver" className="bg-luxury-obsidian text-white">Silver Only</option>
          </select>
        </div>
      </div>

      {/* ── Udhari Ledger Table ── */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl shadow-luxury">
        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-luxury-gold-champagne bg-luxury-gold/10 border-b border-white/[0.08] md:hidden">
          <span>👈 Swipe horizontally to view full recovery details 👉</span>
          <span className="font-mono text-[10px] text-luxury-muted">Actions</span>
        </div>
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-luxury-gold-champagne uppercase font-semibold">
              <tr>
                <th className="px-4 py-3.5">Customer Profile</th>
                <th className="px-4 py-3.5">Purchased Item &amp; Bill #</th>
                <th className="px-4 py-3.5 text-right">Bill Value</th>
                <th className="px-4 py-3.5 text-right">Total Paid</th>
                <th className="px-4 py-3.5 text-right">Pending Udhari</th>
                <th className="px-4 py-3.5 text-center">Due Date &amp; Status</th>
                <th className="px-4 py-3.5 text-center">Recovery Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-luxury-muted">
                    <div className="inline-block h-6 w-6 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-2"></div>
                    <p>Loading Udhari ledger accounts...</p>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-luxury-muted">
                    <p className="font-serif text-sm font-semibold text-white">No pending Udhari accounts found</p>
                    <p className="text-[11px] mt-1 text-luxury-muted">
                      {tab === "overdue"
                        ? "Great news! No customer accounts are currently overdue."
                        : "All customers have cleared their balances or no matching records found."}
                    </p>
                  </td>
                </tr>
              ) : (
                sales.map((s) => {
                  const sp = s.sellingPricePaise / 100;
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
                      {/* Customer Profile */}
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openHistoryModal(s)}
                            className="text-left group"
                            title="Click to view full customer purchase history and past bills"
                          >
                            <p className="text-white font-bold group-hover:text-luxury-gold transition-colors flex items-center gap-1.5">
                              <span>{s.customer.name}</span>
                              <span className="text-[10px] text-luxury-gold-champagne font-mono">↗</span>
                            </p>
                            <p className="text-[11px] text-luxury-gold font-mono">
                              📞 {s.customer.phone}
                            </p>
                            <p className="text-[10px] text-luxury-muted">
                              📍 {s.customer.address || "Visapur"}
                            </p>
                          </button>
                        </div>
                      </td>

                      {/* Purchased Item & Bill # */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white block">{s.itemName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="rounded bg-white/5 px-1.5 py-0.2 text-[9px] font-mono text-luxury-gold">
                            {s.saleNumber}
                          </span>
                          <span className="text-[10px] text-luxury-muted">
                            • {new Date(s.saleDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                      </td>

                      {/* Bill Value */}
                      <td className="px-4 py-3 text-right font-bold text-white font-mono tabular-nums">
                        ₹{sp.toLocaleString("en-IN")}
                      </td>

                      {/* Paid So Far */}
                      <td className="px-4 py-3 text-right text-emerald-400 font-medium font-mono tabular-nums">
                        ₹{paid.toLocaleString("en-IN")}
                      </td>

                      {/* Pending Udhari */}
                      <td className="px-4 py-3 text-right">
                        {balance > 0 ? (
                          <div className="inline-block rounded-xl bg-rose-950/40 border border-rose-500/40 px-2.5 py-1 text-right">
                            <span className="font-mono tabular-nums font-bold text-rose-300 text-sm">
                              ₹{balance.toLocaleString("en-IN")}
                            </span>
                            <span className="block text-[9px] uppercase tracking-wider text-rose-400/80 font-bold">
                              Due
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                            Cleared ✅
                          </span>
                        )}
                      </td>

                      {/* Due Date & Status */}
                      <td className="px-4 py-3 text-center">
                        {balance > 0 ? (
                          <div>
                            {s.dueDate ? (
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                                  isOverdue
                                    ? "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse"
                                    : isDueSoon
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                    : "bg-white/[0.05] text-luxury-muted border-white/[0.08]"
                                }`}
                              >
                                {isOverdue ? "⚠️ Overdue: " : isDueSoon ? "⏰ Due Soon: " : "📅 "}
                                {new Date(s.dueDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            ) : (
                              <span className="text-[10px] text-luxury-muted italic">No date set</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-mono">₹0 Due</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Collect Payment Button */}
                          {balance > 0 ? (
                            <button
                              onClick={() => openCollectModal(s)}
                              className="btn-3d flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-emerald-glow hover:brightness-110 active:scale-95 transition"
                              title="Collect partial or full Udhari recovery"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Collect</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openHistoryModal(s)}
                              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/10 transition"
                            >
                              Statement
                            </button>
                          )}

                          {/* WhatsApp Reminder Button */}
                          {balance > 0 && (
                            <a
                              href={getWhatsAppReminderLink(s)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 p-1.5 text-[#25D366] hover:bg-[#25D366] hover:text-white transition shadow-sm"
                              title="Send polite WhatsApp reminder to customer"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}

                          {/* Customer Statement */}
                          <button
                            onClick={() => openHistoryModal(s)}
                            className="flex items-center justify-center rounded-xl border border-luxury-gold/30 bg-luxury-gold/10 p-1.5 text-luxury-gold-champagne hover:bg-luxury-gold hover:text-black transition"
                            title="View customer lifetime account statement"
                          >
                            <History className="h-4 w-4" />
                          </button>
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
          MODAL 1: COLLECT UDHARI PAYMENT (CASH, ONLINE, ADVANCE)
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
                  Record customer recovery towards pending balance &amp; auto-sync cash till
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
                  Account updated. Click below to send an updated WhatsApp confirmation receipt:
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

                {/* Live Due Breakdown Calculator */}
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
                        className="w-full rounded-xl border border-amber-500/30 bg-black/60 px-3 py-2 text-xs font-mono text-white focus:border-amber-400 focus:outline-none"
                      />
                      <p className="text-[10px] text-luxury-muted">
                        Sets the next follow-up date for WhatsApp reminders and overdue calculation.
                      </p>
                    </div>
                  );
                })()}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Received in shop from customer"
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-2 text-xs text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:outline-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCollectOpen(false);
                      setCollectSuccessData(null);
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="btn-3d rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark px-5 py-2 text-xs font-bold text-black shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submittingPayment ? (
                      <>
                        <span className="inline-block h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <span>Record Recovery</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: CUSTOMER LIFETIME STATEMENT & HISTORY
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
                  href={getWhatsAppReminderLink(historySale)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white hover:brightness-105 transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp Reminder</span>
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
                      : "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block">
                    {historySale.balanceDuePaise > 0 ? "Pending Udhari" : "Balance Due"}
                  </span>
                  <p className="font-mono text-xs font-bold mt-1">
                    ₹{(historySale.balanceDuePaise / 100).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 p-2.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-luxury-muted block">Status</span>
                  <p className="font-semibold text-xs text-white mt-1 uppercase">
                    {historySale.paymentStatus}
                  </p>
                </div>
              </div>
            </div>

            {/* Installments Timeline */}
            <div className="space-y-3">
              <h5 className="font-serif text-xs font-bold text-luxury-gold-champagne uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Transaction &amp; Installment Timeline</span>
              </h5>

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
                  <p className="text-xs text-luxury-muted italic p-2 text-center">
                    No installments recorded yet.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="rounded-xl bg-white/[0.08] px-5 py-2 text-xs font-bold text-white hover:bg-white/[0.12] transition"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
