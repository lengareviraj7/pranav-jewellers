"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Coins,
  Gem,
  Plus,
  Search,
  SlidersHorizontal,
  History,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  Check,
  X,
  Scale,
  Sparkles,
  ArrowUpDown,
  Tag,
} from "lucide-react";

interface Category {
  id: string;
  _id: string;
  name: string;
  metalType: "gold" | "silver";
  displayOrder: number;
  isActive: boolean;
  totalPieces: number;
  totalGrossWeight: number;
  totalNetWeight: number;
  itemCount: number;
}

interface InventoryItem {
  id: string;
  _id: string;
  name: string;
  sku: string;
  categoryId: { _id: string; name: string } | string;
  purity: string;
  quantity: number;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  hallmarkUid?: string;
  supplierName?: string;
  purchaseDate: string;
  purchaseCostRupees: number;
  unitCostRupees?: number;
  notes?: string;
  sourceType: string;
  createdAt: string;
}

interface InventoryManagerProps {
  metalType: "gold" | "silver";
  title: string;
  subtitle: string;
  purityOptions: string[];
}

export default function InventoryManager({
  metalType,
  title,
  subtitle,
  purityOptions,
}: InventoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPurity, setSelectedPurity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");

  // Modals
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Selected item for Adjustment / History
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);
  const [itemHistory, setItemHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Add Stock Form State
  const [stockForm, setStockForm] = useState({
    name: "",
    categoryId: "",
    sku: "",
    purity: purityOptions[0] || "22K",
    quantity: 1,
    grossWeight: "",
    stoneWeight: "0",
    purchaseCostRupees: "",
    hallmarkUid: "",
    supplierName: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Adjust Form State
  const [adjustForm, setAdjustForm] = useState({
    newQuantity: 1,
    newGrossWeight: "",
    newStoneWeight: "0",
    reason: "",
  });

  // Category Form State
  const [categoryForm, setCategoryForm] = useState<{ id?: string; name: string; description?: string }>({
    name: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Categories
      const catRes = await fetch(`/api/inventory/categories?metalType=${metalType}`);
      const catData = await catRes.json();
      if (catData.success) {
        setCategories(catData.categories);
      }

      // Fetch Items
      let url = `/api/inventory/items?metalType=${metalType}&sortBy=${sortBy}`;
      if (selectedCategory !== "all") url += `&categoryId=${selectedCategory}`;
      if (selectedPurity !== "all") url += `&purity=${selectedPurity}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const itemRes = await fetch(url);
      const itemData = await itemRes.json();
      if (itemData.success) {
        setItems(itemData.items);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [metalType, selectedCategory, selectedPurity, searchQuery, sortBy]);

  useEffect(() => {
    fetchData();
    const handleRefresh = () => fetchData();
    window.addEventListener("sj-refresh-data", handleRefresh);
    return () => window.removeEventListener("sj-refresh-data", handleRefresh);
  }, [fetchData]);

  // Overall aggregates for current metal
  const totalPieces = items.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const totalGrossWeight = items.reduce((acc, it) => acc + (it.grossWeight || 0), 0);
  const totalNetWeight = items.reduce((acc, it) => acc + (it.netWeight || 0), 0);

  // Form Net Weight Helper
  const formNetWeight = Number(stockForm.grossWeight || 0) - Number(stockForm.stoneWeight || 0);

  // 1. Submit Add Stock
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...stockForm,
          metalType,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to add stock");

      setSuccessMsg(`Successfully added "${stockForm.name}" (${data.item.sku})`);
      setIsAddStockOpen(false);
      setStockForm({
        name: "",
        categoryId: "",
        sku: "",
        purity: purityOptions[0] || "22K",
        quantity: 1,
        grossWeight: "",
        stoneWeight: "0",
        purchaseCostRupees: "",
        hallmarkUid: "",
        supplierName: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 2. Open Adjust Modal
  const openAdjustModal = (item: InventoryItem) => {
    setActiveItem(item);
    setAdjustForm({
      newQuantity: item.quantity,
      newGrossWeight: String(item.grossWeight),
      newStoneWeight: String(item.stoneWeight),
      reason: "",
    });
    setIsAdjustModalOpen(true);
  };

  // 3. Submit Adjust Stock
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    try {
      const res = await fetch(`/api/inventory/items/${activeItem.id || activeItem._id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjustForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Adjustment failed");

      setSuccessMsg(`Stock adjusted for "${activeItem.name}" with full audit trail!`);
      setIsAdjustModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 4. Open Item History Drawer/Modal
  const openHistoryModal = async (item: InventoryItem) => {
    setActiveItem(item);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/inventory/items/${item.id || item._id}`);
      const data = await res.json();
      if (data.success) {
        setItemHistory(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 5. Soft Delete / Archive Item
  const handleArchiveItem = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to archive "${item.name}" (${item.sku})? This will safely remove it from active stock while preserving historical records.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/inventory/items/${item.id || item._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Archive failed");

      setSuccessMsg(`Archived "${item.name}" successfully.`);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 6. Category Management (Add or Edit)
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = Boolean(categoryForm.id);
      const url = isEditing
        ? `/api/inventory/categories/${categoryForm.id}`
        : "/api/inventory/categories";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryForm.name,
          description: categoryForm.description,
          metalType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Category action failed");

      setSuccessMsg(`Category ${isEditing ? "renamed" : "created"} successfully!`);
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: "" });
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-luxury-gold">
            Showroom Stock Management
          </span>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-luxury-onyx sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/export/inventory?metalType=${metalType}`}
            download
            className="flex items-center gap-1.5 rounded-xl border border-luxury-beige bg-white px-3.5 py-2 text-xs font-semibold text-luxury-charcoal shadow-xs hover:bg-luxury-ivory transition"
          >
            <Download className="h-3.5 w-3.5 text-luxury-gold" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => {
              setCategoryForm({ name: "" });
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-luxury-beige bg-white px-3.5 py-2 text-xs font-semibold text-luxury-charcoal shadow-xs hover:bg-luxury-ivory transition"
          >
            <Tag className="h-3.5 w-3.5 text-luxury-gold" />
            <span>Manage Categories</span>
          </button>

          <button
            onClick={() => setIsAddStockOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-4 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition"
          >
            <Plus className="h-4 w-4 text-white" />
            <span>Add {metalType === "gold" ? "Gold" : "Silver"} Stock</span>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Pieces in Stock
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-luxury-onyx">{totalPieces}</p>
          <span className="text-[11px] text-luxury-muted">Verified showroom items</span>
        </div>

        <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Gross Weight
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-luxury-onyx">
            {totalGrossWeight.toFixed(3)}{" "}
            <span className="text-xs font-sans font-normal text-luxury-muted">g</span>
          </p>
          <span className="text-[11px] text-luxury-muted">Including stones & attachments</span>
        </div>

        <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Net Metal Weight
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-luxury-gold-dark">
            {totalNetWeight.toFixed(3)}{" "}
            <span className="text-xs font-sans font-normal text-luxury-gold">g pure</span>
          </p>
          <span className="text-[11px] text-luxury-muted">Auto-computed (Gross - Stones)</span>
        </div>

        <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Active Categories
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-luxury-onyx">{categories.length}</p>
          <span className="text-[11px] text-luxury-muted">Dynamic & customizable</span>
        </div>
      </div>

      {/* Dynamic Category Summary Carousel / Pills */}
      <div className="rounded-2xl border border-luxury-beige bg-white p-5 shadow-luxury">
        <div className="flex items-center justify-between pb-3 border-b border-luxury-beige">
          <span className="text-xs font-bold uppercase tracking-wider text-luxury-onyx">
            Category-wise Stock Breakdown
          </span>
          <span className="text-[11px] text-luxury-muted">Click any category to filter inventory</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              selectedCategory === "all"
                ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-xs"
                : "border border-luxury-beige bg-luxury-ivory/50 text-luxury-charcoal hover:bg-white hover:text-luxury-gold-dark"
            }`}
          >
            All Categories ({items.length})
          </button>

          {categories.map((cat) => (
            <div
              key={cat.id || cat._id}
              className={`flex items-center rounded-xl border transition overflow-hidden ${
                selectedCategory === (cat.id || cat._id)
                  ? "border-luxury-gold bg-luxury-onyx text-luxury-gold shadow-xs"
                  : "border-luxury-beige bg-luxury-ivory/40 text-luxury-charcoal hover:bg-white hover:text-luxury-gold-dark"
              }`}
            >
              <button
                onClick={() => setSelectedCategory(cat.id || cat._id)}
                className="px-3.5 py-2 text-xs font-semibold text-left"
              >
                <span>{cat.name}</span>
                <span className="ml-2 text-[10px] opacity-80">
                  {cat.totalNetWeight.toFixed(2)}g ({cat.totalPieces} pcs)
                </span>
              </button>

              <button
                onClick={() => {
                  setCategoryForm({ id: cat.id || cat._id, name: cat.name });
                  setIsCategoryModalOpen(true);
                }}
                title="Rename Category"
                className="p-1.5 opacity-60 hover:opacity-100 transition"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-luxury-beige bg-white p-4 shadow-luxury md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-luxury-muted" />
          <input
            type="text"
            placeholder="Search by Item name, SKU, HUID, or Supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-luxury-beige bg-luxury-ivory/30 py-2 pl-9 pr-4 text-xs text-luxury-charcoal placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:bg-white focus:outline-none transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Purity Filter */}
          <select
            value={selectedPurity}
            onChange={(e) => setSelectedPurity(e.target.value)}
            className="rounded-xl border border-luxury-beige bg-white px-3 py-2 text-xs text-luxury-charcoal focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="all">All Purities</option>
            {purityOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-luxury-beige bg-white px-3 py-2 text-xs text-luxury-charcoal focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="latest">Sort: Latest Added</option>
            <option value="weight_desc">Sort: Highest Net Weight</option>
            <option value="weight_asc">Sort: Lowest Net Weight</option>
            <option value="name">Sort: Alphabetical Name</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="overflow-hidden rounded-2xl border border-luxury-beige bg-white shadow-luxury">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-luxury-beige bg-luxury-ivory/80 text-luxury-onyx uppercase font-semibold">
              <tr>
                <th className="px-4 py-3.5">SKU / Item</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Purity</th>
                <th className="px-4 py-3.5 text-right">Qty</th>
                <th className="px-4 py-3.5 text-right">Gross Wt</th>
                <th className="px-4 py-3.5 text-right">Stones</th>
                <th className="px-4 py-3.5 text-right">Net Wt</th>
                <th className="px-4 py-3.5 text-right">Purchase Cost</th>
                <th className="px-4 py-3.5 text-center">HUID / Ref</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-luxury-beige/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-luxury-muted">
                    <div className="inline-block h-6 w-6 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-2"></div>
                    <p>Loading inventory...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-luxury-muted">
                    <p className="font-serif text-sm font-semibold text-luxury-charcoal">No items match your query</p>
                    <p className="text-[11px] mt-1">Try resetting filters or click &apos;Add Stock&apos; above to record a new entry.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const catName = typeof item.categoryId === "object" ? item.categoryId?.name : "Category";
                  return (
                    <tr key={item.id || item._id} className="hover:bg-luxury-ivory/40 transition">
                      <td className="px-4 py-3 font-medium">
                        <p className="text-luxury-charcoal font-semibold">{item.name}</p>
                        <p className="text-[10px] font-mono text-luxury-muted">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-luxury-charcoal">
                        <span className="rounded-md bg-luxury-ivory px-2 py-0.5 border border-luxury-beige text-[11px]">
                          {catName}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-luxury-gold">{item.purity}</td>
                      <td className="px-4 py-3 text-right font-medium text-luxury-charcoal">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-luxury-charcoal">{item.grossWeight.toFixed(3)}g</td>
                      <td className="px-4 py-3 text-right text-luxury-muted">{item.stoneWeight.toFixed(3)}g</td>
                      <td className="px-4 py-3 text-right font-serif font-bold text-luxury-gold-dark">
                        {item.netWeight.toFixed(3)}g
                      </td>
                      <td className="px-4 py-3 text-right text-luxury-charcoal">
                        ₹{(item.purchaseCostRupees || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.hallmarkUid ? (
                          <span className="rounded bg-luxury-gold-subtle px-1.5 py-0.5 text-[10px] font-mono font-bold text-luxury-gold-dark border border-luxury-gold/30">
                            {item.hallmarkUid}
                          </span>
                        ) : (
                          <span className="text-luxury-muted text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openAdjustModal(item)}
                            title="Adjust Stock (Non-destructive)"
                            className="rounded-lg p-1.5 text-luxury-charcoal hover:bg-luxury-ivory hover:text-luxury-gold-dark transition"
                          >
                            <Scale className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openHistoryModal(item)}
                            title="View Stock Movement Audit Trail"
                            className="rounded-lg p-1.5 text-luxury-charcoal hover:bg-luxury-ivory hover:text-luxury-gold-dark transition"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveItem(item)}
                            title="Archive / Remove"
                            className="rounded-lg p-1.5 text-luxury-muted hover:bg-red-50 hover:text-red-700 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Modal 1: Add Stock Form */}
      {isAddStockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-luxury-beige bg-white shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between border-b border-luxury-beige pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-onyx">
                  Add {metalType === "gold" ? "Gold" : "Silver"} Stock
                </h3>
                <p className="text-xs text-luxury-muted">Record new jewellery pieces into showroom stock</p>
              </div>
              <button onClick={() => setIsAddStockOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted" />
              </button>
            </div>

            <form onSubmit={handleAddStock} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder={`e.g. ${metalType === "gold" ? "22K Traditional Kada" : "Pure Silver Pooja Thali"}`}
                    value={stockForm.name}
                    onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Category *</label>
                  <select
                    required
                    value={stockForm.categoryId}
                    onChange={(e) => setStockForm({ ...stockForm, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Purity *</label>
                  <select
                    value={stockForm.purity}
                    onChange={(e) => setStockForm({ ...stockForm, purity: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  >
                    {purityOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Quantity (Pieces) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) })}
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
                    value={stockForm.grossWeight}
                    onChange={(e) => setStockForm({ ...stockForm, grossWeight: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Stone Weight (grams)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={stockForm.stoneWeight}
                    onChange={(e) => setStockForm({ ...stockForm, stoneWeight: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Net Weight Banner */}
              <div className="flex items-center justify-between rounded-xl bg-luxury-ivory p-3 border border-luxury-beige">
                <span className="text-xs font-semibold text-luxury-charcoal">Calculated Net Metal Weight:</span>
                <span className="font-serif text-sm font-bold text-luxury-gold-dark">
                  {formNetWeight > 0 ? formNetWeight.toFixed(3) : "0.000"} g
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    placeholder="₹ Total cost"
                    value={stockForm.purchaseCostRupees}
                    onChange={(e) => setStockForm({ ...stockForm, purchaseCostRupees: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Custom SKU (Optional)</label>
                  <input
                    type="text"
                    placeholder="Leave empty to auto-generate"
                    value={stockForm.sku}
                    onChange={(e) => setStockForm({ ...stockForm, sku: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">HUID / Hallmark (Optional)</label>
                  <input
                    type="text"
                    placeholder="6-character alphanumeric"
                    value={stockForm.hallmarkUid}
                    onChange={(e) => setStockForm({ ...stockForm, hallmarkUid: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Supplier Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Zaveri Bullion Works"
                    value={stockForm.supplierName}
                    onChange={(e) => setStockForm({ ...stockForm, supplierName: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStockOpen(false)}
                  className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition"
                >
                  Save Stock Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Stock Adjustment (Non-destructive) */}
      {isAdjustModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-luxury-beige bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-luxury-beige pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-onyx">Adjust Stock Item</h3>
                <p className="text-xs text-luxury-muted">
                  Non-destructive adjustment with mandatory audit explanation
                </p>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted" />
              </button>
            </div>

            <div className="my-3 rounded-xl border border-luxury-beige bg-luxury-ivory/50 p-3 text-xs">
              <span className="font-bold text-luxury-charcoal">{activeItem.name}</span>{" "}
              <span className="font-mono text-luxury-muted">({activeItem.sku})</span>
              <div className="mt-1 flex gap-4 text-luxury-muted">
                <span>Current Qty: <strong className="text-luxury-charcoal">{activeItem.quantity}</strong></span>
                <span>Gross: <strong className="text-luxury-charcoal">{activeItem.grossWeight.toFixed(3)}g</strong></span>
                <span>Net: <strong className="text-luxury-gold-dark">{activeItem.netWeight.toFixed(3)}g</strong></span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">New Qty</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={adjustForm.newQuantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, newQuantity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">New Gross Wt</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={adjustForm.newGrossWeight}
                    onChange={(e) => setAdjustForm({ ...adjustForm, newGrossWeight: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">New Stone Wt</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={adjustForm.newStoneWeight}
                    onChange={(e) => setAdjustForm({ ...adjustForm, newStoneWeight: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">
                  Mandatory Adjustment Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain reason for adjustment (e.g. physical inventory audit discrepancy, re-weighed after polishing, sold 1 piece)"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition"
                >
                  Record Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Item History Audit Log */}
      {isHistoryModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl border border-luxury-beige bg-white shadow-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-luxury-beige pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-onyx">Stock Movement Audit Trail</h3>
                <p className="text-xs text-luxury-muted">
                  Full transaction history for {activeItem.name} ({activeItem.sku})
                </p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-4 space-y-3">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-luxury-muted">Loading audit history...</div>
              ) : itemHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-luxury-muted">No movement history recorded.</div>
              ) : (
                itemHistory.map((tx) => (
                  <div
                    key={tx._id}
                    className="rounded-xl border border-luxury-beige bg-luxury-ivory/30 p-3.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-luxury-gold-dark uppercase tracking-wide">
                        {tx.transactionType.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-luxury-muted">
                        {new Date(tx.timestamp).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <p className="text-luxury-charcoal">
                      Reason: <span className="font-medium">{tx.reason}</span>
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-luxury-muted border-t border-luxury-beige/60 pt-1 mt-1">
                      <div>
                        Qty: {tx.previousQuantity} → <strong className="text-luxury-charcoal">{tx.newQuantity}</strong> (Δ {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange})
                      </div>
                      <div>
                        Net Wt: {tx.previousNetWeight.toFixed(3)}g → <strong className="text-luxury-gold-dark">{tx.newNetWeight.toFixed(3)}g</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-luxury-beige pt-3 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-xl bg-luxury-onyx px-4 py-2 text-xs font-semibold text-luxury-gold border border-luxury-gold/30 hover:bg-luxury-onyx-surface transition"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Manage / Rename Category */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-luxury-beige bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-luxury-beige pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-onyx">
                  {categoryForm.id ? "Edit Category" : "Add Dynamic Category"}
                </h3>
                <p className="text-xs text-luxury-muted">
                  {metalType === "gold" ? "Gold" : "Silver"} showroom categorization
                </p>
              </div>
              <button onClick={() => setIsCategoryModalOpen(false)}>
                <X className="h-5 w-5 text-luxury-muted" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bridal Chokers, Antique Bangles"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Category purpose or style notes"
                  value={categoryForm.description || ""}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition"
                >
                  {categoryForm.id ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
