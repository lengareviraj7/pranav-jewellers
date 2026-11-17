"use client";

import React, { useState, useEffect } from "react";
import { X, Coins, Gem, RefreshCw, UserPlus, CreditCard, Check, AlertCircle } from "lucide-react";

interface QuickActionModalProps {
  isOpen: boolean;
  initialTab?: "gold_stock" | "silver_stock" | "used_purchase" | "finance_client" | "finance_payment";
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickActionModal({
  isOpen,
  initialTab = "gold_stock",
  onClose,
  onSuccess,
}: QuickActionModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Categories for dropdowns
  const [goldCategories, setGoldCategories] = useState<any[]>([]);
  const [silverCategories, setSilverCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);

  // Form states
  const [goldForm, setGoldForm] = useState({
    name: "",
    categoryId: "",
    purity: "22K",
    quantity: 1,
    grossWeight: "",
    stoneWeight: "0",
    purchaseCostRupees: "",
    hallmarkUid: "",
    supplierName: "",
    notes: "",
  });

  const [silverForm, setSilverForm] = useState({
    name: "",
    categoryId: "",
    purity: "925",
    quantity: 1,
    grossWeight: "",
    stoneWeight: "0",
    purchaseCostRupees: "",
    supplierName: "",
    notes: "",
  });

  const [usedForm, setUsedForm] = useState({
    metalType: "gold",
    sellerName: "",
    sellerPhone: "",
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

  const [clientForm, setClientForm] = useState({
    fullName: "",
    mobileNumber: "",
    secondaryPhone: "",
    address: "",
    identificationType: "aadhar",
    identificationNumber: "",
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    loanId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    totalAmountRupees: "",
    principalAppliedRupees: "",
    interestAppliedRupees: "",
    paymentMethod: "cash",
    referenceTransactionId: "",
    notes: "",
  });

  useEffect(() => {
    setActiveTab(initialTab);
    setError(null);
    setSuccessMsg(null);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/inventory/categories?metalType=gold")
      .then((r) => r.json())
      .then((d) => d.success && setGoldCategories(d.categories));

    fetch("/api/inventory/categories?metalType=silver")
      .then((r) => r.json())
      .then((d) => d.success && setSilverCategories(d.categories));

    fetch("/api/finance/customers")
      .then((r) => r.json())
      .then((d) => d.success && setCustomers(d.customers));

    fetch("/api/finance/loans?status=active")
      .then((r) => r.json())
      .then((d) => d.success && setLoans(d.loans));
  }, [isOpen]);

  if (!isOpen) return null;

  // Helpers for calculations in forms
  const goldNet = Number(goldForm.grossWeight || 0) - Number(goldForm.stoneWeight || 0);
  const silverNet = Number(silverForm.grossWeight || 0) - Number(silverForm.stoneWeight || 0);
  const usedNet = Number(usedForm.grossWeight || 0) - Number(usedForm.deductionsWeight || 0);
  const usedCalcVal = (usedNet > 0 ? usedNet : 0) * (Number(usedForm.ratePerGramRupees) || 0);

  const handleGoldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...goldForm,
          metalType: "gold",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to add gold stock");

      setSuccessMsg(`Gold stock "${goldForm.name}" added successfully!`);
      onSuccess();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSilverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...silverForm,
          metalType: "silver",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to add silver stock");

      setSuccessMsg(`Silver stock "${silverForm.name}" added successfully!`);
      onSuccess();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUsedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/used-metal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usedForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record used metal purchase");

      setSuccessMsg(`Used metal voucher "${data.purchase.transactionNumber}" created!`);
      onSuccess();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create customer");

      setSuccessMsg(`Customer "${data.customer.fullName}" (${data.customer.customerId}) registered!`);
      onSuccess();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to record payment");

      setSuccessMsg(`Payment receipt "${data.payment.receiptNumber}" generated successfully!`);
      onSuccess();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-luxury-beige bg-white shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-luxury-beige bg-gradient-to-r from-luxury-ivory/60 to-white px-6 py-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-luxury-onyx">Quick Action Hub</h3>
            <p className="text-xs text-luxury-muted">Fast transactional entry directly to MongoDB</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-luxury-muted hover:bg-luxury-ivory hover:text-luxury-onyx transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-luxury-beige bg-luxury-ivory/40 p-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("gold_stock")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "gold_stock"
                ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-sm"
                : "text-luxury-charcoal hover:bg-white hover:text-luxury-gold-dark"
            }`}
          >
            <Coins className="h-4 w-4 text-luxury-gold" />
            <span>Add Gold</span>
          </button>

          <button
            onClick={() => setActiveTab("silver_stock")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "silver_stock"
                ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-sm"
                : "text-luxury-charcoal hover:bg-white hover:text-luxury-gold-dark"
            }`}
          >
            <Gem className="h-4 w-4 text-luxury-gold" />
            <span>Add Silver</span>
          </button>

          <button
            onClick={() => setActiveTab("used_purchase")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "used_purchase"
                ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-sm"
                : "text-luxury-charcoal hover:bg-white hover:text-luxury-gold-dark"
            }`}
          >
            <RefreshCw className="h-4 w-4 text-luxury-gold" />
            <span>Used Metal</span>
          </button>

          <button
            onClick={() => setActiveTab("finance_client")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "finance_client"
                ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-sm"
                : "text-luxury-charcoal hover:bg-white hover:text-luxury-gold-dark"
            }`}
          >
            <UserPlus className="h-4 w-4 text-luxury-gold" />
            <span>Add Client</span>
          </button>

          <button
            onClick={() => setActiveTab("finance_payment")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition shrink-0 ${
              activeTab === "finance_payment"
                ? "bg-luxury-onyx text-luxury-gold border border-luxury-gold/40 shadow-sm"
                : "text-luxury-charcoal hover:bg-white hover:text-luxury-gold-dark"
            }`}
          >
            <CreditCard className="h-4 w-4 text-luxury-gold" />
            <span>Record Payment</span>
          </button>
        </div>

        {/* Status Alerts */}
        <div className="px-6 pt-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-luxury-gold-subtle p-3 text-xs text-luxury-gold-dark border border-luxury-gold/30 font-medium">
              <Check className="h-4 w-4 shrink-0 text-luxury-gold-dark" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Tab 1: Gold Stock Form */}
        {activeTab === "gold_stock" && (
          <form onSubmit={handleGoldSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 22K Peacock Necklace"
                  value={goldForm.name}
                  onChange={(e) => setGoldForm({ ...goldForm, name: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Category *</label>
                <select
                  required
                  value={goldForm.categoryId}
                  onChange={(e) => setGoldForm({ ...goldForm, categoryId: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {goldCategories.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Purity</label>
                <select
                  value={goldForm.purity}
                  onChange={(e) => setGoldForm({ ...goldForm, purity: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                >
                  <option value="24K">24K (99.9% Fine)</option>
                  <option value="22K">22K (91.6% Hallmark)</option>
                  <option value="20K">20K (83.3%)</option>
                  <option value="18K">18K (75.0%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Quantity (Pieces)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={goldForm.quantity}
                  onChange={(e) => setGoldForm({ ...goldForm, quantity: Number(e.target.value) })}
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
                  value={goldForm.grossWeight}
                  onChange={(e) => setGoldForm({ ...goldForm, grossWeight: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Stone Weight (grams)</label>
                <input
                  type="number"
                  step="0.001"
                  value={goldForm.stoneWeight}
                  onChange={(e) => setGoldForm({ ...goldForm, stoneWeight: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Calculated Net Weight Indicator */}
            <div className="flex items-center justify-between rounded-xl bg-luxury-ivory p-3 border border-luxury-beige">
              <span className="text-xs font-semibold text-luxury-charcoal">Calculated Net Gold Weight:</span>
              <span className="font-serif text-sm font-bold text-luxury-gold-dark">
                {goldNet > 0 ? goldNet.toFixed(3) : "0.000"} g
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Purchase Cost (₹)</label>
                <input
                  type="number"
                  placeholder="₹ Total cost"
                  value={goldForm.purchaseCostRupees}
                  onChange={(e) => setGoldForm({ ...goldForm, purchaseCostRupees: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">HUID / Hallmark (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ABC123"
                  value={goldForm.hallmarkUid}
                  onChange={(e) => setGoldForm({ ...goldForm, hallmarkUid: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Add Gold Stock"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Silver Stock Form */}
        {activeTab === "silver_stock" && (
          <form onSubmit={handleSilverSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure Silver Diya Set"
                  value={silverForm.name}
                  onChange={(e) => setSilverForm({ ...silverForm, name: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Category *</label>
                <select
                  required
                  value={silverForm.categoryId}
                  onChange={(e) => setSilverForm({ ...silverForm, categoryId: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                >
                  <option value="">Select Silver Category</option>
                  {silverCategories.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Purity</label>
                <select
                  value={silverForm.purity}
                  onChange={(e) => setSilverForm({ ...silverForm, purity: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                >
                  <option value="999">999 (Fine Silver)</option>
                  <option value="925">925 (Sterling Silver)</option>
                  <option value="800">800 (Standard Silver)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Quantity (Pieces)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={silverForm.quantity}
                  onChange={(e) => setSilverForm({ ...silverForm, quantity: Number(e.target.value) })}
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
                  value={silverForm.grossWeight}
                  onChange={(e) => setSilverForm({ ...silverForm, grossWeight: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Stone Weight (grams)</label>
                <input
                  type="number"
                  step="0.001"
                  value={silverForm.stoneWeight}
                  onChange={(e) => setSilverForm({ ...silverForm, stoneWeight: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-luxury-ivory p-3 border border-luxury-beige">
              <span className="text-xs font-semibold text-luxury-charcoal">Calculated Net Silver Weight:</span>
              <span className="font-serif text-sm font-bold text-luxury-gold-dark">
                {silverNet > 0 ? silverNet.toFixed(3) : "0.000"} g
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Add Silver Stock"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Used Metal Purchase Form */}
        {activeTab === "used_purchase" && (
          <form onSubmit={handleUsedSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Metal Type *</label>
                <select
                  value={usedForm.metalType}
                  onChange={(e) => setUsedForm({ ...usedForm, metalType: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                >
                  <option value="gold">Used Gold</option>
                  <option value="silver">Used Silver</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Seller / Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full name"
                  value={usedForm.sellerName}
                  onChange={(e) => setUsedForm({ ...usedForm, sellerName: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Item Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Old broken 22K bangles"
                  value={usedForm.itemDescription}
                  onChange={(e) => setUsedForm({ ...usedForm, itemDescription: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Purity *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 22K / 916"
                  value={usedForm.purity}
                  onChange={(e) => setUsedForm({ ...usedForm, purity: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Gross Weight (grams) *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={usedForm.grossWeight}
                  onChange={(e) => setUsedForm({ ...usedForm, grossWeight: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Deductions / Dirt (grams)</label>
                <input
                  type="number"
                  step="0.001"
                  value={usedForm.deductionsWeight}
                  onChange={(e) => setUsedForm({ ...usedForm, deductionsWeight: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Rate per Gram (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="₹/g"
                  value={usedForm.ratePerGramRupees}
                  onChange={(e) => {
                    const r = e.target.value;
                    const c = (usedNet > 0 ? usedNet : 0) * (Number(r) || 0);
                    setUsedForm({
                      ...usedForm,
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
                  value={usedForm.finalAgreedCostRupees}
                  onChange={(e) => setUsedForm({ ...usedForm, finalAgreedCostRupees: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  required
                  value={usedForm.amountPaidRupees}
                  onChange={(e) => setUsedForm({ ...usedForm, amountPaidRupees: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Payment Method</label>
                <select
                  value={usedForm.paymentMethod}
                  onChange={(e) => setUsedForm({ ...usedForm, paymentMethod: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-luxury-ivory p-3 border border-luxury-beige text-xs">
              <div>
                <span className="font-semibold text-luxury-charcoal">Net Weight: </span>
                <span className="font-bold text-luxury-gold-dark">{usedNet > 0 ? usedNet.toFixed(3) : "0.000"} g</span>
              </div>
              <div>
                <span className="font-semibold text-luxury-charcoal">Calculated Value: </span>
                <span className="font-bold text-luxury-gold-dark">₹{usedCalcVal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition disabled:opacity-50"
              >
                {loading ? "Recording..." : "Record Purchase"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: Finance Client Form */}
        {activeTab === "finance_client" && (
          <form onSubmit={handleClientSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={clientForm.fullName}
                  onChange={(e) => setClientForm({ ...clientForm, fullName: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  placeholder="10-digit mobile"
                  value={clientForm.mobileNumber}
                  onChange={(e) => setClientForm({ ...clientForm, mobileNumber: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">ID Proof Type</label>
                <select
                  value={clientForm.identificationType}
                  onChange={(e) => setClientForm({ ...clientForm, identificationType: e.target.value as any })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                >
                  <option value="aadhar">Aadhaar Card</option>
                  <option value="pan">PAN Card</option>
                  <option value="voter_id">Voter ID</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">ID Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. XXXX-XXXX-1234"
                  value={clientForm.identificationNumber}
                  onChange={(e) => setClientForm({ ...clientForm, identificationNumber: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Address</label>
              <textarea
                rows={2}
                placeholder="Residential address"
                value={clientForm.address}
                onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition disabled:opacity-50"
              >
                {loading ? "Creating..." : "Register Client"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 5: Record Finance Payment */}
        {activeTab === "finance_payment" && (
          <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Select Active Loan *</label>
              <select
                required
                value={paymentForm.loanId}
                onChange={(e) => {
                  const lId = e.target.value;
                  const selectedLoan = loans.find((l) => (l.id || l._id) === lId);
                  setPaymentForm({
                    ...paymentForm,
                    loanId: lId,
                    totalAmountRupees: selectedLoan ? String(selectedLoan.accruedInterestRupees || "") : "",
                    interestAppliedRupees: selectedLoan ? String(selectedLoan.accruedInterestRupees || "") : "",
                    principalAppliedRupees: "0",
                  });
                }}
                className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
              >
                <option value="">Select an active loan...</option>
                {loans.map((l) => (
                  <option key={l.id || l._id} value={l.id || l._id}>
                    {l.loanNumber} — {l.customerId?.fullName || "Client"} (Principal: ₹{l.currentOutstandingPrincipalRupees?.toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Total Received (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentForm.totalAmountRupees}
                  onChange={(e) => setPaymentForm({ ...paymentForm, totalAmountRupees: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Interest Applied (₹)</label>
                <input
                  type="number"
                  value={paymentForm.interestAppliedRupees}
                  onChange={(e) => setPaymentForm({ ...paymentForm, interestAppliedRupees: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Principal Applied (₹)</label>
                <input
                  type="number"
                  value={paymentForm.principalAppliedRupees}
                  onChange={(e) => setPaymentForm({ ...paymentForm, principalAppliedRupees: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-luxury-charcoal mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full rounded-xl border border-luxury-beige px-3 py-2 text-xs focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-luxury-beige px-4 py-2 text-xs font-semibold text-luxury-charcoal hover:bg-luxury-ivory"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-5 py-2 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition disabled:opacity-50"
              >
                {loading ? "Recording..." : "Record Payment & Print Receipt"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
