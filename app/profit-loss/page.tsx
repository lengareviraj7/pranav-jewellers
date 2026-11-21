"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { TiltCard, AnimatedNumber, GlassCard, PulseDot } from "@/components/Motion";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center animate-fadeInUp">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-luxury-gold-champagne">
            Financial Performance &amp; Margins
          </span>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Profit &amp; Loss Analytics
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">
            Realized net profits from showroom sales, metal-wise margins, and category revenue performance
          </p>
        </div>

        {/* Timeframe Filter Chips */}
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
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                range === t.id
                  ? "bg-luxury-gold text-black shadow-gold-glow font-bold border border-luxury-gold-bright scale-105"
                  : "border border-white/[0.08] bg-luxury-graphite/70 text-luxury-muted hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Showroom Revenue */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Showroom Revenue
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-white">
            <AnimatedNumber value={metrics.totalRevenueRupees} prefix="₹" />
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">
            {metrics.totalItemsSold} pieces sold
          </span>
        </TiltCard>

        {/* Realized Net Profit */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-luxury-onyx via-luxury-graphite to-luxury-onyx p-5 shadow-[0_4px_24px_rgba(16,185,129,0.15)] text-white"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Realized Net Profit
          </span>
          <p className="mt-2 font-serif text-3xl font-bold text-emerald-400">
            +<AnimatedNumber value={metrics.totalProfitRupees} prefix="₹" />
          </p>
          <span className="text-[11px] text-emerald-300/80 mt-1 block">
            Owner profit earned
          </span>
        </TiltCard>

        {/* Average Profit Margin */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-luxury-gold/30 bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-gold-champagne">
            Average Profit Margin
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-luxury-gold-bright">
            <AnimatedNumber value={metrics.profitMarginPercent} decimals={1} suffix="%" />
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">
            Net realized return on sales
          </span>
        </TiltCard>

        {/* Pending Customer Udhari */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-amber-500/30 bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            Pending Customer Udhari
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-amber-300">
            <AnimatedNumber value={metrics.totalOutstandingUdhariRupees} prefix="₹" />
          </p>
          <span className="text-[11px] text-amber-400/80 mt-1 block">
            Awaiting counter collection
          </span>
        </TiltCard>
      </div>

      {/* Metal-wise Performance Stream */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Gold Sales */}
        <div className="rounded-2xl border border-luxury-gold/30 bg-luxury-graphite/80 backdrop-blur-xl p-6 shadow-luxury space-y-4 card-3d">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-luxury-gold/15 border border-luxury-gold/30 text-luxury-gold">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-white">Gold Showroom Sales</h3>
                <p className="text-xs text-luxury-gold-champagne">24K, 22K, 18K Jewellery Performance</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-[11px] font-semibold text-luxury-muted">Total Gold Revenue</span>
              <p className="font-serif text-xl font-bold text-white mt-1">
                <AnimatedNumber value={metrics.goldRevenueRupees} prefix="₹" />
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-emerald-400">Realized Gold Profit</span>
              <p className="font-serif text-xl font-bold text-emerald-400 mt-1">
                +<AnimatedNumber value={metrics.goldProfitRupees} prefix="₹" />
              </p>
            </div>
          </div>
        </div>

        {/* Silver Sales */}
        <div className="rounded-2xl border border-slate-400/30 bg-luxury-graphite/80 backdrop-blur-xl p-6 shadow-luxury space-y-4 card-3d">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-400/15 border border-slate-400/30 text-slate-300">
                <Gem className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-white">Silver Showroom Sales</h3>
                <p className="text-xs text-slate-300">999, 925 Anklets, Payal &amp; Articles</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-[11px] font-semibold text-luxury-muted">Total Silver Revenue</span>
              <p className="font-serif text-xl font-bold text-white mt-1">
                <AnimatedNumber value={metrics.silverRevenueRupees} prefix="₹" />
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-emerald-400">Realized Silver Profit</span>
              <p className="font-serif text-xl font-bold text-emerald-400 mt-1">
                +<AnimatedNumber value={metrics.silverProfitRupees} prefix="₹" />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category-wise Breakdown Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl shadow-luxury overflow-hidden">
        <div className="p-4 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <h3 className="font-serif text-sm font-bold text-white">
            Category-wise Profit &amp; Revenue Breakdown
          </h3>
          <span className="text-[11px] text-luxury-muted">Rings, Anklets, Chains, etc.</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.04] text-luxury-gold-champagne uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Category Name</th>
                <th className="px-4 py-3">Metal</th>
                <th className="px-4 py-3 text-right">Pieces Sold</th>
                <th className="px-4 py-3 text-right">Revenue (₹)</th>
                <th className="px-4 py-3 text-right">Realized Profit (₹)</th>
                <th className="px-4 py-3 text-right">Margin (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
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
                  <tr key={idx} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-3 font-bold text-white">{cat.name}</td>
                    <td className="px-4 py-3 uppercase text-[10px] font-semibold">
                      <span
                        className={`rounded px-1.5 py-0.5 ${
                          cat.metal === "gold"
                            ? "bg-luxury-gold/15 text-luxury-gold-bright border border-luxury-gold/30"
                            : "bg-slate-400/15 text-slate-300 border border-slate-400/30"
                        }`}
                      >
                        {cat.metal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white/80 font-mono tabular-nums">{cat.count} pcs</td>
                    <td className="px-4 py-3 text-right font-bold text-white font-mono tabular-nums">
                      ₹{cat.revenueRupees.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400 font-mono tabular-nums">
                      +₹{cat.profitRupees.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-luxury-gold font-mono tabular-nums">{cat.marginPercent}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
