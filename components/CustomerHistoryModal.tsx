"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  X,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

interface PaymentItem {
  amountPaise: number;
  paymentMode: "cash" | "online";
  date: string;
  notes?: string;
}

interface SaleLineItem {
  itemName: string;
  purity?: string;
  quantitySold?: number;
  netWeightSold?: number;
  sellingPricePaise?: number;
}

interface CustomerSale {
  _id: string;
  saleNumber: string;
  itemName: string;
  saleDate: string;
  createdAt: string;
  sellingPricePaise: number;
  paidAmountPaise: number;
  balanceDuePaise: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  paymentMode: string;
  dueDate?: string;
  items?: SaleLineItem[];
  payments?: PaymentItem[];
}

interface CustomerDetails {
  fullName: string;
  mobileNumber: string;
  address?: string;
  totalPurchasesCount: number;
  totalBilledPaise: number;
  totalPaidPaise: number;
  outstandingUdhariPaise: number;
  advanceBalancePaise?: number;
  sales: CustomerSale[];
}

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerPhone?: string;
  customerName?: string;
}

export default function CustomerHistoryModal({
  isOpen,
  onClose,
  customerPhone,
  customerName,
}: CustomerHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CustomerDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !customerPhone) return;

    let isMounted = true;
    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sales/customers?phone=${encodeURIComponent(customerPhone || "")}&details=true`);
        const json = await res.json();
        if (json.success && json.customer) {
          if (isMounted) setData(json.customer);
        } else {
          if (isMounted) setError(json.error || "No past purchase history found for this customer.");
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load customer history");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [isOpen, customerPhone]);

  if (!isOpen) return null;

  const totalBilledRupees = (data?.totalBilledPaise || 0) / 100;
  const totalPaidRupees = (data?.totalPaidPaise || 0) / 100;
  const totalDueRupees = (data?.outstandingUdhariPaise || 0) / 100;
  const displayName = data?.fullName || customerName || "Customer";
  const displayPhone = data?.mobileNumber || customerPhone || "";
  const displayAddress = data?.address || "Visapur";

  // Generate WhatsApp Account Statement Link
  const shopPhone = "8329465301";
  const advRupees = ((data?.advanceBalancePaise || 0) / 100);
  const statementText = `*SIDHESHWAR JEWELLERS* 👑%0A*Customer Account Statement*%0A--------------------------------%0A👤 Customer: *${displayName}*%0A📞 Mobile: *${displayPhone}*%0A📍 Village: *${displayAddress}*%0A%0A📦 Total Lifetime Purchases: *${data?.totalPurchasesCount || 0}*%0A💰 Total Billed: *₹${totalBilledRupees.toLocaleString("en-IN")}*%0A💵 Total Paid: *₹${totalPaidRupees.toLocaleString("en-IN")}*%0A⚠️ *Current Udhari Balance: ₹${totalDueRupees.toLocaleString("en-IN")}*${advRupees > 0 ? `%0A🎁 *Customer Advance Credit: ₹${advRupees.toLocaleString("en-IN")}*` : ""}%0A--------------------------------%0AThank you for being our valued customer!%0AFor any queries, contact: +91 ${shopPhone}`;
  const whatsappUrl = `https://wa.me/91${displayPhone.replace(/\D/g, "")}?text=${statementText}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto modal-backdrop">
      <div className="relative w-full max-w-2xl rounded-2xl border border-luxury-gold/40 bg-luxury-graphite text-white shadow-2xl p-4 sm:p-6 my-2 sm:my-8 max-h-[92dvh] overflow-y-auto space-y-4 sm:space-y-5 animate-scaleUp modal-content">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-luxury-gold" />
              <span>Customer Lifetime Account &amp; Purchase History</span>
            </h3>
            <p className="text-xs text-luxury-muted">
              Auto-saved records of all purchases, bills, Udhari due dates and past payment installments
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-luxury-muted hover:text-white transition p-1 rounded-lg hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-luxury-gold border-t-transparent" />
            <p className="text-xs text-luxury-muted">Retrieving customer lifetime history from database...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-center space-y-2">
            <AlertCircle className="h-6 w-6 text-amber-400 mx-auto" />
            <p className="text-xs text-amber-200">{error}</p>
            <p className="text-[11px] text-luxury-muted">
              First-time customer details will be automatically saved upon completing the sale.
            </p>
          </div>
        ) : (
          <>
            {/* Customer Profile Banner */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-luxury-gold/20 border border-luxury-gold/40 text-luxury-gold font-serif font-bold text-base">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{displayName}</h4>
                      <span className="rounded-md bg-luxury-gold/20 px-2 py-0.5 text-[10px] font-bold text-luxury-gold-bright border border-luxury-gold/30">
                        🔁 Repeat Customer
                      </span>
                    </div>
                    <p className="text-xs text-luxury-gold font-mono mt-0.5 flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      <span>{displayPhone}</span>
                    </p>
                    <p className="text-[11px] text-luxury-muted flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      <span>{displayAddress}</span>
                    </p>
                  </div>
                </div>

                {displayPhone && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white hover:brightness-105 transition shadow-sm"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>WhatsApp Statement</span>
                  </a>
                )}
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white/5 p-2.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-luxury-muted block">Purchases</span>
                  <p className="font-mono text-sm font-bold text-white mt-0.5">
                    {data?.totalPurchasesCount || 0} bills
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 p-2.5 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-luxury-muted block">Lifetime Billed</span>
                  <p className="font-mono text-sm font-bold text-white mt-0.5">
                    ₹{totalBilledRupees.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-950/30 p-2.5 border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block">Total Paid</span>
                  <p className="font-mono text-sm font-bold text-emerald-400 mt-0.5">
                    ₹{totalPaidRupees.toLocaleString("en-IN")}
                  </p>
                </div>
                <div
                  className={`rounded-xl p-2.5 border ${
                    totalDueRupees > 0
                      ? "bg-rose-950/30 border-rose-500/30 text-rose-300"
                      : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block">
                    {totalDueRupees > 0 ? "Pending Udhari" : "Balance Due"}
                  </span>
                  <p className="font-mono text-sm font-bold mt-0.5">
                    ₹{totalDueRupees.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Advance Balance Alert if available */}
              {(data?.advanceBalancePaise || 0) > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-amber-500/15 border border-amber-500/30 p-2.5 px-3.5 text-xs text-amber-300 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💰</span>
                    <span>Customer Advance Deposit Credit (अॅडव्हान्स जमा):</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-amber-200">
                    ₹{((data?.advanceBalancePaise || 0) / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>

            {/* Chronological Past Purchases & Installment Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-luxury-gold-champagne flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Previous Purchase Transactions ({data?.sales?.length || 0})</span>
                </span>
                <span className="text-[11px] text-luxury-muted font-mono">
                  Chronological Ledger
                </span>
              </div>

              {!data?.sales || data.sales.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-center text-xs text-luxury-muted">
                  No purchases recorded yet for this customer.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.sales.map((sale, idx) => {
                    const sPrice = (sale.sellingPricePaise || 0) / 100;
                    const sPaid = (sale.paidAmountPaise || 0) / 100;
                    const sBal = (sale.balanceDuePaise || 0) / 100;
                    const sDate = sale.saleDate || sale.createdAt;

                    return (
                      <div
                        key={sale._id || idx}
                        className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2.5 transition hover:border-luxury-gold/40"
                      >
                        {/* Sale Row Top */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-luxury-gold">{sale.saleNumber}</span>
                            <span className="text-luxury-muted">•</span>
                            <span className="text-luxury-muted flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(sDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                sale.paymentStatus === "paid"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : sale.paymentStatus === "partial"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {sale.paymentStatus}
                            </span>
                            <span className="font-mono text-xs font-bold text-white">
                              ₹{sPrice.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Item Details */}
                        <div className="text-xs text-white/90">
                          <p className="font-semibold text-luxury-gold-bright flex items-center gap-1.5">
                            <ShoppingBag className="h-3.5 w-3.5 text-luxury-gold" />
                            <span>{sale.itemName}</span>
                          </p>
                          {sale.items && sale.items.length > 0 && (
                            <div className="mt-1 pl-5 space-y-0.5 text-[11px] text-luxury-muted">
                              {sale.items.map((line, lIdx) => (
                                <div key={lIdx} className="flex items-center justify-between">
                                  <span>
                                    {line.quantitySold || 1}x {line.itemName} ({line.purity || "22K"})
                                  </span>
                                  <span className="font-mono">
                                    {line.netWeightSold ? `${line.netWeightSold.toFixed(3)}g net` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Breakdown: Paid vs Udhari Due */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] border-t border-white/[0.04]">
                          <span className="text-emerald-400 font-mono">
                            Paid: ₹{sPaid.toLocaleString("en-IN")}
                          </span>
                          {sBal > 0 ? (
                            <span className="text-rose-400 font-mono font-bold">
                              Due: ₹{sBal.toLocaleString("en-IN")}{" "}
                              {sale.dueDate && (
                                <span className="text-[10px] text-luxury-muted font-normal">
                                  (Promise: {new Date(sale.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Fully Cleared
                            </span>
                          )}
                        </div>

                        {/* Installments Ledger if any payments made */}
                        {sale.payments && sale.payments.length > 0 && (
                          <div className="rounded-lg bg-white/[0.03] p-2 space-y-1 text-[10px]">
                            <span className="font-bold text-luxury-gold uppercase tracking-wider block">
                              Payment Installments ({sale.payments.length}):
                            </span>
                            {sale.payments.map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="flex items-center justify-between text-luxury-muted font-mono"
                              >
                                <span>
                                  {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} •{" "}
                                  <span className="uppercase text-white">{p.paymentMode}</span>
                                  {p.notes && ` (${p.notes})`}
                                </span>
                                <span className="font-bold text-emerald-400">
                                  +₹{(p.amountPaise / 100).toLocaleString("en-IN")}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
