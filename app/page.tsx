"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Coins,
  Gem,
  RefreshCw,
  Landmark,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";

interface DashboardStats {
  gold: {
    pieces: number;
    grossWeight: number;
    netWeight: number;
    categoryCount: number;
  };
  silver: {
    pieces: number;
    grossWeight: number;
    netWeight: number;
    categoryCount: number;
  };
  usedMetal: {
    totalCount: number;
    goldNetWeight: number;
    silverNetWeight: number;
    totalCostRupees: number;
  };
  finance: {
    activeClients: number;
    activeLoansCount: number;
    originalPrincipalRupees: number;
    outstandingPrincipalRupees: number;
    accruedInterestRupees: number;
    totalDueRupees: number;
    overdueCount: number;
  };
  recentActivities: Array<{
    id: string;
    type: "inventory" | "used_purchase" | "finance_payment";
    metalType: string;
    title: string;
    subtitle: string;
    date: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || "Failed to load dashboard metrics");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const handleRefresh = () => fetchStats();
    window.addEventListener("sj-refresh-data", handleRefresh);
    return () => window.removeEventListener("sj-refresh-data", handleRefresh);
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-luxury-gold border-t-transparent animate-spin"></div>
          <p className="text-xs font-semibold text-luxury-muted">Reading live figures from MongoDB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-luxury-gold">
            Sarafa Live Operations
          </span>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-luxury-green sm:text-3xl">
            Executive Dashboard
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">
            Real-time balance of showroom metals, scrap acquisition ledger, and gold finance portfolio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchStats()}
            className="flex items-center gap-1.5 rounded-xl border border-luxury-beige bg-white px-3.5 py-2 text-xs font-semibold text-luxury-charcoal shadow-xs hover:bg-luxury-ivory transition"
          >
            <RefreshCw className="h-3.5 w-3.5 text-luxury-gold" />
            <span>Sync Data</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* KPI Section 1: Gold & Silver Showroom Inventory */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Gold Available Stock */}
        <div className="group relative overflow-hidden rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury transition hover:shadow-luxury-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-luxury-muted">
              Gold Showroom Stock
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-luxury-gold">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-serif text-2xl font-bold text-luxury-green">
              {stats?.gold.netWeight.toFixed(3) || "0.000"}{" "}
              <span className="text-sm font-sans font-normal text-luxury-muted">g Net</span>
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-luxury-muted border-t border-luxury-beige/60 pt-2">
              <span>Gross: {stats?.gold.grossWeight.toFixed(3) || "0.000"} g</span>
              <span className="font-semibold text-luxury-charcoal">{stats?.gold.pieces || 0} pieces</span>
            </div>
          </div>
          <Link
            href="/gold"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-luxury-gold group-hover:text-luxury-green transition"
          >
            <span>View {stats?.gold.categoryCount || 0} Gold Categories</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Card 2: Silver Available Stock */}
        <div className="group relative overflow-hidden rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury transition hover:shadow-luxury-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-luxury-muted">
              Silver Showroom Stock
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
              <Gem className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-serif text-2xl font-bold text-luxury-green">
              {stats?.silver.netWeight.toFixed(3) || "0.000"}{" "}
              <span className="text-sm font-sans font-normal text-luxury-muted">g Net</span>
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-luxury-muted border-t border-luxury-beige/60 pt-2">
              <span>Gross: {stats?.silver.grossWeight.toFixed(3) || "0.000"} g</span>
              <span className="font-semibold text-luxury-charcoal">{stats?.silver.pieces || 0} pieces</span>
            </div>
          </div>
          <Link
            href="/silver"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-luxury-gold group-hover:text-luxury-green transition"
          >
            <span>View {stats?.silver.categoryCount || 0} Silver Categories</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Card 3: Scrap Metal Purchased */}
        <div className="group relative overflow-hidden rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury transition hover:shadow-luxury-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-luxury-muted">
              Used Metal Purchases
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-luxury-green">
              <RefreshCw className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-serif text-2xl font-bold text-luxury-green">
              ₹{(stats?.usedMetal.totalCostRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-luxury-muted border-t border-luxury-beige/60 pt-2">
              <span>Gold: {stats?.usedMetal.goldNetWeight.toFixed(3) || "0.000"} g</span>
              <span>Silver: {stats?.usedMetal.silverNetWeight.toFixed(3) || "0.000"} g</span>
            </div>
          </div>
          <Link
            href="/used-metal"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-luxury-gold group-hover:text-luxury-green transition"
          >
            <span>{stats?.usedMetal.totalCount || 0} Scrap Vouchers</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Card 4: Gold Finance Outstanding */}
        <div className="group relative overflow-hidden rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury transition hover:shadow-luxury-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-luxury-muted">
              Finance Outstanding Dues
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
              <Landmark className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="font-serif text-2xl font-bold text-luxury-green">
              ₹{(stats?.finance.totalDueRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-luxury-muted border-t border-luxury-beige/60 pt-2">
              <span>Principal: ₹{(stats?.finance.outstandingPrincipalRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              <span className="text-amber-800 font-semibold">+₹{(stats?.finance.accruedInterestRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })} int</span>
            </div>
          </div>
          <Link
            href="/finance"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-luxury-gold group-hover:text-luxury-green transition"
          >
            <span>{stats?.finance.activeLoansCount || 0} Active Loans</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Finance Overdue Warning Banner if any overdue accounts */}
      {(stats?.finance.overdueCount || 0) > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50/80 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Action Required: {stats?.finance.overdueCount} Finance Accounts are Past Maturity Due Date!
              </p>
              <p className="text-[11px] text-amber-700">
                Review overdue client pledges and calculate updated compound dues in the Gold Finance module.
              </p>
            </div>
          </div>
          <Link
            href="/finance?status=overdue"
            className="rounded-xl bg-amber-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 shadow-xs transition"
          >
            View Overdue Accounts
          </Link>
        </div>
      )}

      {/* Grid: Quick Access & Recent Activities */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Primary Operations Hub */}
        <div className="space-y-6 lg:col-span-2">
          {/* Module Deep-Dive Cards */}
          <div className="rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury">
            <div className="flex items-center justify-between border-b border-luxury-beige pb-4">
              <div>
                <h3 className="font-serif text-base font-bold text-luxury-green">Primary Modules</h3>
                <p className="text-xs text-luxury-muted">Direct access to core business ledgers</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                href="/gold"
                className="group flex flex-col justify-between rounded-xl border border-luxury-beige bg-luxury-ivory/40 p-4 hover:border-luxury-gold hover:bg-white transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm font-bold text-luxury-green">Gold Inventory</span>
                    <Coins className="h-4 w-4 text-luxury-gold" />
                  </div>
                  <p className="mt-1 text-xs text-luxury-muted">
                    Dynamic category-wise pieces, gross/net milligram weights, stone deductions, and HUID registry.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-luxury-green">
                  <span>Enter Gold Module</span>
                  <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>

              <Link
                href="/silver"
                className="group flex flex-col justify-between rounded-xl border border-luxury-beige bg-luxury-ivory/40 p-4 hover:border-luxury-gold hover:bg-white transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm font-bold text-luxury-green">Silver Inventory</span>
                    <Gem className="h-4 w-4 text-luxury-gold" />
                  </div>
                  <p className="mt-1 text-xs text-luxury-muted">
                    Anklets, utensils, pooja items, 999 coins, and standard ornaments with category aggregates.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-luxury-green">
                  <span>Enter Silver Module</span>
                  <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>

              <Link
                href="/used-metal"
                className="group flex flex-col justify-between rounded-xl border border-luxury-beige bg-luxury-ivory/40 p-4 hover:border-luxury-gold hover:bg-white transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm font-bold text-luxury-green">Used Gold & Silver</span>
                    <RefreshCw className="h-4 w-4 text-luxury-gold" />
                  </div>
                  <p className="mt-1 text-xs text-luxury-muted">
                    Customer exchange & scrap purchases, tested purity, deduction tracking, and explicit showroom conversion.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-luxury-green">
                  <span>Enter Scrap Ledger</span>
                  <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>

              <Link
                href="/finance"
                className="group flex flex-col justify-between rounded-xl border border-luxury-beige bg-luxury-ivory/40 p-4 hover:border-luxury-gold hover:bg-white transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm font-bold text-luxury-green">Gold Finance & Mortgage</span>
                    <Landmark className="h-4 w-4 text-luxury-gold" />
                  </div>
                  <p className="mt-1 text-xs text-luxury-muted">
                    Native mortgage engine v2, 12-month compound rests, pledged ornament segregation, payment vouchers.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-luxury-green">
                  <span>Enter Finance Engine</span>
                  <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Col: Recent Activity Stream */}
        <div className="rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury">
          <div className="flex items-center justify-between border-b border-luxury-beige pb-4">
            <div>
              <h3 className="font-serif text-base font-bold text-luxury-green">Live Activity Feed</h3>
              <p className="text-xs text-luxury-muted">Latest operations across all ledgers</p>
            </div>
            <Clock className="h-4 w-4 text-luxury-gold" />
          </div>

          <div className="mt-4 space-y-4">
            {!stats?.recentActivities || stats.recentActivities.length === 0 ? (
              <p className="text-xs text-luxury-muted py-8 text-center">
                No recent transactions recorded yet.
              </p>
            ) : (
              stats.recentActivities.map((act) => {
                const dateStr = new Date(act.date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 rounded-xl border border-luxury-beige/60 p-3 bg-luxury-ivory/20 hover:bg-luxury-ivory/60 transition"
                  >
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-luxury-green/10 text-luxury-green shrink-0">
                      {act.type === "inventory" ? (
                        <Coins className="h-3.5 w-3.5 text-luxury-gold" />
                      ) : act.type === "used_purchase" ? (
                        <RefreshCw className="h-3.5 w-3.5 text-luxury-green" />
                      ) : (
                        <Landmark className="h-3.5 w-3.5 text-amber-800" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-luxury-charcoal truncate">{act.title}</p>
                      <p className="text-[11px] text-luxury-muted mt-0.5 truncate">{act.subtitle}</p>
                      <p className="text-[10px] text-luxury-gold font-medium mt-1">{dateStr}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
