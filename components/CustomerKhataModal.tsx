"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  FileText,
  MessageSquare,
  X,
  CreditCard,
  Plus,
  Minus,
  CheckCircle2,
  Calendar,
  Clock,
  Printer,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export interface KhataCustomer {
  name: string;
  phone: string;
  address?: string;
  saleId?: string;
}

interface LedgerEntry {
  id: string;
  type: "gave" | "got";
  amountPaise: number;
  amountRupees: number;
  date: string;
  description: string;
  saleNumber: string;
  saleId: string;
  paymentMode?: string;
  runningBalancePaise: number;
  runningBalanceRupees: number;
}

interface CustomerKhataModalProps {
  customer: KhataCustomer | null;
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export default function CustomerKhataModal({
  customer,
  isOpen,
  onClose,
  onDataChanged,
}: CustomerKhataModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [totalGave, setTotalGave] = useState(0);
  const [totalGot, setTotalGot] = useState(0);
  const [balanceDue, setBalanceDue] = useState(0);

  // Sub-modal states for "YOU GAVE" and "YOU GOT"
  const [isGaveOpen, setIsGaveOpen] = useState(false);
  const [isGotOpen, setIsGotOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Form states: YOU GAVE
  const isGaveSubmittingRef = useRef(false);
  const [gaveSubmitting, setGaveSubmitting] = useState(false);
  const [gaveAmount, setGaveAmount] = useState("");
  const [gaveItem, setGaveItem] = useState("");
  const [gaveDate, setGaveDate] = useState("");
  const [gaveDueDate, setGaveDueDate] = useState("");
  const [gaveNotes, setGaveNotes] = useState("");

  // Form states: YOU GOT
  const isGotSubmittingRef = useRef(false);
  const [gotSubmitting, setGotSubmitting] = useState(false);
  const [gotAmount, setGotAmount] = useState("");
  const [gotMode, setGotMode] = useState<"cash" | "online">("cash");
  const [gotDate, setGotDate] = useState("");
  const [gotDueDate, setGotDueDate] = useState("");
  const [gotNotes, setGotNotes] = useState("");

  // Toast feedback
  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Fetch Customer Ledger
  const fetchLedger = useCallback(async () => {
    if (!customer || !customer.phone) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/udhari/entry?phone=${encodeURIComponent(customer.phone)}&name=${encodeURIComponent(
          customer.name
        )}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load customer khata");
      }

      setLedgerEntries(data.entries || []);
      setTotalGave(data.totalGaveRupees || 0);
      setTotalGot(data.totalGotRupees || 0);
      setBalanceDue(data.balanceDueRupees || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load customer khata");
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    if (isOpen && customer) {
      fetchLedger();
    }
  }, [isOpen, customer, fetchLedger]);

  if (!isOpen || !customer) return null;

  // Initials for avatar
  const initials = customer.name
    ? customer.name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CU";

  const cleanPhone = customer.phone.replace(/\D/g, "");

  // WhatsApp Reminder Link
  const waReminderLink = `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${encodeURIComponent(
    `Namaste ${customer.name} ji! 🙏\n\nGreetings from Siddheshwar Jewellers & Finance.\nYour current pending balance in our Khata is *₹${balanceDue.toLocaleString(
      "en-IN"
    )}*.\n\nKindly clear your pending balance at your earliest convenience.\n\n📍 Siddheshwar Jewellers, Visapur\n📞 +91 918329465301`
  )}`;

  // SMS Link / Copy
  const handleSms = () => {
    const text = `Namaste ${customer.name} ji! Your pending balance at Siddheshwar Jewellers is Rs. ${balanceDue.toLocaleString(
      "en-IN"
    )}. Thank you!`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast("SMS reminder text copied to clipboard!");
    }
    window.open(`sms:${cleanPhone}?body=${encodeURIComponent(text)}`, "_blank");
  };

  // Submit YOU GAVE (आम्ही दिले)
  const handleGaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGaveSubmittingRef.current || gaveSubmitting) return;
    const num = parseFloat(gaveAmount);
    if (isNaN(num) || num <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      isGaveSubmittingRef.current = true;
      setGaveSubmitting(true);
      setError(null);

      const res = await fetch("/api/udhari/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "give",
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: customer.address || "Visapur",
          amountRupees: gaveAmount,
          description: gaveItem || "Jewellery Credit (आम्ही दिले)",
          date: gaveDate ? new Date(gaveDate).toISOString() : new Date().toISOString(),
          dueDate: gaveDueDate || undefined,
          notes: gaveNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record Udhari entry");
      }

      showToast(`Recorded ₹${num.toLocaleString("en-IN")} given (YOU GAVE) ✅`);
      setIsGaveOpen(false);
      setGaveAmount("");
      setGaveItem("");
      setGaveDate("");
      setGaveDueDate("");
      setGaveNotes("");

      await fetchLedger();
      if (onDataChanged) onDataChanged();
      window.dispatchEvent(new CustomEvent("sj-refresh-data"));
    } catch (err: any) {
      alert(err.message || "Failed to save entry");
    } finally {
      isGaveSubmittingRef.current = false;
      setGaveSubmitting(false);
    }
  };

  // Submit YOU GOT (आम्हाला मिळाले)
  const handleGotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGotSubmittingRef.current || gotSubmitting) return;
    const num = parseFloat(gotAmount);
    if (isNaN(num) || num <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      isGotSubmittingRef.current = true;
      setGotSubmitting(true);
      setError(null);

      const res = await fetch("/api/udhari/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "got",
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: customer.address || "Visapur",
          amountRupees: gotAmount,
          paymentMode: gotMode,
          date: gotDate ? new Date(gotDate).toISOString() : new Date().toISOString(),
          dueDate: gotDueDate || undefined,
          notes: gotNotes || undefined,
          saleId: customer.saleId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record payment");
      }

      showToast(`Recorded ₹${num.toLocaleString("en-IN")} received (YOU GOT) ✅`);
      setIsGotOpen(false);
      setGotAmount("");
      setGotMode("cash");
      setGotDate("");
      setGotDueDate("");
      setGotNotes("");

      await fetchLedger();
      if (onDataChanged) onDataChanged();
      window.dispatchEvent(new CustomEvent("sj-refresh-data"));
    } catch (err: any) {
      alert(err.message || "Failed to record payment");
    } finally {
      isGotSubmittingRef.current = false;
      setGotSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md overflow-hidden modal-backdrop">
      {/* Main Full-Height Khatabook Container */}
      <div className="relative flex flex-col w-full h-full sm:h-[92dvh] sm:max-w-2xl sm:rounded-2xl border border-white/10 bg-[#0f0f12] text-white shadow-2xl overflow-hidden">
        {/* ── TOP HEADER ── */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#141419] px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.12] active:scale-95 transition"
              title="Back to Khata list"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {/* Profile Avatar Circle */}
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm sm:text-base shadow-md">
              {initials}
            </div>

            {/* Customer Details */}
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate flex items-center gap-1.5">
                <span>{customer.name}</span>
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono truncate">
                📞 {customer.phone} • {customer.address || "Visapur"}
              </p>
            </div>
          </div>

          {/* Right Header Icons */}
          <div className="flex items-center gap-1.5">
            {/* Phone Call Button */}
            <a
              href={`tel:${cleanPhone}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.12] hover:text-emerald-400 transition"
              title="Call customer"
            >
              <Phone className="h-4 w-4" />
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.12] transition"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── TOAST NOTIFICATION ── */}
        {successMsg && (
          <div className="bg-emerald-600/90 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── QUICK ACTION BAR (Report, Reminders, SMS) ── */}
        <div className="grid grid-cols-3 border-b border-white/[0.08] bg-[#17171e] text-center text-xs">
          {/* 1. Report (PDF) */}
          <button
            onClick={() => setIsReportOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 hover:bg-white/[0.04] transition border-r border-white/[0.06]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.08] text-white">
              <FileText className="h-4 w-4 text-red-400" />
            </div>
            <span className="text-[11px] font-semibold text-neutral-200">Report</span>
          </button>

          {/* 2. Reminders (WhatsApp) */}
          <a
            href={waReminderLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 hover:bg-white/[0.04] transition border-r border-white/[0.06]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#25D366]/20 text-[#25D366]">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-[#25D366]">Reminders</span>
          </a>

          {/* 3. SMS */}
          <button
            onClick={handleSms}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 hover:bg-white/[0.04] transition"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.08] text-cyan-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-neutral-200">SMS</span>
          </button>
        </div>

        {/* ── CURRENT BALANCE STRIP ── */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/[0.06] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Current Balance</span>
            <span
              className={`font-mono text-base font-bold ${
                balanceDue > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {balanceDue > 0 ? `₹${balanceDue.toLocaleString("en-IN")} Due` : "₹0 (Cleared ✅)"}
            </span>
          </div>
          <div className="text-right text-[11px] text-neutral-400">
            <span>Total Given: </span>
            <span className="font-mono text-rose-300 font-bold">₹{totalGave.toLocaleString("en-IN")}</span>
            <span className="mx-1.5">•</span>
            <span>Total Got: </span>
            <span className="font-mono text-emerald-300 font-bold">₹{totalGot.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* ── LEDGER TABLE HEADERS ── */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-white/[0.08] bg-[#141419] text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          <div className="col-span-5 text-left">Entries</div>
          <div className="col-span-3 text-right text-rose-400">You Gave</div>
          <div className="col-span-4 text-right text-emerald-400">You Got</div>
        </div>

        {/* ── LEDGER SCROLLABLE ENTRIES LIST ── */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06] bg-[#0c0c0e]">
          {loading ? (
            <div className="py-16 text-center text-neutral-500">
              <div className="inline-block h-6 w-6 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-2" />
              <p className="text-xs">Loading ledger entries...</p>
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 space-y-2">
              <p className="font-serif text-sm font-semibold text-white">No transactions recorded yet</p>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                Use the buttons below to record Udhari given (You Gave) or payments received (You Got).
              </p>
            </div>
          ) : (
            ledgerEntries.map((entry) => {
              const d = new Date(entry.date);
              const dateFormatted = d.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "2-digit",
              });
              const timeFormatted = d.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Left Column: Date, Time, Description & Running Balance */}
                  <div className="col-span-5 min-w-0 pr-1">
                    <p className="text-xs font-semibold text-neutral-200 truncate">
                      {dateFormatted} • {timeFormatted}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5" title={entry.description}>
                      {entry.description}
                    </p>
                    <p className="text-[10px] font-mono font-medium text-neutral-500 mt-0.5">
                      Bal. ₹{entry.runningBalanceRupees.toLocaleString("en-IN")}
                    </p>
                  </div>

                  {/* Middle Column: YOU GAVE (Red) */}
                  <div className="col-span-3 text-right">
                    {entry.type === "gave" ? (
                      <span className="font-mono text-sm sm:text-base font-bold text-rose-400">
                        ₹{entry.amountRupees.toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-neutral-700 font-mono text-xs">—</span>
                    )}
                  </div>

                  {/* Right Column: YOU GOT (Green) */}
                  <div className="col-span-4 text-right">
                    {entry.type === "got" ? (
                      <span className="font-mono text-sm sm:text-base font-bold text-emerald-400">
                        ₹{entry.amountRupees.toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-neutral-700 font-mono text-xs">—</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── FIXED BOTTOM ACTION BAR (YOU GAVE ₹ / YOU GOT ₹) ── */}
        <div className="grid grid-cols-2 gap-3 p-3 sm:p-4 bg-[#141419] border-t border-white/[0.08]">
          {/* YOU GAVE ₹ (Red Button) */}
          <button
            onClick={() => {
              setIsGaveOpen(true);
              setGaveAmount("");
              setGaveItem("");
              setGaveDate("");
              setGaveDueDate("");
              setGaveNotes("");
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#e53935] hover:bg-[#d32f2f] active:scale-[0.98] py-3 px-4 text-white font-bold text-xs sm:text-sm tracking-wider uppercase shadow-lg shadow-rose-950/40 transition"
          >
            <Minus className="h-4 w-4 stroke-[3]" />
            <span>YOU GAVE ₹</span>
          </button>

          {/* YOU GOT ₹ (Green Button) */}
          <button
            onClick={() => {
              setIsGotOpen(true);
              setGotAmount("");
              setGotMode("cash");
              setGotDate("");
              setGotDueDate("");
              setGotNotes("");
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#00a86b] hover:bg-[#00915c] active:scale-[0.98] py-3 px-4 text-white font-bold text-xs sm:text-sm tracking-wider uppercase shadow-lg shadow-emerald-950/40 transition"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>YOU GOT ₹</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          SUB-MODAL 1: YOU GAVE ₹ (RECORD UDHARI GIVEN)
          ======================================================== */}
      {isGaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#16161c] text-white shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 font-bold">
                  ₹
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Record Udhari Given (आम्ही दिले)</h4>
                  <p className="text-[11px] text-neutral-400">To: {customer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsGaveOpen(false)}
                className="text-neutral-400 hover:text-white transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGaveSubmit} className="space-y-3.5">
              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-rose-300 uppercase tracking-wider mb-1">
                  Amount Given (₹) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="e.g. 2950"
                  value={gaveAmount}
                  onChange={(e) => setGaveAmount(e.target.value)}
                  className="w-full rounded-xl border border-rose-500/40 bg-black/60 px-4 py-2.5 text-base font-mono font-bold text-rose-300 placeholder:text-neutral-600 focus:border-rose-400 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Item / Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Item / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 22K Gold Chain, Cash credit, Silver ring"
                  value={gaveItem}
                  onChange={(e) => setGaveItem(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-rose-400 focus:outline-none"
                />
              </div>

              {/* Date & Promised Due Date */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Entry Date
                  </label>
                  <input
                    type="date"
                    value={gaveDate}
                    onChange={(e) => setGaveDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white focus:border-rose-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                    Promised Due Date
                  </label>
                  <input
                    type="date"
                    value={gaveDueDate}
                    onChange={(e) => setGaveDueDate(e.target.value)}
                    className="w-full rounded-xl border border-amber-500/30 bg-black/60 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional remarks"
                  value={gaveNotes}
                  onChange={(e) => setGaveNotes(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-rose-400 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsGaveOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gaveSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                >
                  {gaveSubmitting ? "Saving..." : "Save Udhari (दिले)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL 2: YOU GOT ₹ (RECORD PAYMENT RECEIVED)
          ======================================================== */}
      {isGotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/40 bg-[#16161c] text-white shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold">
                  ₹
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Record Payment Received (आम्हाला मिळाले)</h4>
                  <p className="text-[11px] text-neutral-400">From: {customer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsGotOpen(false)}
                className="text-neutral-400 hover:text-white transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGotSubmit} className="space-y-3.5">
              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Amount Received (₹) *
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Due: ₹{balanceDue.toLocaleString("en-IN")}
                  </span>
                </div>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="e.g. 1000"
                  value={gotAmount}
                  onChange={(e) => setGotAmount(e.target.value)}
                  className="w-full rounded-xl border border-emerald-500/40 bg-black/60 px-4 py-2.5 text-base font-mono font-bold text-emerald-300 placeholder:text-neutral-600 focus:border-emerald-400 focus:outline-none"
                  autoFocus
                />

                {/* Quick Chips */}
                {balanceDue > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold">Quick:</span>
                    {[
                      { label: "25%", val: Math.round(balanceDue * 0.25) },
                      { label: "50%", val: Math.round(balanceDue * 0.5) },
                      { label: "75%", val: Math.round(balanceDue * 0.75) },
                      { label: `Full (₹${balanceDue.toLocaleString("en-IN")})`, val: balanceDue },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setGotAmount(chip.val.toString())}
                        className="rounded-lg bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-neutral-300 hover:text-emerald-300 hover:bg-emerald-500/15 border border-white/10 transition"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Mode (Cash vs Online) */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGotMode("cash")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold transition border ${
                      gotMode === "cash"
                        ? "bg-emerald-600 text-white border-emerald-400 shadow-md"
                        : "bg-black/50 text-neutral-400 border-white/10 hover:text-white"
                    }`}
                  >
                    <span>💵</span>
                    <span>Cash (Rojmel Jama)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGotMode("online")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-xs font-bold transition border ${
                      gotMode === "online"
                        ? "bg-cyan-600 text-white border-cyan-400 shadow-md"
                        : "bg-black/50 text-neutral-400 border-white/10 hover:text-white"
                    }`}
                  >
                    <span>📲</span>
                    <span>Online (UPI)</span>
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {gotMode === "cash"
                    ? "✓ Automatically recorded in today's Cash Counter Book (Rojmel Jama)."
                    : "✓ Online bank / UPI transfer."}
                </p>
              </div>

              {/* Date & Next Due Date */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={gotDate}
                    onChange={(e) => setGotDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    value={gotDueDate}
                    onChange={(e) => setGotDueDate(e.target.value)}
                    className="w-full rounded-xl border border-amber-500/30 bg-black/60 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional remarks (e.g. Paid at shop)"
                  value={gotNotes}
                  onChange={(e) => setGotNotes(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsGotOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gotSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                >
                  {gotSubmitting ? "Recording..." : "Save Payment (मिळाले)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL 3: PRINTABLE ACCOUNT STATEMENT (REPORT)
          ======================================================== */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-xl max-h-[92dvh] flex flex-col rounded-2xl border border-white/10 bg-white text-black shadow-2xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-neutral-900">SIDDHESHWAR JEWELLERS &amp; FINANCE</h3>
                <p className="text-xs text-neutral-600">Customer Account Statement (खातेवही)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-neutral-800 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="text-neutral-500 hover:text-black p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Customer Details Strip */}
            <div className="rounded-xl bg-neutral-100 p-3 mb-3 text-xs flex justify-between">
              <div>
                <p className="font-bold text-neutral-900">{customer.name}</p>
                <p className="text-neutral-600 font-mono">📞 {customer.phone}</p>
                <p className="text-neutral-600">📍 {customer.address || "Visapur"}</p>
              </div>
              <div className="text-right">
                <p className="text-neutral-500 text-[11px]">Pending Balance Due</p>
                <p className="font-mono text-lg font-bold text-rose-600">
                  ₹{balanceDue.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto border rounded-lg text-xs">
              <table className="w-full text-left">
                <thead className="bg-neutral-100 border-b font-bold text-neutral-700">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right text-rose-600">You Gave</th>
                    <th className="p-2 text-right text-emerald-600">You Got</th>
                    <th className="p-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[11px]">
                  {ledgerEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="p-2 font-mono whitespace-nowrap">
                        {new Date(e.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </td>
                      <td className="p-2 truncate max-w-[140px]">{e.description}</td>
                      <td className="p-2 text-right font-mono font-bold text-rose-600">
                        {e.type === "gave" ? `₹${e.amountRupees.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-600">
                        {e.type === "got" ? `₹${e.amountRupees.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-neutral-900">
                        ₹{e.runningBalanceRupees.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="flex justify-between items-center pt-3 border-t mt-3 text-xs font-bold text-neutral-800">
              <div>
                <span>Total Given: ₹{totalGave.toLocaleString("en-IN")}</span>
                <span className="mx-2">•</span>
                <span>Total Received: ₹{totalGot.toLocaleString("en-IN")}</span>
              </div>
              <div className="font-mono text-sm text-rose-600">
                Net Due: ₹{balanceDue.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
