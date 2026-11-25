"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Coins,
  Gem,
  Building,
  Shield,
  Download,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import { TiltCard, AnimatedNumber } from "@/components/Motion";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingRates, setSavingRates] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Metal Rates
  const [rates, setRates] = useState({
    gold24k: "7950",
    gold22k: "7285",
    gold18k: "5962",
    silverFine: "98",
  });

  // Shop Profile Settings
  const [shopSettings, setShopSettings] = useState({
    shopName: "SIDHESHWAR JEWELLERS",
    phone: "+91 8329465301",
    email: "contact@sidheshwarjewellers.com",
    address: "Shop No. 12, Sarafa Bazaar, Main Road",
    defaultMonthlyInterestRate: 2.0,
    defaultInterestMode: "yearly_compound",
    timezone: "Asia/Kolkata",
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (d.rates) {
            setRates({
              gold24k: String(d.rates.gold24kRateRupeesPerGram),
              gold22k: String(d.rates.gold22kRateRupeesPerGram),
              gold18k: String(d.rates.gold18kRateRupeesPerGram),
              silverFine: String(d.rates.silverFineRateRupeesPerGram),
            });
          }
          if (d.settings) {
            setShopSettings({
              shopName: d.settings.shopName || "SIDHESHWAR JEWELLERS",
              phone: d.settings.phone || "",
              email: d.settings.email || "",
              address: d.settings.address || "",
              defaultMonthlyInterestRate: d.settings.defaultMonthlyInterestRate || 2.0,
              defaultInterestMode: d.settings.defaultInterestMode || "yearly_compound",
              timezone: d.settings.timezone || "Asia/Kolkata",
            });
          }
          if (d.auditLogs) {
            setAuditLogs(d.auditLogs);
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRates(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_rates",
          ...rates,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update rates");

      setSuccessMsg("Daily benchmark metal rates updated successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingRates(false);
    }
  };

  const handleUpdateShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShop(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_shop_settings",
          ...shopSettings,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update settings");

      setSuccessMsg("Shop profile & finance defaults saved!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingShop(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fadeInUp">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-luxury-gold-champagne">
          System Administration
        </span>
        <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Settings &amp; Configurations
        </h1>
        <p className="mt-1 text-xs text-luxury-muted">
          Benchmark daily market rates, shop profile details, CSV export utilities, and system audit trail.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-950/40 p-3 text-xs text-red-300 border border-red-500/40 backdrop-blur-md animate-slideDown">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-luxury-gold-subtle/50 p-3 text-xs text-luxury-gold-bright border border-luxury-gold/40 backdrop-blur-md font-medium animate-slideDown">
          <Check className="h-4 w-4 shrink-0 text-luxury-gold" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Benchmark Daily Metal Rates */}
        <div className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-6 shadow-luxury card-3d">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-white">Daily Benchmark Rates</h3>
              <p className="text-xs text-luxury-muted">Sarafa Bazaar market reference per gram (₹/g)</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-luxury-gold/15 text-luxury-gold border border-luxury-gold/30">
              <Coins className="h-4 w-4" />
            </div>
          </div>

          <form onSubmit={handleUpdateRates} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">
                  Gold 24K Rate (₹/g)
                </label>
                <input
                  type="number"
                  required
                  value={rates.gold24k}
                  onChange={(e) => setRates({ ...rates, gold24k: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs font-bold text-luxury-gold-bright focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">
                  Gold 22K Rate (₹/g)
                </label>
                <input
                  type="number"
                  required
                  value={rates.gold22k}
                  onChange={(e) => setRates({ ...rates, gold22k: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs font-bold text-luxury-gold-bright focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">
                  Gold 18K Rate (₹/g)
                </label>
                <input
                  type="number"
                  required
                  value={rates.gold18k}
                  onChange={(e) => setRates({ ...rates, gold18k: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs font-bold text-luxury-gold-bright focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">
                  Silver Fine 999 (₹/g)
                </label>
                <input
                  type="number"
                  required
                  value={rates.silverFine}
                  onChange={(e) => setRates({ ...rates, silverFine: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs font-bold text-slate-200 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingRates}
                className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50 btn-3d"
              >
                {savingRates ? "Saving..." : "Update Daily Rates"}
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Shop Profile & Defaults */}
        <div className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-6 shadow-luxury card-3d">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-white">Shop Profile &amp; Settings</h3>
              <p className="text-xs text-luxury-muted">Receipt letterhead and mortgage default rates</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-luxury-gold border border-white/[0.1]">
              <Building className="h-4 w-4" />
            </div>
          </div>

          <form onSubmit={handleUpdateShopSettings} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-luxury-muted mb-1">Shop Name</label>
              <input
                type="text"
                required
                value={shopSettings.shopName}
                onChange={(e) => setShopSettings({ ...shopSettings, shopName: e.target.value })}
                className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">Phone</label>
                <input
                  type="text"
                  value={shopSettings.phone}
                  onChange={(e) => setShopSettings({ ...shopSettings, phone: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">Email</label>
                <input
                  type="email"
                  value={shopSettings.email}
                  onChange={(e) => setShopSettings({ ...shopSettings, email: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-luxury-muted mb-1">Shop Address</label>
              <input
                type="text"
                value={shopSettings.address}
                onChange={(e) => setShopSettings({ ...shopSettings, address: e.target.value })}
                className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">
                  Default Finance Rate (%/mo)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={shopSettings.defaultMonthlyInterestRate}
                  onChange={(e) =>
                    setShopSettings({
                      ...shopSettings,
                      defaultMonthlyInterestRate: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">Timezone</label>
                <input
                  type="text"
                  disabled
                  value={shopSettings.timezone}
                  className="w-full rounded-xl border border-white/[0.08] bg-luxury-obsidian/40 px-3 py-2 text-xs text-luxury-muted"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingShop}
                className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 active:scale-95 transition disabled:opacity-50 btn-3d"
              >
                {savingShop ? "Saving..." : "Save Shop Settings"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* CSV Export Center */}
      <div className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-6 shadow-luxury card-3d">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="font-serif text-base font-bold text-white">Data Export Center</h3>
            <p className="text-xs text-luxury-muted">
              Download clean Excel spreadsheets (.xlsx) for accounting, CA audits, tax filing, and offline backup
            </p>
          </div>
          <FileSpreadsheet className="h-5 w-5 text-luxury-gold" />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/api/export/sales"
            download
            className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 hover:border-emerald-400 hover:bg-emerald-950/40 transition-all shadow-xs"
          >
            <div>
              <p className="font-bold text-xs text-emerald-300">Sales Ledger (Excel)</p>
              <p className="text-[11px] text-luxury-muted mt-0.5">Customer bills, Udhari, modes</p>
            </div>
            <Download className="h-4 w-4 text-emerald-400" />
          </a>

          <a
            href="/api/export/cash-book"
            download
            className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 hover:border-amber-400 hover:bg-amber-950/40 transition-all shadow-xs"
          >
            <div>
              <p className="font-bold text-xs text-amber-300">Rojmel Cash Book (Excel)</p>
              <p className="text-[11px] text-luxury-muted mt-0.5">Counter Jama &amp; Kharach</p>
            </div>
            <Download className="h-4 w-4 text-amber-400" />
          </a>

          <a
            href="/api/export/inventory?metalType=gold"
            download
            className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 hover:border-luxury-gold/50 hover:bg-white/[0.06] transition-all"
          >
            <div>
              <p className="font-bold text-xs text-white">Gold Inventory (Excel)</p>
              <p className="text-[11px] text-luxury-muted mt-0.5">All active gold stock</p>
            </div>
            <Download className="h-4 w-4 text-luxury-gold" />
          </a>

          <a
            href="/api/export/inventory?metalType=silver"
            download
            className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 hover:border-slate-400/50 hover:bg-white/[0.06] transition-all"
          >
            <div>
              <p className="font-bold text-xs text-white">Silver Inventory (Excel)</p>
              <p className="text-[11px] text-luxury-muted mt-0.5">All active silver stock</p>
            </div>
            <Download className="h-4 w-4 text-slate-300" />
          </a>

          <a
            href="/api/export/profit-loss"
            download
            className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 hover:border-emerald-500/50 hover:bg-white/[0.06] transition-all"
          >
            <div>
              <p className="font-bold text-xs text-white">Profit &amp; Loss (Excel)</p>
              <p className="text-[11px] text-luxury-muted mt-0.5">Realized margins &amp; revenues</p>
            </div>
            <Download className="h-4 w-4 text-emerald-400" />
          </a>

          <a
            href="/api/export/used-metal"
            download
            className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 hover:border-luxury-gold/50 hover:bg-white/[0.06] transition-all"
          >
            <div>
              <p className="font-bold text-xs text-white">Used Metal Scrap (Excel)</p>
              <p className="text-[11px] text-luxury-muted mt-0.5">Customer exchange vouchers</p>
            </div>
            <Download className="h-4 w-4 text-luxury-gold" />
          </a>

          <a
            href="/api/export/finance-loans"
            download
            className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 hover:border-amber-500/50 hover:bg-white/[0.06] transition-all"
          >
            <div>
              <p className="font-bold text-xs text-white">Finance Portfolio (Excel)</p>
              <p className="text-[11px] text-luxury-muted mt-0.5">Loans, dues &amp; pledged items</p>
            </div>
            <Download className="h-4 w-4 text-amber-400" />
          </a>

          <a
            href="/api/export/stocktake"
            download
            className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 hover:border-teal-500/50 hover:bg-white/[0.06] transition-all"
          >
            <div>
              <p className="font-bold text-xs text-white">Stock Audit Checklist (Excel)</p>
              <p className="text-[11px] text-luxury-muted mt-0.5">Physical showroom audit</p>
            </div>
            <Download className="h-4 w-4 text-teal-400" />
          </a>
        </div>
      </div>

      {/* System Audit Trail */}
      <div className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-6 shadow-luxury card-3d">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="font-serif text-base font-bold text-white">System Audit Trail</h3>
            <p className="text-xs text-luxury-muted">Immutable log of critical operations across all modules</p>
          </div>
          <Shield className="h-5 w-5 text-luxury-gold" />
        </div>

        <div className="mt-4 space-y-2.5 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
          {auditLogs.length === 0 ? (
            <p className="py-8 text-center text-xs text-luxury-muted">No audit events recorded yet.</p>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log._id}
                className="flex items-start justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-luxury-gold font-mono uppercase text-[11px]">
                      {log.action}
                    </span>
                    <span className="rounded bg-luxury-gold/15 border border-luxury-gold/30 px-1.5 py-0.5 text-[9px] font-semibold text-luxury-gold-bright uppercase">
                      {log.module}
                    </span>
                  </div>
                  <p className="text-white/80">{log.description}</p>
                </div>
                <div className="text-right text-[10px] text-luxury-muted shrink-0 ml-4 font-mono">
                  <p>{new Date(log.timestamp).toLocaleDateString("en-IN")}</p>
                  <p>{new Date(log.timestamp).toLocaleTimeString("en-IN")}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
