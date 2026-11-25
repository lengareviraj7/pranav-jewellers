"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Check,
  Scale,
  X,
  Square,
  CheckSquare,
  Coins,
  Gem,
  SlidersHorizontal,
  Download,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { TiltCard, AnimatedNumber } from "@/components/Motion";

interface StocktakeSession {
  _id: string;
  sessionCode: string;
  month: number;
  year: number;
  metalType: string;
  status: "draft" | "counting" | "under_review" | "finalized" | "reopened";
  snapshotTimestamp: string;
  finalizedAt?: string;
  finalizedBy?: string;
  notes?: string;
  metrics: {
    totalExpectedItems: number;
    totalExpectedGrossWeight: number;
    totalExpectedNetWeight: number;
    totalCountedItems: number;
    totalMatchedItems: number;
    totalMissingItems: number;
    totalExcessItems: number;
    totalWeightMismatchItems: number;
    totalUncountedItems: number;
    netGrossWeightDiff: number;
    netNetWeightDiff: number;
  };
}

interface StocktakeLine {
  _id: string;
  itemId?: any;
  sku: string;
  metalType: "gold" | "silver";
  categoryName: string;
  itemName: string;
  purity: string;
  expectedQuantity: number;
  expectedGrossWeight: number;
  expectedNetWeight: number;
  physicalQuantity: number;
  physicalGrossWeight: number;
  physicalNetWeight: number;
  qtyDifference: number;
  grossWeightDifference: number;
  netWeightDifference: number;
  status: "uncounted" | "matched" | "missing" | "excess" | "weight_mismatch";
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
  diffGrams?: number;
  absDiffGrams?: number;
  diffMg?: number;
}

export default function MonthlyStockCheckingPage() {
  const [session, setSession] = useState<StocktakeSession | null>(null);
  const [lines, setLines] = useState<StocktakeLine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // View Mode: 'remaining' (Unchecked), 'checked' (Verified), or 'all'
  const [viewTab, setViewTab] = useState<"remaining" | "checked" | "all">("remaining");

  // Filters & Search (Exact match with Gold & Silver stock)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMetal, setSelectedMetal] = useState<"all" | "gold" | "silver">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPurity, setSelectedPurity] = useState<string>("all");
  const [selectedWeightBracket, setSelectedWeightBracket] = useState<string>("all");
  const [targetWeightSearch, setTargetWeightSearch] = useState<string>("");
  const [weightTolerance, setWeightTolerance] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");

  // Discrepancy Scale Modal
  const [scaleModalLine, setScaleModalLine] = useState<StocktakeLine | null>(null);
  const [scaleGrossWeight, setScaleGrossWeight] = useState<string>("");
  const [scaleNetWeight, setScaleNetWeight] = useState<string>("");
  const [scaleNotes, setScaleNotes] = useState<string>("");
  const [savingScaleCount, setSavingScaleCount] = useState<boolean>(false);

  // Finalize Modal
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);
  const [finalizing, setFinalizing] = useState<boolean>(false);

  // Fetch or Auto-Initialize Stocktake Session
  const fetchStocktakeData = useCallback(async (sync = false) => {
    try {
      if (!sync) setLoading(true);
      else setSyncing(true);

      const sessRes = await fetch("/api/inventory/stocktake?autoInit=true");
      const sessJson = await sessRes.json();

      if (sessJson.success && sessJson.sessions?.length > 0) {
        const activeSess =
          sessJson.sessions.find((s: StocktakeSession) => ["draft", "counting"].includes(s.status)) ||
          sessJson.sessions[0];
        setSession(activeSess);

        const linesUrl = `/api/inventory/stocktake/${activeSess._id}${sync ? "?sync=true" : ""}`;
        const linesRes = await fetch(linesUrl);
        const linesJson = await linesRes.json();

        if (linesJson.success) {
          setLines(linesJson.lines || []);
          if (linesJson.session) setSession(linesJson.session);
        }
      }
    } catch (e: any) {
      console.error(e);
      setMessage({ type: "error", text: e.message || "Failed to load stocktake checklist" });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchStocktakeData();
  }, [fetchStocktakeData]);

  // Handle 1-Click Tick / Check Action
  const handleToggleCheck = async (line: StocktakeLine) => {
    if (!session) return;
    const isCurrentlyChecked = line.status === "matched";
    const nextAction = isCurrentlyChecked ? "uncheck" : "check";

    try {
      setTogglingId(line._id);

      // Optimistic state update for instant UI response
      setLines((prev) =>
        prev.map((l) =>
          l._id === line._id
            ? {
                ...l,
                status: nextAction === "check" ? "matched" : "uncounted",
                physicalQuantity: nextAction === "check" ? l.expectedQuantity || 1 : 0,
                physicalGrossWeight: nextAction === "check" ? l.expectedGrossWeight : 0,
                physicalNetWeight: nextAction === "check" ? l.expectedNetWeight : 0,
                verifiedAt: nextAction === "check" ? new Date().toISOString() : undefined,
              }
            : l
        )
      );

      const res = await fetch(`/api/inventory/stocktake/${session._id}/count`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId: line._id,
          action: nextAction,
          checked: nextAction === "check",
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to update item check status");
      }

      if (json.sessionMetrics && session) {
        setSession({ ...session, metrics: json.sessionMetrics });
      }
    } catch (err: any) {
      // Revert optimistic update
      setMessage({ type: "error", text: err.message || "Failed to update status" });
      fetchStocktakeData();
    } finally {
      setTogglingId(null);
    }
  };

  // Handle Custom Scale Verification (Weight discrepancy entry)
  const handleSaveScaleCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !scaleModalLine) return;

    try {
      setSavingScaleCount(true);
      const res = await fetch(`/api/inventory/stocktake/${session._id}/count`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId: scaleModalLine._id,
          physicalQuantity: scaleModalLine.expectedQuantity || 1,
          physicalGrossWeight: parseFloat(scaleGrossWeight),
          physicalNetWeight: parseFloat(scaleNetWeight),
          notes: scaleNotes.trim(),
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to record scale verification");

      setScaleModalLine(null);
      setMessage({ type: "success", text: `Verified weight for ${scaleModalLine.itemName}` });
      fetchStocktakeData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error saving weight count" });
    } finally {
      setSavingScaleCount(false);
    }
  };

  // Reset All Checks
  const handleResetAllChecks = async () => {
    if (!session) return;
    if (!confirm("Are you sure you want to reset all checked items back to Remaining?")) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/stocktake/${session._id}/count`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_all" }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "All checklist items reset to Remaining." });
        fetchStocktakeData();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to reset checks" });
    } finally {
      setLoading(false);
    }
  };

  // Finalize Session
  const handleFinalize = async () => {
    if (!session) return;
    try {
      setFinalizing(true);
      const res = await fetch(`/api/inventory/stocktake/${session._id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyAdjustments: false }),
      });
      const json = await res.json();
      if (json.success) {
        setShowFinalizeModal(false);
        setMessage({ type: "success", text: "Stocktake audit finalized and locked." });
        fetchStocktakeData();
      } else {
        throw new Error(json.error || "Failed to finalize session");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setFinalizing(false);
    }
  };

  // Compute Categories from Lines
  const categoriesList = useMemo(() => {
    const map = new Map<string, { name: string; count: number; netWeight: number }>();
    lines.forEach((l) => {
      const name = l.categoryName || "General";
      const existing = map.get(name) || { name, count: 0, netWeight: 0 };
      existing.count += l.expectedQuantity || 1;
      existing.netWeight += l.expectedNetWeight || 0;
      map.set(name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [lines]);

  // Purities List
  const puritiesList = useMemo(() => {
    return Array.from(new Set(lines.map((l) => l.purity).filter(Boolean))).sort();
  }, [lines]);

  // Overall Aggregates
  const totalPieces = lines.reduce((acc, l) => acc + (l.expectedQuantity || 1), 0);
  const totalGrossWeight = lines.reduce((acc, l) => acc + (l.expectedGrossWeight || 0), 0);
  const totalNetWeight = lines.reduce((acc, l) => acc + (l.expectedNetWeight || 0), 0);

  const checkedLines = useMemo(() => lines.filter((l) => l.status === "matched"), [lines]);
  const remainingLines = useMemo(() => lines.filter((l) => l.status === "uncounted"), [lines]);

  const checkedPieces = checkedLines.reduce((acc, l) => acc + (l.expectedQuantity || 1), 0);
  const remainingPieces = remainingLines.reduce((acc, l) => acc + (l.expectedQuantity || 1), 0);
  const checkedNetWeight = checkedLines.reduce((acc, l) => acc + (l.expectedNetWeight || 0), 0);
  const percentComplete = totalPieces > 0 ? Math.round((checkedPieces / totalPieces) * 100) : 0;

  // Weight Search Proximity Calculation
  const targetWeightNum = parseFloat(targetWeightSearch);
  const isWeightSearchActive = !isNaN(targetWeightNum) && targetWeightNum > 0;

  // Filtered & Displayed Lines
  const displayedLines = useMemo(() => {
    let list = [...lines];

    // 1. View Tab Filter (Remaining vs Checked vs All)
    if (viewTab === "remaining") {
      list = list.filter((l) => l.status === "uncounted");
    } else if (viewTab === "checked") {
      list = list.filter((l) => l.status === "matched");
    }

    // 2. Metal Filter
    if (selectedMetal !== "all") {
      list = list.filter((l) => l.metalType === selectedMetal);
    }

    // 3. Category Filter
    if (selectedCategory !== "all") {
      list = list.filter((l) => l.categoryName === selectedCategory);
    }

    // 4. Purity Filter
    if (selectedPurity !== "all") {
      list = list.filter((l) => l.purity === selectedPurity);
    }

    // 5. Weight Bracket Filter
    if (selectedWeightBracket !== "all") {
      if (selectedWeightBracket === "under_2") {
        list = list.filter((l) => l.expectedNetWeight < 2);
      } else if (selectedWeightBracket === "2_to_5") {
        list = list.filter((l) => l.expectedNetWeight >= 2 && l.expectedNetWeight <= 5);
      } else if (selectedWeightBracket === "5_to_10") {
        list = list.filter((l) => l.expectedNetWeight > 5 && l.expectedNetWeight <= 10);
      } else if (selectedWeightBracket === "10_to_20") {
        list = list.filter((l) => l.expectedNetWeight > 10 && l.expectedNetWeight <= 20);
      } else if (selectedWeightBracket === "over_20") {
        list = list.filter((l) => l.expectedNetWeight > 20);
      }
    }

    // 6. Text Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((l) => {
        const itemObj = typeof l.itemId === "object" ? l.itemId : null;
        const huid = itemObj?.hallmarkUid || "";
        const supplier = itemObj?.supplierName || "";
        return (
          l.itemName.toLowerCase().includes(q) ||
          l.sku.toLowerCase().includes(q) ||
          l.categoryName.toLowerCase().includes(q) ||
          l.purity.toLowerCase().includes(q) ||
          huid.toLowerCase().includes(q) ||
          supplier.toLowerCase().includes(q)
        );
      });
    }

    // 7. Direct Weight Proximity Search
    if (isWeightSearchActive) {
      const tol = weightTolerance !== "all" ? parseFloat(weightTolerance) : null;
      list = list
        .map((l) => {
          const diff = Number(((l.expectedNetWeight || 0) - targetWeightNum).toFixed(3));
          const absDiff = Math.abs(diff);
          const diffMg = Math.round(diff * 1000);
          return {
            ...l,
            diffGrams: diff,
            absDiffGrams: absDiff,
            diffMg,
          };
        })
        .filter((l) => {
          if (tol !== null && !isNaN(tol)) {
            return (l.absDiffGrams || 0) <= tol + 0.0001;
          }
          return true;
        })
        .sort((a, b) => (a.absDiffGrams || 0) - (b.absDiffGrams || 0));
    } else {
      // Sorting
      if (sortBy === "weight_desc") {
        list.sort((a, b) => b.expectedNetWeight - a.expectedNetWeight);
      } else if (sortBy === "weight_asc") {
        list.sort((a, b) => a.expectedNetWeight - b.expectedNetWeight);
      } else if (sortBy === "name") {
        list.sort((a, b) => a.itemName.localeCompare(b.itemName));
      }
    }

    return list;
  }, [
    lines,
    viewTab,
    selectedMetal,
    selectedCategory,
    selectedPurity,
    selectedWeightBracket,
    searchQuery,
    isWeightSearchActive,
    targetWeightNum,
    weightTolerance,
    sortBy,
  ]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-block rounded-md bg-luxury-gold/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-luxury-gold-bright border border-luxury-gold/30">
            Physical Inventory Audit · Real-time Reconciliation
          </span>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Showroom Stock Checklist
          </h1>
          <p className="mt-1 text-xs text-luxury-muted">
            Tick items in front to verify physical showroom presence. Checked pieces move automatically to the Checked
            list.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/export/stocktake"
            download
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all border border-emerald-400/30"
            title="Download complete physical showroom inventory checklist in Excel"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Checklist (Excel)</span>
          </a>

          <button
            onClick={() => fetchStocktakeData(true)}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-luxury-graphite/80 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-white/[0.08] hover:border-luxury-gold/40 transition-all disabled:opacity-50"
            title="Scan showroom inventory and import newly added gold/silver pieces"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-luxury-gold ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Syncing Stock..." : "Sync Showroom Stock"}</span>
          </button>

          <button
            onClick={handleResetAllChecks}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all"
            title="Reset all verified ticks back to remaining"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset Checks</span>
          </button>

          {session?.status === "counting" && (
            <button
              onClick={() => setShowFinalizeModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-gold-glow hover:brightness-110 active:scale-95 transition-all"
            >
              <FileCheck className="h-4 w-4" />
              <span>Finalize Month Audit</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl p-3 text-xs border backdrop-blur-md animate-slideDown ${
            message.type === "success"
              ? "bg-luxury-gold-subtle/50 text-luxury-gold-bright border-luxury-gold/40"
              : "bg-red-950/40 text-red-300 border-red-500/40"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <Check className="h-4 w-4 shrink-0 text-luxury-gold" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Summary KPI Cards (Same 3D TiltCards as Gold & Silver stock) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Pieces */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
            Total Pieces Under Audit
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-white">
            <AnimatedNumber value={totalPieces} />
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-luxury-muted">
            <span>Gold + Silver showroom items</span>
            <span className="font-mono">{session?.sessionCode || "Audit Active"}</span>
          </div>
        </TiltCard>

        {/* Remaining to Check */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-amber-500/40 bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              Remaining to Check
            </span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
              Pending
            </span>
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-amber-400">
            <AnimatedNumber value={remainingPieces} />
          </p>
          <span className="text-[11px] text-amber-300/80 mt-1 block">
            {remainingPieces === 0 ? "🎉 All stock verified!" : "Awaiting physical counter verification"}
          </span>
        </TiltCard>

        {/* Checked & Verified */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-emerald-500/40 bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              Verified &amp; Checked
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              {percentComplete}%
            </span>
          </div>
          <p className="mt-2 font-serif text-2xl font-bold text-emerald-400">
            <AnimatedNumber value={checkedPieces} />{" "}
            <span className="text-xs font-sans font-normal text-luxury-muted">/ {totalPieces} pcs</span>
          </p>
          {/* Visual Progress Bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </TiltCard>

        {/* Verified Net Weight */}
        <TiltCard
          maxTilt={8}
          glare={true}
          className="rounded-2xl border border-luxury-gold/40 bg-luxury-graphite/85 backdrop-blur-xl p-5 shadow-luxury"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-luxury-gold-champagne">
            Verified Net Weight
          </span>
          <p className="mt-2 font-serif text-2xl font-bold text-luxury-gold-bright">
            <AnimatedNumber value={checkedNetWeight} decimals={3} />{" "}
            <span className="text-xs font-sans font-normal text-luxury-muted">
              / {totalNetWeight.toFixed(3)}g
            </span>
          </p>
          <span className="text-[11px] text-luxury-muted mt-1 block">Confirmed physical metal weight</span>
        </TiltCard>
      </div>

      {/* ── Category Breakdown Pills ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl p-5 shadow-luxury">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Category-wise Stock Breakdown
          </span>
          <span className="text-[11px] text-luxury-muted">Click any category to filter checklist</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
              selectedCategory === "all"
                ? "bg-luxury-gold text-black shadow-gold-glow font-bold border border-luxury-gold-bright"
                : "border border-white/[0.08] bg-white/[0.03] text-luxury-muted hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            All Categories ({lines.length})
          </button>

          {categoriesList.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                selectedCategory === cat.name
                  ? "border-luxury-gold bg-luxury-gold/15 text-luxury-gold-bright shadow-xs"
                  : "border-white/[0.08] bg-white/[0.03] text-luxury-muted hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <span>{cat.name}</span>
              <span className="ml-2 text-[10px] opacity-80">
                {cat.netWeight.toFixed(2)}g ({cat.count} pcs)
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl p-4 shadow-luxury lg:flex-row lg:items-center lg:justify-between">
        {/* Text Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-luxury-muted" />
          <input
            type="text"
            placeholder="Search by Item name, SKU, Category, HUID, or Supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.1] bg-luxury-obsidian/60 py-2 pl-9 pr-4 text-xs text-white placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metal Selector (Gold, Silver, or All) */}
          <div className="flex items-center rounded-xl border border-white/[0.1] bg-luxury-obsidian/70 p-1">
            <button
              onClick={() => setSelectedMetal("all")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                selectedMetal === "all"
                  ? "bg-luxury-gold text-black font-bold shadow-xs"
                  : "text-luxury-muted hover:text-white"
              }`}
            >
              All Metal
            </button>
            <button
              onClick={() => setSelectedMetal("gold")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                selectedMetal === "gold"
                  ? "bg-amber-400 text-black font-bold shadow-xs"
                  : "text-amber-300 hover:text-white"
              }`}
            >
              <Coins className="h-3 w-3" /> Gold
            </button>
            <button
              onClick={() => setSelectedMetal("silver")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                selectedMetal === "silver"
                  ? "bg-cyan-400 text-black font-bold shadow-xs"
                  : "text-cyan-300 hover:text-white"
              }`}
            >
              <Gem className="h-3 w-3" /> Silver
            </button>
          </div>

          {/* Direct Search by Weight (Integrated) */}
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
            <option value="under_2" className="bg-luxury-obsidian text-white">&lt; 2g (Light / Rings)</option>
            <option value="2_to_5" className="bg-luxury-obsidian text-white">2g – 5g (Standard Rings)</option>
            <option value="5_to_10" className="bg-luxury-obsidian text-white">5g – 10g (Heavy Rings / Chains)</option>
            <option value="10_to_20" className="bg-luxury-obsidian text-white">10g – 20g (Chains / Bangles)</option>
            <option value="over_20" className="bg-luxury-obsidian text-white">&gt; 20g (Heavy Sets / Kadas)</option>
          </select>

          {/* Purity Filter */}
          <select
            value={selectedPurity}
            onChange={(e) => setSelectedPurity(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-luxury-obsidian/70 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none"
          >
            <option value="all" className="bg-luxury-obsidian text-white">All Purities</option>
            {puritiesList.map((p) => (
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
            <option value="latest" className="bg-luxury-obsidian text-white">Sort: Default Order</option>
            <option value="weight_desc" className="bg-luxury-obsidian text-white">Sort: Highest Net Weight</option>
            <option value="weight_asc" className="bg-luxury-obsidian text-white">Sort: Lowest Net Weight</option>
            <option value="name" className="bg-luxury-obsidian text-white">Sort: Alphabetical Name</option>
          </select>
        </div>
      </div>

      {/* ── Active Weight Search Proximity Banner ── */}
      {isWeightSearchActive && (
        <div className="flex items-center justify-between rounded-xl bg-luxury-gold/15 border border-luxury-gold/40 px-4 py-2.5 text-xs animate-slideDown">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-luxury-gold shrink-0" />
            <span className="text-white font-medium">
              Showing checklist pieces sorted nearest to{" "}
              <strong className="text-luxury-gold-bright font-mono">{targetWeightNum.toFixed(3)}g</strong>
              {weightTolerance !== "all" && (
                <span className="text-luxury-gold-champagne ml-1">(Tolerance: ±{weightTolerance}g)</span>
              )}
            </span>
            <span className="rounded-full bg-luxury-gold/25 px-2.5 py-0.5 text-[10px] font-bold text-luxury-gold-bright border border-luxury-gold/40">
              {displayedLines.length} match{displayedLines.length === 1 ? "" : "es"}
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

      {/* ── View Mode Tabs: Remaining to Check vs Checked vs All ── */}
      <div className="flex items-center gap-2 border-b border-white/[0.1] pb-3">
        <button
          onClick={() => setViewTab("remaining")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            viewTab === "remaining"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
              : "bg-white/[0.04] text-amber-300 hover:bg-white/[0.08]"
          }`}
        >
          <Square className="h-4 w-4" />
          <span>Remaining to Check</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
              viewTab === "remaining" ? "bg-black/25 text-black" : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {remainingPieces}
          </span>
        </button>

        <button
          onClick={() => setViewTab("checked")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            viewTab === "checked"
              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
              : "bg-white/[0.04] text-emerald-300 hover:bg-white/[0.08]"
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          <span>Checked / Verified</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
              viewTab === "checked" ? "bg-black/25 text-black" : "bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {checkedPieces}
          </span>
        </button>

        <button
          onClick={() => setViewTab("all")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            viewTab === "all"
              ? "bg-luxury-gold text-black shadow-gold-glow"
              : "bg-white/[0.04] text-luxury-muted hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>All Stock Items</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
              viewTab === "all" ? "bg-black/25 text-black" : "bg-white/[0.08] text-luxury-muted"
            }`}
          >
            {totalPieces}
          </span>
        </button>
      </div>

      {/* ── Main Stock Checklist Table ── */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-luxury-graphite/80 backdrop-blur-xl shadow-luxury">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] text-luxury-gold-champagne uppercase font-semibold">
              <tr>
                <th className="px-4 py-3.5 text-center w-14">Check</th>
                <th className="px-4 py-3.5 text-left">SKU / Item</th>
                <th className="px-4 py-3.5 text-left">Category</th>
                <th className="px-4 py-3.5 text-center">Size / Dim</th>
                <th className="px-4 py-3.5 text-center">Purity</th>
                <th className="px-4 py-3.5 text-right">Qty</th>
                <th className="px-4 py-3.5 text-right">Gross Wt</th>
                <th className="px-4 py-3.5 text-right">Stones</th>
                <th className="px-4 py-3.5 text-right">Net Wt</th>
                <th className="px-4 py-3.5 text-center">HUID / Ref</th>
                <th className="px-4 py-3.5 text-center">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-luxury-muted">
                    <div className="inline-block h-6 w-6 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-2" />
                    <p>Loading stock checklist...</p>
                  </td>
                </tr>
              ) : displayedLines.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-luxury-muted">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] mb-3">
                      {viewTab === "remaining" ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <Search className="h-6 w-6 text-luxury-muted" />
                      )}
                    </div>
                    <p className="font-serif text-sm font-semibold text-white">
                      {viewTab === "remaining"
                        ? "🎉 No remaining pieces to check! All stock has been verified."
                        : viewTab === "checked"
                        ? "No checked pieces yet. Tick items from 'Remaining to Check' to verify them."
                        : "No inventory pieces match your filter."}
                    </p>
                    <p className="text-[11px] mt-1 text-luxury-muted">
                      {viewTab === "remaining"
                        ? "Click 'Checked / Verified' tab above to review verified items, or 'Sync Showroom Stock' to check for newly added pieces."
                        : "Try clearing search filters or changing the active view tab."}
                    </p>
                  </td>
                </tr>
              ) : (
                displayedLines.map((line) => {
                  const isChecked = line.status === "matched";
                  const isToggling = togglingId === line._id;
                  const itemObj = typeof line.itemId === "object" ? line.itemId : null;
                  const size = itemObj?.size || "";
                  const stoneWeight = itemObj?.stoneWeight || 0;
                  const hallmarkUid = itemObj?.hallmarkUid || "";

                  return (
                    <tr
                      key={line._id}
                      className={`transition-colors ${
                        isChecked ? "bg-emerald-950/15 hover:bg-emerald-950/25" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      {/* 1. Small Tick Option in front of item */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCheck(line)}
                          disabled={isToggling}
                          title={isChecked ? "Click to untick & return to Remaining" : "Click to tick & mark checked"}
                          className={`group relative flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                            isChecked
                              ? "border-emerald-500 bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                              : "border-white/20 bg-black/40 text-transparent hover:border-emerald-400 hover:text-emerald-400/60"
                          } ${isToggling ? "opacity-50" : "active:scale-90"}`}
                        >
                          <Check className={`h-4 w-4 stroke-[3] ${isChecked ? "text-black" : ""}`} />
                        </button>
                      </td>

                      {/* 2. SKU / Item */}
                      <td className="px-4 py-3 font-medium text-left">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                              line.metalType === "gold"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            }`}
                          >
                            {line.metalType}
                          </span>
                          <p className="text-white font-semibold truncate max-w-[200px]">{line.itemName}</p>
                        </div>
                        <p className="text-[10px] font-mono text-luxury-gold-champagne tracking-tight mt-0.5">
                          {line.sku}
                        </p>
                      </td>

                      {/* 3. Category */}
                      <td className="px-4 py-3 text-left text-white/90">
                        <span className="rounded-md bg-white/[0.05] px-2 py-0.5 border border-white/[0.08] text-[11px] text-luxury-gold-champagne">
                          {line.categoryName}
                        </span>
                      </td>

                      {/* 4. Size / Dim */}
                      <td className="px-4 py-3 text-center">
                        {size ? (
                          <span className="inline-block rounded bg-luxury-gold/15 px-2 py-0.5 font-medium text-[11px] text-luxury-gold-bright border border-luxury-gold/30">
                            {size}
                          </span>
                        ) : (
                          <span className="text-luxury-muted text-[11px]">—</span>
                        )}
                      </td>

                      {/* 5. Purity */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded bg-luxury-gold/15 px-2 py-0.5 font-semibold text-[11px] text-luxury-gold-bright border border-luxury-gold/30">
                          {line.purity}
                        </span>
                      </td>

                      {/* 6. Quantity */}
                      <td className="px-4 py-3 text-right font-medium text-white/90 font-mono tabular-nums">
                        {line.expectedQuantity}
                      </td>

                      {/* 7. Gross Weight */}
                      <td className="px-4 py-3 text-right text-white/90 font-mono tabular-nums">
                        {line.expectedGrossWeight.toFixed(3)}g
                      </td>

                      {/* 8. Stone Weight */}
                      <td className="px-4 py-3 text-right text-luxury-muted font-mono tabular-nums">
                        {stoneWeight.toFixed(3)}g
                      </td>

                      {/* 9. Net Weight + Proximity badge */}
                      <td className="px-4 py-3 text-right font-bold text-luxury-gold-bright font-mono tabular-nums">
                        <div>{line.expectedNetWeight.toFixed(3)}g</div>
                        {isWeightSearchActive && line.diffMg !== undefined && (
                          <span
                            className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-mono font-bold mt-0.5 ${
                              line.diffMg === 0
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : line.diffMg > 0
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            }`}
                          >
                            {line.diffMg === 0
                              ? "🎯 Exact"
                              : line.diffMg > 0
                              ? `+${line.diffMg}mg`
                              : `${line.diffMg}mg`}
                          </span>
                        )}
                      </td>

                      {/* 10. HUID / Ref */}
                      <td className="px-4 py-3 text-center">
                        {hallmarkUid ? (
                          <span className="inline-block rounded bg-luxury-gold/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-luxury-gold-bright border border-luxury-gold/30">
                            {hallmarkUid}
                          </span>
                        ) : (
                          <span className="text-luxury-muted text-[10px]">—</span>
                        )}
                      </td>

                      {/* 11. Status / Quick Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isChecked ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              <Check className="h-3 w-3 stroke-[3]" /> Checked
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleCheck(line)}
                              disabled={isToggling}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500 hover:text-black transition-all"
                            >
                              <Square className="h-3 w-3" />
                              <span>Tick to Verify</span>
                            </button>
                          )}

                          {/* Discrepancy Scale Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setScaleModalLine(line);
                              setScaleGrossWeight(String(line.expectedGrossWeight));
                              setScaleNetWeight(String(line.expectedNetWeight));
                              setScaleNotes(line.notes || "");
                            }}
                            title="Scale verification / enter physical weight difference"
                            className="rounded-lg p-1 text-luxury-muted hover:bg-white/[0.08] hover:text-luxury-gold transition-colors"
                          >
                            <Scale className="h-3.5 w-3.5" />
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

      {/* ── Discrepancy / Weight Calibration Modal ── */}
      {scaleModalLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-luxury-gold/40 bg-luxury-graphite p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-luxury-gold" />
                <h3 className="font-serif text-base font-bold text-white">Scale Weight Verification</h3>
              </div>
              <button onClick={() => setScaleModalLine(null)} className="text-luxury-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScaleCount} className="mt-4 space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-luxury-obsidian p-3 text-xs space-y-1">
                <p className="font-semibold text-white">{scaleModalLine.itemName}</p>
                <p className="font-mono text-luxury-gold-champagne text-[11px]">{scaleModalLine.sku}</p>
                <div className="flex justify-between pt-1 text-luxury-muted text-[11px]">
                  <span>System Expected:</span>
                  <span className="font-mono font-bold text-white">
                    Gross: {scaleModalLine.expectedGrossWeight.toFixed(3)}g | Net:{" "}
                    {scaleModalLine.expectedNetWeight.toFixed(3)}g
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-luxury-muted uppercase mb-1">
                    Scale Gross Weight (g) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={scaleGrossWeight}
                    onChange={(e) => setScaleGrossWeight(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs font-mono font-bold text-white focus:border-luxury-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-luxury-muted uppercase mb-1">
                    Scale Net Weight (g) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={scaleNetWeight}
                    onChange={(e) => setScaleNetWeight(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs font-mono font-bold text-luxury-gold-bright focus:border-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-luxury-muted uppercase mb-1">Audit Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Verified on digital counter scale"
                  value={scaleNotes}
                  onChange={(e) => setScaleNotes(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-white focus:border-luxury-gold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setScaleModalLine(null)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingScaleCount}
                  className="rounded-xl bg-gradient-to-r from-luxury-gold via-luxury-gold-bright to-luxury-gold-dark px-5 py-2 text-xs font-bold text-black shadow-gold-glow hover:brightness-110 disabled:opacity-50"
                >
                  {savingScaleCount ? "Recording..." : "Save Scale Count"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Finalize Monthly Stock Modal ── */}
      {showFinalizeModal && session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-luxury-graphite p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-white">Finalize Monthly Stock Audit</h3>
            <p className="mt-1 text-xs text-luxury-muted">
              Lock the physical verification records for this month.
            </p>

            <div className="my-4 rounded-xl border border-white/[0.08] bg-luxury-obsidian p-4 text-xs space-y-2">
              <div className="flex justify-between text-white/80">
                <span>Audit Session:</span>
                <span className="font-mono font-bold text-luxury-gold-bright">{session.sessionCode}</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>Verified Pieces:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {checkedPieces} / {totalPieces} ({percentComplete}%)
                </span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>Unchecked Remaining Pieces:</span>
                <span className="font-mono font-bold text-amber-400">{remainingPieces} pieces</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {finalizing ? "Finalizing..." : "Confirm & Lock Audit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
