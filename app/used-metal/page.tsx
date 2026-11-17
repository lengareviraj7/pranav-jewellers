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
      if (data.success) {
        setPurchases(data.purchases);
      } else {
        setError(data.error || "Failed to load purchases");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, searchQuery]);

  useEffect(() => {
    fetchPurchases();
    const handleRefresh = () => fetchPurchases();
    window.addEventListener("sj-refresh-data", handleRefresh);
    return () => window.removeEventListener("sj-refresh-data", handleRefresh);
  }, [fetchPurchases]);

  useEffect(() => {
    fetch("/api/inventory/categories?metalType=gold")
      .then((r) => r.json())
      .then((d) => d.success && setGoldCategories(d.categories));

    fetch("/api/inventory/categories?metalType=silver")
      .then((r) => r.json())
      .then((d) => d.success && setSilverCategories(d.categories));
  }, []);

  // Summary Metrics for current tab
  const totalCount = purchases.length;
  const totalWeight = purchases.reduce((acc, p) => acc + (p.netWeight || 0), 0);
  const totalAmount = purchases.reduce((acc, p) => acc + (p.finalAgreedCostRupees || 0), 0);
  const totalConvertedCount = purchases.filter((p) => p.isConvertedToInventory).length;

  // Add Form Calculations
  const addNetWeight = Number(addForm.grossWeight || 0) - Number(addForm.deductionsWeight || 0);
  const addCalcVal = (addNetWeight > 0 ? addNetWeight : 0) * (Number(addForm.ratePerGramRupees) || 0);

  // Submit Add Purchase
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
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record purchase");

      setSuccessMsg(`Used metal purchase "${data.purchase.transactionNumber}" saved!`);
      setIsAddOpen(false);
      setAddForm({
        date: new Date().toISOString().split("T")[0],
        sellerName: "",
        sellerPhone: "",
        sellerAddress: "",
        itemDescription: "",
        purity: activeTab === "gold" ? "22K" : "925",
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
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Open Convert Modal
  const openConvertModal = (p: UsedPurchase) => {
    setSelectedPurchase(p);
    setConvertForm({
      targetCategoryId: "",
      refinedNetWeight: String(p.netWeight),
      purity: p.purity,
      itemName: `Refined ${p.metalType.toUpperCase()} (${p.itemDescription})`,
      notes: `Refined from scrap voucher ${p.transactionNumber}`,
    });
    setIsConvertOpen(true);
  };

  // Submit Conversion to Showroom Stock
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-luxury-gold">
            Scrap & Exchange Acquisition
          </span>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-luxury-onyx sm:text-3xl">
            Used Gold & Silver Purchases
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">
            Independent ledger for customer exchange and scrap metal. Never enters showroom stock until refined and explicitly converted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/export/used-metal?metalType=${activeTab}`}
            download
            className="flex items-center gap-1.5 rounded-xl border border-luxury-beige bg-white px-3.5 py-2 text-xs font-semibold text-luxury-charcoal shadow-xs hover:bg-luxury-ivory transition"
          >
            <Download className="h-3.5 w-3.5 text-luxury-gold" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-4 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition"
          >
            <Plus className="h-4 w-4 text-white" />
            <span>Record Used {activeTab === "gold" ? "Gold" : "Silver"} Purchase</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center justify-between rounded-xl bg-luxury-gold-subtle p-3 text-xs text-luxury-gold-dark border border-luxury-gold/30 font-medium">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-luxury-gold-dark" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Primary Tabs (Gold / Silver) */}
      <div className="flex rounded-2xl border border-luxury-beige bg-white p-1.5 shadow-sm max-w-md">
        <button
          onClick={() => setActiveTab("gold")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
            activeTab === "gold"
              ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-sm"
              : "text-luxury-charcoal hover:bg-luxury-ivory hover:text-luxury-gold-dark"
          }`}
        >
          <Coins className="h-4 w-4 text-luxury-gold" />
          <span>Used Gold Purchases</span>
        </button>

        <button
          onClick={() => setActiveTab("silver")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
            activeTab === "silver"
              ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-sm"
              : "text-luxury-charcoal hover:bg-luxury-ivory hover:text-luxury-gold-dark"
          }`}
        >
          <Gem className="h-4 w-4 text-luxury-gold" />
          <span>Used Silver Purchases</span>
        </button>
      </div>

      {/* KPI Cards for Tab */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Purchases
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-luxury-onyx">{totalCount}</p>
          <span className="text-[11px] text-luxury-muted">Old {activeTab} vouchers</span>
        </div>

        <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Net Weight Acquired
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-luxury-gold-dark">
            {totalWeight.toFixed(3)}{" "}
            <span className="text-xs font-sans font-normal text-luxury-muted">g</span>
          </p>
          <span className="text-[11px] text-luxury-muted">After stone & dirt deductions</span>
        </div>

        <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Purchase Outlay
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-luxury-gold-dark">
            ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[11px] text-luxury-muted">Agreed settlement amount</span>
        </div>

        <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Converted to Showroom
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-luxury-onyx">
            {totalConvertedCount} / {totalCount}
          </p>
          <span className="text-[11px] text-luxury-muted">Refined & added to stock</span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-3 rounded-2xl border border-luxury-beige bg-white p-4 shadow-luxury md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-luxury-muted" />
          <input
            type="text"
            placeholder="Search by Seller name, Phone, Voucher number, or Description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-luxury-beige bg-luxury-ivory/30 py-2 pl-9 pr-4 text-xs text-luxury-charcoal placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:bg-white focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-luxury-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-luxury-beige bg-white px-3 py-2 text-xs text-luxury-charcoal focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="overflow-hidden rounded-2xl border border-luxury-beige bg-white shadow-luxury">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-luxury-beige bg-luxury-ivory/80 text-luxury-onyx uppercase font-semibold">
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
            <tbody className="divide-y divide-luxury-beige/60">
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
                    <p className="font-serif text-sm font-semibold text-luxury-charcoal">No scrap purchases found</p>
                    <p className="text-[11px] mt-1">Click &apos;Record Used Purchase&apos; above to log an exchange transaction.</p>
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
                    <tr key={p.id || p._id} className="hover:bg-luxury-ivory/40 transition">
                      <td className="px-4 py-3 font-medium">
                        <p className="font-mono font-bold text-luxury-gold-dark">{p.transactionNumber}</p>
                        <p className="text-[10px] text-luxury-muted">{dateStr}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-luxury-charcoal">{p.sellerName}</p>
                        {p.sellerPhone && <p className="text-[10px] text-luxury-muted">{p.sellerPhone}</p>}
                      </td>
                      <td className="px-4 py-3 text-luxury-charcoal max-w-[200px] truncate" title={p.itemDescription}>
                        {p.itemDescription}
                      </td>
                      <td className="px-4 py-3 font-semibold text-luxury-gold">{p.purity}</td>
                      <td className="px-4 py-3 text-right font-serif font-bold text-luxury-gold-dark">
                        {p.netWeight.toFixed(3)}g
                        <span className="block text-[9px] font-sans font-normal text-luxury-muted">
                          (Gross: {p.grossWeight.toFixed(3)}g)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-luxury-charcoal">
                        ₹{p.ratePerGramRupees.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-luxury-charcoal">
                        ₹{p.finalAgreedCostRupees.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right text-luxury-charcoal font-medium">
                        ₹{p.amountPaidRupees.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            p.paymentStatus === "paid"
                              ? "bg-luxury-gold-subtle text-luxury-gold-dark border border-luxury-gold/30"
                              : p.paymentStatus === "partially_paid"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-red-50 text-red-800 border border-red-200"
                          }`}
                        >
                          {p.paymentStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.isConvertedToInventory ? (
                          <div className="flex items-center justify-center gap-1 text-luxury-gold-dark font-medium text-[11px]">
                            <ShieldCheck className="h-4 w-4 text-luxury-gold" />
                            <span>Converted</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => openConvertModal(p)}
                            className="flex items-center gap-1 mx-auto rounded-lg bg-luxury-gold-subtle border border-luxury-gold/40 px-2.5 py-1 text-[11px] font-semibold text-luxury-gold-dark hover:bg-luxury-gold hover:text-white transition active:scale-95"
                          >
                            <span>Convert to Stock</span>
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

      {/* Modal 1: Add Purchase */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-luxury-beige bg-white shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between border-b border-luxury-beige pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-onyx">
                  Record Used {activeTab === "gold" ? "Gold" : "Silver"} Purchase
                </h3>
                <p className="text-xs text-luxury-muted">Record customer scrap or exchange voucher</p>
              </div>
              <button onClick={() => setIsAddOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Seller / Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={addForm.sellerName}
                    onChange={(e) => setAddForm({ ...addForm, sellerName: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="10-digit mobile"
                    value={addForm.sellerPhone}
                    onChange={(e) => setAddForm({ ...addForm, sellerPhone: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Item Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Old broken necklace with wax and stones"
                    value={addForm.itemDescription}
                    onChange={(e) => setAddForm({ ...addForm, itemDescription: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Tested Purity *</label>
                  <input
                    type="text"
                    required
                    placeholder={activeTab === "gold" ? "22K / 91.6%" : "925 / Sterling"}
                    value={addForm.purity}
                    onChange={(e) => setAddForm({ ...addForm, purity: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Date</label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Gross Weight (grams) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="0.000"
                    value={addForm.grossWeight}
                    onChange={(e) => setAddForm({ ...addForm, grossWeight: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Deductions (wax, dirt, stones)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={addForm.deductionsWeight}
                    onChange={(e) => setAddForm({ ...addForm, deductionsWeight: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              {/* Net Weight and Calculated Value Live Indicator */}
              <div className="flex items-center justify-between rounded-xl bg-luxury-ivory p-3 border border-luxury-beige text-xs">
                <div>
                  <span className="font-semibold text-luxury-charcoal">Net Weight: </span>
                  <span className="font-serif font-bold text-luxury-gold-dark">
                    {addNetWeight > 0 ? addNetWeight.toFixed(3) : "0.000"} g
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-luxury-charcoal">Formula Estimate: </span>
                  <span className="font-bold text-luxury-gold-dark">
                    ₹{addCalcVal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Market Rate per Gram (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="₹ / g"
                    value={addForm.ratePerGramRupees}
                    onChange={(e) => {
                      const r = e.target.value;
                      const c = (addNetWeight > 0 ? addNetWeight : 0) * (Number(r) || 0);
                      setAddForm({
                        ...addForm,
                        ratePerGramRupees: r,
                        finalAgreedCostRupees: c.toFixed(2),
                        amountPaidRupees: c.toFixed(2),
                      });
                    }}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Final Agreed Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    value={addForm.finalAgreedCostRupees}
                    onChange={(e) => setAddForm({ ...addForm, finalAgreedCostRupees: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    required
                    value={addForm.amountPaidRupees}
                    onChange={(e) => setAddForm({ ...addForm, amountPaidRupees: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Payment Method</label>
                  <select
                    value={addForm.paymentMethod}
                    onChange={(e) => setAddForm({ ...addForm, paymentMethod: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition"
                >
                  Record Used Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Convert to Inventory Workflow */}
      {isConvertOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-luxury-beige bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-luxury-beige pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-onyx">Convert to Showroom Stock</h3>
                <p className="text-xs text-luxury-muted">
                  Transform refined scrap into active showroom inventory
                </p>
              </div>
              <button onClick={() => setIsConvertOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted" />
              </button>
            </div>

            <div className="my-3 rounded-xl border border-luxury-beige bg-luxury-ivory/50 p-3 text-xs">
              <span className="font-bold text-luxury-charcoal">Source Voucher: {selectedPurchase.transactionNumber}</span>
              <p className="text-luxury-muted mt-0.5">{selectedPurchase.itemDescription} ({selectedPurchase.sellerName})</p>
              <div className="mt-1 flex gap-4 text-luxury-muted">
                <span>Original Net: <strong className="text-luxury-charcoal">{selectedPurchase.netWeight.toFixed(3)}g</strong></span>
                <span>Purity: <strong className="text-luxury-charcoal">{selectedPurchase.purity}</strong></span>
                <span>Cost: <strong className="text-luxury-gold-dark">₹{selectedPurchase.finalAgreedCostRupees.toLocaleString("en-IN")}</strong></span>
              </div>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">
                  Destination Showroom Category *
                </label>
                <select
                  required
                  value={convertForm.targetCategoryId}
                  onChange={(e) => setConvertForm({ ...convertForm, targetCategoryId: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                >
                  <option value="">Select Destination Category</option>
                  {(selectedPurchase.metalType === "gold" ? goldCategories : silverCategories).map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">
                    Tested Refined Net Weight (g) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={convertForm.refinedNetWeight}
                    onChange={(e) => setConvertForm({ ...convertForm, refinedNetWeight: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">
                    Final Stock Purity *
                  </label>
                  <input
                    type="text"
                    required
                    value={convertForm.purity}
                    onChange={(e) => setConvertForm({ ...convertForm, purity: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">
                  Showroom Item Name
                </label>
                <input
                  type="text"
                  required
                  value={convertForm.itemName}
                  onChange={(e) => setConvertForm({ ...convertForm, itemName: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Refining & Melting Notes</label>
                <textarea
                  rows={2}
                  value={convertForm.notes}
                  onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConvertOpen(false)}
                  className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition"
                >
                  Confirm Showroom Conversion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
