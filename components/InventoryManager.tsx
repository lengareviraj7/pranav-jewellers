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
  ShoppingBag,
  Send,
  MessageCircle,
  User,
  Phone,
  Calendar,
  DollarSign,
  Filter,
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
  size?: string;
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
  const [selectedSize, setSelectedSize] = useState<string>("all");
  const [selectedWeightBracket, setSelectedWeightBracket] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");

  // Modals
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  // Selected item for Adjustment / History / Sell
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);
  const [sellItem, setSellItem] = useState<InventoryItem | null>(null);
  const [sellSuccessData, setSellSuccessData] = useState<{
    saleNumber: string;
    whatsappUrl: string;
    whatsappText: string;
    customerName: string;
    remainingBalance: number;
  } | null>(null);
  const [itemHistory, setItemHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sell Form State
  const [sellForm, setSellForm] = useState({
    quantitySold: 1,
    sellingPriceRupees: "",
    manualProfitRupees: "",
    paidAmountRupees: "",
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    dueDate: "",
    paymentMode: "cash" as "cash" | "online" | "mixed",
    notes: "",
  });

  // Add Stock Form State
  const [stockForm, setStockForm] = useState({
    name: "",
    categoryId: "",
    sku: "",
    purity: purityOptions[0] || "22K",
    size: "",
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
      if (selectedSize !== "all") url += `&size=${encodeURIComponent(selectedSize)}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      if (selectedWeightBracket !== "all") {
        if (metalType === "gold") {
          if (selectedWeightBracket === "under_2") url += "&maxWeight=1.999";
          else if (selectedWeightBracket === "2_to_5") url += "&minWeight=2&maxWeight=5";
          else if (selectedWeightBracket === "5_to_10") url += "&minWeight=5&maxWeight=10";
          else if (selectedWeightBracket === "10_to_20") url += "&minWeight=10&maxWeight=20";
          else if (selectedWeightBracket === "over_20") url += "&minWeight=20";
        } else {
          if (selectedWeightBracket === "under_20") url += "&maxWeight=19.999";
          else if (selectedWeightBracket === "20_to_50") url += "&minWeight=20&maxWeight=50";
          else if (selectedWeightBracket === "50_to_100") url += "&minWeight=50&maxWeight=100";
          else if (selectedWeightBracket === "over_100") url += "&minWeight=100";
        }
      }

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
  }, [metalType, selectedCategory, selectedPurity, selectedSize, selectedWeightBracket, searchQuery, sortBy]);

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
        size: "",
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

  // 7. Sell Material Handler
  const openSellModal = (item: InventoryItem) => {
    setSellItem(item);
    setSellSuccessData(null);
    const unitCost = Math.round((item.purchaseCostRupees || 0) / (item.quantity || 1));
    setSellForm({
      quantitySold: 1,
      sellingPriceRupees: "",
      manualProfitRupees: "",
      paidAmountRupees: "",
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      dueDate: "",
      paymentMode: "cash",
      notes: "",
    });
    setIsSellModalOpen(true);
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellItem) return;
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: sellItem.id || sellItem._id,
          ...sellForm,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record sale");
      }

      setSellSuccessData({
        saleNumber: data.sale.saleNumber,
        whatsappUrl: data.whatsappUrl,
        whatsappText: data.whatsappText,
        customerName: data.sale.customer.name,
        remainingBalance: data.sale.balanceDuePaise / 100,
      });

      setSuccessMsg(`Sale recorded! Stock of ${sellItem.name} deducted successfully.`);
      fetchData();
      // Notify other tabs / counters
      window.dispatchEvent(new Event("sj-refresh-data"));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to record sale");
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

          {/* Quick Add Dynamic Category Button */}
          <button
            onClick={() => {
              setCategoryForm({ name: "" });
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-dashed border-luxury-gold/60 bg-luxury-gold-subtle/50 px-3.5 py-2 text-xs font-semibold text-luxury-gold-dark hover:bg-luxury-gold-subtle transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ New Category</span>
          </button>
        </div>
      </div>

      {/* Search & Segregation / Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-luxury-beige bg-white p-4 shadow-luxury lg:flex-row lg:items-center lg:justify-between">
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
          {/* Weight Segregation Filter */}
          <select
            value={selectedWeightBracket}
            onChange={(e) => setSelectedWeightBracket(e.target.value)}
            className="rounded-xl border border-luxury-beige bg-white px-3 py-2 text-xs text-luxury-charcoal focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="all">⚖️ All Weights</option>
            {metalType === "gold" ? (
              <>
                <option value="under_2">&lt; 2g (Light / Rings)</option>
                <option value="2_to_5">2g – 5g (Standard Rings)</option>
                <option value="5_to_10">5g – 10g (Heavy Rings / Chains)</option>
                <option value="10_to_20">10g – 20g (Chains / Bangles)</option>
                <option value="over_20">&gt; 20g (Heavy Sets / Kadas)</option>
              </>
            ) : (
              <>
                <option value="under_20">&lt; 20g (Light Silver)</option>
                <option value="20_to_50">20g – 50g (Light Anklets)</option>
                <option value="50_to_100">50g – 100g (Heavy Payal)</option>
                <option value="over_100">&gt; 100g (Utensils / Articles)</option>
              </>
            )}
          </select>

          {/* Size Segregation Filter */}
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="rounded-xl border border-luxury-beige bg-white px-3 py-2 text-xs text-luxury-charcoal focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="all">📏 All Sizes</option>
            {Array.from(new Set(items.map((i) => i.size).filter(Boolean))).map((sz) => (
              <option key={sz} value={sz}>
                Size: {sz}
              </option>
            ))}
          </select>

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
                <th className="px-4 py-3.5">Size / Dim</th>
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
                  <td colSpan={11} className="py-12 text-center text-luxury-muted">
                    <div className="inline-block h-6 w-6 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-2"></div>
                    <p>Loading inventory...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-luxury-muted">
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
                      <td className="px-4 py-3 text-luxury-charcoal">
                        {item.size ? (
                          <span className="rounded bg-luxury-gold-subtle/80 px-2 py-0.5 font-medium text-[11px] text-luxury-gold-dark border border-luxury-gold/30">
                            {item.size}
                          </span>
                        ) : (
                          <span className="text-luxury-muted text-[11px]">—</span>
                        )}
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
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Main Sell Button */}
                          <button
                            onClick={() => openSellModal(item)}
                            title="Sell Material (Deduct stock, record customer udhari & profit)"
                            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:brightness-105 active:scale-95 transition"
                          >
                            <ShoppingBag className="h-3 w-3" />
                            <span>Sell</span>
                          </button>

                          <button
                            onClick={() => openAdjustModal(item)}
                            title="Adjust Stock (Non-destructive)"
                            className="rounded-lg p-1 text-luxury-charcoal hover:bg-luxury-ivory hover:text-luxury-gold-dark transition"
                          >
                            <Scale className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openHistoryModal(item)}
                            title="View Stock Movement Audit Trail"
                            className="rounded-lg p-1 text-luxury-charcoal hover:bg-luxury-ivory hover:text-luxury-gold-dark transition"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveItem(item)}
                            title="Archive / Remove"
                            className="rounded-lg p-1 text-luxury-muted hover:bg-red-50 hover:text-red-700 transition"
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-luxury-charcoal">Category *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryForm({ name: "" });
                        setIsCategoryModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-luxury-gold-dark hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> + New Category
                    </button>
                  </div>
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
                  <label className="block text-xs font-semibold text-luxury-charcoal mb-1">
                    Size / Dimensions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ring Size 14, 10.5 in, Bangle 2.4"
                    value={stockForm.size}
                    onChange={(e) => setStockForm({ ...stockForm, size: e.target.value })}
                    className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
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

      {/* Modal 5: Sell Material & Customer Udhari Khata */}
      {isSellModalOpen && sellItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-luxury-beige bg-white shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between border-b border-luxury-beige pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-onyx flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-luxury-gold-dark" />
                  <span>Sell Material — Counter Billing</span>
                </h3>
                <p className="text-xs text-luxury-muted">
                  Deducts showroom inventory, records manual profit, and tracks customer udhari
                </p>
              </div>
              <button
                onClick={() => {
                  setIsSellModalOpen(false);
                  setSellSuccessData(null);
                }}
              >
                <X className="h-5 w-5 text-luxury-muted" />
              </button>
            </div>

            {sellSuccessData ? (
              <div className="my-6 space-y-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-luxury-gold-subtle border border-luxury-gold/50 shadow-gold-glow text-luxury-gold-dark">
                  <Sparkles className="h-8 w-8 text-luxury-gold-dark" />
                </div>

                <div>
                  <h4 className="font-serif text-xl font-bold text-luxury-onyx">Sale Recorded Successfully!</h4>
                  <p className="text-xs font-mono text-luxury-muted mt-1">{sellSuccessData.saleNumber}</p>
                  <p className="text-xs text-luxury-charcoal mt-2">
                    Item stock deducted. Cash counter credited automatically.
                  </p>
                  {sellSuccessData.remainingBalance > 0 ? (
                    <div className="mt-3 inline-block rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-900">
                      Remaining Udhari Due: <strong>₹{sellSuccessData.remainingBalance.toLocaleString("en-IN")}</strong>
                    </div>
                  ) : (
                    <div className="mt-3 inline-block rounded-xl bg-luxury-gold-subtle border border-luxury-gold/40 px-4 py-2 text-xs text-luxury-gold-dark font-semibold">
                      Full Payment Received (₹0 Balance)
                    </div>
                  )}
                </div>

                {/* WhatsApp Greeting & Receipt Button */}
                <div className="rounded-xl border border-luxury-beige bg-luxury-ivory/50 p-4 text-left">
                  <p className="text-xs font-semibold text-luxury-charcoal mb-2 flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4 text-luxury-gold-dark" />
                    <span>Send Customer WhatsApp Greeting & Payment Summary</span>
                  </p>
                  <p className="text-[11px] text-luxury-muted mb-3">
                    Click below to open WhatsApp with a personalized greeting, purchase breakdown, remaining due, and promised due date.
                  </p>
                  <a
                    href={sellSuccessData.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-105 active:scale-95 transition"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Open WhatsApp for {sellSuccessData.customerName}</span>
                  </a>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setIsSellModalOpen(false);
                      setSellSuccessData(null);
                    }}
                    className="w-full rounded-xl bg-luxury-onyx px-5 py-2.5 text-xs font-bold text-luxury-gold hover:bg-luxury-onyx-surface transition"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSellSubmit} className="mt-4 space-y-4">
                {/* Item Details Box */}
                <div className="rounded-xl border border-luxury-beige bg-luxury-ivory/50 p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-luxury-charcoal text-sm">{sellItem.name}</span>
                    <span className="rounded bg-luxury-gold-subtle px-2 py-0.5 text-[10px] font-bold text-luxury-gold-dark border border-luxury-gold/30">
                      {sellItem.purity}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-luxury-muted text-[11px]">
                    <span>SKU: <strong className="text-luxury-charcoal font-mono">{sellItem.sku}</strong></span>
                    {sellItem.size && <span>Size: <strong className="text-luxury-gold-dark">{sellItem.size}</strong></span>}
                    <span>Available Qty: <strong className="text-luxury-charcoal">{sellItem.quantity} pcs</strong></span>
                    <span>Net Wt: <strong className="text-luxury-charcoal">{sellItem.netWeight.toFixed(3)}g</strong></span>
                    <span>Unit Cost: <strong className="text-luxury-charcoal">₹{Math.round((sellItem.purchaseCostRupees || 0) / (sellItem.quantity || 1)).toLocaleString("en-IN")}</strong></span>
                  </div>
                </div>

                {/* Quantity & Proportional Weight */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Quantity to Sell *</label>
                    <input
                      type="number"
                      min="1"
                      max={sellItem.quantity}
                      required
                      value={sellForm.quantitySold}
                      onChange={(e) => {
                        const q = Math.max(1, Math.min(sellItem.quantity, parseInt(e.target.value) || 1));
                        setSellForm({ ...sellForm, quantitySold: q });
                      }}
                      className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                    />
                    <span className="text-[10px] text-luxury-muted mt-0.5 block">Max available: {sellItem.quantity}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Sold Net Weight (Est.)</label>
                    <div className="w-full rounded-xl border border-luxury-beige bg-luxury-ivory/40 px-3 py-2 text-xs font-bold text-luxury-gold-dark">
                      {((sellItem.netWeight / sellItem.quantity) * sellForm.quantitySold).toFixed(3)} grams
                    </div>
                  </div>
                </div>

                {/* Selling Price & Manual Profit/Loss */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Selling Price (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 10000"
                      value={sellForm.sellingPriceRupees}
                      onChange={(e) => {
                        const sp = e.target.value;
                        const approxCost = Math.round(((sellItem.purchaseCostRupees || 0) / sellItem.quantity) * sellForm.quantitySold);
                        const autoProfit = sp ? String(Math.round(parseFloat(sp) - approxCost)) : "";
                        setSellForm({
                          ...sellForm,
                          sellingPriceRupees: sp,
                          manualProfitRupees: autoProfit,
                          paidAmountRupees: sp, // default paid to full
                        });
                      }}
                      className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs font-bold text-luxury-onyx focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-luxury-charcoal">
                        Manual Profit / Loss (₹)
                      </label>
                      <span className="text-[10px] text-luxury-muted font-normal">(Owner only)</span>
                    </div>
                    <input
                      type="number"
                      placeholder="Calculated or manual margin"
                      value={sellForm.manualProfitRupees}
                      onChange={(e) => setSellForm({ ...sellForm, manualProfitRupees: e.target.value })}
                      className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs font-bold text-luxury-gold-dark focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                    />
                    <span className="text-[10px] text-luxury-muted mt-0.5 block">
                      Net margin from this piece. Positive for profit, negative for loss.
                    </span>
                  </div>
                </div>

                {/* Payment Amount & Udhari Khata */}
                <div className="rounded-xl border border-luxury-beige bg-luxury-ivory/30 p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Paid Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Amount received today"
                        value={sellForm.paidAmountRupees}
                        onChange={(e) => setSellForm({ ...sellForm, paidAmountRupees: e.target.value })}
                        className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs font-bold focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Payment Mode</label>
                      <select
                        value={sellForm.paymentMode}
                        onChange={(e) => setSellForm({ ...sellForm, paymentMode: e.target.value as any })}
                        className="w-full rounded-xl border border-luxury-beige bg-white px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                      >
                        <option value="cash">Cash (Counter)</option>
                        <option value="online">Online / UPI</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                  </div>

                  {/* Remaining Balance & Udhari Badge */}
                  {(() => {
                    const sp = parseFloat(sellForm.sellingPriceRupees) || 0;
                    const paid = parseFloat(sellForm.paidAmountRupees) || 0;
                    const bal = Math.max(0, sp - paid);
                    return (
                      <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-luxury-beige text-xs">
                        <span className="font-medium text-luxury-muted">Remaining Balance:</span>
                        {bal > 0 ? (
                          <span className="font-serif text-sm font-bold text-amber-800">
                            ₹{bal.toLocaleString("en-IN")} (Added to Udhari Khata)
                          </span>
                        ) : (
                          <span className="font-serif text-xs font-bold text-luxury-gold-dark">
                            ₹0 (Fully Paid)
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Customer Details & Due Date */}
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-bold text-luxury-onyx uppercase tracking-wider">
                    Customer Information (For Greeting & Udhari)
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Customer Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Patil"
                        value={sellForm.customerName}
                        onChange={(e) => setSellForm({ ...sellForm, customerName: e.target.value })}
                        className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Mobile Number (WhatsApp) *</label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile number"
                        value={sellForm.customerPhone}
                        onChange={(e) => setSellForm({ ...sellForm, customerPhone: e.target.value })}
                        className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Address (Optional)</label>
                      <input
                        type="text"
                        placeholder="Locality / Village / Town"
                        value={sellForm.customerAddress}
                        onChange={(e) => setSellForm({ ...sellForm, customerAddress: e.target.value })}
                        className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-luxury-charcoal mb-1">
                        Promised Due Date (If Udhari)
                      </label>
                      <input
                        type="date"
                        value={sellForm.dueDate}
                        onChange={(e) => setSellForm({ ...sellForm, dueDate: e.target.value })}
                        className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                      />
                      <span className="text-[10px] text-luxury-muted mt-0.5 block">
                        Alert triggers 3 days before this date
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-luxury-beige">
                  <button
                    type="button"
                    onClick={() => setIsSellModalOpen(false)}
                    className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-bold text-white shadow-luxury hover:brightness-105 active:scale-95 transition"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Confirm Sale &amp; Deduct Stock</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
