"use client";

import React from "react";
import { X, Printer, CheckCircle } from "lucide-react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    receiptNumber: string;
    paymentDate: string;
    loanNumber: string;
    customerName: string;
    customerMobile: string;
    customerAddress?: string;
    totalAmountRupees: number;
    principalAppliedRupees: number;
    interestAppliedRupees: number;
    previousOutstandingPrincipalRupees: number;
    newOutstandingPrincipalRupees: number;
    paymentMethod: string;
    referenceTransactionId?: string;
    notes?: string;
  } | null;
}

export default function ReceiptModal({ isOpen, onClose, data }: ReceiptModalProps) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl border border-luxury-beige bg-white shadow-2xl overflow-hidden my-8">
        {/* Actions bar (hidden in print) */}
        <div className="flex items-center justify-between border-b border-luxury-beige bg-luxury-ivory px-6 py-3 print:hidden">
          <span className="text-xs font-semibold text-luxury-onyx flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-luxury-gold" />
            Official Payment Receipt
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-3.5 py-1.5 text-xs font-semibold text-white shadow-luxury hover:brightness-105 active:scale-95 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-luxury-muted hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="printable-receipt" className="p-8 text-luxury-charcoal space-y-6">
          {/* Header */}
          <div className="text-center border-b border-luxury-beige pb-4 flex flex-col items-center">
            <div className="h-16 w-16 rounded-full border-2 border-luxury-gold/60 p-0.5 mb-2 bg-white shadow-xs overflow-hidden">
              <img
                src="/logo.png"
                alt="Siddheshwar Jewellers & Finance"
                className="h-full w-full object-cover rounded-full"
              />
            </div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-luxury-onyx">
              SIDDESHWAR JEWELLERS &amp; FINANCE
            </h2>
            <p className="text-xs font-medium text-luxury-gold uppercase tracking-widest mt-0.5">
              Since 2009 • Gold Ornaments, Silver, Bullion &amp; Mortgage Finance
            </p>
            <p className="text-[11px] text-luxury-muted mt-1">
              Shop No. 12, Sarafa Bazaar, Main Road • Phone: +91 98765 43210
            </p>
            <div className="inline-block mt-2 rounded-full border border-luxury-beige bg-luxury-ivory px-3 py-0.5 text-[10px] font-bold text-luxury-gold-dark tracking-wider uppercase">
              Official Mortgage Repayment Voucher
            </div>
          </div>

          {/* Receipt Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-luxury-muted">Receipt Number:</p>
              <p className="font-bold text-luxury-gold-dark font-mono">{data.receiptNumber}</p>

              <p className="text-luxury-muted mt-2">Mortgage Loan No:</p>
              <p className="font-bold text-luxury-charcoal font-mono">{data.loanNumber}</p>
            </div>

            <div className="text-right">
              <p className="text-luxury-muted">Payment Date:</p>
              <p className="font-bold text-luxury-charcoal">{data.paymentDate}</p>

              <p className="text-luxury-muted mt-2">Payment Mode:</p>
              <p className="font-bold text-luxury-charcoal uppercase">
                {data.paymentMethod} {data.referenceTransactionId ? `(${data.referenceTransactionId})` : ""}
              </p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="rounded-xl border border-luxury-beige bg-luxury-ivory/50 p-3 text-xs">
            <p className="text-[10px] uppercase font-semibold text-luxury-muted tracking-wider">
              Customer Details
            </p>
            <p className="font-bold text-luxury-onyx mt-0.5">{data.customerName}</p>
            <p className="text-luxury-charcoal">Mobile: {data.customerMobile}</p>
            {data.customerAddress && <p className="text-luxury-muted mt-0.5">Address: {data.customerAddress}</p>}
          </div>

          {/* Payment Breakdown Table */}
          <table className="w-full text-xs border border-luxury-beige rounded-lg overflow-hidden">
            <thead className="bg-luxury-ivory text-luxury-onyx font-semibold">
              <tr>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-luxury-beige">
              <tr>
                <td className="px-3 py-2 text-luxury-charcoal">Previous Principal Outstanding</td>
                <td className="px-3 py-2 text-right font-medium">
                  ₹{data.previousOutstandingPrincipalRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-luxury-charcoal">Interest Amount Applied</td>
                <td className="px-3 py-2 text-right font-medium text-amber-800">
                  ₹{data.interestAppliedRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-luxury-charcoal">Principal Amount Applied</td>
                <td className="px-3 py-2 text-right font-medium text-luxury-charcoal">
                  ₹{data.principalAppliedRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="bg-luxury-ivory/80 font-bold">
                <td className="px-3 py-2 text-luxury-gold-dark">Total Received & Acknowledged</td>
                <td className="px-3 py-2 text-right text-luxury-gold-dark font-serif text-sm">
                  ₹{data.totalAmountRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="bg-white font-bold border-t-2 border-luxury-beige">
                <td className="px-3 py-2 text-luxury-charcoal">Remaining Principal Balance</td>
                <td className="px-3 py-2 text-right text-luxury-onyx">
                  ₹{data.newOutstandingPrincipalRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {data.notes && (
            <p className="text-[11px] text-luxury-muted italic">Note: {data.notes}</p>
          )}

          {/* Signature lines */}
          <div className="pt-8 flex justify-between text-xs text-luxury-muted">
            <div className="border-t border-luxury-beige pt-2 text-center w-36">
              Customer Signature
            </div>
            <div className="border-t border-luxury-beige pt-2 text-center w-36">
              Authorized Signatory
              <p className="text-[10px] text-luxury-gold font-serif mt-0.5">Sidheshwar Jewellers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
