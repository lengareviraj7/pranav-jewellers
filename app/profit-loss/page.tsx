"use client";

import React, { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import {
  TrendingUp,
  TrendingDown,
  Coins,
  Gem,
  DollarSign,
  PieChart,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Filter,
} from "lucide-react";

interface CategoryAnalysis {
  name: string;
  metal: string;
  count: number;
  revenueRupees: number;
  profitRupees: number;
  marginPercent: number;
}

export default function ProfitLossPage() {
  const [data, setData] = useState<{
    metrics: {
      totalRevenueRupees: number;
      totalCostRupees: number;
      totalProfitRupees: number;
      totalOutstandingUdhariRupees: number;
      profitMarginPercent: number;
      goldRevenueRupees: number;
      goldProfitRupees: number;
      silverRevenueRupees: number;
      silverProfitRupees: number;
      totalItemsSold: number;
    };
    categoryAnalysis: CategoryAnalysis[];
    recentSales: any[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("month");

  const fetchProfitLoss = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/profit-loss?range=${range}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchProfitLoss();
    const handleRefresh = () => fetchProfitLoss();
    window.addEventListener("sj-refresh-data", handleRefresh);
    return () => window.removeEventListener("sj-refresh-data", handleRefresh);
  }, [fetchProfitLoss]);

  const metrics = data?.metrics || {
    totalRevenueRupees: 0,
    totalCostRupees: 0,
    totalProfitRupees: 0,
    totalOutstandingUdhariRupees: 0,
    profitMarginPercent: 0,
    goldRevenueRupees: 0,
    goldProfitRupees: 0,
    silverRevenueRupees: 0,
    silverProfitRupees: 0,
    totalItemsSold: 0,
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-luxury-gold">
              Financial Performance &amp; Margins
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-luxury-onyx sm:text-3xl">
              Profit &amp; Loss Analytics
            </h1>
            <p className="mt-1 text-xs text-luxury-muted">
              Realized net profits from showroom sales, metal-wise margins, and category revenue performance
            </p>
          </div>

          {/* Timeframe Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "today", label: "Today" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
              { id: "year", label: "This Year" },
              { id: "all", label: "All Time" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setRange(t.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  range === t.id
                    ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-xs"
                    : "border border-luxury-beige bg-white text-luxury-charcoal hover:bg-luxury-ivory"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
              Total Showroom Revenue
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-luxury-onyx">
              ₹{metrics.totalRevenueRupees.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-luxury-muted">{metrics.totalItemsSold} pieces sold</span>
          </div>

          <div className="rounded-2xl border-2 border-luxury-gold/60 bg-gradient-to-br from-luxury-onyx via-luxury-onyx-surface to-luxury-onyx p-5 shadow-gold-glow text-white">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-gold">
              Realized Net Profit
            </span>
            <p className="mt-2 font-serif text-3xl font-bold text-luxury-gold">
              +₹{metrics.totalProfitRupees.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-white/70 mt-1 block">Owner profit earned</span>
          </div>

          <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
              Average Profit Margin
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-luxury-gold-dark">
              {metrics.profitMarginPercent}%
            </p>
            <span className="text-[11px] text-luxury-muted">Net realized return on sales</span>
          </div>

          <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
              Pending Customer Udhari
            </span>
            <p className="mt-2 font-serif text-2xl font-bold text-amber-800">
              ₹{metrics.totalOutstandingUdhariRupees.toLocaleString("en-IN")}
            </p>
            <span className="text-[11px] text-amber-700">Awaiting counter collection</span>
          </div>
        </div>

        {/* Metal-wise Comparison Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Gold Section */}
          <div className="rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-luxury-beige">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-luxury-gold-subtle border border-luxury-gold/40 text-luxury-gold-dark">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-luxury-onyx">Gold Showroom Sales</h3>
                  <p className="text-xs text-luxury-muted">24K, 22K, 18K Jewellery Performance</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-[11px] font-semibold text-luxury-muted">Total Gold Revenue</span>
                <p className="font-serif text-xl font-bold text-luxury-onyx mt-1">
                  ₹{metrics.goldRevenueRupees.toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-luxury-muted">Realized Gold Profit</span>
                <p className="font-serif text-xl font-bold text-luxury-gold-dark mt-1">
                  +₹{metrics.goldProfitRupees.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          {/* Silver Section */}
          <div className="rounded-2xl border border-luxury-beige bg-white p-6 shadow-luxury space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-luxury-beige">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-300 text-slate-700">
                  <Gem className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-luxury-onyx">Silver Showroom Sales</h3>
                  <p className="text-xs text-luxury-muted">999, 925 Anklets, Payal &amp; Articles</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-[11px] font-semibold text-luxury-muted">Total Silver Revenue</span>
                <p className="font-serif text-xl font-bold text-luxury-onyx mt-1">
                  ₹{metrics.silverRevenueRupees.toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-luxury-muted">Realized Silver Profit</span>
                <p className="font-serif text-xl font-bold text-luxury-gold-dark mt-1">
                  +₹{metrics.silverProfitRupees.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category-wise Breakdown Table */}
        <div className="rounded-2xl border border-luxury-beige bg-white shadow-luxury overflow-hidden">
          <div className="p-4 border-b border-luxury-beige bg-luxury-ivory/40 flex items-center justify-between">
            <h3 className="font-serif text-sm font-bold text-luxury-onyx">
              Category-wise Profit &amp; Revenue Breakdown
            </h3>
            <span className="text-[11px] text-luxury-muted">Rings, Anklets, Chains, etc.</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-luxury-beige bg-luxury-ivory/80 text-luxury-onyx uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">Metal</th>
                  <th className="px-4 py-3 text-right">Pieces Sold</th>
                  <th className="px-4 py-3 text-right">Revenue (₹)</th>
                  <th className="px-4 py-3 text-right">Realized Profit (₹)</th>
                  <th className="px-4 py-3 text-right">Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-beige/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-luxury-muted">
                      Loading profit report...
                    </td>
                  </tr>
                ) : !data || data.categoryAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-luxury-muted">
                      No sales recorded in this timeframe yet.
                    </td>
                  </tr>
                ) : (
                  data.categoryAnalysis.map((cat, idx) => (
                    <tr key={idx} className="hover:bg-luxury-ivory/40 transition">
                      <td className="px-4 py-3 font-bold text-luxury-onyx">{cat.name}</td>
                      <td className="px-4 py-3 uppercase text-[10px] font-semibold">
                        <span
                          className={`rounded px-1.5 py-0.5 ${
                            cat.metal === "gold"
                              ? "bg-luxury-gold-subtle text-luxury-gold-dark border border-luxury-gold/30"
                              : "bg-slate-100 text-slate-700 border border-slate-300"
                          }`}
                        >
                          {cat.metal}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-luxury-charcoal font-mono tabular-nums">{cat.count} pcs</td>
                      <td className="px-4 py-3 text-right font-bold text-luxury-charcoal font-mono tabular-nums">
                        ₹{cat.revenueRupees.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-luxury-gold-dark font-mono tabular-nums">
                        +₹{cat.profitRupees.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-luxury-onyx font-mono tabular-nums">{cat.marginPercent}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
