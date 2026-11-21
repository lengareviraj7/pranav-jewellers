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
  const [collectMode, setCollectMode] = useState<"cash" | "online">("cash");
  const [collectNotes, setCollectNotes] = useState("");
  const [collectSuccessData, setCollectSuccessData] = useState<{
    whatsappUrl: string;
    customerName: string;
  } | null>(null);

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
    setCollectAmount((sale.balanceDuePaise / 100).toString());
    setCollectMode("cash");
    setCollectNotes("");
    setCollectSuccessData(null);
    setIsCollectOpen(true);
  };

  // Submit Collect Payment
  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSale) return;

    try {
      const amountPaise = Math.round(Number(collectAmount) * 100);
      if (isNaN(amountPaise) || amountPaise <= 0) {
        alert("Enter a valid recovery amount");
        return;
      }

      const res = await fetch(`/api/sales/${activeSale._id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaise,
          paymentMode: collectMode,
          notes: collectNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record payment");

      setCollectSuccessData({
        whatsappUrl: data.whatsappUrl,
        customerName: activeSale.customer.name,
      });

      setSuccessMsg(`Payment of ₹${collectAmount} recorded successfully!`);
      fetchSales();
      window.dispatchEvent(new Event("sj-refresh-data"));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
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
        ? `Namaste ${sale.customer.name} ji! 🙏\n\nGreetings from *SIDHESHWAR JEWELLERS*.\n\nThis is a gentle reminder regarding your purchase of *${sale.itemName}*.\n- Total Amount: ₹${totalRs}\n- *Pending Balance: ₹${balRs}*\n- *Promised Due Date: ${dueDateStr}*\n\nPlease arrange the payment at your earliest convenience. For any queries, contact us at +91 98765 43210.\n\nThank you for choosing Sidheshwar Jewellers! 🌟`
        : `Namaste ${sale.customer.name} ji! 🙏\n\nThank you for shopping at *SIDHESHWAR JEWELLERS*! Your account for *${sale.itemName}* is fully settled. We look forward to serving you again! 🌟`;

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
        <div className="overflow-x-auto">
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

                          {/* Collect Payment Button */}
                          {balance > 0 && (
                            <button
                              onClick={() => openCollectModal(s)}
                              title="Collect Udhari Payment"
                              className="flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-500/40 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500 hover:text-black transition-all btn-3d"
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

      {/* Modal: Collect Udhari Payment */}
      {isCollectOpen && activeSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.12] bg-luxury-graphite text-white shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Collect Udhari Payment</h3>
                <p className="text-xs text-luxury-muted">Record customer recovery towards balance</p>
              </div>
              <button
                onClick={() => {
                  setIsCollectOpen(false);
                  setCollectSuccessData(null);
                }}
              >
                <X className="h-5 w-5 text-luxury-muted hover:text-white" />
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
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>{activeSale.customer.name}</span>
                    <span className="text-amber-400">
                      Pending: ₹{(activeSale.balanceDuePaise / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[11px] text-luxury-muted">
                    Item: {activeSale.itemName} ({activeSale.saleNumber})
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={activeSale.balanceDuePaise / 100}
                    required
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs font-bold text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Payment Mode</label>
                  <select
                    value={collectMode}
                    onChange={(e) => setCollectMode(e.target.value as any)}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  >
                    <option value="cash" className="bg-luxury-obsidian text-white">Cash (Counter Credit)</option>
                    <option value="online" className="bg-luxury-obsidian text-white">Online / UPI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Received in shop from customer"
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsCollectOpen(false)}
                    className="rounded-xl border border-white/[0.1] px-4 py-2 text-xs font-semibold text-luxury-muted hover:text-white hover:bg-white/[0.05]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 transition btn-3d"
                  >
                    Record Recovery
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
