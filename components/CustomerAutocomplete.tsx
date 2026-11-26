"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  Phone,
  MapPin,
  History,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  ChevronDown,
} from "lucide-react";
import CustomerHistoryModal from "./CustomerHistoryModal";

export interface CustomerSuggestion {
  customerId: string;
  fullName: string;
  mobileNumber: string;
  address: string;
  totalPurchasesCount: number;
  totalBilledRupees: number;
  totalPaidRupees: number;
  outstandingUdhariRupees: number;
  lastPurchaseDate: string;
  recentItems?: string[];
  isRepeat: boolean;
}

interface CustomerAutocompleteProps {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  onNameChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  onAddressChange: (val: string) => void;
  nameRequired?: boolean;
  phoneRequired?: boolean;
  defaultAddress?: string;
  className?: string;
}

export default function CustomerAutocomplete({
  customerName,
  customerPhone,
  customerAddress,
  onNameChange,
  onPhoneChange,
  onAddressChange,
  nameRequired = true,
  phoneRequired = true,
  defaultAddress = "Visapur",
  className = "",
}: CustomerAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSuggestion | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  // Fetch suggestions when query changes
  const fetchSuggestions = useCallback(async (query: string) => {
    if (isSelectingRef.current) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/sales/customers?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setSuggestions(data.customers);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search on name input change
  useEffect(() => {
    if (!customerName || customerName.trim().length === 0) {
      if (customerPhone && customerPhone.trim().length >= 2) {
        fetchSuggestions(customerPhone);
      } else {
        setSuggestions([]);
      }
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestions(customerName);
    }, 250);

    return () => clearTimeout(timer);
  }, [customerName, customerPhone, fetchSuggestions]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (cust: CustomerSuggestion) => {
    isSelectingRef.current = true;
    onNameChange(cust.fullName);
    onPhoneChange(cust.mobileNumber);
    onAddressChange(cust.address || defaultAddress);
    setSelectedCustomer(cust);
    setShowDropdown(false);
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 300);
  };

  const handleClearSelected = () => {
    setSelectedCustomer(null);
    onNameChange("");
    onPhoneChange("");
    onAddressChange(defaultAddress);
  };

  const openSavedCustomersList = async () => {
    setShowDropdown(true);
    fetchSuggestions("");
  };

  return (
    <div className={`space-y-3 ${className}`} ref={dropdownRef}>
      {/* Repeat Customer Detected Banner */}
      {selectedCustomer && (
        <div className="rounded-xl border border-luxury-gold/50 bg-luxury-gold/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-luxury-gold/20 border border-luxury-gold/40 text-luxury-gold font-bold text-sm">
              {selectedCustomer.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{selectedCustomer.fullName}</span>
                <span className="rounded bg-luxury-gold/30 px-1.5 py-0.5 text-[9px] font-bold text-luxury-gold-bright uppercase tracking-wide">
                  🔁 Repeat Customer
                </span>
              </div>
              <p className="text-[11px] text-luxury-muted mt-0.5 font-mono">
                📞 {selectedCustomer.mobileNumber} • 📍 {selectedCustomer.address || defaultAddress}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px]">
                <span className="text-luxury-gold-champagne font-bold">
                  📦 {selectedCustomer.totalPurchasesCount} Past Purchases
                </span>
                <span className="text-luxury-muted">•</span>
                <span className="text-emerald-400 font-mono">
                  Paid: ₹{selectedCustomer.totalPaidRupees.toLocaleString("en-IN")}
                </span>
                {selectedCustomer.outstandingUdhariRupees > 0 && (
                  <>
                    <span className="text-luxury-muted">•</span>
                    <span className="text-rose-400 font-mono font-bold">
                      ⚠️ Existing Udhari: ₹{selectedCustomer.outstandingUdhariRupees.toLocaleString("en-IN")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-luxury-gold/20 hover:bg-luxury-gold/30 border border-luxury-gold/40 px-2.5 py-1 text-[11px] font-bold text-luxury-gold-bright transition shadow-sm"
              title="View complete purchase timeline and past bills"
            >
              <History className="h-3.5 w-3.5 text-luxury-gold" />
              <span>History</span>
            </button>
            <button
              type="button"
              onClick={handleClearSelected}
              className="text-luxury-muted hover:text-white transition p-1 rounded-md hover:bg-white/10"
              title="Clear customer details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input Grid: Row 1 (Name & Mobile) and Row 2 (Address) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Name with Autocomplete dropdown */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
              Customer Name {nameRequired && "*"}
            </label>
            <button
              type="button"
              onClick={openSavedCustomersList}
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
              required={nameRequired}
              placeholder="e.g. Ramesh Patil (or select repeat customer)"
              value={customerName}
              onChange={(e) => {
                onNameChange(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => {
                setShowDropdown(true);
                if (!customerName) fetchSuggestions("");
              }}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs text-white focus:border-luxury-gold focus:outline-none"
            />
            {customerName && (
              <button
                type="button"
                onClick={() => {
                  onNameChange("");
                  setSelectedCustomer(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-luxury-muted hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl border border-luxury-gold/40 bg-luxury-graphite shadow-2xl divide-y divide-white/[0.06] animate-slideDown">
              <div className="px-3 py-1.5 bg-black/40 text-[10px] uppercase font-bold text-luxury-gold flex items-center justify-between">
                <span>Select Repeat Customer (Auto-fills Details)</span>
                <span>{suggestions.length} found</span>
              </div>
              {suggestions.map((c) => (
                <button
                  key={c.customerId || c.mobileNumber}
                  type="button"
                  onClick={() => handleSelect(c)}
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
                        <span>📍 {c.address || defaultAddress}</span>
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
                      {c.totalPurchasesCount} purchase{c.totalPurchasesCount > 1 ? "s" : ""}
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

        {/* Mobile No with live lookup */}
        <div>
          <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
            Mobile No {phoneRequired && "*"}
          </label>
          <div className="relative">
            <input
              type="tel"
              required={phoneRequired}
              placeholder="10-digit mobile number"
              value={customerPhone}
              onChange={(e) => {
                onPhoneChange(e.target.value);
                if (e.target.value.length >= 3) {
                  setShowDropdown(true);
                  fetchSuggestions(e.target.value);
                }
              }}
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs font-mono text-white focus:border-luxury-gold focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Address */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
            Address / Village
          </label>
          <span className="text-[10px] font-mono text-luxury-gold">
            By default {defaultAddress}.
          </span>
        </div>
        <input
          type="text"
          placeholder={defaultAddress}
          value={customerAddress}
          onChange={(e) => onAddressChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs text-white focus:border-luxury-gold focus:outline-none"
        />
      </div>

      {/* Customer Lifetime Statement & History Modal */}
      <CustomerHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        customerPhone={selectedCustomer?.mobileNumber || customerPhone}
        customerName={selectedCustomer?.fullName || customerName}
      />
    </div>
  );
}
