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
  Sparkles,
  Wallet,
  ShoppingBag,
  TrendingUp,
  Clock,
  Activity,
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
  counter?: {
    cashInHandRupees: number;
    totalProfitRupees: number;
    outstandingUdhariRupees: number;
    dueAlertCount: number;
    totalSalesCount: number;
  };
  recentActivities: Array<{
    id: string;
    type: "inventory" | "used_purchase" | "finance_payment" | "sale";
    metalType: string;
    title: string;
    subtitle: string;
    date: string;
  }>;
}

// KPI Card component
function KpiCard({
  label,
  value,
  sub,
  subRight,
  link,
  linkLabel,
  icon: Icon,
  iconBg,
  dark,
  delay,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  subRight?: React.ReactNode;
  link: string;
  linkLabel: string;
  icon: React.ElementType;
  iconBg?: string;
  dark?: boolean;
  delay?: number;
}) {
  return (
    <Link
      href={link}
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-300 cursor-pointer animate-fadeInUp card-hover overflow-hidden ${
        dark
          ? "border-luxury-gold/30 bg-luxury-onyx text-white shadow-gold-glow"
          : "border-luxury-champagne bg-white shadow-luxury hover:border-luxury-gold/35"
      }`}
      style={{ animationDelay: `${(delay || 0) * 0.07}s` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <span className={`text-[11px] font-semibold uppercase tracking-widest ${dark ? "text-luxury-gold" : "text-luxury-muted"}`}>
          {label}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${iconBg || "bg-luxury-gold-subtle border border-luxury-champagne"}`}>
          <Icon className={`h-4.5 w-4.5 ${dark ? "text-luxury-gold" : "text-luxury-gold-dark"}`} />
        </div>
      </div>

      {/* Value */}
      <div className="mt-3">
        <p className={`font-serif text-2xl font-bold leading-tight ${dark ? "text-luxury-gold" : "text-luxury-onyx"}`}>
          {value}
        </p>
        {(sub || subRight) && (
          <div className={`mt-2 flex items-center justify-between gap-2 border-t pt-2 text-[11px] ${dark ? "border-luxury-gold/15 text-white/60" : "border-luxury-champagne text-luxury-muted"}`}>
            {sub && <span className="truncate">{sub}</span>}
            {subRight && <span className={`font-semibold shrink-0 ${dark ? "text-white/80" : "text-luxury-charcoal"}`}>{subRight}</span>}
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className={`mt-4 flex items-center justify-between text-[11px] font-semibold transition-colors ${dark ? "text-luxury-gold group-hover:text-luxury-gold-bright" : "text-luxury-gold-dark group-hover:text-luxury-gold"}`}>
        <span>{linkLabel}</span>
        <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchStats = useCallback(async (showSync = false) => {
    try {
      if (showSync) setSyncing(true);
      else setLoading(true);
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats);
        setError(null);
      } else {
        setError(data.error || "Failed to load dashboard metrics");
      }
    } catch (err: any) {
      setError(err.message || "Network error — check server connection");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const handleRefresh = () => fetchStats(true);
    window.addEventListener("sj-refresh-data", handleRefresh);
    return () => window.removeEventListener("sj-refresh-data", handleRefresh);
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fadeInUp">
          <div className="h-9 w-9 rounded-full border-2 border-luxury-gold/20 border-t-luxury-gold animate-spin" />
          <p className="text-[11px] text-luxury-muted font-medium">
            Reading live figures from database…
          </p>
        </div>
      </div>
    );
  }

  const counter = stats?.counter;

  return (
    <div className="space-y-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end animate-fadeInUp">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-luxury-gold-dark">
            Sarafa Live Operations
          </span>
          <h1 className="mt-0.5 font-serif text-2xl font-bold tracking-wide text-luxury-onyx sm:text-3xl">
            Executive Dashboard
          </h1>
          <p className="mt-1 text-[12px] text-luxury-muted max-w-lg">
            Real-time showroom metals, scrap acquisition ledger &amp; gold finance portfolio.
          </p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={syncing}
          className="flex items-center gap-2 self-start rounded-xl border border-luxury-champagne bg-white px-4 py-2.5 text-[12px] font-semibold text-luxury-charcoal shadow-luxury transition-all hover:border-luxury-gold/40 hover:bg-luxury-gold-subtle hover:shadow-luxury-md disabled:opacity-60 md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-luxury-gold-dark ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync Data"}
        </button>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 animate-slideDown flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── KPI Row 1: Metals + Finance ── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-3.5 w-0.5 rounded-full bg-luxury-gold" />
          <h2 className="font-serif text-[11px] font-bold uppercase tracking-widest text-luxury-onyx">
            Showroom Metals &amp; Finance Portfolio
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            delay={0}
            label="Gold Stock"
            value={<>{stats?.gold.netWeight.toFixed(3) || "0.000"} <span className="text-sm font-sans font-normal text-luxury-gold-dark">g net</span></>}
            sub={`Gross: ${stats?.gold.grossWeight.toFixed(3) || "0.000"} g`}
            subRight={`${stats?.gold.pieces || 0} pcs`}
            link="/gold"
            linkLabel={`${stats?.gold.categoryCount || 0} Categories`}
            icon={Coins}
            iconBg="bg-luxury-gold-subtle border border-luxury-champagne"
          />
          <KpiCard
            delay={1}
            label="Silver Stock"
            value={<>{stats?.silver.netWeight.toFixed(3) || "0.000"} <span className="text-sm font-sans font-normal text-slate-500">g net</span></>}
            sub={`Gross: ${stats?.silver.grossWeight.toFixed(3) || "0.000"} g`}
            subRight={`${stats?.silver.pieces || 0} pcs`}
            link="/silver"
            linkLabel={`${stats?.silver.categoryCount || 0} Categories`}
            icon={Gem}
            iconBg="bg-slate-50 border border-slate-200"
          />
          <KpiCard
            delay={2}
            label="Used Metal"
            value={<>₹{(stats?.usedMetal.totalCostRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</>}
            sub={`Au: ${stats?.usedMetal.goldNetWeight.toFixed(2) || "0.00"}g`}
            subRight={`Ag: ${stats?.usedMetal.silverNetWeight.toFixed(2) || "0.00"}g`}
            link="/used-metal"
            linkLabel={`${stats?.usedMetal.totalCount || 0} Vouchers`}
            icon={RefreshCw}
            iconBg="bg-luxury-gold-subtle border border-luxury-champagne"
          />
          <KpiCard
            delay={3}
            label="Finance Outstanding"
            value={<>₹{(stats?.finance.totalDueRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</>}
            sub={`Principal: ₹${(stats?.finance.outstandingPrincipalRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            subRight={<span className="text-amber-700">+₹{(stats?.finance.accruedInterestRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })} int</span>}
            link="/finance"
            linkLabel={`${stats?.finance.activeLoansCount || 0} Active Loans`}
            icon={Landmark}
            iconBg="bg-amber-50 border border-amber-200"
          />
        </div>
      </section>

      {/* ── KPI Row 2: Cash + Sales ── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-3.5 w-0.5 rounded-full bg-luxury-gold-dark" />
          <h2 className="font-serif text-[11px] font-bold uppercase tracking-widest text-luxury-onyx">
            Cash Counter &amp; Sales Performance
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            delay={4}
            dark
            label="Live Cash in Counter"
            value={<>₹{(counter?.cashInHandRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</>}
            sub="Rojmel counter balance"
            link="/cash-book"
            linkLabel="Open Cash Book"
            icon={Wallet}
          />
          <KpiCard
            delay={5}
            label="Realized Profit"
            value={<span className="text-luxury-gold-dark">+₹{(counter?.totalProfitRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>}
            sub={`${counter?.totalSalesCount || 0} sales logged`}
            link="/profit-loss"
            linkLabel="Profit & Loss Report"
            icon={TrendingUp}
            iconBg="bg-luxury-gold-subtle border border-luxury-champagne"
          />
          <KpiCard
            delay={6}
            label="Pending Udhari"
            value={<span className="text-amber-700">₹{(counter?.outstandingUdhariRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>}
            sub="Customer balance to collect"
            link="/sales?tab=pending_udhari"
            linkLabel="Open Udhari Khata"
            icon={ShoppingBag}
            iconBg="bg-amber-50 border border-amber-200"
          />
          <KpiCard
            delay={7}
            label="Due Alerts (3 Days)"
            value={<>{counter?.dueAlertCount || 0} <span className="text-sm font-sans font-normal text-luxury-muted">due soon</span></>}
            sub="WhatsApp reminder queue"
            link="/sales?tab=3_days"
            linkLabel="Send Due Alerts"
            icon={Clock}
            iconBg="bg-amber-50 border border-amber-200"
          />
        </div>
      </section>

      {/* ── Overdue Alert Banner ── */}
      {(stats?.finance.overdueCount || 0) > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-luxury animate-slideDown">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-luxury">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-amber-900">
                Action Required — {stats?.finance.overdueCount} Finance Accounts Past Maturity
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700">
                Review overdue client pledges and calculate updated compound dues.
              </p>
            </div>
          </div>
          <Link
            href="/finance?status=overdue"
            className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-[12px] font-semibold text-white shadow-luxury hover:bg-amber-700 transition-colors"
          >
            View Overdue
          </Link>
        </div>
      )}

      {/* ── Bottom: Quick Links + Live Activity ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Quick Links (2 col span) */}
        <div className="lg:col-span-2 rounded-2xl border border-luxury-champagne bg-white shadow-luxury overflow-hidden">
          <div className="border-b border-luxury-champagne px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-luxury-gold" />
              <div>
                <h3 className="font-serif text-[13px] font-bold text-luxury-onyx">Quick Module Access</h3>
                <p className="text-[11px] text-luxury-muted">Jump to any core business ledger</p>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { href: "/gold", icon: Coins, label: "Gold Inventory", desc: "Stock by category, HUID, purity" },
              { href: "/silver", icon: Gem, label: "Silver Inventory", desc: "Anklets, coins, utensils" },
              { href: "/sales", icon: ShoppingBag, label: "Sales & Udhari", desc: "Counter billing, Udhari khata" },
              { href: "/cash-book", icon: Wallet, label: "Cash Book", desc: "Daily Jama & Kharach" },
              { href: "/used-metal", icon: RefreshCw, label: "Used Metal", desc: "Exchange & scrap purchases" },
              { href: "/finance", icon: Landmark, label: "Gold Finance", desc: "Mortgage engine v2" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col gap-2 rounded-xl border border-luxury-champagne bg-luxury-gold-subtle/30 p-3.5 hover:border-luxury-gold/50 hover:bg-white transition-all duration-200 card-hover animate-fadeInUp"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-4 w-4 text-luxury-gold-dark" />
                    <ArrowUpRight className="h-3.5 w-3.5 text-luxury-muted group-hover:text-luxury-gold-dark group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <div>
                    <p className="font-serif text-[12px] font-bold text-luxury-onyx leading-snug">{item.label}</p>
                    <p className="text-[10px] text-luxury-muted mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="rounded-2xl border border-luxury-champagne bg-white shadow-luxury overflow-hidden">
          <div className="border-b border-luxury-champagne px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-[13px] font-bold text-luxury-onyx">Live Activity</h3>
              <p className="text-[11px] text-luxury-muted">Latest operations</p>
            </div>
            <Activity className="h-4 w-4 text-luxury-gold-dark" />
          </div>
          <div className="p-4 space-y-2.5 max-h-[320px] overflow-y-auto">
            {!stats?.recentActivities || stats.recentActivities.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[12px] text-luxury-muted">No recent transactions yet.</p>
              </div>
            ) : (
              stats.recentActivities.map((act, i) => {
                const dateStr = new Date(act.date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const icons: Record<string, React.ElementType> = {
                  sale: ShoppingBag,
                  inventory: Coins,
                  used_purchase: RefreshCw,
                  finance_payment: Landmark,
                };
                const ActIcon = icons[act.type] || Coins;
                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 rounded-xl border border-luxury-champagne/70 p-3 hover:bg-luxury-gold-subtle/30 transition-colors animate-fadeInUp"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-luxury-gold/10">
                      <ActIcon className="h-3.5 w-3.5 text-luxury-gold-dark" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-luxury-charcoal truncate">{act.title}</p>
                      <p className="text-[10px] text-luxury-muted mt-0.5 truncate">{act.subtitle}</p>
                      <p className="text-[9px] text-luxury-gold-dark font-medium mt-1">{dateStr}</p>
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
