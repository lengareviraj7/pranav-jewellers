"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ReceiptText,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Coins,
  Gem,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Printer,
  Sparkles,
  Phone,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
} from "lucide-react";
import { TiltCard, AnimatedNumber, GlassCard, PulseDot } from "@/components/Motion";
import CustomerAutocomplete from "@/components/CustomerAutocomplete";

interface InventoryItemOption {
  _id: string;
  metalType: "gold" | "silver";
  categoryId: string | { _id: string; name: string };
  name: string;
  sku: string;
  purity: string;
  size?: string;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  purchaseCostPaise?: number;
}

interface CategoryOption {
  _id: string;
  name: string;
  metalType: "gold" | "silver" | "both";
}

interface CartItem {
  id: string;
  itemId: string;
  metalType: "gold" | "silver";
  categoryName: string;
  itemName: string;
  sku: string;
  purity: string;
  size?: string;
  quantitySold: number;
  grossWeightSold: number;
  netWeightSold: number;
  sellingPriceRupees: number;
}

interface ExchangeItem {
  id: string;
  metalType: "gold" | "silver";
  grossWeight: number;
  netWeight: number;
  purity: string;
  rateRupeesPerGram: number;
  deductionRupees: number;
  exchangeValueRupees: number;
  notes?: string;
}

export default function CounterBillingPage() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [inventory, setInventory] = useState<InventoryItemOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Sale Material Line Form
  const [selectedMetal, setSelectedMetal] = useState<"gold" | "silver">("gold");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [itemName, setItemName] = useState<string>("");
  const [sku, setSku] = useState<string>("");
  const [purity, setPurity] = useState<string>("22K");
  const [size, setSize] = useState<string>("");
  const [quantitySold, setQuantitySold] = useState<number>(1);
  const [grossWeight, setGrossWeight] = useState<number>(0);
  const [netWeight, setNetWeight] = useState<number>(0);
  const [sellingPriceRupees, setSellingPriceRupees] = useState<number>(0);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Exchange state
  const [exchangeMetal, setExchangeMetal] = useState<"gold" | "silver">("gold");
  const [exGrossWeight, setExGrossWeight] = useState<number>(0);
  const [exNetWeight, setExNetWeight] = useState<number>(0);
  const [exPurity, setExPurity] = useState<string>("22K Scrap");
  const [exRateRupees, setExRateRupees] = useState<number>(6500);
  const [exDeductionRupees, setExDeductionRupees] = useState<number>(0);
  const [exchangeItems, setExchangeItems] = useState<ExchangeItem[]>([]);

  // Payment & Split Payments
  const [cashAmountRupees, setCashAmountRupees] = useState<number>(0);
  const [onlineAmountRupees, setOnlineAmountRupees] = useState<number>(0);
  const [advanceAmountRupees, setAdvanceAmountRupees] = useState<number>(0);

  // Customer & Credit info
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [promisedDueDate, setPromisedDueDate] = useState<string>("");
  const [manualProfitRupees, setManualProfitRupees] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Submission / Success State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Inventory & Categories
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, invRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/inventory/items?limit=500"),
      ]);
      const catJson = await catRes.json();
      const invJson = await invRes.json();

      if (catJson.success) setCategories(catJson.categories || []);
      if (invJson.success) setInventory(invJson.items || []);
    } catch (e) {
      console.error("Failed to load counter data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When item selection changes, pre-populate product fields
  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedItemId(id);
    if (!id) return;

    const item = inventory.find((i) => i._id === id);
    if (item) {
      setItemName(item.name);
      setSku(item.sku);
      setSelectedMetal(item.metalType);
      setPurity(item.purity);
      setSize(item.size || "");
      setGrossWeight(item.grossWeight);
      setNetWeight(item.netWeight);
      setQuantitySold(1);
    }
  };

  // Add Item to Sale Cart
  const handleAddToCart = () => {
    if (!selectedItemId) {
      alert("Please select an inventory item.");
      return;
    }
    const invItem = inventory.find((i) => i._id === selectedItemId);
    if (!invItem) return;

    if (quantitySold <= 0 || quantitySold > invItem.quantity) {
      alert(`Invalid quantity. Available in shop: ${invItem.quantity} pcs.`);
      return;
    }
    if (sellingPriceRupees <= 0) {
      alert("Please enter a valid selling price in ₹.");
      return;
    }

    const catName =
      categories.find((c) => c._id === selectedCategoryId)?.name ||
      (typeof invItem.categoryId === "object" ? (invItem.categoryId as any).name : "Jewellery");

    const newItem: CartItem = {
      id: `cart-${Date.now()}-${Math.random()}`,
      itemId: selectedItemId,
      metalType: selectedMetal,
      categoryName: catName,
      itemName: itemName || invItem.name,
      sku: sku || invItem.sku,
      purity,
      size,
      quantitySold,
      grossWeightSold: grossWeight,
      netWeightSold: netWeight,
      sellingPriceRupees,
    };

    setCartItems((prev) => [...prev, newItem]);

    // Reset line fields
    setSelectedItemId("");
    setItemName("");
    setSku("");
    setSellingPriceRupees(0);
    setGrossWeight(0);
    setNetWeight(0);
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Add Old Metal Exchange Entry
  const handleAddExchangeItem = () => {
    if (exGrossWeight <= 0 || exNetWeight <= 0) {
      alert("Please enter valid gross and net weights for old metal.");
      return;
    }
    if (exNetWeight > exGrossWeight) {
      alert("Net metal weight cannot exceed gross weight.");
      return;
    }
    if (exRateRupees <= 0) {
      alert("Please enter applicable exchange rate (₹/g).");
      return;
    }

    const calculatedCredit = Math.max(0, exNetWeight * exRateRupees - exDeductionRupees);

    const newEx: ExchangeItem = {
      id: `ex-${Date.now()}`,
      metalType: exchangeMetal,
      grossWeight: exGrossWeight,
      netWeight: exNetWeight,
      purity: exPurity,
      rateRupeesPerGram: exRateRupees,
      deductionRupees: exDeductionRupees,
      exchangeValueRupees: calculatedCredit,
    };

    setExchangeItems((prev) => [...prev, newEx]);

    // Reset exchange inputs
    setExGrossWeight(0);
    setExNetWeight(0);
    setExDeductionRupees(0);
  };

  const handleRemoveExchangeItem = (id: string) => {
    setExchangeItems((prev) => prev.filter((e) => e.id !== id));
  };

  // Totals calculations
  const totalNewPurchaseRupees = cartItems.reduce((acc, item) => acc + item.sellingPriceRupees, 0);
  const totalExchangeCreditRupees = exchangeItems.reduce((acc, ex) => acc + ex.exchangeValueRupees, 0);
  const netAmountPayableRupees = Math.max(0, totalNewPurchaseRupees - totalExchangeCreditRupees);

  const totalPaidRupees = (cashAmountRupees || 0) + (onlineAmountRupees || 0) + (advanceAmountRupees || 0);
  const outstandingUdhariRupees = Math.max(0, netAmountPayableRupees - totalPaidRupees);

  // Submit Counter Bill
  const handleSubmitCounterBill = async () => {
    setErrorMsg(null);
    if (cartItems.length === 0) {
      setErrorMsg("Please add at least one jewellery item to the bill.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg("Customer name and 10-digit mobile number are required.");
      return;
    }
    if (outstandingUdhariRupees > 0 && !promisedDueDate) {
      setErrorMsg("Promised payment due date is mandatory when there is an unpaid balance (Udhari).");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim() || undefined,
        items: cartItems.map((c) => ({
          itemId: c.itemId,
          quantitySold: c.quantitySold,
          sellingPriceRupees: c.sellingPriceRupees,
        })),
        exchangeMetals: exchangeItems.map((ex) => ({
          metalType: ex.metalType,
          grossWeight: ex.grossWeight,
          netWeight: ex.netWeight,
          purity: ex.purity,
          rateRupeesPerGram: ex.rateRupeesPerGram,
          deductionRupees: ex.deductionRupees,
          notes: ex.notes,
        })),
        cashAmountRupees,
        onlineAmountRupees,
        advanceAmountRupees,
        dueDate: outstandingUdhariRupees > 0 ? promisedDueDate : undefined,
        manualProfitRupees: manualProfitRupees ? parseFloat(manualProfitRupees) : undefined,
        notes,
      };

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setCompletedSale(json.sale);
        setWhatsappUrl(json.whatsappUrl || "");
        loadData(); // refresh live stock
      } else {
        setErrorMsg(json.error || "Failed to complete counter billing.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Network error submitting counter bill.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetBill = () => {
    setCartItems([]);
    setExchangeItems([]);
    setCashAmountRupees(0);
    setOnlineAmountRupees(0);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setPromisedDueDate("");
    setManualProfitRupees("");
    setNotes("");
    setCompletedSale(null);
    setWhatsappUrl("");
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center animate-fadeInUp">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-luxury-gold-champagne">
            Showroom Point of Sale
          </span>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Advanced Counter Billing &amp; Exchange
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">
            Two-column fast entry, old metal trade-in allowance, split cash/online payments &amp; 3-stage WhatsApp reminders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetBill}
            className="rounded-xl border border-white/[0.08] bg-luxury-graphite/70 px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.05]"
          >
            New Clear Bill
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300 animate-fadeInUp">
          <AlertCircle className="inline mr-2 h-4 w-4" />
          {errorMsg}
        </div>
      )}

      {/* Sale Completion Modal / Card */}
      {completedSale && (
        <GlassCard className="p-6 border-emerald-500/40 bg-emerald-950/20 animate-fadeInUp">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="font-serif text-lg font-bold text-white">Invoice Generated Successfully!</h2>
            <p className="text-xs text-white/80 font-mono">
              Invoice #{completedSale.saleNumber} • Customer: {completedSale.customer.name} (
              {completedSale.customer.phone})
            </p>

            <div className="my-4 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl text-left">
              <div className="rounded-xl bg-luxury-obsidian/80 p-2.5 border border-white/10">
                <span className="text-[10px] uppercase text-luxury-muted">New Purchase</span>
                <p className="font-mono text-sm font-bold text-white">
                  ₹{(completedSale.sellingPricePaise / 100).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl bg-luxury-obsidian/80 p-2.5 border border-white/10">
                <span className="text-[10px] uppercase text-luxury-muted">Old Metal Credit</span>
                <p className="font-mono text-sm font-bold text-luxury-gold">
                  -₹{(completedSale.totalExchangeCreditPaise / 100 || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl bg-luxury-obsidian/80 p-2.5 border border-white/10">
                <span className="text-[10px] uppercase text-luxury-muted">Amount Paid</span>
                <p className="font-mono text-sm font-bold text-emerald-400">
                  ₹{(completedSale.paidAmountPaise / 100).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl bg-luxury-obsidian/80 p-2.5 border border-white/10">
                <span className="text-[10px] uppercase text-luxury-muted">Udhari Due</span>
                <p className="font-mono text-sm font-bold text-rose-400">
                  ₹{(completedSale.balanceDuePaise / 100).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-emerald-500"
                >
                  <Phone className="h-4 w-4" />
                  Send Instant WhatsApp Invoice
                </a>
              )}
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-luxury-graphite px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                <Printer className="h-4 w-4" />
                Print Counter Bill
              </button>
              <button
                onClick={handleResetBill}
                className="rounded-xl bg-luxury-gold px-4 py-2 text-xs font-bold text-black shadow-gold-glow hover:bg-luxury-gold-bright"
              >
                Next Customer Bill
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* SECTION 1: SALE MATERIAL / PRODUCT SELECTION (TWO-COLUMN FAST ENTRY) */}
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-luxury-gold/20 text-xs font-bold text-luxury-gold">
              1
            </span>
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-white">
              Sale Material / Product Selection
            </h2>
          </div>
          <span className="text-[11px] text-luxury-muted">Select from registered showroom stock</span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT SIDE — PRODUCT SELECTION */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-gold-champagne">
              Left Side — Item Selection
            </span>

            {/* Metal Category */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMetal("gold")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                  selectedMetal === "gold"
                    ? "bg-luxury-gold text-black shadow-gold-glow"
                    : "border border-white/10 bg-luxury-obsidian text-white/80 hover:bg-white/5"
                }`}
              >
                <Coins className="h-3.5 w-3.5" />
                Gold Jewellery
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetal("silver")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                  selectedMetal === "silver"
                    ? "bg-slate-300 text-black shadow-lg"
                    : "border border-white/10 bg-luxury-obsidian text-white/80 hover:bg-white/5"
                }`}
              >
                <Gem className="h-3.5 w-3.5" />
                Silver Jewellery
              </button>
            </div>

            {/* Jewellery Category (Dynamic from DB) */}
            <div>
              <label className="block text-[11px] font-bold text-luxury-muted uppercase mb-1">
                Jewellery Category
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs text-white focus:border-luxury-gold focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories
                  .filter((c) => c.metalType === selectedMetal || c.metalType === "both")
                  .map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Stock Item Selection */}
            <div>
              <label className="block text-[11px] font-bold text-luxury-muted uppercase mb-1">
                Select Inventory Item / Barcode SKU *
              </label>
              <select
                value={selectedItemId}
                onChange={handleItemSelect}
                className="w-full rounded-xl border border-luxury-gold/40 bg-luxury-obsidian p-2 text-xs font-semibold text-white focus:border-luxury-gold focus:outline-none"
              >
                <option value="">-- Choose Showroom Piece --</option>
                {inventory
                  .filter((item) => item.metalType === selectedMetal && item.quantity > 0)
                  .map((item) => (
                    <option key={item._id} value={item._id}>
                      [{item.sku}] {item.name} ({item.purity}) — {item.netWeight}g net • {item.quantity} in stock
                    </option>
                  ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-luxury-muted uppercase mb-1">Quantity (pcs)</label>
                <input
                  type="number"
                  min="1"
                  value={quantitySold}
                  onChange={(e) => setQuantitySold(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-luxury-muted uppercase mb-1">Item Size</label>
                <input
                  type="text"
                  placeholder="e.g. Size 14, 2.4"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* RIGHT SIDE — WEIGHT AND PURITY */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-gold-champagne">
              Right Side — Weight &amp; Pricing
            </span>

            {/* Gross & Net Weights */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-luxury-muted uppercase mb-1">
                  Gross Weight (grams)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs font-mono font-bold text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-luxury-muted uppercase mb-1">
                  Net Metal Weight (grams)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={netWeight}
                  onChange={(e) => setNetWeight(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-luxury-gold/30 bg-luxury-obsidian p-2 text-xs font-mono font-bold text-luxury-gold"
                />
              </div>
            </div>

            {/* Purity & Selling Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-luxury-muted uppercase mb-1">Purity Standard</label>
                <select
                  value={purity}
                  onChange={(e) => setPurity(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs text-white"
                >
                  {selectedMetal === "gold" ? (
                    <>
                      <option value="24K">24K (99.9% Pure)</option>
                      <option value="22K">22K (91.6% Hallmark)</option>
                      <option value="18K">18K (75.0%)</option>
                      <option value="14K">14K</option>
                    </>
                  ) : (
                    <>
                      <option value="999">999 Fine Silver</option>
                      <option value="925">925 Sterling Silver</option>
                      <option value="800">800 Silver</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-luxury-gold-champagne uppercase mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="₹ 0"
                  value={sellingPriceRupees || ""}
                  onChange={(e) => setSellingPriceRupees(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-luxury-gold bg-luxury-obsidian p-2 text-xs font-mono font-bold text-white shadow-gold-glow"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-luxury-gold to-luxury-gold-dark py-2.5 text-xs font-bold text-black shadow-gold-glow hover:bg-luxury-gold-bright transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Item to Sale Bill
              </button>
            </div>
          </div>
        </div>

        {/* CART LINE ITEMS TABLE */}
        {cartItems.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-[10px] font-bold uppercase tracking-wider text-luxury-muted border-b border-white/10">
                <tr>
                  <th className="py-2 px-3">Item Name</th>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3">Purity</th>
                  <th className="py-2 px-3 text-right">Qty</th>
                  <th className="py-2 px-3 text-right">Net Wt</th>
                  <th className="py-2 px-3 text-right">Price (₹)</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {cartItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-bold text-white">{item.itemName}</td>
                    <td className="py-2.5 px-3 font-mono text-luxury-gold">{item.sku}</td>
                    <td className="py-2.5 px-3 text-white/80">{item.purity}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-white">{item.quantitySold}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-white/80">{item.netWeightSold}g</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      ₹{item.sellingPriceRupees.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* SECTION 2: OLD METAL RECEIVED / TRADE-IN EXCHANGE */}
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/20 text-xs font-bold text-teal-400">
              2
            </span>
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-white">
              Old Metal Received / Exchange (Trade-In)
            </h2>
          </div>
          <span className="text-[11px] text-teal-300">
            Deducts from new purchase • Strictly separate from mortgage loans
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end">
          {/* Metal */}
          <div>
            <label className="block text-[10px] font-bold text-luxury-muted uppercase mb-1">Old Metal</label>
            <select
              value={exchangeMetal}
              onChange={(e) => setExchangeMetal(e.target.value as any)}
              className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs text-white"
            >
              <option value="gold">Old Gold</option>
              <option value="silver">Old Silver</option>
            </select>
          </div>

          {/* Gross Weight */}
          <div>
            <label className="block text-[10px] font-bold text-luxury-muted uppercase mb-1">Gross Wt (g)</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={exGrossWeight || ""}
              onChange={(e) => setExGrossWeight(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs font-mono text-white"
              placeholder="0.000"
            />
          </div>

          {/* Net Weight */}
          <div>
            <label className="block text-[10px] font-bold text-luxury-muted uppercase mb-1">Net Wt (g)</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={exNetWeight || ""}
              onChange={(e) => setExNetWeight(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-teal-500/30 bg-luxury-obsidian p-2 text-xs font-mono text-teal-300 font-bold"
              placeholder="0.000"
            />
          </div>

          {/* Scrap Rate */}
          <div>
            <label className="block text-[10px] font-bold text-luxury-muted uppercase mb-1">Rate (₹/g)</label>
            <input
              type="number"
              min="0"
              value={exRateRupees || ""}
              onChange={(e) => setExRateRupees(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs font-mono text-white"
              placeholder="₹/g"
            />
          </div>

          {/* Deductions */}
          <div>
            <label className="block text-[10px] font-bold text-luxury-muted uppercase mb-1">Deduction (₹)</label>
            <input
              type="number"
              min="0"
              value={exDeductionRupees || ""}
              onChange={(e) => setExDeductionRupees(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs font-mono text-white"
              placeholder="Melt/Stones"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={handleAddExchangeItem}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white hover:bg-teal-500 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Trade-In
            </button>
          </div>
        </div>

        {/* Exchange lines list */}
        {exchangeItems.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-teal-500/30 bg-teal-950/10">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-teal-500/20 text-[10px] font-bold uppercase text-teal-300">
                <tr>
                  <th className="py-2 px-3">Metal</th>
                  <th className="py-2 px-3">Gross Wt</th>
                  <th className="py-2 px-3">Net Wt</th>
                  <th className="py-2 px-3">Rate (₹/g)</th>
                  <th className="py-2 px-3">Deduction</th>
                  <th className="py-2 px-3 text-right">Exchange Value Credit</th>
                  <th className="py-2 px-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-500/10">
                {exchangeItems.map((ex) => (
                  <tr key={ex.id}>
                    <td className="py-2 px-3 uppercase font-bold text-white">{ex.metalType}</td>
                    <td className="py-2 px-3 font-mono">{ex.grossWeight}g</td>
                    <td className="py-2 px-3 font-mono font-bold text-teal-300">{ex.netWeight}g</td>
                    <td className="py-2 px-3 font-mono">₹{ex.rateRupeesPerGram}/g</td>
                    <td className="py-2 px-3 font-mono text-rose-400">-₹{ex.deductionRupees}</td>
                    <td className="py-2 px-3 font-mono font-bold text-right text-emerald-400">
                      ₹{ex.exchangeValueRupees.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => handleRemoveExchangeItem(ex.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* SECTION 3: SPLIT PAYMENTS & FINANCIAL TOTALS */}
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400">
              3
            </span>
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-white">
              Financial Breakdown &amp; Split Payment
            </h2>
          </div>
        </div>

        {/* Financial Summary Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-white/10 bg-luxury-obsidian p-3.5">
            <span className="text-[10px] font-bold uppercase text-luxury-muted">Total New Purchase</span>
            <p className="mt-1 font-mono text-xl font-bold text-white">
              ₹{totalNewPurchaseRupees.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-3.5">
            <span className="text-[10px] font-bold uppercase text-teal-300">Total Old Metal Credit</span>
            <p className="mt-1 font-mono text-xl font-bold text-teal-300">
              - ₹{totalExchangeCreditRupees.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-xl border-2 border-luxury-gold/50 bg-luxury-obsidian p-3.5 shadow-gold-glow">
            <span className="text-[10px] font-bold uppercase text-luxury-gold-champagne">Net Amount Payable</span>
            <p className="mt-1 font-mono text-2xl font-bold text-luxury-gold-bright">
              ₹{netAmountPayableRupees.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Split Payments: Cash + Online + Advance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-emerald-400 uppercase mb-1">
              Cash (₹) → Rojmel Jama
            </label>
            <input
              type="number"
              min="0"
              value={cashAmountRupees || ""}
              onChange={(e) => setCashAmountRupees(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2.5 text-xs font-mono font-bold text-white focus:border-luxury-gold focus:outline-none"
              placeholder="₹ 0"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-cyan-400 uppercase mb-1">
              Online (UPI / Bank) (₹)
            </label>
            <input
              type="number"
              min="0"
              value={onlineAmountRupees || ""}
              onChange={(e) => setOnlineAmountRupees(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2.5 text-xs font-mono font-bold text-white focus:border-luxury-gold focus:outline-none"
              placeholder="₹ 0"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-400 uppercase mb-1">
              Advance Paid (₹) (Deposit)
            </label>
            <input
              type="number"
              min="0"
              value={advanceAmountRupees || ""}
              onChange={(e) => setAdvanceAmountRupees(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2.5 text-xs font-mono font-bold text-white focus:border-luxury-gold focus:outline-none"
              placeholder="₹ 0"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between rounded-xl bg-luxury-obsidian/60 p-3 border border-white/5">
          <div className="text-xs text-white/80">
            Total Paid: <span className="font-mono font-bold text-emerald-400">₹{totalPaidRupees.toLocaleString("en-IN")}</span>
          </div>
          <div className="text-xs text-white/80">
            Remaining Udhari:{" "}
            <span
              className={`font-mono font-bold ${
                outstandingUdhariRupees > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              ₹{outstandingUdhariRupees.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* SECTION 4: CUSTOMER INFORMATION & UDHARI (TWO-COLUMN FAST ENTRY) */}
      <GlassCard className="p-5">
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-bold text-amber-400">
              4
            </span>
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-white">
              Customer Information &amp; Udhari Due Date
            </h2>
          </div>
          {outstandingUdhariRupees > 0 && (
            <span className="text-[11px] font-bold text-rose-400">
              Promised Payment Date is required for Udhari
            </span>
          )}
        </div>

        <CustomerAutocomplete
          customerName={customerName}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          onNameChange={setCustomerName}
          onPhoneChange={setCustomerPhone}
          onAddressChange={setCustomerAddress}
          defaultAddress="Visapur"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-4 pt-4 border-t border-white/[0.08]">
          {/* LEFT COLUMN: Calculated Outstanding Udhari */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-gold-champagne">
              Udhari Balance
            </span>

            <div className="rounded-xl border border-white/10 bg-luxury-obsidian p-3.5">
              <span className="text-[10px] uppercase text-luxury-muted">Calculated Udhari Balance</span>
              <p className="font-mono text-xl font-bold text-rose-400 mt-1">
                ₹{outstandingUdhariRupees.toLocaleString("en-IN")}
              </p>
              <span className="text-[10px] text-luxury-muted mt-1 block">
                {outstandingUdhariRupees > 0
                  ? "Requires promised payment date for 3-stage WhatsApp reminders"
                  : "Bill is fully settled. No Udhari pending."}
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Promised Due Date & Optional Manual Profit */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-gold-champagne">
              Credit Due Schedule &amp; Margin
            </span>

            <div>
              <label className="block text-[11px] font-bold text-luxury-muted uppercase mb-1">
                Promised Payment Date {outstandingUdhariRupees > 0 && <span className="text-rose-400">*</span>}
              </label>
              <input
                type="date"
                value={promisedDueDate}
                onChange={(e) => setPromisedDueDate(e.target.value)}
                className={`w-full rounded-xl border bg-luxury-obsidian p-2 text-xs text-white ${
                  outstandingUdhariRupees > 0 && !promisedDueDate
                    ? "border-rose-500/60"
                    : "border-white/10"
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-luxury-gold-champagne uppercase mb-1">
                Manual Realized Profit (₹) — Internal Optional
              </label>
              <input
                type="number"
                placeholder="Internal showroom profit override"
                value={manualProfitRupees}
                onChange={(e) => setManualProfitRupees(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs font-mono text-luxury-gold"
              />
              <span className="text-[10px] text-luxury-muted">
                Hidden from customer invoice and WhatsApp message
              </span>
            </div>
          </div>
        </div>

        {/* SUBMISSION BUTTON */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex justify-end">
          <button
            type="button"
            onClick={handleSubmitCounterBill}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark px-6 py-3 text-sm font-bold text-black shadow-gold-glow hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
          >
            <ShieldCheck className="h-5 w-5" />
            {submitting ? "Processing Sale..." : "COMPLETE COUNTER BILLING & ISSUE INVOICE"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
