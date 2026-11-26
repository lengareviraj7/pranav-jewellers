"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Users,
  Phone,
  Calendar,
  DollarSign,
  Filter,
  ChevronDown,
} from "lucide-react";
import { TiltCard, AnimatedNumber } from "@/components/Motion";
import CustomerHistoryModal from "@/components/CustomerHistoryModal";

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
  const [targetWeightSearch, setTargetWeightSearch] = useState<string>("");
  const [weightTolerance, setWeightTolerance] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");

  // Modals
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  // Selected item for Adjustment / History / Sell / Edit
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [sellItem, setSellItem] = useState<InventoryItem | null>(null);
  const [sellSuccessData, setSellSuccessData] = useState<{
    saleNumber: string;
    whatsappUrl: string;
    whatsappText: string;
    customerName: string;
    remainingBalance: number;
    totalNewPurchase?: number;
    totalExchangeCredit?: number;
    amountPaid?: number;
  } | null>(null);
  const [itemHistory, setItemHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Old Metal Exchange items within Sell Modal (Direct format from handwritten diagram)
  const [goldExGrossWeight, setGoldExGrossWeight] = useState("");
  const [goldExNetWeight, setGoldExNetWeight] = useState("");
  const [goldExRate, setGoldExRate] = useState("6500");
  const [silverExGrossWeight, setSilverExGrossWeight] = useState("");
  const [silverExNetWeight, setSilverExNetWeight] = useState("");
  const [silverExRate, setSilverExRate] = useState("75");
  const [cashAmountRupees, setCashAmountRupees] = useState("");
  const [onlineAmountRupees, setOnlineAmountRupees] = useState("");
  const [advanceAmountRupees, setAdvanceAmountRupees] = useState("");

  // Legacy exchange array state for compatibility
  const [sellExchangeItems, setSellExchangeItems] = useState<Array<{
    id: string;
    metalType: "gold" | "silver";
    grossWeight: number;
    netWeight: number;
    purity: string;
    rateRupeesPerGram: number;
    deductionRupees: number;
    exchangeValueRupees: number;
    notes?: string;
  }>>([]);
  const [exForm, setExForm] = useState({
    metalType: "gold" as "gold" | "silver",
    grossWeight: "",
    netWeight: "",
    purity: "22K Scrap",
    rateRupeesPerGram: "6500",
    deductionRupees: "0",
  });

  // Sell Form State
  const [sellForm, setSellForm] = useState({
    quantitySold: 1,
    netWeightSold: "",
    udhariRupees: "",
    manualProfitRupees: "",
    paidAmountRupees: "",
    customerName: "",
    customerPhone: "",
    customerAddress: "Visapur",
    dueDate: "",
    paymentMode: "cash" as "cash" | "online" | "mixed",
    notes: "",
  });

  // Repeat Customer State & Autocomplete
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState<any | null>(null);
  const [isCustomerHistoryOpen, setIsCustomerHistoryOpen] = useState(false);

  const searchCustomers = async (q: string) => {
    try {
      const res = await fetch(`/api/sales/customers?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setCustomerSuggestions(data.customers);
      } else {
        setCustomerSuggestions([]);
      }
    } catch {
      setCustomerSuggestions([]);
    }
  };

  const handleSelectCustomer = (cust: any) => {
    setSellForm((prev) => ({
      ...prev,
      customerName: cust.fullName,
      customerPhone: cust.mobileNumber,
      customerAddress: cust.address || "Visapur",
    }));
    setSelectedCustomerData(cust);
    setShowCustomerDropdown(false);
  };

  // Double-submission lock states and ref
  const isSubmittingRef = useRef(false);
  const [submittingStock, setSubmittingStock] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [submittingSell, setSubmittingSell] = useState(false);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);
  const [submittingCategory, setSubmittingCategory] = useState(false);

  // Add Stock Form State - Defaults to 22K for gold
  const defaultPurity = metalType === "gold" ? "22K" : (purityOptions[0] || "999");
  const [stockForm, setStockForm] = useState({
    name: "",
    categoryId: "",
    sku: "",
    purity: defaultPurity,
    size: "",
    quantity: 1,
    grossWeight: "",
    stoneWeight: "0",
    netWeight: "",
    hallmarkUid: "",
    supplierName: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Edit Stock Form State
  const [editForm, setEditForm] = useState({
    name: "",
    categoryId: "",
    sku: "",
    purity: defaultPurity,
    size: "",
    quantity: 1,
    grossWeight: "",
    stoneWeight: "0",
    netWeight: "",
    hallmarkUid: "",
    supplierName: "",
    notes: "",
  });
  const [isEditAddingPurity, setIsEditAddingPurity] = useState(false);
  const [editNewPurityInput, setEditNewPurityInput] = useState("");

  // Dynamic Purity Management
  const [customPurities, setCustomPurities] = useState<string[]>([]);
  const [isAddingPurity, setIsAddingPurity] = useState(false);
  const [newPurityInput, setNewPurityInput] = useState("");

  // Load saved custom purities from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`sj_custom_purities_${metalType}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCustomPurities(parsed);
      }
    } catch (_) { }
  }, [metalType]);

  // Combined purities from default props, custom added, and existing inventory items
  const activePurities = React.useMemo(() => {
    const fromItems = items.map((i) => i.purity).filter(Boolean);
    const combined = Array.from(new Set([...purityOptions, ...customPurities, ...fromItems]));
    return combined;
  }, [purityOptions, customPurities, items]);

  const handleAddNewPurity = () => {
    const val = newPurityInput.trim().toUpperCase();
    if (!val) return;
    if (!activePurities.includes(val)) {
      const updated = [...customPurities, val];
      setCustomPurities(updated);
      try {
        localStorage.setItem(`sj_custom_purities_${metalType}`, JSON.stringify(updated));
      } catch (_) { }
    }
    setStockForm((prev) => ({ ...prev, purity: val }));
    setNewPurityInput("");
    setIsAddingPurity(false);
    setSuccessMsg(`Purity "${val}" added successfully!`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

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

  // Weight Search Proximity Calculation
  const targetWeightNum = parseFloat(targetWeightSearch);
  const isWeightSearchActive = !isNaN(targetWeightNum) && targetWeightNum > 0;

  const displayedItems = React.useMemo(() => {
    let list = [...items];

    if (isWeightSearchActive) {
      const tol = weightTolerance !== "all" ? parseFloat(weightTolerance) : null;
      list = list
        .map((it: any) => {
          const diff = Number(((it.netWeight || 0) - targetWeightNum).toFixed(3));
          const absDiff = Math.abs(diff);
          const diffMg = Math.round(diff * 1000);
          return {
            ...it,
            diffGrams: diff,
            absDiffGrams: absDiff,
            diffMg,
          };
        })
        .filter((it: any) => {
          if (tol !== null && !isNaN(tol)) {
            return it.absDiffGrams <= tol + 0.0001;
          }
          return true;
        })
        .sort((a: any, b: any) => a.absDiffGrams - b.absDiffGrams);
    }

    return list;
  }, [items, targetWeightSearch, weightTolerance, isWeightSearchActive, targetWeightNum]);

  // Form Net Weight Helper
  const formNetWeight = stockForm.netWeight !== ""
    ? Number(stockForm.netWeight)
    : Number(stockForm.grossWeight || 0) - Number(stockForm.stoneWeight || 0);

  const editFormNetWeight = editForm.netWeight !== ""
    ? Number(editForm.netWeight)
    : Math.max(0, Number(editForm.grossWeight || 0) - Number(editForm.stoneWeight || 0));

  // 1. Submit Add Stock
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || submittingStock) return;
    isSubmittingRef.current = true;
    setSubmittingStock(true);
    try {
      const numGross = Number(stockForm.grossWeight);
      const computedNet = stockForm.netWeight !== ""
        ? Number(stockForm.netWeight)
        : Math.max(0, numGross - Number(stockForm.stoneWeight || 0));

      if (computedNet > numGross) {
        setError(`Net weight (${computedNet}g) cannot exceed gross weight (${numGross}g). Gross weight must be greater than or equal to net weight.`);
        isSubmittingRef.current = false;
        setSubmittingStock(false);
        return;
      }

      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...stockForm,
          netWeight: computedNet,
          purchaseCostRupees: 0,
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
        purity: defaultPurity,
        size: "",
        quantity: 1,
        grossWeight: "",
        stoneWeight: "0",
        netWeight: "",
        hallmarkUid: "",
        supplierName: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      isSubmittingRef.current = false;
      setSubmittingStock(false);
    }
  };

  // Open Edit Product Modal
  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    const catId = typeof item.categoryId === "object"
      ? ((item.categoryId as any)?._id || (item.categoryId as any)?.id || "")
      : (item.categoryId || "");
    setEditForm({
      name: item.name || "",
      categoryId: catId,
      sku: item.sku || "",
      purity: item.purity || defaultPurity,
      size: item.size || "",
      quantity: item.quantity || 1,
      grossWeight: item.grossWeight !== undefined ? String(item.grossWeight) : "",
      stoneWeight: item.stoneWeight !== undefined ? String(item.stoneWeight) : "0",
      netWeight: item.netWeight !== undefined ? String(item.netWeight) : "",
      hallmarkUid: item.hallmarkUid || "",
      supplierName: item.supplierName || "",
      notes: item.notes || "",
    });
    setIsEditAddingPurity(false);
    setEditNewPurityInput("");
    setIsEditModalOpen(true);
  };

  const handleEditAddNewPurity = () => {
    const val = editNewPurityInput.trim().toUpperCase();
    if (!val) return;
    if (!activePurities.includes(val)) {
      const updated = [...customPurities, val];
      setCustomPurities(updated);
      try {
        localStorage.setItem(`sj_custom_purities_${metalType}`, JSON.stringify(updated));
      } catch (_) { }
    }
    setEditForm({ ...editForm, purity: val });
    setEditNewPurityInput("");
    setIsEditAddingPurity(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || isSubmittingRef.current || submittingEdit) return;
    isSubmittingRef.current = true;
    setSubmittingEdit(true);

    try {
      const numGross = Number(editForm.grossWeight);
      const computedNet = editForm.netWeight !== ""
        ? Number(editForm.netWeight)
        : Math.max(0, numGross - (Number(editForm.stoneWeight) || 0));

      if (computedNet > numGross) {
        setError(`Net weight (${computedNet}g) cannot exceed gross weight (${numGross}g). Gross weight must be greater than or equal to net weight.`);
        isSubmittingRef.current = false;
        setSubmittingEdit(false);
        return;
      }

      const payload = {
        name: editForm.name.trim(),
        categoryId: editForm.categoryId,
        sku: editForm.sku.trim(),
        purity: editForm.purity.trim(),
        size: editForm.size.trim() || undefined,
        quantity: Number(editForm.quantity),
        grossWeight: Number(editForm.grossWeight),
        stoneWeight: Number(editForm.stoneWeight) || 0,
        netWeight: Number(computedNet.toFixed(3)),
        hallmarkUid: editForm.hallmarkUid.trim() || undefined,
        supplierName: editForm.supplierName.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
      };

      const res = await fetch(`/api/inventory/items/${editingItem.id || editingItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update item");

      setSuccessMsg(`Product "${payload.name}" updated successfully!`);
      setIsEditModalOpen(false);
      setEditingItem(null);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update product");
    } finally {
      isSubmittingRef.current = false;
      setSubmittingEdit(false);
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
    if (!activeItem || isSubmittingRef.current || submittingAdjust) return;
    isSubmittingRef.current = true;
    setSubmittingAdjust(true);

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
    } finally {
      isSubmittingRef.current = false;
      setSubmittingAdjust(false);
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
    if (isSubmittingRef.current || submittingCategory) return;
    isSubmittingRef.current = true;
    setSubmittingCategory(true);
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
    } finally {
      isSubmittingRef.current = false;
      setSubmittingCategory(false);
    }
  };

  // 7. Sell Material Handler
  const openSellModal = (item: InventoryItem) => {
    setSellItem(item);
    setSellSuccessData(null);
    setSellExchangeItems([]);
    setGoldExGrossWeight("");
    setGoldExNetWeight("");
    setGoldExRate("0");
    setSilverExGrossWeight("");
    setSilverExNetWeight("");
    setSilverExRate("0");
    setCashAmountRupees("");
    setOnlineAmountRupees("");
    setExForm({
      metalType: "gold",
      grossWeight: "",
      netWeight: "",
      purity: "22K Scrap",
      rateRupeesPerGram: "0",
      deductionRupees: "0",
    });

    const defaultSoldNet = item.quantity > 0
      ? (item.netWeight / item.quantity).toFixed(3)
      : item.netWeight.toFixed(3);

    setSellForm({
      quantitySold: 1,
      netWeightSold: defaultSoldNet,
      udhariRupees: "",
      manualProfitRupees: "",
      paidAmountRupees: "",
      customerName: "",
      customerPhone: "",
      customerAddress: "Visapur", // Required default: Visapur
      dueDate: "",
      paymentMode: "cash",
      notes: "",
    });
    setIsSellModalOpen(true);
  };

  const handleAddSellExchange = () => {
    const gw = parseFloat(exForm.grossWeight) || 0;
    const nw = parseFloat(exForm.netWeight) || 0;
    const rate = parseFloat(exForm.rateRupeesPerGram) || 0;
    const ded = parseFloat(exForm.deductionRupees) || 0;

    if (gw <= 0 && nw <= 0) {
      alert("Please enter valid gross or net weight for old metal.");
      return;
    }

    const val = Math.max(0, nw * rate - ded);
    setSellExchangeItems((prev) => [
      ...prev,
      {
        id: `ex-${Date.now()}-${Math.random()}`,
        metalType: exForm.metalType,
        grossWeight: gw > 0 ? gw : nw,
        netWeight: nw > 0 ? nw : gw,
        purity: exForm.purity,
        rateRupeesPerGram: rate,
        deductionRupees: ded,
        exchangeValueRupees: val,
      },
    ]);

    setExForm({
      metalType: exForm.metalType,
      grossWeight: "",
      netWeight: "",
      purity: exForm.metalType === "gold" ? "22K Scrap" : "925 Scrap",
      rateRupeesPerGram: "0",
      deductionRupees: "0",
    });
  };

  const handleRemoveSellExchange = (id: string) => {
    setSellExchangeItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellItem || isSubmittingRef.current || submittingSell) return;
    isSubmittingRef.current = true;
    setSubmittingSell(true);

    const cashVal = parseFloat(cashAmountRupees) || 0;
    const onlineVal = parseFloat(onlineAmountRupees) || 0;
    const advanceVal = parseFloat(advanceAmountRupees) || 0;
    const udhariVal = parseFloat(sellForm.udhariRupees) || 0;
    const totalTransactionAmount = cashVal + onlineVal + advanceVal + udhariVal;

    if (totalTransactionAmount <= 0) {
      alert("Please enter at least Cash Received, Online payment, Advance payment, or an Udhari amount.");
      return;
    }

    if (udhariVal > 0 && !sellForm.dueDate) {
      alert("Promised payment due date is mandatory when Udhari is entered.");
      return;
    }

    // Direct exchange items from Gold & Silver inputs (weights only, rate option removed)
    const goldNW = parseFloat(goldExNetWeight) || 0;
    const goldGW = parseFloat(goldExGrossWeight) || goldNW;
    const silverNW = parseFloat(silverExNetWeight) || 0;
    const silverGW = parseFloat(silverExGrossWeight) || silverNW;

    if (goldNW > 0 && goldGW > 0 && goldNW > goldGW + 0.001) {
      alert("Gold net weight cannot exceed gross weight.");
      return;
    }
    if (silverNW > 0 && silverGW > 0 && silverNW > silverGW + 0.001) {
      alert("Silver net weight cannot exceed gross weight.");
      return;
    }

    const compiledExchange: any[] = [];
    if (goldNW > 0 || goldGW > 0) {
      compiledExchange.push({
        metalType: "gold",
        grossWeight: goldGW > 0 ? goldGW : goldNW,
        netWeight: goldNW > 0 ? goldNW : goldGW,
        purity: "22K Scrap",
        rateRupeesPerGram: 0,
        deductionRupees: 0,
        exchangeValueRupees: 0,
      });
    }
    if (silverNW > 0 || silverGW > 0) {
      compiledExchange.push({
        metalType: "silver",
        grossWeight: silverGW > 0 ? silverGW : silverNW,
        netWeight: silverNW > 0 ? silverNW : silverGW,
        purity: "925 Scrap",
        rateRupeesPerGram: 0,
        deductionRupees: 0,
        exchangeValueRupees: 0,
      });
    }

    // Also include any items from legacy list if present
    for (const ex of sellExchangeItems) {
      compiledExchange.push(ex);
    }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: sellItem.id || sellItem._id,
          quantitySold: sellForm.quantitySold,
          netWeightSold: sellForm.netWeightSold ? parseFloat(sellForm.netWeightSold) : undefined,
          sellingPriceRupees: totalTransactionAmount,
          udhariAmountRupees: udhariVal,
          manualProfitRupees: sellForm.manualProfitRupees ? parseFloat(sellForm.manualProfitRupees) : undefined,
          exchangeMetals: compiledExchange.map((ex) => ({
            metalType: ex.metalType,
            grossWeight: ex.grossWeight,
            netWeight: ex.netWeight,
            purity: ex.purity,
            rateRupeesPerGram: ex.rateRupeesPerGram || 0,
            deductionRupees: ex.deductionRupees || 0,
            notes: ex.notes,
          })),
          cashAmountRupees: cashVal,
          onlineAmountRupees: onlineVal,
          advanceAmountRupees: advanceVal,
          customerName: sellForm.customerName.trim(),
          customerPhone: sellForm.customerPhone.trim(),
          customerAddress: sellForm.customerAddress.trim() || undefined,
          dueDate: udhariVal > 0 ? sellForm.dueDate : undefined,
          notes: sellForm.notes,
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
        totalNewPurchase: data.sale.sellingPricePaise / 100,
        totalExchangeCredit: (data.sale.totalExchangeCreditPaise || 0) / 100,
        amountPaid: data.sale.paidAmountPaise / 100,
      });

      setSuccessMsg(`Sale recorded! Stock of ${sellItem.name} deducted successfully.`);
      fetchData();
      // Notify other tabs / counters
      window.dispatchEvent(new Event("sj-refresh-data"));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to record sale");
    } finally {
      isSubmittingRef.current = false;
      setSubmittingSell(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center animate-fadeInUp">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-luxury-gold-champagne">
            Showroom Stock Management
          </span>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/export/inventory?metalType=${metalType}`}
            download
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all border border-emerald-400/30"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Stock (Excel)</span>
          </a>

          <button
            onClick={() => setIsAddStockOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-4 py-2 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 active:scale-95 transition-all btn-3d"
          >
            <Plus className="h-4 w-4 text-black" />
            <span>Add {metalType === "gold" ? "Gold" : "Silver"} Stock</span>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Pieces in Stock
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-white">
            <AnimatedNumber value={totalPieces} />
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">Verified showroom items</span>
        </TiltCard>

        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Gross Weight
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-white">
            <AnimatedNumber value={totalGrossWeight} decimals={3} />{" "}
            <span className="text-xs font-sans font-normal text-luxury-muted">g</span>
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">Including stones & attachments</span>
        </TiltCard>

        <TiltCard
          maxTilt={8}
          glare={true}
          className={`rounded-2xl border ${metalType === "gold" ? "border-luxury-gold/40" : "border-slate-400/40"
            } bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury`}
        >
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${metalType === "gold" ? "text-luxury-gold-champagne" : "text-slate-300"
            }`}>
            Total Net Metal Weight
          </span>
          <p className={`mt-2 font-serif text-2xl font-bold ${metalType === "gold" ? "text-luxury-gold-bright" : "text-slate-200"
            }`}>
            <AnimatedNumber value={totalNetWeight} decimals={3} />{" "}
            <span className={`text-xs font-sans font-normal ${metalType === "gold" ? "text-luxury-gold" : "text-slate-400"
              }`}>g pure</span>
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">Auto-computed (Gross - Stones)</span>
        </TiltCard>

        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Active Categories
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-white">
            <AnimatedNumber value={categories.length} />
          </p>
          <span className="text-[11px] text-luxury-muted/80 mt-1 block">Dynamic &amp; customizable</span>
        </TiltCard>
      </div>

      {/* Dynamic Category Summary Carousel / Pills */}
      <div className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl p-5 shadow-luxury">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Category-wise Stock Breakdown
          </span>
          <span className="text-[11px] text-luxury-muted">Click any category to filter inventory</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${selectedCategory === "all"
              ? "bg-luxury-gold text-black shadow-gold-glow font-bold border border-luxury-gold-bright"
              : "border border-white/[0.08] bg-white/[0.03] text-luxury-muted hover:text-white hover:bg-white/[0.06]"
              }`}
          >
            All Categories ({items.length})
          </button>

          {categories.map((cat) => (
            <div
              key={cat.id || cat._id}
              className={`flex items-center rounded-xl border transition-all duration-200 overflow-hidden ${selectedCategory === (cat.id || cat._id)
                ? "border-luxury-gold bg-luxury-gold/15 text-luxury-gold-bright shadow-xs"
                : "border-white/[0.08] bg-white/[0.03] text-luxury-muted hover:text-white hover:bg-white/[0.06]"
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
                className="p-1.5 opacity-60 hover:opacity-100 transition-opacity"
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
            className="flex items-center gap-1.5 rounded-xl border border-dashed border-luxury-gold/50 bg-luxury-gold/10 px-3.5 py-2 text-xs font-semibold text-luxury-gold hover:bg-luxury-gold/20 hover:border-luxury-gold transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ New Category</span>
          </button>
        </div>
      </div>

      {/* Search & Segregation / Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl p-4 shadow-luxury lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-luxury-muted" />
          <input
            type="text"
            placeholder="Search by Item name, SKU, HUID, or Supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.1] bg-luxury-obsidian/60 py-2 pl-9 pr-4 text-xs text-white placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Direct Search by Weight (Integrated into Gold & Silver stock) */}
          <div className="flex items-center gap-1.5 rounded-xl border border-luxury-gold/50 bg-black/60 px-2.5 py-1.5 shadow-sm">
            <Scale className="h-4 w-4 text-luxury-gold shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-gold-champagne whitespace-nowrap">
              Weight:
            </span>
            <input
              type="number"
              step="0.001"
              placeholder="e.g. 8.5g"
              value={targetWeightSearch}
              onChange={(e) => setTargetWeightSearch(e.target.value)}
              title="Search by target net weight (e.g. 8.5g)"
              className="w-20 bg-transparent text-xs font-mono font-bold text-luxury-gold-bright placeholder:text-neutral-500 focus:outline-none"
            />
            <span className="text-[10px] font-mono text-luxury-muted">g</span>

            {targetWeightSearch && (
              <div className="flex items-center gap-1 pl-1.5 border-l border-white/10">
                <select
                  value={weightTolerance}
                  onChange={(e) => setWeightTolerance(e.target.value)}
                  className="rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white border border-white/10 focus:outline-none"
                >
                  <option value="all">Nearest</option>
                  <option value="0.2">±0.2g</option>
                  <option value="0.5">±0.5g</option>
                  <option value="1.0">±1.0g</option>
                </select>
                <button
                  type="button"
                  onClick={() => setTargetWeightSearch("")}
                  title="Clear weight search"
                  className="rounded p-0.5 text-neutral-400 hover:text-white transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Weight Segregation Filter */}
          <select
            value={selectedWeightBracket}
            onChange={(e) => setSelectedWeightBracket(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="all" className="bg-luxury-obsidian text-white">⚖️ All Weights</option>
            {metalType === "gold" ? (
              <>
                <option value="under_2" className="bg-luxury-obsidian text-white">&lt; 2g (Light / Rings)</option>
                <option value="2_to_5" className="bg-luxury-obsidian text-white">2g – 5g (Standard Rings)</option>
                <option value="5_to_10" className="bg-luxury-obsidian text-white">5g – 10g (Heavy Rings / Chains)</option>
                <option value="10_to_20" className="bg-luxury-obsidian text-white">10g – 20g (Chains / Bangles)</option>
                <option value="over_20" className="bg-luxury-obsidian text-white">&gt; 20g (Heavy Sets / Kadas)</option>
              </>
            ) : (
              <>
                <option value="under_20" className="bg-luxury-obsidian text-white">&lt; 20g (Light Silver)</option>
                <option value="20_to_50" className="bg-luxury-obsidian text-white">20g – 50g (Light Anklets)</option>
                <option value="50_to_100" className="bg-luxury-obsidian text-white">50g – 100g (Heavy Payal)</option>
                <option value="over_100" className="bg-luxury-obsidian text-white">&gt; 100g (Utensils / Articles)</option>
              </>
            )}
          </select>

          {/* Size Segregation Filter */}
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="all" className="bg-luxury-obsidian text-white">📏 All Sizes</option>
            {Array.from(new Set(items.map((i) => i.size).filter(Boolean))).map((sz) => (
              <option key={sz} value={sz} className="bg-luxury-obsidian text-white">
                Size: {sz}
              </option>
            ))}
          </select>

          {/* Purity Filter */}
          <select
            value={selectedPurity}
            onChange={(e) => setSelectedPurity(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="all" className="bg-luxury-obsidian text-white">All Purities</option>
            {activePurities.map((p) => (
              <option key={p} value={p} className="bg-luxury-obsidian text-white">
                {p}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="latest" className="bg-luxury-obsidian text-white">Sort: Latest Added</option>
            <option value="weight_desc" className="bg-luxury-obsidian text-white">Sort: Highest Net Weight</option>
            <option value="weight_asc" className="bg-luxury-obsidian text-white">Sort: Lowest Net Weight</option>
            <option value="name" className="bg-luxury-obsidian text-white">Sort: Alphabetical Name</option>
          </select>
        </div>
      </div>

      {/* Active Weight Search Banner */}
      {isWeightSearchActive && (
        <div className="flex items-center justify-between rounded-xl bg-luxury-gold/15 border border-luxury-gold/40 px-4 py-2.5 text-xs animate-slideDown">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-luxury-gold shrink-0" />
            <span className="text-white font-medium">
              Showing pieces sorted nearest to <strong className="text-luxury-gold-bright font-mono">{targetWeightNum.toFixed(3)}g</strong>
              {weightTolerance !== "all" && (
                <span className="text-luxury-gold-champagne ml-1">
                  (Tolerance: ±{weightTolerance}g)
                </span>
              )}
            </span>
            <span className="rounded-full bg-luxury-gold/25 px-2.5 py-0.5 text-[10px] font-bold text-luxury-gold-bright border border-luxury-gold/40">
              {displayedItems.length} match{displayedItems.length === 1 ? "" : "es"}
            </span>
          </div>
          <button
            onClick={() => setTargetWeightSearch("")}
            className="text-[11px] font-bold text-luxury-gold-champagne hover:text-white hover:underline flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Reset Weight Filter
          </button>
        </div>
      )}

      {/* Inventory Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl shadow-luxury">
        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-luxury-gold-champagne bg-luxury-gold/10 border-b border-white/[0.08] md:hidden">
          <span>👈 Swipe horizontally to view all columns 👉</span>
          <span className="font-mono text-[10px] text-luxury-muted">Net Wt • Actions</span>
        </div>
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-luxury-gold-champagne uppercase font-semibold">
              <tr>
                <th className="px-4 py-3.5 text-left">SKU / Item</th>
                <th className="px-4 py-3.5 text-left">Category</th>
                <th className="px-4 py-3.5 text-center">Size / Dim</th>
                <th className="px-4 py-3.5 text-center">Purity</th>
                <th className="px-4 py-3.5 text-right">Qty</th>
                <th className="px-4 py-3.5 text-right">Gross Wt</th>
                <th className="px-4 py-3.5 text-right">Stones</th>
                <th className="px-4 py-3.5 text-right">Net Wt</th>
                <th className="px-4 py-3.5 text-center">HUID / Ref</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-luxury-muted">
                    <div className="inline-block h-6 w-6 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-2"></div>
                    <p>Loading inventory...</p>
                  </td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-luxury-muted">
                    <p className="font-serif text-sm font-semibold text-white">
                      {isWeightSearchActive ? `No pieces found within ±${weightTolerance}g of ${targetWeightNum.toFixed(3)}g` : "No items match your query"}
                    </p>
                    <p className="text-[11px] mt-1 text-luxury-muted">
                      {isWeightSearchActive ? "Try selecting 'Nearest' or a wider tolerance in the weight filter." : "Try resetting filters or click 'Add Stock' above to record a new entry."}
                    </p>
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => {
                  const catName = typeof item.categoryId === "object" ? item.categoryId?.name : "Category";
                  return (
                    <tr key={item.id || item._id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-4 py-3 font-medium text-left">
                        <p className="text-white font-semibold">{item.name}</p>
                        <p className="text-[10px] font-mono text-luxury-gold-champagne tracking-tight">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-left text-white/90">
                        <span className="rounded-md bg-white/[0.05] px-2 py-0.5 border border-white/[0.08] text-[11px] text-luxury-gold-champagne">
                          {catName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.size ? (
                          <span className="inline-block rounded bg-luxury-gold/15 px-2 py-0.5 font-medium text-[11px] text-luxury-gold-bright border border-luxury-gold/30">
                            {item.size}
                          </span>
                        ) : (
                          <span className="text-luxury-muted text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded bg-luxury-gold/15 px-2 py-0.5 font-semibold text-[11px] text-luxury-gold-bright border border-luxury-gold/30">
                          {item.purity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-white/90 font-mono tabular-nums">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-white/90 font-mono tabular-nums">{item.grossWeight.toFixed(3)}g</td>
                      <td className="px-4 py-3 text-right text-luxury-muted font-mono tabular-nums">{item.stoneWeight.toFixed(3)}g</td>
                      <td className="px-4 py-3 text-right font-bold text-luxury-gold-bright font-mono tabular-nums">
                        <div>{item.netWeight.toFixed(3)}g</div>
                        {isWeightSearchActive && (item as any).diffMg !== undefined && (
                          <span
                            className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-mono font-bold mt-0.5 ${(item as any).diffMg === 0
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : (item as any).diffMg > 0
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              }`}
                          >
                            {(item as any).diffMg === 0
                              ? "🎯 Exact match"
                              : (item as any).diffMg > 0
                                ? `+${(item as any).diffMg}mg`
                                : `${(item as any).diffMg}mg`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.hallmarkUid ? (
                          <span className="inline-block rounded bg-luxury-gold/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-luxury-gold-bright border border-luxury-gold/30">
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
                            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-2.5 py-1 text-[11px] font-bold text-black shadow-gold-glow hover:brightness-110 active:scale-95 transition-all btn-3d"
                          >
                            <ShoppingBag className="h-3 w-3" />
                            <span>Sell</span>
                          </button>

                          {/* Edit Product Details */}
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Product Details"
                            className="rounded-lg p-1 text-luxury-gold-champagne hover:bg-luxury-gold/20 hover:text-luxury-gold-bright transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => openAdjustModal(item)}
                            title="Adjust Stock (Non-destructive)"
                            className="rounded-lg p-1 text-luxury-muted hover:bg-white/[0.08] hover:text-white transition-colors"
                          >
                            <Scale className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openHistoryModal(item)}
                            title="View Stock Movement Audit Trail"
                            className="rounded-lg p-1 text-luxury-muted hover:bg-white/[0.08] hover:text-white transition-colors"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveItem(item)}
                            title="Archive / Remove"
                            className="rounded-lg p-1 text-luxury-muted hover:bg-red-500/20 hover:text-red-400 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto modal-backdrop">
          <div className="relative w-full max-w-xl rounded-2xl border border-white/[0.15] bg-luxury-graphite text-white shadow-2xl p-4 sm:p-6 my-2 sm:my-8 max-h-[92dvh] overflow-y-auto space-y-4 modal-content">
            <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-gold-champagne">
                  Add {metalType === "gold" ? "Gold" : "Silver"} Stock
                </h3>
                <p className="text-xs text-luxury-muted">Record new jewellery pieces into showroom stock</p>
              </div>
              <button
                onClick={() => setIsAddStockOpen(false)}
                className="rounded-lg p-1 text-luxury-muted hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStock} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder={`e.g. ${metalType === "gold" ? "22K Traditional Kada" : "Pure Silver Pooja Thali"}`}
                    value={stockForm.name}
                    onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-300">Category *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryForm({ name: "" });
                        setIsCategoryModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-luxury-gold-bright hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> + New Category
                    </button>
                  </div>
                  <select
                    required
                    value={stockForm.categoryId}
                    onChange={(e) => setStockForm({ ...stockForm, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/70 px-3 py-2 text-xs font-medium text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  >
                    <option value="" className="bg-luxury-obsidian text-neutral-400">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id} className="bg-luxury-obsidian text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Size / Dimensions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ring Size 14, 10.5 in, Bangle 2.4"
                    value={stockForm.size}
                    onChange={(e) => setStockForm({ ...stockForm, size: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-300">Purity *</label>
                    <button
                      type="button"
                      onClick={() => setIsAddingPurity(!isAddingPurity)}
                      className="text-[10px] text-luxury-gold hover:underline font-bold"
                    >
                      {isAddingPurity ? "Select from list" : "+ + New Purity"}
                    </button>
                  </div>

                  {isAddingPurity ? (
                    <div className="flex items-center gap-1.5 animate-fadeIn">
                      <input
                        type="text"
                        placeholder="e.g. 995, 920, 840, 750, 18K"
                        value={newPurityInput}
                        onChange={(e) => setNewPurityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddNewPurity();
                          } else if (e.key === "Escape") {
                            setIsAddingPurity(false);
                          }
                        }}
                        className="w-full rounded-xl border border-luxury-gold/50 bg-black/70 px-3 py-2 text-xs font-bold text-white focus:border-luxury-gold focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddNewPurity}
                        className="rounded-xl bg-luxury-gold px-3 py-2 text-xs font-bold text-black hover:bg-luxury-gold-bright transition shrink-0"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingPurity(false)}
                        className="rounded-xl bg-white/10 px-2.5 py-2 text-xs font-medium text-white hover:bg-white/20 transition shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={stockForm.purity}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsAddingPurity(true);
                        } else {
                          setStockForm({ ...stockForm, purity: e.target.value });
                        }
                      }}
                      className="w-full rounded-xl border border-white/20 bg-black/70 px-3 py-2 text-xs font-medium text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                    >
                      {activePurities.map((p) => (
                        <option key={p} value={p} className="bg-luxury-obsidian text-white">
                          {p}
                        </option>
                      ))}
                      <option value="__NEW__" className="bg-luxury-gold/20 text-luxury-gold font-bold">
                        + Add Custom Purity...
                      </option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Quantity (Pieces) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Gross Weight (grams) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="0.000"
                    value={stockForm.grossWeight}
                    onChange={(e) => {
                      const gw = e.target.value;
                      const sw = stockForm.stoneWeight || "0";
                      const autoNet = gw ? Math.max(0, Number(gw) - Number(sw)).toFixed(3) : "";
                      setStockForm({
                        ...stockForm,
                        grossWeight: gw,
                        netWeight: autoNet,
                      });
                    }}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-mono font-bold text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Stone Weight (grams)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={stockForm.stoneWeight}
                    onChange={(e) => {
                      const sw = e.target.value;
                      const gw = stockForm.grossWeight || "0";
                      const autoNet = gw ? Math.max(0, Number(gw) - Number(sw)).toFixed(3) : "";
                      setStockForm({
                        ...stockForm,
                        stoneWeight: sw,
                        netWeight: autoNet,
                      });
                    }}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-mono font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                {/* Net Metal Weight (grams) replaces Purchase Cost */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-amber-300">
                      Net Metal Weight (grams) *
                    </label>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      direct entry
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="0.000"
                    value={stockForm.netWeight}
                    onChange={(e) => {
                      const nw = e.target.value;
                      const numNw = parseFloat(nw);
                      const numGw = parseFloat(stockForm.grossWeight);
                      let newStone = stockForm.stoneWeight;
                      if (!isNaN(numNw) && !isNaN(numGw) && numGw >= numNw) {
                        newStone = (numGw - numNw).toFixed(3);
                      }
                      setStockForm({
                        ...stockForm,
                        netWeight: nw,
                        stoneWeight: newStone,
                      });
                    }}
                    className="w-full rounded-xl border border-amber-500/50 bg-black/60 px-3 py-2 text-xs font-mono font-bold text-amber-200 placeholder:text-neutral-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  />
                  {Number(stockForm.grossWeight || 0) > 0 && Number(stockForm.netWeight || 0) > Number(stockForm.grossWeight || 0) && (
                    <p className="text-[10px] text-red-400 font-bold mt-1">
                      ⚠️ Net weight ({stockForm.netWeight}g) cannot exceed gross weight ({stockForm.grossWeight}g)!
                    </p>
                  )}
                  <span className="text-[10px] text-luxury-muted mt-0.5 block">
                    Actual gold/silver weight in stock
                  </span>
                </div>
              </div>

              {/* Live Net Weight Banner */}
              <div className="flex items-center justify-between rounded-xl bg-luxury-gold/15 p-3 border border-luxury-gold/30">
                <span className="text-xs font-semibold text-neutral-200">Current Net Metal Weight:</span>
                <span className="font-serif text-sm font-bold text-luxury-gold-bright">
                  {formNetWeight > 0 ? formNetWeight.toFixed(3) : "0.000"} g
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Custom SKU (Optional)</label>
                  <input
                    type="text"
                    placeholder="Leave empty to auto-generate"
                    value={stockForm.sku}
                    onChange={(e) => setStockForm({ ...stockForm, sku: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">HUID / Hallmark (Optional)</label>
                  <input
                    type="text"
                    placeholder="6-character alphanumeric"
                    value={stockForm.hallmarkUid}
                    onChange={(e) => setStockForm({ ...stockForm, hallmarkUid: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Supplier Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Zaveri Bullion Works"
                    value={stockForm.supplierName}
                    onChange={(e) => setStockForm({ ...stockForm, supplierName: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.1]">
                <button
                  type="button"
                  onClick={() => setIsAddStockOpen(false)}
                  className="rounded-xl border border-white/20 px-5 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStock}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark px-6 py-2 text-xs font-bold text-black shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingStock ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Saving Stock...</span>
                    </>
                  ) : (
                    <span>Save Stock Item</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1B: Edit Stock Item Form */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto modal-backdrop">
          <div className="relative w-full max-w-xl rounded-2xl border border-white/[0.15] bg-luxury-graphite text-white shadow-2xl p-4 sm:p-6 my-2 sm:my-8 max-h-[92dvh] overflow-y-auto space-y-4 modal-content">
            <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-gold-champagne">
                  Edit {metalType === "gold" ? "Gold" : "Silver"} Product
                </h3>
                <p className="text-xs text-luxury-muted">
                  Update item parameters, weights, category, or purity for <strong className="text-white font-mono">{editingItem.sku}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="rounded-lg p-1 text-luxury-muted hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder={`e.g. ${metalType === "gold" ? "22K Traditional Kada" : "Pure Silver Pooja Thali"}`}
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-300">Category *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryForm({ name: "" });
                        setIsCategoryModalOpen(true);
                      }}
                      className="text-[10px] font-bold text-luxury-gold-bright hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> + New Category
                    </button>
                  </div>
                  <select
                    required
                    value={editForm.categoryId}
                    onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/70 px-3 py-2 text-xs font-medium text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  >
                    <option value="" className="bg-luxury-obsidian text-neutral-400">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id} className="bg-luxury-obsidian text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Size / Dimensions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ring Size 14, 10.5 in, Bangle 2.4"
                    value={editForm.size}
                    onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-300">Purity *</label>
                    <button
                      type="button"
                      onClick={() => setIsEditAddingPurity(!isEditAddingPurity)}
                      className="text-[10px] text-luxury-gold hover:underline font-bold"
                    >
                      {isEditAddingPurity ? "Select from list" : "+ + New Purity"}
                    </button>
                  </div>

                  {isEditAddingPurity ? (
                    <div className="flex items-center gap-1.5 animate-fadeIn">
                      <input
                        type="text"
                        placeholder="e.g. 995, 920, 840, 750, 18K"
                        value={editNewPurityInput}
                        onChange={(e) => setEditNewPurityInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleEditAddNewPurity();
                          } else if (e.key === "Escape") {
                            setIsEditAddingPurity(false);
                          }
                        }}
                        className="w-full rounded-xl border border-luxury-gold/50 bg-black/70 px-3 py-2 text-xs font-bold text-white focus:border-luxury-gold focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleEditAddNewPurity}
                        className="rounded-xl bg-luxury-gold px-3 py-2 text-xs font-bold text-black hover:bg-luxury-gold-bright transition shrink-0"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditAddingPurity(false)}
                        className="rounded-xl bg-white/10 px-2.5 py-2 text-xs font-medium text-white hover:bg-white/20 transition shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={editForm.purity}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsEditAddingPurity(true);
                        } else {
                          setEditForm({ ...editForm, purity: e.target.value });
                        }
                      }}
                      className="w-full rounded-xl border border-white/20 bg-black/70 px-3 py-2 text-xs font-medium text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                    >
                      {activePurities.map((p) => (
                        <option key={p} value={p} className="bg-luxury-obsidian text-white">
                          {p}
                        </option>
                      ))}
                      <option value="__NEW__" className="bg-luxury-gold/20 text-luxury-gold font-bold">
                        + Add Custom Purity...
                      </option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Quantity (Pieces) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Gross Weight (grams) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="0.000"
                    value={editForm.grossWeight}
                    onChange={(e) => {
                      const gw = e.target.value;
                      const sw = editForm.stoneWeight || "0";
                      const autoNet = gw ? Math.max(0, Number(gw) - Number(sw)).toFixed(3) : "";
                      setEditForm({
                        ...editForm,
                        grossWeight: gw,
                        netWeight: autoNet,
                      });
                    }}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-mono font-bold text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Stone Weight (grams)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={editForm.stoneWeight}
                    onChange={(e) => {
                      const sw = e.target.value;
                      const gw = editForm.grossWeight || "0";
                      const autoNet = gw ? Math.max(0, Number(gw) - Number(sw)).toFixed(3) : "";
                      setEditForm({
                        ...editForm,
                        stoneWeight: sw,
                        netWeight: autoNet,
                      });
                    }}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-mono font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-amber-300">
                      Net Metal Weight (grams) *
                    </label>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      direct entry
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="0.000"
                    value={editForm.netWeight}
                    onChange={(e) => {
                      const nw = e.target.value;
                      const numNw = parseFloat(nw);
                      const numGw = parseFloat(editForm.grossWeight);
                      let newStone = editForm.stoneWeight;
                      if (!isNaN(numNw) && !isNaN(numGw) && numGw >= numNw) {
                        newStone = (numGw - numNw).toFixed(3);
                      }
                      setEditForm({
                        ...editForm,
                        netWeight: nw,
                        stoneWeight: newStone,
                      });
                    }}
                    className="w-full rounded-xl border border-amber-500/50 bg-black/60 px-3 py-2 text-xs font-mono font-bold text-amber-200 placeholder:text-neutral-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  />
                  {Number(editForm.grossWeight || 0) > 0 && Number(editForm.netWeight || 0) > Number(editForm.grossWeight || 0) && (
                    <p className="text-[10px] text-red-400 font-bold mt-1">
                      ⚠️ Net weight ({editForm.netWeight}g) cannot exceed gross weight ({editForm.grossWeight}g)!
                    </p>
                  )}
                  <span className="text-[10px] text-luxury-muted mt-0.5 block">
                    Actual gold/silver weight in stock
                  </span>
                </div>
              </div>

              {/* Live Net Weight Banner */}
              <div className="flex items-center justify-between rounded-xl bg-luxury-gold/15 p-3 border border-luxury-gold/30">
                <span className="text-xs font-semibold text-neutral-200">Current Net Metal Weight:</span>
                <span className="font-serif text-sm font-bold text-luxury-gold-bright">
                  {editFormNetWeight > 0 ? editFormNetWeight.toFixed(3) : "0.000"} g
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    value={editForm.sku}
                    onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium font-mono text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">HUID / Hallmark (Optional)</label>
                  <input
                    type="text"
                    placeholder="6-character alphanumeric"
                    value={editForm.hallmarkUid}
                    onChange={(e) => setEditForm({ ...editForm, hallmarkUid: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Supplier Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajkot Bullion Mart, Zaveri Bazaar"
                    value={editForm.supplierName}
                    onChange={(e) => setEditForm({ ...editForm, supplierName: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.1]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="rounded-xl border border-white/20 px-5 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark px-6 py-2 text-xs font-bold text-black shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingEdit ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Stock Adjustment (Non-destructive) */}
      {isAdjustModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto modal-backdrop">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.15] bg-luxury-graphite text-white shadow-2xl p-4 sm:p-6 my-2 sm:my-8 max-h-[92dvh] overflow-y-auto space-y-4 modal-content">
            <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-gold-champagne">Adjust Stock Item</h3>
                <p className="text-xs text-luxury-muted">
                  Non-destructive adjustment with mandatory audit explanation
                </p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="rounded-lg p-1 text-luxury-muted hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/50 p-3 text-xs space-y-1">
              <span className="font-bold text-white">{activeItem.name}</span>{" "}
              <span className="font-mono text-luxury-gold">({activeItem.sku})</span>
              <div className="mt-1 flex gap-4 text-luxury-muted">
                <span>Current Qty: <strong className="text-white">{activeItem.quantity}</strong></span>
                <span>Gross: <strong className="text-white">{activeItem.grossWeight.toFixed(3)}g</strong></span>
                <span>Net: <strong className="text-luxury-gold-bright">{activeItem.netWeight.toFixed(3)}g</strong></span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">New Qty</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={adjustForm.newQuantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, newQuantity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">New Gross Wt</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={adjustForm.newGrossWeight}
                    onChange={(e) => setAdjustForm({ ...adjustForm, newGrossWeight: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-mono font-medium text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">New Stone Wt</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={adjustForm.newStoneWeight}
                    onChange={(e) => setAdjustForm({ ...adjustForm, newStoneWeight: e.target.value })}
                    className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-mono font-medium text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Mandatory Adjustment Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain reason for adjustment (e.g. physical inventory audit discrepancy, re-weighed after polishing, sold 1 piece)"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.1]">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark px-5 py-2 text-xs font-bold text-black shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingAdjust ? "Recording..." : "Record Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Item History Audit Log */}
      {isHistoryModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto modal-backdrop">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/[0.15] bg-luxury-graphite text-white shadow-2xl p-4 sm:p-6 my-2 sm:my-8 max-h-[92dvh] flex flex-col modal-content">
            <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-gold-champagne">Stock Movement Audit Trail</h3>
                <p className="text-xs text-luxury-muted">
                  Full transaction history for {activeItem.name} ({activeItem.sku})
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-lg p-1 text-luxury-muted hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
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
                    className="rounded-xl border border-white/10 bg-black/40 p-3.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-luxury-gold uppercase tracking-wide">
                        {tx.transactionType.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-luxury-muted">
                        {new Date(tx.timestamp).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <p className="text-neutral-300">
                      Reason: <span className="font-medium text-white">{tx.reason}</span>
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-luxury-muted border-t border-white/[0.08] pt-1 mt-1">
                      <div>
                        Qty: {tx.previousQuantity} → <strong className="text-white">{tx.newQuantity}</strong> (Δ {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange})
                      </div>
                      <div>
                        Net Wt: {tx.previousNetWeight.toFixed(3)}g → <strong className="text-luxury-gold-bright">{tx.newNetWeight.toFixed(3)}g</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/[0.1] pt-3 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="rounded-xl bg-luxury-gold px-5 py-2 text-xs font-bold text-black hover:bg-luxury-gold-bright transition"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Manage / Rename Category */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto modal-backdrop">
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.15] bg-luxury-graphite text-white shadow-2xl p-4 sm:p-6 my-2 sm:my-8 max-h-[92dvh] overflow-y-auto space-y-4 modal-content">
            <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-luxury-gold-champagne">
                  {categoryForm.id ? "Edit Category" : "Add Dynamic Category"}
                </h3>
                <p className="text-xs text-luxury-muted">
                  {metalType === "gold" ? "Gold" : "Silver"} showroom categorization
                </p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-lg p-1 text-luxury-muted hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bridal Chokers, Antique Bangles"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Category purpose or style notes"
                  value={categoryForm.description || ""}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-medium text-white placeholder:text-neutral-500 focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.1]">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCategory}
                  className="rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark px-5 py-2 text-xs font-bold text-black shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingCategory ? "Saving..." : categoryForm.id ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Sell Material & Counter Billing with Old Metal Trade-In */}
      {isSellModalOpen && sellItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto modal-backdrop">
          <div className="relative w-full max-w-2xl rounded-2xl border border-luxury-gold/40 bg-luxury-graphite text-white shadow-2xl p-4 sm:p-6 my-2 sm:my-8 max-h-[92dvh] overflow-y-auto modal-content">
            <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-luxury-gold" />
                  <span>Sell Material — Counter Billing</span>
                </h3>
                <p className="text-xs text-luxury-muted">
                  Deducts showroom inventory, records old metal trade-in, split payments &amp; customer udhari
                </p>
              </div>
              <button
                onClick={() => {
                  setIsSellModalOpen(false);
                  setSellSuccessData(null);
                }}
                className="text-luxury-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {sellSuccessData ? (
              <div className="my-6 space-y-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-luxury-gold/20 border border-luxury-gold/50 shadow-gold-glow text-luxury-gold-bright">
                  <Sparkles className="h-8 w-8 text-luxury-gold" />
                </div>

                <div>
                  <h4 className="font-serif text-xl font-bold text-white">Sale Recorded Successfully!</h4>
                  <p className="text-xs font-mono text-luxury-gold mt-1">{sellSuccessData.saleNumber}</p>
                  <p className="text-xs text-white/80 mt-2">
                    Item stock deducted. Cash counter (Rojmel) credited automatically.
                  </p>

                  <div className="my-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                    <div className="rounded-xl bg-luxury-obsidian/80 p-2.5 border border-white/10">
                      <span className="text-[10px] uppercase text-luxury-muted">New Purchase</span>
                      <p className="font-mono text-xs font-bold text-white">
                        ₹{(sellSuccessData.totalNewPurchase || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="rounded-xl bg-luxury-obsidian/80 p-2.5 border border-white/10">
                      <span className="text-[10px] uppercase text-luxury-muted">Old Metal Credit</span>
                      <p className="font-mono text-xs font-bold text-luxury-gold">
                        -₹{(sellSuccessData.totalExchangeCredit || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="rounded-xl bg-luxury-obsidian/80 p-2.5 border border-white/10">
                      <span className="text-[10px] uppercase text-luxury-muted">Amount Paid</span>
                      <p className="font-mono text-xs font-bold text-emerald-400">
                        ₹{(sellSuccessData.amountPaid || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="rounded-xl bg-luxury-obsidian/80 p-2.5 border border-white/10">
                      <span className="text-[10px] uppercase text-luxury-muted">Remaining Udhari</span>
                      <p className="font-mono text-xs font-bold text-rose-400">
                        ₹{sellSuccessData.remainingBalance.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Greeting & Receipt Button */}
                <div className="rounded-xl border border-white/10 bg-luxury-obsidian p-4 text-left">
                  <p className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    <span>Send Customer WhatsApp Greeting &amp; Payment Summary</span>
                  </p>
                  <p className="text-[11px] text-luxury-muted mb-3">
                    Click below to open WhatsApp with a personalized greeting, purchase breakdown, old metal credit, remaining due, and promised due date.
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
                    className="w-full rounded-xl bg-luxury-gold px-5 py-2.5 text-xs font-bold text-black hover:bg-luxury-gold-bright transition"
                  >
                    Done &amp; Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSellSubmit} className="mt-4 space-y-4">
                {/* ========================================================
                    TOP SECTION: Today date / Day, Product Name, Net Weight (editable), Purity
                    ======================================================== */}
                <div className="rounded-2xl border border-luxury-gold/30 bg-gradient-to-br from-luxury-obsidian via-[#14120e] to-luxury-charcoal p-4 shadow-luxury space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-luxury-gold/15 px-3 py-1 text-xs font-semibold text-luxury-gold-bright border border-luxury-gold/30">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Today: {new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date())}</span>
                      </span>
                      <span className="text-[11px] text-luxury-muted">Day / Date</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-luxury-muted font-bold">Purity:</span>
                      <span className="rounded-lg bg-luxury-gold/20 px-3 py-1 text-xs font-bold text-luxury-gold-bright border border-luxury-gold/40 shadow-gold-glow">
                        {sellItem.purity}
                      </span>
                    </div>
                  </div>

                  {/* Product Name & Editable Net Weight (Selling Price option removed as requested) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-luxury-muted mb-1">
                        Product Name
                      </label>
                      <div className="rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5">
                        <p className="font-bold text-white text-sm truncate">{sellItem.name}</p>
                        <p className="text-[10px] text-luxury-muted font-mono mt-0.5">
                          SKU: <span className="text-luxury-gold">{sellItem.sku}</span> | In Stock: <span className="text-white">{sellItem.quantity} pcs</span>
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-4">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          Net Weight (g)
                        </label>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          editable
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={sellForm.netWeightSold}
                        onChange={(e) => setSellForm({ ...sellForm, netWeightSold: e.target.value })}
                        className="w-full rounded-xl border border-amber-500/50 bg-black/60 px-3 py-2 text-xs font-mono font-bold text-amber-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                        placeholder="0.000"
                      />
                      <span className="text-[9px] text-luxury-muted mt-0.5 block">
                        Original piece net wt: {sellItem.netWeight.toFixed(3)}g
                      </span>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-luxury-muted mb-1">
                        Qty to Sell *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={sellItem.quantity}
                        required
                        value={sellForm.quantitySold}
                        onChange={(e) => {
                          const q = Math.max(1, Math.min(sellItem.quantity, parseInt(e.target.value) || 1));
                          const autoNet = ((sellItem.netWeight / sellItem.quantity) * q).toFixed(3);
                          setSellForm({ ...sellForm, quantitySold: q, netWeightSold: autoNet });
                        }}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-bold text-white focus:border-luxury-gold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ========================================================
                    MIDDLE SECTION: Old Metal Received. (Gold, Silver, Cash with split)
                    (Rates removed in front of Gold & Silver as requested)
                    ======================================================== */}
                <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-[#081a17] via-luxury-obsidian to-[#0a1512] p-4 shadow-luxury space-y-3">
                  <div className="flex items-center justify-between border-b border-teal-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🪙</span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300">
                        Old Metal Received.
                      </h4>
                    </div>
                    <span className="text-[10px] text-teal-400/80">
                      Physical old metal weights received at counter
                    </span>
                  </div>

                  {/* Table with Gross Wt (G.W) first, then Net Wt (N.t) without rate columns */}
                  <div className="space-y-2.5">
                    {/* Header Columns */}
                    <div className="grid grid-cols-12 gap-3 text-[10px] uppercase font-bold text-teal-300/80 px-2">
                      <div className="col-span-3">Metal</div>
                      <div className="col-span-4 text-center">Gross Wt (G.W) (g)</div>
                      <div className="col-span-5 text-center">Net Wt (N.t) (g)</div>
                    </div>

                    {/* Row 1: Gold */}
                    <div className="grid grid-cols-12 gap-3 items-center rounded-xl bg-black/40 border border-teal-500/20 p-2.5">
                      <div className="col-span-3 flex items-center gap-2">
                        <span className="text-lg">🪙</span>
                        <span className="text-xs font-bold text-amber-300">Gold</span>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="Gross wt (G.W)"
                          value={goldExGrossWeight}
                          onChange={(e) => {
                            const val = e.target.value;
                            setGoldExGrossWeight(val);
                            if (!goldExNetWeight || goldExNetWeight === goldExGrossWeight) {
                              setGoldExNetWeight(val);
                            }
                          }}
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-center text-xs font-mono text-white focus:border-teal-400 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-5">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="Net wt (N.t)"
                          value={goldExNetWeight}
                          onChange={(e) => {
                            const val = e.target.value;
                            setGoldExNetWeight(val);
                            const numNet = parseFloat(val) || 0;
                            const numGross = parseFloat(goldExGrossWeight) || 0;
                            if (!goldExGrossWeight || (numGross > 0 && numGross < numNet)) {
                              setGoldExGrossWeight(val);
                            }
                          }}
                          className="w-full rounded-lg border border-teal-500/40 bg-black/60 px-3 py-2 text-center text-xs font-mono font-bold text-amber-300 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Row 2: Silver */}
                    <div className="grid grid-cols-12 gap-3 items-center rounded-xl bg-black/40 border border-teal-500/20 p-2.5">
                      <div className="col-span-3 flex items-center gap-2">
                        <span className="text-lg">🥈</span>
                        <span className="text-xs font-bold text-slate-200">Silver</span>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="Gross wt (G.W)"
                          value={silverExGrossWeight}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSilverExGrossWeight(val);
                            if (!silverExNetWeight || silverExNetWeight === silverExGrossWeight) {
                              setSilverExNetWeight(val);
                            }
                          }}
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-center text-xs font-mono text-white focus:border-teal-400 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-5">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="Net wt (N.t)"
                          value={silverExNetWeight}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSilverExNetWeight(val);
                            const numNet = parseFloat(val) || 0;
                            const numGross = parseFloat(silverExGrossWeight) || 0;
                            if (!silverExGrossWeight || (numGross > 0 && numGross < numNet)) {
                              setSilverExGrossWeight(val);
                            }
                          }}
                          className="w-full rounded-lg border border-teal-500/40 bg-black/60 px-3 py-2 text-center text-xs font-mono font-bold text-slate-200 focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Row 3: Cash, Online & Advance Split */}
                    <div className="rounded-xl bg-black/40 border border-teal-500/20 p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <span className="text-base">💳</span>
                        <span>Payment Breakdown (Cash, Online &amp; Advance)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">
                            Cash (₹) <span className="text-[9px] text-luxury-muted font-normal">→ Counter Rojmel</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="₹ Cash amount"
                            value={cashAmountRupees}
                            onChange={(e) => setCashAmountRupees(e.target.value)}
                            className="w-full rounded-xl border border-emerald-500/40 bg-black/60 px-3 py-2 text-xs font-mono font-bold text-emerald-300 focus:border-emerald-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-cyan-400 mb-1">
                            Online (₹) <span className="text-[9px] text-luxury-muted font-normal">(UPI / Bank transfer)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="₹ Online amount"
                            value={onlineAmountRupees}
                            onChange={(e) => setOnlineAmountRupees(e.target.value)}
                            className="w-full rounded-xl border border-cyan-500/40 bg-black/60 px-3 py-2 text-xs font-mono font-bold text-cyan-300 focus:border-cyan-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-amber-400 mb-1">
                            Advance (₹) <span className="text-[9px] text-luxury-muted font-normal">(Customer Advance)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="₹ Advance amount"
                            value={advanceAmountRupees}
                            onChange={(e) => setAdvanceAmountRupees(e.target.value)}
                            className="w-full rounded-xl border border-amber-500/40 bg-black/60 px-3 py-2 text-xs font-mono font-bold text-amber-300 focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================
                    FINANCIAL SUMMARY STRIP
                    ======================================================== */}
                {(() => {
                  const cash = parseFloat(cashAmountRupees) || 0;
                  const online = parseFloat(onlineAmountRupees) || 0;
                  const advance = parseFloat(advanceAmountRupees) || 0;
                  const udhari = parseFloat(sellForm.udhariRupees) || 0;
                  const totalPaid = cash + online + advance;
                  const totalBill = totalPaid + udhari;

                  const goldNW = parseFloat(goldExNetWeight) || 0;
                  const silverNW = parseFloat(silverExNetWeight) || 0;

                  return (
                    <div className="rounded-2xl border border-white/10 bg-luxury-obsidian/95 p-3.5 space-y-2.5">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                        <div className="rounded-xl bg-emerald-950/30 p-2 border border-emerald-500/20">
                          <span className="text-[9px] uppercase tracking-wider text-emerald-300 block">Cash Paid</span>
                          <p className="font-mono text-xs font-bold text-emerald-400 mt-0.5">₹{cash.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="rounded-xl bg-cyan-950/30 p-2 border border-cyan-500/20">
                          <span className="text-[9px] uppercase tracking-wider text-cyan-300 block">Online Paid</span>
                          <p className="font-mono text-xs font-bold text-cyan-400 mt-0.5">₹{online.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="rounded-xl bg-amber-950/30 p-2 border border-amber-500/20">
                          <span className="text-[9px] uppercase tracking-wider text-amber-300 block">Advance Paid</span>
                          <p className="font-mono text-xs font-bold text-amber-400 mt-0.5">₹{advance.toLocaleString("en-IN")}</p>
                        </div>
                        <div className={`rounded-xl p-2 border ${udhari > 0 ? "bg-rose-950/30 border-rose-500/30" : "bg-white/5 border-white/5"}`}>
                          <span className="text-[9px] uppercase tracking-wider text-luxury-muted block">Udhari (Due)</span>
                          <p className={`font-mono text-xs font-bold mt-0.5 ${udhari > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                            ₹{udhari.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="rounded-xl bg-luxury-gold/15 p-2 border border-luxury-gold/30">
                          <span className="text-[9px] uppercase tracking-wider text-luxury-gold-champagne font-bold block">Total Transaction</span>
                          <p className="font-mono text-xs font-bold text-luxury-gold-bright mt-0.5">₹{totalBill.toLocaleString("en-IN")}</p>
                        </div>
                      </div>

                      {(goldNW > 0 || silverNW > 0) && (
                        <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-teal-300">
                          {goldNW > 0 && <span>🪙 Old Gold: <strong>{goldNW.toFixed(3)}g</strong></span>}
                          {silverNW > 0 && <span>🥈 Old Silver: <strong>{silverNW.toFixed(3)}g</strong></span>}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ========================================================
                    BOTTOM 2-COLUMN SECTION: Exactly as drawn in notebook
                    With Intelligent Repeat Customer Auto-complete & Lifetime History
                    Left Column: Customer Name (Auto-search), Address (By default Visapur), Promise Date
                    Right Column: Mobile No, Udhari (MANUAL input), Manual Profit (optional)
                    ======================================================== */}
                <div className="rounded-2xl border border-white/10 bg-luxury-obsidian/95 p-4 space-y-3">
                  {/* Repeat Customer Identified Banner */}
                  {selectedCustomerData && (
                    <div className="rounded-xl border border-luxury-gold/50 bg-luxury-gold/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-luxury-gold/20 border border-luxury-gold/40 text-luxury-gold font-bold text-sm">
                          {selectedCustomerData.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{selectedCustomerData.fullName}</span>
                            <span className="rounded bg-luxury-gold/30 px-1.5 py-0.5 text-[9px] font-bold text-luxury-gold-bright uppercase tracking-wide">
                              🔁 Repeat Customer ({selectedCustomerData.totalPurchasesCount} purchases)
                            </span>
                          </div>
                          <p className="text-[11px] text-luxury-muted mt-0.5 font-mono">
                            📞 {selectedCustomerData.mobileNumber} • 📍 {selectedCustomerData.address || "Visapur"}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px]">
                            <span className="text-emerald-400 font-mono">
                              Paid: ₹{selectedCustomerData.totalPaidRupees.toLocaleString("en-IN")}
                            </span>
                            {selectedCustomerData.outstandingUdhariRupees > 0 && (
                              <>
                                <span className="text-luxury-muted">•</span>
                                <span className="text-rose-400 font-mono font-bold">
                                  ⚠️ Previous Udhari: ₹{selectedCustomerData.outstandingUdhariRupees.toLocaleString("en-IN")}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsCustomerHistoryOpen(true)}
                          className="flex items-center gap-1 rounded-lg bg-luxury-gold/20 hover:bg-luxury-gold/30 border border-luxury-gold/40 px-2.5 py-1 text-[11px] font-bold text-luxury-gold-bright transition shadow-sm"
                          title="View complete purchase timeline and past bills"
                        >
                          <History className="h-3.5 w-3.5 text-luxury-gold" />
                          <span>View History</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerData(null);
                            setSellForm((prev) => ({
                              ...prev,
                              customerName: "",
                              customerPhone: "",
                              customerAddress: "Visapur",
                            }));
                          }}
                          className="text-luxury-muted hover:text-white p-1 rounded-md hover:bg-white/10"
                          title="Clear customer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Row 1, Col 1: Customer Name with Autocomplete */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                          Customer Name *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomerDropdown(!showCustomerDropdown);
                            searchCustomers("");
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-luxury-gold hover:text-luxury-gold-bright transition"
                          title="Browse saved repeat customers"
                        >
                          <Users className="h-3 w-3" />
                          <span>Repeat Customers</span>
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Patil (or select repeat customer)"
                          value={sellForm.customerName}
                          onChange={(e) => {
                            setSellForm({ ...sellForm, customerName: e.target.value });
                            setShowCustomerDropdown(true);
                            searchCustomers(e.target.value);
                          }}
                          onFocus={() => {
                            setShowCustomerDropdown(true);
                            if (!sellForm.customerName) searchCustomers("");
                          }}
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs text-white focus:border-luxury-gold focus:outline-none"
                        />
                        {sellForm.customerName && (
                          <button
                            type="button"
                            onClick={() => {
                              setSellForm({ ...sellForm, customerName: "", customerPhone: "", customerAddress: "Visapur" });
                              setSelectedCustomerData(null);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-luxury-muted hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Suggestions */}
                      {showCustomerDropdown && customerSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-luxury-gold/40 bg-luxury-graphite shadow-2xl divide-y divide-white/[0.06] animate-slideDown">
                          <div className="px-3 py-1.5 bg-black/50 text-[10px] uppercase font-bold text-luxury-gold flex items-center justify-between">
                            <span>Repeat Customers (Auto-fills)</span>
                            <span>{customerSuggestions.length} found</span>
                          </div>
                          {customerSuggestions.map((c) => (
                            <button
                              key={c.customerId || c.mobileNumber}
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className="w-full text-left p-3 hover:bg-white/[0.06] transition flex items-center justify-between gap-3 group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-luxury-gold/15 text-luxury-gold font-bold text-xs group-hover:bg-luxury-gold group-hover:text-black transition">
                                  {c.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white group-hover:text-luxury-gold-bright truncate">
                                    {c.fullName}
                                  </p>
                                  <p className="text-[11px] text-luxury-muted font-mono flex items-center gap-2">
                                    <span>📞 {c.mobileNumber}</span>
                                    <span>•</span>
                                    <span>📍 {c.address || "Visapur"}</span>
                                  </p>
                                  {c.recentItems && c.recentItems.length > 0 && (
                                    <p className="text-[10px] text-luxury-gold-champagne/80 truncate">
                                      Bought: {c.recentItems.join(", ")}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="inline-block rounded bg-luxury-gold/15 px-1.5 py-0.5 text-[9px] font-bold text-luxury-gold uppercase">
                                  {c.totalPurchasesCount} bill{c.totalPurchasesCount > 1 ? "s" : ""}
                                </span>
                                {c.outstandingUdhariRupees > 0 ? (
                                  <p className="text-[10px] font-mono font-bold text-rose-400 mt-0.5">
                                    Due: ₹{c.outstandingUdhariRupees.toLocaleString("en-IN")}
                                  </p>
                                ) : (
                                  <p className="text-[10px] font-mono text-emerald-400 mt-0.5">Clear</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Row 1, Col 2: Mobile No */}
                    <div>
                      <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
                        Mobile No *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile number"
                        value={sellForm.customerPhone}
                        onChange={(e) => {
                          setSellForm({ ...sellForm, customerPhone: e.target.value });
                          if (e.target.value.length >= 3) {
                            setShowCustomerDropdown(true);
                            searchCustomers(e.target.value);
                          }
                        }}
                        className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs font-mono text-white focus:border-luxury-gold focus:outline-none"
                      />
                    </div>

                    {/* Row 2, Col 1: Address (By default Visapur) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                          Address
                        </label>
                        <span className="text-[10px] font-mono text-luxury-gold">
                          By default Visapur.
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Visapur"
                        value={sellForm.customerAddress}
                        onChange={(e) => setSellForm({ ...sellForm, customerAddress: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs text-white focus:border-luxury-gold focus:outline-none"
                      />
                    </div>

                    {/* Row 2, Col 2: Manual Udhari input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                          Udhari (₹)
                        </label>
                        <span className="text-[10px] font-semibold text-rose-400">
                          manual entry
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="₹ 0"
                        value={sellForm.udhariRupees}
                        onChange={(e) => setSellForm({ ...sellForm, udhariRupees: e.target.value })}
                        className="w-full rounded-xl border border-rose-500/40 bg-black/50 px-3.5 py-2.5 text-xs font-mono font-bold text-rose-300 focus:border-rose-400 focus:outline-none"
                      />
                      <span className="text-[10px] text-luxury-muted mt-1 block">
                        Enter remaining customer debt balance
                      </span>
                    </div>

                    {/* Row 3, Col 1: Promise Date */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                          Promise Date
                        </label>
                        {(() => {
                          const udhari = parseFloat(sellForm.udhariRupees) || 0;
                          return udhari > 0 ? (
                            <span className="text-[10px] font-bold text-rose-400">Mandatory for Udhari</span>
                          ) : (
                            <span className="text-[10px] text-luxury-muted">Optional if full payment</span>
                          );
                        })()}
                      </div>
                      <input
                        type="date"
                        value={sellForm.dueDate}
                        onChange={(e) => setSellForm({ ...sellForm, dueDate: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs text-white focus:border-luxury-gold focus:outline-none"
                      />
                      <span className="text-[10px] text-luxury-muted mt-1 block">
                        Triggers automated 3-stage WhatsApp payment reminders
                      </span>
                    </div>

                    {/* Row 3, Col 2: Manual Profit */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                          Manual Profit
                        </label>
                        <span className="text-[10px] font-semibold text-luxury-muted">
                          optional
                        </span>
                      </div>
                      <input
                        type="number"
                        placeholder="Optional margin override"
                        value={sellForm.manualProfitRupees}
                        onChange={(e) => setSellForm({ ...sellForm, manualProfitRupees: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs font-mono font-bold text-luxury-gold focus:border-luxury-gold focus:outline-none"
                      />
                      <span className="text-[10px] text-luxury-muted mt-1 block">
                        Net margin earned for showroom analytics (Owner only)
                      </span>
                    </div>
                  </div>
                </div>

                {/* MODAL FOOTER ACTIONS */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.1]">
                  <button
                    type="button"
                    onClick={() => setIsSellModalOpen(false)}
                    className="rounded-xl border border-white/20 px-5 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSell}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark px-6 py-2.5 text-xs font-bold text-black shadow-gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingSell ? (
                      <>
                        <span className="inline-block h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Processing Sale &amp; Invoice...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" />
                        <span>Confirm Sale &amp; Issue Invoice</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Customer Lifetime Statement & History Modal */}
      <CustomerHistoryModal
        isOpen={isCustomerHistoryOpen}
        onClose={() => setIsCustomerHistoryOpen(false)}
        customerPhone={selectedCustomerData?.mobileNumber || sellForm.customerPhone}
        customerName={selectedCustomerData?.fullName || sellForm.customerName}
      />
    </div>
  );
}
