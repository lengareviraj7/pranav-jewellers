"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Calendar,
  Filter,
  Download,
  AlertCircle,
  Check,
  X,
  Sparkles,
  TrendingUp,
  Receipt,
  FileText,
} from "lucide-react";
import { TiltCard, AnimatedNumber } from "@/components/Motion";

interface CashTransaction {
  _id: string;
  transactionType: "credit" | "debit";
  amountPaise: number;
  category: string;
  purpose: string;
  referenceId?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export default function CashBookPage() {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [metrics, setMetrics] = useState({
    totalCashInHandRupees: 0,
    todayCreditsRupees: 0,
    todayDebitsRupees: 0,
    netTodayRupees: 0,
    totalTransactionsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [rangeFilter, setRangeFilter] = useState<string>("today");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    transactionType: "debit" as "credit" | "debit",
    amountRupees: "",
    category: "shop_expense",
    purpose: "",
    notes: "",
  });

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/cash-book?range=${rangeFilter}`;
      if (typeFilter !== "all") url += `&type=${typeFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to fetch cash book");

      setTransactions(data.transactions);
      if (data.metrics) setMetrics(data.metrics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [rangeFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchTransactions();
    const handleRefresh = () => fetchTransactions();
    window.addEventListener("sj-refresh-data", handleRefresh);
    return () => window.removeEventListener("sj-refresh-data", handleRefresh);
  }, [fetchTransactions]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/cash-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record transaction");

      setSuccessMsg(
        `${form.transactionType === "credit" ? "Cash Inflow (Jama)" : "Expense (Kharach)"} of ₹${form.amountRupees} recorded!`
      );
      setIsAddOpen(false);
      setForm({
        transactionType: "debit",
        amountRupees: "",
        category: "shop_expense",
        purpose: "",
        notes: "",
      });

      fetchTransactions();
      window.dispatchEvent(new Event("sj-refresh-data"));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      sale_cash: "Counter Cash Sale",
      udhari_recovery: "Udhari Recovery",
      loan_interest: "Finance Interest",
      loan_principal: "Loan Principal",
      opening_cash: "Opening Counter Cash",
      other_income: "Other Cash Inflow",
      shop_expense: "Shop Expense / Tea",
      karigar_wages: "Karigar / Polishing Wages",
      scrap_purchase: "Used Metal Scrap Payout",
      loan_disbursement: "Gold Loan Disbursement",
      cash_withdrawal: "Cash Handover / Withdrawal",
      other_expense: "Other Cash Outflow",
    };
    return labels[cat] || cat;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center animate-fadeInUp">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-luxury-gold-champagne">
            Counter Accounting &amp; Rojmel
          </span>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Cash Counter Book (Rojmel)
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">
            Real-time cash in counter balance tracking, daily credits (Jama), debits (Kharach), and audit ledger
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-4 py-2.5 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 active:scale-95 transition-all btn-3d"
        >
          <Plus className="h-4 w-4 text-black" />
          <span>Record Cash Entry (Jama / Kharach)</span>
        </button>
      </div>

      {/* Alerts */}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Main Counter Cash in Hand */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-luxury-gold/50 bg-gradient-to-br from-luxury-onyx via-luxury-graphite to-luxury-onyx p-5 shadow-gold-glow-lg text-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-gold-champagne">
              Live Cash in Counter
            </span>
            <Wallet className="h-5 w-5 text-luxury-gold" />
          </div>
          <p className="mt-3 font-serif text-3xl font-bold text-luxury-gold-bright">
            <AnimatedNumber value={metrics.totalCashInHandRupees} prefix="₹" />
          </p>
          <span className="text-[11px] text-white/70 mt-1 block">Net actual cash in shop till</span>
        </TiltCard>

        {/* Today's Cash Inflow */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-emerald-500/30 bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Today&apos;s Inflow (Jama)
            </span>
            <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-3 font-serif text-2xl font-bold text-emerald-400">
            +<AnimatedNumber value={metrics.todayCreditsRupees} prefix="₹" />
          </p>
          <span className="text-[11px] text-emerald-300/80 mt-1 block">Sales &amp; collections today</span>
        </TiltCard>

        {/* Today's Outflow */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-red-500/30 bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
              Today&apos;s Outflow (Kharach)
            </span>
            <ArrowUpRight className="h-5 w-5 text-red-400" />
          </div>
          <p className="mt-3 font-serif text-2xl font-bold text-red-400">
            -<AnimatedNumber value={metrics.todayDebitsRupees} prefix="₹" />
          </p>
          <span className="text-[11px] text-red-300/80 mt-1 block">Expenses, wages &amp; scrap payouts</span>
        </TiltCard>

        {/* Today's Net Movement */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
              Today&apos;s Net Movement
            </span>
            <TrendingUp className="h-5 w-5 text-white/80" />
          </div>
          <p
            className={`mt-3 font-serif text-2xl font-bold ${
              metrics.netTodayRupees >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {metrics.netTodayRupees >= 0 ? "+" : "-"}
            <AnimatedNumber value={Math.abs(metrics.netTodayRupees)} prefix="₹" />
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">Net cash added/deducted today</span>
        </TiltCard>
      </div>

      {/* Date Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-3">
        {[
          { id: "today", label: "Today's Rojmel" },
          { id: "yesterday", label: "Yesterday" },
          { id: "week", label: "Past 7 Days" },
          { id: "month", label: "This Month" },
          { id: "all", label: "All Records" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setRangeFilter(t.id)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
              rangeFilter === t.id
                ? "bg-luxury-gold text-black shadow-gold-glow font-bold border border-luxury-gold-bright"
                : "border border-white/[0.08] bg-white/[0.03] text-luxury-muted hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search & Type Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl p-4 shadow-luxury md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-luxury-muted" />
          <input
            type="text"
            placeholder="Search by purpose, notes, or reference number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.1] bg-luxury-obsidian/60 py-2 pl-9 pr-4 text-xs text-white placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="all" className="bg-luxury-obsidian text-white">All Cash Movements</option>
            <option value="credit" className="bg-luxury-obsidian text-white">Inflows Only (Jama)</option>
            <option value="debit" className="bg-luxury-obsidian text-white">Outflows Only (Kharach)</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl shadow-luxury">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-luxury-gold-champagne uppercase font-semibold">
              <tr>
                <th className="px-4 py-3.5">Time / Date</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Purpose / Description</th>
                <th className="px-4 py-3.5">Reference ID</th>
                <th className="px-4 py-3.5 text-right">Inflow (Jama)</th>
                <th className="px-4 py-3.5 text-right">Outflow (Kharach)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-luxury-muted">
                    <div className="inline-block h-6 w-6 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-2"></div>
                    <p>Loading cash transactions...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-luxury-muted">
                    <p className="font-serif text-sm font-semibold text-white">No cash transactions found</p>
                    <p className="text-[11px] mt-1 text-luxury-muted">Click &apos;Record Cash Entry&apos; to log an expense or cash addition.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const amt = t.amountPaise / 100;
                  return (
                    <tr key={t._id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-4 py-3 font-medium text-white/90">
                        <p>{new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                        <p className="text-[10px] text-luxury-muted font-mono">
                          {new Date(t.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {t.transactionType === "credit" ? (
                          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                            + Jama (Credit)
                          </span>
                        ) : (
                          <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30">
                            - Kharach (Debit)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium text-white">
                        {getCategoryLabel(t.category)}
                      </td>

                      <td className="px-4 py-3 text-white/90 font-semibold">
                        <p>{t.purpose}</p>
                        {t.notes && <p className="text-[10px] text-luxury-muted font-normal">{t.notes}</p>}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-luxury-gold-champagne">
                        {t.referenceId || "—"}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-emerald-400 font-mono tabular-nums">
                        {t.transactionType === "credit" ? `+₹${amt.toLocaleString("en-IN")}` : "—"}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-red-400 font-mono tabular-nums">
                        {t.transactionType === "debit" ? `-₹${amt.toLocaleString("en-IN")}` : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Manual Cash Transaction */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.12] bg-luxury-graphite text-white shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Record Cash Entry</h3>
                <p className="text-xs text-luxury-muted">Log cash addition or counter expense</p>
              </div>
              <button onClick={() => setIsAddOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-luxury-obsidian/60 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      transactionType: "credit",
                      category: "other_income",
                    })
                  }
                  className={`rounded-lg py-2 text-xs font-bold transition-all duration-200 ${
                    form.transactionType === "credit"
                      ? "bg-emerald-500 text-black shadow-sm font-bold"
                      : "text-luxury-muted hover:text-white"
                  }`}
                >
                  + Cash Inflow (Jama)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      transactionType: "debit",
                      category: "shop_expense",
                    })
                  }
                  className={`rounded-lg py-2 text-xs font-bold transition-all duration-200 ${
                    form.transactionType === "debit"
                      ? "bg-red-500 text-white shadow-sm font-bold"
                      : "text-luxury-muted hover:text-white"
                  }`}
                >
                  - Expense (Kharach)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="e.g. 500"
                  value={form.amountRupees}
                  onChange={(e) => setForm({ ...form, amountRupees: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs font-bold text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                >
                  {form.transactionType === "credit" ? (
                    <>
                      <option value="sale_cash" className="bg-luxury-obsidian text-white">Manual Cash Sale</option>
                      <option value="udhari_recovery" className="bg-luxury-obsidian text-white">Customer Udhari Recovery</option>
                      <option value="opening_cash" className="bg-luxury-obsidian text-white">Opening Cash Addition</option>
                      <option value="other_income" className="bg-luxury-obsidian text-white">Other Cash Income</option>
                    </>
                  ) : (
                    <>
                      <option value="shop_expense" className="bg-luxury-obsidian text-white">Shop Expense (Tea / Refreshments)</option>
                      <option value="karigar_wages" className="bg-luxury-obsidian text-white">Karigar / Polishing Wages</option>
                      <option value="shop_expense" className="bg-luxury-obsidian text-white">Electricity / Rent / Bills</option>
                      <option value="cash_withdrawal" className="bg-luxury-obsidian text-white">Owner Cash Withdrawal</option>
                      <option value="other_expense" className="bg-luxury-obsidian text-white">Other Expense</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">
                  Purpose / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    form.transactionType === "credit"
                      ? "e.g. Added morning till change"
                      : "e.g. Customer tea and snacks, Electricity bill"
                  }
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Additional remark"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-white/[0.1] px-4 py-2 text-xs font-semibold text-luxury-muted hover:text-white hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 transition btn-3d"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
