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
  BookOpen,
} from "lucide-react";
import { TiltCard, AnimatedNumber, GlassCard, PulseDot } from "@/components/Motion";

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

// KPI Card component with 3D Tilt
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
  accent = "gold",
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
  accent?: "gold" | "silver" | "amber" | "emerald";
}) {
  const accentClasses = {
    gold: "border-luxury-gold/30 hover:border-luxury-gold/70 shadow-[0_4px_24px_rgba(201,168,76,0.12)]",
    silver: "border-slate-400/30 hover:border-slate-300/70 shadow-[0_4px_24px_rgba(192,196,204,0.12)]",
    amber: "border-amber-500/30 hover:border-amber-400/70 shadow-[0_4px_24px_rgba(245,158,11,0.12)]",
    emerald: "border-emerald-500/30 hover:border-emerald-400/70 shadow-[0_4px_24px_rgba(16,185,129,0.12)]",
  };

  return (
    <Link href={link} className="block group">
      <TiltCard
        maxTilt={8}
        glare={true}
        className={`h-full rounded-2xl border p-5 transition-all duration-300 animate-fadeInUp ${
          dark
            ? "bg-gradient-to-br from-luxury-onyx via-luxury-graphite to-luxury-onyx text-white border-luxury-gold/50 shadow-gold-glow-lg dark:text-white"
            : `bg-luxury-graphite/90 backdrop-blur-xl ${accentClasses[accent]}`
        }`}
        style={{ animationDelay: `${(delay || 0) * 0.06}s` }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-luxury-gold-champagne">
            {label}
          </span>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110 ${
              iconBg || "bg-white/[0.06] border border-white/[0.1] text-luxury-gold"
            }`}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Value */}
        <div className="mt-3">
          <div className="font-serif text-2xl font-bold leading-tight text-neutral-900 dark:text-white group-hover:text-luxury-gold-bright transition-colors">
            {value}
          </div>
          {(sub || subRight) && (
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-black/10 dark:border-white/[0.08] pt-2 text-[11px] text-luxury-muted">
              {sub && <span className="truncate">{sub}</span>}
              {subRight && <span className="font-semibold text-neutral-900 dark:text-white/90 shrink-0">{subRight}</span>}
            </div>
          )}
        </div>

        {/* Footer link */}
        <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-luxury-gold transition-colors group-hover:text-luxury-gold-bright">
          <span>{linkLabel}</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
        </div>
      </TiltCard>
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
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-luxury-gold-champagne">
            Sarafa Live Operations
          </span>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-wide text-white sm:text-3xl">
            Executive Dashboard
          </h1>
          <p className="mt-1 text-[12px] text-luxury-muted max-w-lg">
            Real-time showroom metals, scrap acquisition ledger &amp; gold finance portfolio.
          </p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={syncing}
          className="flex items-center gap-2 self-start rounded-xl border border-luxury-gold/30 bg-luxury-graphite/90 px-4 py-2.5 text-[12px] font-semibold text-white shadow-luxury backdrop-blur-md transition-all hover:border-luxury-gold/60 hover:bg-white/[0.08] hover:shadow-gold-glow disabled:opacity-60 md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-luxury-gold ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync Data"}
        </button>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-[12px] text-red-300 animate-slideDown flex items-center gap-2 backdrop-blur-md">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          {error}
        </div>
      )}

      {/* ── KPI Row 1: Metals + Finance ── */}
      <section>
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-1 rounded-full bg-luxury-gold shadow-[0_0_8px_rgba(201,168,76,0.8)]" />
            <h2 className="font-serif text-[11px] font-bold uppercase tracking-widest text-luxury-gold-champagne">
              Showroom Metals &amp; Finance Portfolio
            </h2>
          </div>
          <span className="text-[10px] text-luxury-muted">Live Inventory</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            delay={0}
            accent="gold"
            label="Gold Stock"
            value={<><AnimatedNumber value={stats?.gold.netWeight || 0} decimals={3} /> <span className="text-sm font-sans font-normal text-luxury-gold-champagne">g net</span></>}
            sub={`Gross: ${(stats?.gold.grossWeight || 0).toFixed(3)} g`}
            subRight={`${stats?.gold.pieces || 0} pcs`}
            link="/gold"
            linkLabel={`${stats?.gold.categoryCount || 0} Categories`}
            icon={Coins}
            iconBg="bg-luxury-gold/15 border border-luxury-gold/30 text-luxury-gold"
          />
          <KpiCard
            delay={1}
            accent="silver"
            label="Silver Stock"
            value={<><AnimatedNumber value={stats?.silver.netWeight || 0} decimals={3} /> <span className="text-sm font-sans font-normal text-slate-400">g net</span></>}
            sub={`Gross: ${(stats?.silver.grossWeight || 0).toFixed(3)} g`}
            subRight={`${stats?.silver.pieces || 0} pcs`}
            link="/silver"
            linkLabel={`${stats?.silver.categoryCount || 0} Categories`}
            icon={Gem}
            iconBg="bg-slate-400/15 border border-slate-400/30 text-slate-300"
          />
          <KpiCard
            delay={2}
            accent="gold"
            label="Used Metal"
            value={<AnimatedNumber value={stats?.usedMetal.totalCostRupees || 0} prefix="₹" />}
            sub={`Au: ${(stats?.usedMetal.goldNetWeight || 0).toFixed(2)}g`}
            subRight={`Ag: ${(stats?.usedMetal.silverNetWeight || 0).toFixed(2)}g`}
            link="/used-metal"
            linkLabel={`${stats?.usedMetal.totalCount || 0} Vouchers`}
            icon={RefreshCw}
            iconBg="bg-luxury-gold/15 border border-luxury-gold/30 text-luxury-gold"
          />
          <KpiCard
            delay={3}
            accent="amber"
            label="Finance Outstanding"
            value={<AnimatedNumber value={stats?.finance.totalDueRupees || 0} prefix="₹" />}
            sub={`Principal: ₹${(stats?.finance.outstandingPrincipalRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            subRight={<span className="text-amber-400">+₹{(stats?.finance.accruedInterestRupees || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })} int</span>}
            link="/finance"
            linkLabel={`${stats?.finance.activeLoansCount || 0} Active Loans`}
            icon={Landmark}
            iconBg="bg-amber-500/15 border border-amber-500/30 text-amber-400"
          />
        </div>
      </section>

      {/* ── KPI Row 2: Cash + Sales ── */}
      <section>
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <h2 className="font-serif text-[11px] font-bold uppercase tracking-widest text-emerald-400">
              Cash Counter &amp; Sales Performance
            </h2>
          </div>
          <span className="text-[10px] text-luxury-muted">Rojmel &amp; Udhari</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            delay={4}
            dark
            label="Live Cash in Counter"
            value={<AnimatedNumber value={counter?.cashInHandRupees || 0} prefix="₹" />}
            sub="Rojmel counter balance"
            link="/cash-book"
            linkLabel="Open Cash Book"
            icon={Wallet}
          />
          <KpiCard
            delay={5}
            accent="emerald"
            label="Realized Profit"
            value={<span className="text-emerald-400">+<AnimatedNumber value={counter?.totalProfitRupees || 0} prefix="₹" /></span>}
            sub={`${counter?.totalSalesCount || 0} sales logged`}
            link="/profit-loss"
            linkLabel="Profit & Loss Report"
            icon={TrendingUp}
            iconBg="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
          />
          <KpiCard
            delay={6}
            accent="amber"
            label="Pending Udhari"
            value={<span className="text-amber-400"><AnimatedNumber value={counter?.outstandingUdhariRupees || 0} prefix="₹" /></span>}
            sub="Customer balance to collect"
            link="/udhari?tab=pending_udhari"
            linkLabel="Open Udhari Khata"
            icon={BookOpen}
            iconBg="bg-amber-500/15 border border-amber-500/30 text-amber-400"
          />
          <KpiCard
            delay={7}
            accent="amber"
            label="Due Alerts (3 Days)"
            value={<><AnimatedNumber value={counter?.dueAlertCount || 0} /> <span className="text-sm font-sans font-normal text-luxury-muted">due soon</span></>}
            sub="WhatsApp reminder queue"
            link="/udhari?tab=3_days"
            linkLabel="Send Due Alerts"
            icon={Clock}
            iconBg="bg-amber-500/15 border border-amber-500/30 text-amber-400"
          />
        </div>
      </section>

      {/* ── Overdue Alert Banner ── */}
      {(stats?.finance.overdueCount || 0) > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 shadow-luxury backdrop-blur-md animate-slideDown">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-luxury">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-amber-200">
                Action Required — {stats?.finance.overdueCount} Finance Accounts Past Maturity
              </p>
              <p className="mt-0.5 text-[11px] text-amber-300/80">
                Review overdue client pledges and calculate updated compound dues.
              </p>
            </div>
          </div>
          <Link
            href="/finance?status=overdue"
            className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-[12px] font-bold text-black shadow-luxury hover:bg-amber-400 transition-colors btn-3d"
          >
            View Overdue
          </Link>
        </div>
      )}

      {/* ── Bottom: Quick Links + Live Activity ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Quick Links (2 col span) */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl shadow-luxury overflow-hidden">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-luxury-gold" />
              <div>
                <h3 className="font-serif text-[13px] font-bold text-white">Quick Module Access</h3>
                <p className="text-[11px] text-luxury-muted">Jump to any core business ledger</p>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { href: "/gold", icon: Coins, label: "Gold Inventory", desc: "Stock by category, HUID, purity" },
              { href: "/silver", icon: Gem, label: "Silver Inventory", desc: "Anklets, coins, utensils" },
              { href: "/sales", icon: ShoppingBag, label: "Sales & Invoices", desc: "Showroom billing, counter invoices" },
              { href: "/udhari", icon: BookOpen, label: "Udhari Khata", desc: "Customer credit, recovery & WhatsApp" },
              { href: "/cash-book", icon: Wallet, label: "Cash Book", desc: "Daily Jama & Kharach (Rojmel)" },
              { href: "/profit-loss", icon: TrendingUp, label: "Profit & Loss", desc: "Realized showroom margins" },
              { href: "/used-metal", icon: RefreshCw, label: "Used Metal", desc: "Exchange & scrap purchases" },
              { href: "/finance", icon: Landmark, label: "Gold Finance", desc: "Khata Book mortgage v2" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 hover:border-luxury-gold/50 hover:bg-white/[0.07] transition-all duration-200 card-3d animate-fadeInUp"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-4 w-4 text-luxury-gold group-hover:scale-110 transition-transform duration-200" />
                    <ArrowUpRight className="h-3.5 w-3.5 text-luxury-muted group-hover:text-luxury-gold-bright group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <div>
                    <p className="font-serif text-[12px] font-bold text-white leading-snug group-hover:text-luxury-gold-bright transition-colors">{item.label}</p>
                    <p className="text-[10px] text-luxury-muted mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl shadow-luxury overflow-hidden">
          <div className="border-b border-white/[0.08] px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-[13px] font-bold text-white">Live Activity</h3>
              <p className="text-[11px] text-luxury-muted">Latest operations</p>
            </div>
            <PulseDot color="gold" label="Live" />
          </div>
          <div className="p-4 space-y-2.5 max-h-[320px] overflow-y-auto scrollbar-thin">
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
                    className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.06] hover:border-luxury-gold/30 transition-all duration-200 animate-fadeInUp"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-luxury-gold/15 border border-luxury-gold/30">
                      <ActIcon className="h-3.5 w-3.5 text-luxury-gold" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-white truncate">{act.title}</p>
                      <p className="text-[10px] text-luxury-muted mt-0.5 truncate">{act.subtitle}</p>
                      <p className="text-[9px] text-luxury-gold font-medium mt-1">{dateStr}</p>
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
