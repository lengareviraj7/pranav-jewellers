"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import QuickActionModal from "./QuickActionModal";
import { useAuth } from "./AuthContext";
import { Sparkles } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [quickActionInitialTab, setQuickActionInitialTab] = useState<
    "gold_stock" | "silver_stock" | "used_purchase" | "finance_client" | "finance_payment"
  >("gold_stock");

  const isLoginPage = pathname === "/login";

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-luxury-ivory">
        <div className="flex flex-col items-center gap-5 animate-fadeInUp">
          {/* Logo crest */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-luxury-onyx border-2 border-luxury-gold/40 shadow-gold-glow-lg">
            <Sparkles className="h-8 w-8 text-luxury-gold" />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-luxury-gold opacity-75 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-luxury-gold" />
            </span>
          </div>
          {/* Spinner */}
          <div className="h-8 w-8 rounded-full border-2 border-luxury-gold/20 border-t-luxury-gold animate-spin" />
          <div className="text-center">
            <p className="font-serif text-sm font-bold tracking-[0.12em] text-luxury-onyx">
              SIDHESHWAR JEWELLERS
            </p>
            <p className="mt-1 text-[11px] text-luxury-muted">
              Initializing secure ERP environment…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoginPage || !user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-luxury-ivory text-luxury-charcoal">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header
          onOpenQuickAction={() => {
            setQuickActionInitialTab("gold_stock");
            setQuickActionOpen(true);
          }}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 animate-fadeInUp">
            {children}
          </div>
        </main>
      </div>

      <QuickActionModal
        isOpen={quickActionOpen}
        initialTab={quickActionInitialTab}
        onClose={() => setQuickActionOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new Event("sj-refresh-data"));
        }}
      />
    </div>
  );
}
