"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Scale,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  Coins,
  Gem,
  CheckCircle2,
  ReceiptText,
  Clock,
  Layers,
} from "lucide-react";
import { TiltCard, AnimatedNumber, GlassCard } from "@/components/Motion";

interface WeightSearchResult {
  _id: string;
  sku: string;
  name: string;
  metalType: "gold" | "silver";
  categoryName: string;
  purity: string;
  size?: string;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  diffGrams: number;
  absDiffGrams: number;
  diffMg: number;
  diffLabel: string;
  purchaseCostPaise?: number;
}

export default function WeightSearchPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [metalType, setMetalType] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("");
  const [targetWeight, setTargetWeight] = useState<string>("2.500");
  const [weightBasis, setWeightBasis] = useState<"net" | "gross">("net");
  const [tolerance, setTolerance] = useState<string>("0.5");
  const [purity, setPurity] = useState<string>("");

  const [results, setResults] = useState<WeightSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCategories(json.categories || []);
      })
      .catch(console.error);
  }, []);

  const handleSearch = useCallback(async () => {
    const tw = parseFloat(targetWeight);
    if (isNaN(tw) || tw <= 0) {
      alert("Please enter a valid target weight in grams (e.g. 2.500).");
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      const params = new URLSearchParams({
        targetWeight: targetWeight.toString(),
        weightBasis,
        tolerance,
      });
      if (metalType !== "all") params.append("metalType", metalType);
      if (categoryId) params.append("categoryId", categoryId);
      if (purity) params.append("purity", purity);

      const res = await fetch(`/api/inventory/search-by-weight?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setResults(json.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [targetWeight, weightBasis, tolerance, metalType, categoryId, purity]);

  // Run initial search
  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center animate-fadeInUp">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-luxury-gold-champagne">
            Intelligent Inventory Discovery
          </span>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Search Jewellery by Approximate Weight
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">
            Find the closest available rings, chains, or ornaments ordered by milligram proximity to customer request
          </p>
        </div>

        <Link
          href="/sales/billing"
          className="inline-flex items-center gap-2 rounded-xl bg-luxury-gold px-4 py-2 text-xs font-bold text-black shadow-gold-glow hover:bg-luxury-gold-bright transition-all"
        >
          <ReceiptText className="h-4 w-4" />
          Open Counter Billing
        </Link>
      </div>

      {/* SEARCH CONTROLS CARD */}
      <GlassCard className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end">
          {/* Target Weight in Grams */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-luxury-gold-champagne uppercase mb-1">
              Target Weight (Grams) *
            </label>
            <div className="relative">
              <Scale className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-luxury-gold" />
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="e.g. 2.500"
                className="w-full rounded-xl border border-luxury-gold/50 bg-luxury-obsidian py-2.5 pl-9 pr-3 text-sm font-mono font-bold text-white shadow-gold-glow focus:border-luxury-gold focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-luxury-muted">Supports milligram (0.001g) precision</span>
          </div>

          {/* Weight Basis */}
          <div>
            <label className="block text-[10px] font-bold text-luxury-muted uppercase mb-1">Weight Basis</label>
            <select
              value={weightBasis}
              onChange={(e) => setWeightBasis(e.target.value as any)}
              className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs font-semibold text-white focus:border-luxury-gold focus:outline-none"
            >
              <option value="net">Net Metal Weight</option>
              <option value="gross">Gross Weight</option>
            </select>
          </div>

          {/* Tolerance Range */}
          <div>
            <label className="block text-[10px] font-bold text-luxury-muted uppercase mb-1">Max Difference</label>
            <select
              value={tolerance}
              onChange={(e) => setTolerance(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs font-semibold text-white focus:border-luxury-gold focus:outline-none"
            >
              <option value="0.000">Exact Match (0.000g)</option>
              <option value="0.050">± 50 mg (0.050g)</option>
              <option value="0.100">± 100 mg (0.100g)</option>
              <option value="0.250">± 250 mg (0.250g)</option>
              <option value="0.500">± 500 mg (0.500g)</option>
              <option value="1.000">± 1.000 g</option>
              <option value="all">All Nearby (No limit)</option>
            </select>
          </div>

          {/* Metal Filter */}
          <div>
            <label className="block text-[10px] font-bold text-luxury-muted uppercase mb-1">Metal</label>
            <select
              value={metalType}
              onChange={(e) => setMetalType(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-luxury-obsidian p-2 text-xs font-semibold text-white focus:border-luxury-gold focus:outline-none"
            >
              <option value="all">All Metals</option>
              <option value="gold">Gold Stock</option>
              <option value="silver">Silver Stock</option>
            </select>
          </div>

          {/* Search Button */}
          <div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-luxury-gold to-luxury-gold-dark py-2.5 text-xs font-bold text-black shadow-gold-glow hover:bg-luxury-gold-bright transition-all disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {loading ? "Searching..." : "Find Closest"}
            </button>
          </div>
        </div>

        {/* Secondary Filters row */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-luxury-muted">Quick Category Filter:</span>
          <button
            onClick={() => setCategoryId("")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              categoryId === "" ? "bg-luxury-gold text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setCategoryId(cat._id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                categoryId === cat._id ? "bg-luxury-gold text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* RESULTS LISTING */}
      <GlassCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-bold text-white">Closest Available Showroom Pieces</span>
            <span className="rounded-full bg-luxury-gold/20 px-2 py-0.5 text-[10px] font-mono font-bold text-luxury-gold-bright border border-luxury-gold/40">
              {results.length} found
            </span>
          </div>
          <span className="text-[11px] text-luxury-muted">Ordered by absolute weight closeness (|Δw| ascending)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-luxury-muted">
              <tr>
                <th className="px-4 py-3">Rank / Proximity</th>
                <th className="px-4 py-3">Barcode / SKU</th>
                <th className="px-4 py-3">Jewellery Name</th>
                <th className="px-4 py-3">Metal &amp; Purity</th>
                <th className="px-4 py-3 text-right">Net Weight</th>
                <th className="px-4 py-3 text-right">Gross Weight</th>
                <th className="px-4 py-3 text-right">Weight Difference</th>
                <th className="px-4 py-3 text-center">In Stock</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-luxury-muted">
                    Finding closest matching jewellery items...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-luxury-muted">
                    No available items within the specified weight tolerance. Try selecting &quot;All Nearby&quot; or
                    increasing tolerance.
                  </td>
                </tr>
              ) : (
                results.map((item, idx) => {
                  const isExact = Math.abs(item.diffGrams) < 0.001;

                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isExact ? "bg-luxury-gold/5" : ""
                      }`}
                    >
                      {/* Rank badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-mono text-[10px] font-bold ${
                            idx === 0
                              ? "bg-luxury-gold text-black shadow-gold-glow"
                              : "bg-white/10 text-white/80"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3 font-mono font-bold text-luxury-gold-bright">{item.sku}</td>

                      {/* Item Name & Category */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-white">{item.name}</p>
                        <p className="text-[10px] text-luxury-muted">
                          {item.categoryName} {item.size && `• Size ${item.size}`}
                        </p>
                      </td>

                      {/* Metal & Purity */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            item.metalType === "gold"
                              ? "bg-luxury-gold/15 text-luxury-gold-bright border border-luxury-gold/30"
                              : "bg-slate-300/15 text-slate-300 border border-slate-300/30"
                          }`}
                        >
                          {item.metalType} • {item.purity}
                        </span>
                      </td>

                      {/* Net Weight */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {item.netWeight.toFixed(3)} g
                      </td>

                      {/* Gross Weight */}
                      <td className="px-4 py-3 text-right font-mono text-luxury-muted">
                        {item.grossWeight.toFixed(3)} g
                      </td>

                      {/* Weight Difference Label */}
                      <td className="px-4 py-3 text-right font-mono">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isExact
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : Math.abs(item.diffMg) <= 50
                              ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {item.diffLabel}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3 text-center font-mono text-white/80">{item.quantity} pc</td>

                      {/* Select into Counter Billing Button */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/sales/billing`}
                          className="inline-flex items-center gap-1 rounded-lg bg-luxury-gold/20 px-2.5 py-1 text-[11px] font-bold text-luxury-gold-bright border border-luxury-gold/40 hover:bg-luxury-gold hover:text-black transition-all"
                        >
                          <ReceiptText className="h-3 w-3" /> Select for Bill
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
