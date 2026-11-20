"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
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
} from "lucide-react";

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
        url += "&dueAlert=3_days";
      } else if (tab === "overdue") {
        url += "&dueAlert=overdue";
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to fetch sales");

      setSales(data.sales);
      if (data.metrics) setMetrics(data.metrics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [metalFilter, searchQuery, tab]);

  useEffect(() => {
    fetchSales();
    const handleRefresh = () => fetchSales();
    window.addEventListener("sj-refresh-data", handleRefresh);
    return () => window.removeEventListener("sj-refresh-data", handleRefresh);
  }, [fetchSales]);

  // Open Collect Modal
  const openCollectModal = (sale: SaleRecord) => {
    setActiveSale(sale);
    setCollectAmount((sale.balanceDuePaise / 100).toString());
    setCollectMode("cash");
    setCollectNotes("");
    setCollectSuccessData(null);
    setIsCollectOpen(true);
  };

  // Submit Payment Recovery
  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSale) return;
    try {
      const res = await fetch(`/api/sales/${activeSale._id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountRupees: collectAmount,
          paymentMode: collectMode,
          notes: collectNotes,
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
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-luxury-gold">
              Customer Ledger &amp; Counter Billing
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-luxury-onyx sm:text-3xl">
              Sales &amp; Customer Udhari Khata
            </h1>
            <p className="mt-1 text-xs text-luxury-muted">
              Live showroom sales tracking, owner profit analysis, and due date WhatsApp reminders
            </p>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-center justify-between rounded-xl bg-red-50 p-4 border border-red-200 text-xs text-red-800">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center justify-between rounded-xl bg-luxury-gold-subtle p-4 border border-luxury-gold/40 text-xs text-luxury-gold-dark font-semibold">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
              Total Sales Volume
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-luxury-onyx">
              ₹{metrics.totalRevenueRupees.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-luxury-muted">{metrics.totalSalesCount} transactions completed</span>
          </div>

          <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
              Total Realized Profit
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-luxury-gold-dark">
              +₹{metrics.totalProfitRupees.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-luxury-gold">Manual owner margin recorded</span>
          </div>

          <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
              Total Outstanding Udhari
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-amber-800">
              ₹{metrics.totalOutstandingUdhariRupees.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-amber-700 font-medium">Customer dues to be collected</span>
          </div>

          <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
              Due Date Alerts
            </span>
            <div className="mt-2 flex items-center gap-3">
              <span className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900">
                {metrics.due3DaysCount} in 3 Days
              </span>
              <span className="rounded-lg bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-bold text-red-900">
                {metrics.overdueCount} Overdue
              </span>
            </div>
            <span className="text-[11px] text-luxury-muted mt-1 block">Scheduled reminders</span>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-luxury-beige pb-3">
          <button
            onClick={() => setTab("all")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              tab === "all"
                ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-xs"
                : "border border-luxury-beige bg-white text-luxury-charcoal hover:bg-luxury-ivory"
            }`}
          >
            All Sales ({metrics.totalSalesCount})
          </button>

          <button
            onClick={() => setTab("pending_udhari")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              tab === "pending_udhari"
                ? "bg-amber-900 text-white shadow-xs"
                : "border border-amber-200 bg-amber-50/60 text-amber-900 hover:bg-amber-100/60"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-700" />
            <span>Pending Udhari Dues</span>
          </button>

          <button
            onClick={() => setTab("3_days")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              tab === "3_days"
                ? "bg-amber-800 text-white shadow-xs"
                : "border border-luxury-beige bg-white text-luxury-charcoal hover:bg-luxury-ivory"
            }`}
          >
            <span>🟡 Due in 3 Days</span>
            <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
              {metrics.due3DaysCount}
            </span>
          </button>

          <button
            onClick={() => setTab("overdue")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              tab === "overdue"
                ? "bg-red-800 text-white shadow-xs"
                : "border border-red-200 bg-red-50/50 text-red-900 hover:bg-red-100/50"
            }`}
          >
            <span>🔴 Overdue Accounts</span>
            <span className="rounded-full bg-red-200 px-1.5 py-0.2 text-[10px] font-bold text-red-900">
              {metrics.overdueCount}
            </span>
          </button>

          <button
            onClick={() => setTab("paid")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              tab === "paid"
                ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-xs"
                : "border border-luxury-beige bg-white text-luxury-charcoal hover:bg-luxury-ivory"
            }`}
          >
            Fully Settled
          </button>
        </div>

        {/* Search & Metal Filter Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-luxury-beige bg-white p-4 shadow-luxury md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-luxury-muted" />
            <input
              type="text"
              placeholder="Search by customer name, phone number, sale #, SKU, or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-luxury-beige bg-luxury-ivory/30 py-2 pl-9 pr-4 text-xs text-luxury-charcoal placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:bg-white focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={metalFilter}
              onChange={(e) => setMetalFilter(e.target.value)}
              className="rounded-xl border border-luxury-beige bg-white px-3 py-2 text-xs text-luxury-charcoal focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
            >
              <option value="all">All Metals (Gold &amp; Silver)</option>
              <option value="gold">Gold Only</option>
              <option value="silver">Silver Only</option>
            </select>
          </div>
        </div>

        {/* Sales & Udhari Ledger Table */}
        <div className="overflow-hidden rounded-2xl border border-luxury-beige bg-white shadow-luxury">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-luxury-beige bg-luxury-ivory/80 text-luxury-onyx uppercase font-semibold">
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
              <tbody className="divide-y divide-luxury-beige/60">
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
                      <p className="font-serif text-sm font-semibold text-luxury-charcoal">No sales records found</p>
                      <p className="text-[11px] mt-1">
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
                      <tr key={s._id} className="hover:bg-luxury-ivory/40 transition">
                        <td className="px-4 py-3 font-medium">
                          <p className="text-luxury-charcoal font-semibold">{s.saleNumber}</p>
                          <p className="text-[10px] text-luxury-muted">
                            {new Date(s.saleDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-luxury-onyx">{s.customer.name}</p>
                          <p className="text-[10px] font-mono text-luxury-muted">{s.customer.phone}</p>
                          {s.customer.address && (
                            <p className="text-[10px] text-luxury-muted truncate max-w-[140px]">{s.customer.address}</p>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-semibold text-luxury-charcoal">{s.itemName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="rounded bg-luxury-gold-subtle px-1.5 py-0.2 text-[10px] font-bold text-luxury-gold-dark border border-luxury-gold/30">
                              {s.purity}
                            </span>
                            {s.size && (
                              <span className="text-[10px] text-luxury-muted">Sz: {s.size}</span>
                            )}
                            <span className="text-[10px] font-mono text-luxury-muted">({s.sku})</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className="font-medium text-luxury-charcoal font-mono tabular-nums">{s.quantitySold} pc</span>
                          <p className="text-[10px] font-mono tabular-nums text-luxury-gold-dark">{s.netWeightSold.toFixed(3)}g net</p>
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-luxury-charcoal font-mono tabular-nums">
                          ₹{sp.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-mono tabular-nums font-bold ${
                              profit >= 0 ? "text-luxury-gold-dark" : "text-red-700"
                            }`}
                          >
                            {profit >= 0 ? `+₹${profit.toLocaleString("en-IN")}` : `-₹${Math.abs(profit).toLocaleString("en-IN")}`}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right text-luxury-charcoal font-medium font-mono tabular-nums">
                          ₹{paid.toLocaleString("en-IN")}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {balance > 0 ? (
                            <span className="font-mono tabular-nums font-bold text-amber-800">
                              ₹{balance.toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="rounded-md bg-luxury-gold-subtle px-1.5 py-0.5 text-[10px] font-semibold text-luxury-gold-dark border border-luxury-gold/30">
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
                                      ? "bg-red-50 text-red-800 border-red-300"
                                      : isDueSoon
                                      ? "bg-amber-50 text-amber-900 border-amber-300"
                                      : "bg-luxury-ivory text-luxury-charcoal border-luxury-beige"
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
                            <span className="text-[10px] text-luxury-muted">Settled</span>
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
                              className="rounded-lg bg-[#25D366]/10 p-1.5 text-[#25D366] hover:bg-[#25D366] hover:text-white transition"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>

                            {/* Direct Call Button */}
                            <a
                              href={`tel:${s.customer.phone}`}
                              title={`Call ${s.customer.name}`}
                              className="rounded-lg p-1.5 text-luxury-charcoal hover:bg-luxury-ivory hover:text-luxury-gold-dark transition"
                            >
                              <Phone className="h-4 w-4" />
                            </a>

                            {/* Collect Payment Button */}
                            {balance > 0 && (
                              <button
                                onClick={() => openCollectModal(s)}
                                title="Collect Udhari Payment"
                                className="flex items-center gap-1 rounded-lg bg-amber-900 px-2 py-1 text-[11px] font-bold text-white hover:bg-amber-800 transition"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-2xl border border-luxury-beige bg-white shadow-2xl p-6">
              <div className="flex items-center justify-between border-b border-luxury-beige pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-luxury-onyx">Collect Udhari Payment</h3>
                  <p className="text-xs text-luxury-muted">Record customer recovery towards balance</p>
                </div>
                <button
                  onClick={() => {
                    setIsCollectOpen(false);
                    setCollectSuccessData(null);
                  }}
                >
                  <X className="h-5 w-5 text-luxury-muted" />
                </button>
              </div>

              {collectSuccessData ? (
                <div className="my-6 space-y-4 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-luxury-gold-subtle border border-luxury-gold text-luxury-gold-dark">
                    <CheckCircle2 className="h-7 w-7 text-luxury-gold-dark" />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-luxury-onyx">Payment Recorded!</h4>
                  <p className="text-xs text-luxury-charcoal">
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
                    className="w-full rounded-xl bg-luxury-onyx px-4 py-2 text-xs font-bold text-luxury-gold"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCollectSubmit} className="mt-4 space-y-4">
                  <div className="rounded-xl border border-luxury-beige bg-luxury-ivory/50 p-3 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-luxury-charcoal">
                      <span>{activeSale.customer.name}</span>
                      <span className="text-amber-800">
                        Pending: ₹{(activeSale.balanceDuePaise / 100).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-[11px] text-luxury-muted">
                      Item: {activeSale.itemName} ({activeSale.saleNumber})
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-luxury-charcoal mb-1">
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
                      className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs font-bold text-luxury-onyx focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Payment Mode</label>
                    <select
                      value={collectMode}
                      onChange={(e) => setCollectMode(e.target.value as any)}
                      className="w-full rounded-xl border border-luxury-beige bg-white px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                    >
                      <option value="cash">Cash (Counter Credit)</option>
                      <option value="online">Online / UPI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Received in shop from customer"
                      value={collectNotes}
                      onChange={(e) => setCollectNotes(e.target.value)}
                      className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-luxury-beige">
                    <button
                      type="button"
                      onClick={() => setIsCollectOpen(false)}
                      className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-bold text-white shadow-luxury hover:brightness-105 transition"
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
