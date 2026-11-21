"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Coins,
  Gem,
  Plus,
  Search,
  Download,
  AlertCircle,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { TiltCard, AnimatedNumber } from "@/components/Motion";

interface UsedPurchase {
  id: string;
  _id: string;
  transactionNumber: string;
  date: string;
  metalType: "gold" | "silver";
  sellerName: string;
  sellerPhone?: string;
  sellerAddress?: string;
  itemDescription: string;
  purity: string;
  grossWeight: number;
  deductionsWeight: number;
  netWeight: number;
  ratePerGramRupees: number;
  calculatedValueRupees: number;
  finalAgreedCostRupees: number;
  amountPaidRupees: number;
  remainingPayableRupees: number;
  paymentStatus: "paid" | "partially_paid" | "pending";
  paymentMethod: string;
  differenceReason?: string;
  notes?: string;
  isConvertedToInventory: boolean;
  convertedDate?: string;
  convertedNetWeight?: number;
  convertedPurity?: string;
}

export default function UsedMetalPage() {
  const [activeTab, setActiveTab] = useState<"gold" | "silver">("gold");
  const [purchases, setPurchases] = useState<UsedPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<UsedPurchase | null>(null);

  // Categories for Convert Modal
  const [goldCategories, setGoldCategories] = useState<any[]>([]);
  const [silverCategories, setSilverCategories] = useState<any[]>([]);

  // Add Purchase Form
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().split("T")[0],
    sellerName: "",
    sellerPhone: "",
    sellerAddress: "",
    itemDescription: "",
    purity: "22K",
    grossWeight: "",
    deductionsWeight: "0",
    ratePerGramRupees: "",
    finalAgreedCostRupees: "",
    amountPaidRupees: "",
    paymentMethod: "cash",
    differenceReason: "",
    notes: "",
  });

  // Convert Form
  const [convertForm, setConvertForm] = useState({
    targetCategoryId: "",
    refinedNetWeight: "",
    purity: "",
    itemName: "",
    notes: "",
  });

  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/used-metal?metalType=${activeTab}`;
      if (statusFilter !== "all") url += `&paymentStatus=${statusFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load scrap purchases");

      setPurchases(data.purchases);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, searchQuery]);

  const fetchCategories = useCallback(async () => {
    try {
      const [gRes, sRes] = await Promise.all([
        fetch("/api/categories?metalType=gold"),
        fetch("/api/categories?metalType=silver"),
      ]);
      const gData = await gRes.json();
      const sData = await sRes.json();
      if (gData.success) setGoldCategories(gData.categories);
      if (sData.success) setSilverCategories(sData.categories);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
    fetchCategories();
  }, [fetchPurchases, fetchCategories]);

  // Calculations for Add Form
  const formNetWeight = Math.max(
    0,
    (parseFloat(addForm.grossWeight) || 0) - (parseFloat(addForm.deductionsWeight) || 0)
  );
  const formCalculatedValue = Math.round(
    formNetWeight * (parseFloat(addForm.ratePerGramRupees) || 0)
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/used-metal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          metalType: activeTab,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save purchase");

      setSuccessMsg(`Used metal purchase recorded successfully: ${data.purchase.transactionNumber}`);
      setIsAddOpen(false);
      setAddForm({
        date: new Date().toISOString().split("T")[0],
        sellerName: "",
        sellerPhone: "",
        sellerAddress: "",
        itemDescription: "",
        purity: activeTab === "gold" ? "22K" : "999",
        grossWeight: "",
        deductionsWeight: "0",
        ratePerGramRupees: "",
        finalAgreedCostRupees: "",
        amountPaidRupees: "",
        paymentMethod: "cash",
        differenceReason: "",
        notes: "",
      });
      fetchPurchases();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Open Convert Modal
  const openConvertModal = (purchase: UsedPurchase) => {
    setSelectedPurchase(purchase);
    setConvertForm({
      targetCategoryId: "",
      refinedNetWeight: purchase.netWeight.toString(),
      purity: purchase.purity,
      itemName: `Refined ${purchase.purity} ${purchase.metalType === "gold" ? "Gold" : "Silver"} - ${purchase.itemDescription}`,
      notes: `Converted from old metal voucher #${purchase.transactionNumber} purchased from ${purchase.sellerName}`,
    });
    setIsConvertOpen(true);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;

    try {
      const res = await fetch(`/api/used-metal/${selectedPurchase.id || selectedPurchase._id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(convertForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Conversion failed");

      setSuccessMsg(`Successfully converted to showroom inventory item: ${data.item.name} (${data.item.sku})`);
      setIsConvertOpen(false);
      fetchPurchases();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Summary Metrics
  const totalWeight = purchases.reduce((sum, p) => sum + (p.netWeight || 0), 0);
  const totalAmount = purchases.reduce((sum, p) => sum + (p.finalAgreedCostRupees || 0), 0);
  const totalConvertedCount = purchases.filter((p) => p.isConvertedToInventory).length;
  const totalCount = purchases.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center animate-fadeInUp">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-luxury-gold-champagne">
            Scrap &amp; Exchange Acquisition
          </span>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Used Gold &amp; Silver Purchases
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">
            Independent ledger for customer exchange and scrap metal. Never enters showroom stock until refined and explicitly converted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/export/used-metal?metalType=${activeTab}`}
            download
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-luxury-graphite/80 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-white/[0.08] hover:border-luxury-gold/40 transition-all"
          >
            <Download className="h-3.5 w-3.5 text-luxury-gold" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-4 py-2 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 active:scale-95 transition-all btn-3d"
          >
            <Plus className="h-4 w-4 text-black" />
            <span>Record Used {activeTab === "gold" ? "Gold" : "Silver"} Purchase</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-red-950/40 p-3 text-xs text-red-300 border border-red-500/40 backdrop-blur-md animate-slideDown">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center justify-between rounded-xl bg-luxury-gold-subtle/50 p-3 text-xs text-luxury-gold-bright border border-luxury-gold/40 backdrop-blur-md font-medium animate-slideDown">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-luxury-gold" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Primary Tabs (Gold / Silver) */}
      <div className="flex rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 p-1.5 shadow-sm max-w-md backdrop-blur-md">
        <button
          onClick={() => setActiveTab("gold")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 ${
            activeTab === "gold"
              ? "bg-luxury-gold text-black shadow-gold-glow font-bold border border-luxury-gold-bright"
              : "text-luxury-muted hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <Coins className="h-4 w-4" />
          <span>Used Gold Purchases</span>
        </button>

        <button
          onClick={() => setActiveTab("silver")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 ${
            activeTab === "silver"
              ? "bg-slate-300 text-black shadow-xs font-bold border border-white/60"
              : "text-luxury-muted hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <Gem className="h-4 w-4" />
          <span>Used Silver Purchases</span>
        </button>
      </div>

      {/* KPI Cards for Tab */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Purchases
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-white">
            <AnimatedNumber value={totalCount} />
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">Old {activeTab} vouchers</span>
        </TiltCard>

        <TiltCard
          maxTilt={8}
          glare={true}
          className={`rounded-2xl border ${
            activeTab === "gold" ? "border-luxury-gold/40" : "border-slate-400/40"
          } bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury`}
        >
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${
            activeTab === "gold" ? "text-luxury-gold-champagne" : "text-slate-300"
          }`}>
            Total Net Weight Acquired
          </span>
          <p className={`mt-2 font-serif text-2xl font-bold ${
            activeTab === "gold" ? "text-luxury-gold-bright" : "text-slate-200"
          }`}>
            <AnimatedNumber value={totalWeight} decimals={3} />{" "}
            <span className="text-xs font-sans font-normal text-luxury-muted">g</span>
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">After stone &amp; dirt deductions</span>
        </TiltCard>

        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Purchase Outlay
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-luxury-gold-bright">
            <AnimatedNumber value={totalAmount} prefix="₹" />
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">Agreed settlement amount</span>
        </TiltCard>

        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Converted to Showroom
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-white">
            {totalConvertedCount} / {totalCount}
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">Refined &amp; added to stock</span>
        </TiltCard>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl p-4 shadow-luxury md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-luxury-muted" />
          <input
            type="text"
            placeholder="Search by Seller name, Phone, Voucher number, or Description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.1] bg-luxury-obsidian/60 py-2 pl-9 pr-4 text-xs text-white placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-luxury-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="all" className="bg-luxury-obsidian text-white">All Payment Statuses</option>
            <option value="paid" className="bg-luxury-obsidian text-white">Paid</option>
            <option value="partially_paid" className="bg-luxury-obsidian text-white">Partially Paid</option>
            <option value="pending" className="bg-luxury-obsidian text-white">Pending</option>
          </select>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl shadow-luxury">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-luxury-gold-champagne uppercase font-semibold">
              <tr>
                <th className="px-4 py-3.5">Voucher / Date</th>
                <th className="px-4 py-3.5">Seller</th>
                <th className="px-4 py-3.5">Item Description</th>
                <th className="px-4 py-3.5">Purity</th>
                <th className="px-4 py-3.5 text-right">Net Wt</th>
                <th className="px-4 py-3.5 text-right">Rate / g</th>
                <th className="px-4 py-3.5 text-right">Agreed Cost</th>
                <th className="px-4 py-3.5 text-right">Paid</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Stock Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-luxury-muted">
                    <div className="inline-block h-6 w-6 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-2"></div>
                    <p>Loading scrap transactions...</p>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-luxury-muted">
                    <p className="font-serif text-sm font-semibold text-white">No scrap purchases found</p>
                    <p className="text-[11px] mt-1 text-luxury-muted">Click &apos;Record Used Purchase&apos; above to log an exchange transaction.</p>
                  </td>
                </tr>
              ) : (
                purchases.map((p) => {
                  const dateStr = new Date(p.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={p.id || p._id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <p className="font-mono font-bold text-luxury-gold">{p.transactionNumber}</p>
                        <p className="text-[10px] text-luxury-muted font-mono">{dateStr}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{p.sellerName}</p>
                        {p.sellerPhone && <p className="text-[10px] text-luxury-muted font-mono">{p.sellerPhone}</p>}
                      </td>
                      <td className="px-4 py-3 text-white/90 max-w-[200px] truncate" title={p.itemDescription}>
                        {p.itemDescription}
                      </td>
                      <td className="px-4 py-3 font-semibold text-luxury-gold">{p.purity}</td>
                      <td className="px-4 py-3 text-right font-serif font-bold text-luxury-gold-bright">
                        {p.netWeight.toFixed(3)}g
                        <span className="block text-[9px] font-sans font-normal text-luxury-muted">
                          (Gross: {p.grossWeight.toFixed(3)}g)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white/90 font-mono">
                        ₹{p.ratePerGramRupees.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white font-mono">
                        ₹{p.finalAgreedCostRupees.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right text-white/90 font-medium font-mono">
                        ₹{p.amountPaidRupees.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            p.paymentStatus === "paid"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : p.paymentStatus === "partially_paid"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-red-500/15 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {p.paymentStatus === "paid"
                            ? "Paid"
                            : p.paymentStatus === "partially_paid"
                            ? "Part Paid"
                            : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.isConvertedToInventory ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>In Showroom</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => openConvertModal(p)}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-luxury-gold-dark to-luxury-gold px-2.5 py-1 text-[11px] font-bold text-black shadow-gold-glow hover:brightness-110 active:scale-95 transition-all btn-3d"
                          >
                            <span>Refine / Convert</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD USED METAL PURCHASE */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-white/[0.12] bg-luxury-graphite text-white shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">
                  Record Old {activeTab === "gold" ? "Gold" : "Silver"} Purchase
                </h3>
                <p className="text-xs text-luxury-muted">Acquire exchange or scrap metal directly from customer</p>
              </div>
              <button onClick={() => setIsAddOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Seller Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Customer full name"
                    value={addForm.sellerName}
                    onChange={(e) => setAddForm({ ...addForm, sellerName: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Seller Phone</label>
                  <input
                    type="tel"
                    placeholder="Mobile number"
                    value={addForm.sellerPhone}
                    onChange={(e) => setAddForm({ ...addForm, sellerPhone: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Item Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Broken old chain with stones, 2 worn bangles"
                    value={addForm.itemDescription}
                    onChange={(e) => setAddForm({ ...addForm, itemDescription: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Purity *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 22K, 18K, 999"
                    value={addForm.purity}
                    onChange={(e) => setAddForm({ ...addForm, purity: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Gross Wt (g) *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    placeholder="0.000"
                    value={addForm.grossWeight}
                    onChange={(e) => setAddForm({ ...addForm, grossWeight: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Deductions (Stones / Dirt g)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={addForm.deductionsWeight}
                    onChange={(e) => setAddForm({ ...addForm, deductionsWeight: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Rate / gram (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="Current scrap buying rate"
                    value={addForm.ratePerGramRupees}
                    onChange={(e) => setAddForm({ ...addForm, ratePerGramRupees: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              {/* Net Weight & Value calculation badge */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-xs flex justify-between items-center">
                <div>
                  <span className="text-luxury-muted">Net Pure Weight:</span>
                  <p className="font-bold text-luxury-gold-bright font-serif text-sm">
                    {formNetWeight.toFixed(3)}g
                  </p>
                </div>
                <div>
                  <span className="text-luxury-muted">Calculated Value:</span>
                  <p className="font-bold text-white font-mono text-sm">
                    ₹{formCalculatedValue.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Final Agreed Cost (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder={`e.g. ${formCalculatedValue || "5000"}`}
                    value={addForm.finalAgreedCostRupees}
                    onChange={(e) => setAddForm({ ...addForm, finalAgreedCostRupees: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs font-bold text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Amount Paid Immediately (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="0"
                    value={addForm.amountPaidRupees}
                    onChange={(e) => setAddForm({ ...addForm, amountPaidRupees: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs font-bold text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
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
                  Save Scrap Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REFINING & CONVERTING TO SHOWROOM INVENTORY */}
      {isConvertOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.12] bg-luxury-graphite text-white shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Refine &amp; Convert to Showroom Stock</h3>
                <p className="text-xs text-luxury-muted">
                  Voucher #{selectedPurchase.transactionNumber} • {selectedPurchase.itemDescription}
                </p>
              </div>
              <button onClick={() => setIsConvertOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">Target Inventory Category *</label>
                <select
                  required
                  value={convertForm.targetCategoryId}
                  onChange={(e) => setConvertForm({ ...convertForm, targetCategoryId: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                >
                  <option value="" className="bg-luxury-obsidian text-white">Select Destination Showroom Category</option>
                  {(selectedPurchase.metalType === "gold" ? goldCategories : silverCategories).map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id} className="bg-luxury-obsidian text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-muted mb-1">Showroom Item Name *</label>
                <input
                  type="text"
                  required
                  value={convertForm.itemName}
                  onChange={(e) => setConvertForm({ ...convertForm, itemName: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Refined Net Wt (g) *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={convertForm.refinedNetWeight}
                    onChange={(e) => setConvertForm({ ...convertForm, refinedNetWeight: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs font-bold text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-muted mb-1">Target Purity *</label>
                  <input
                    type="text"
                    required
                    value={convertForm.purity}
                    onChange={(e) => setConvertForm({ ...convertForm, purity: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsConvertOpen(false)}
                  className="rounded-xl border border-white/[0.1] px-4 py-2 text-xs font-semibold text-luxury-muted hover:text-white hover:bg-white/[0.05]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 transition btn-3d"
                >
                  Confirm &amp; Add to Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
