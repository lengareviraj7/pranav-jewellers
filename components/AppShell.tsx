"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileBottomNav from "./MobileBottomNav";
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
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-luxury-gold/60 shadow-gold-glow-lg overflow-hidden bg-white p-1">
            <img
              src="/logo.png"
              alt="Siddheshwar Jewellers & Finance"
              className="h-full w-full object-cover rounded-full"
            />
            <span className="absolute bottom-0 right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
            </span>
          </div>
          {/* Spinner */}
          <div className="h-6 w-6 rounded-full border-2 border-luxury-gold/20 border-t-luxury-gold animate-spin" />
          <div className="text-center">
            <p className="font-serif text-sm font-bold tracking-[0.14em] text-white">
              SIDDESHWAR JEWELLERS &amp; FINANCE
            </p>
            <p className="mt-1 text-[11px] text-luxury-gold-champagne tracking-wider uppercase font-semibold">
              Since 2009 • Initializing secure ERP environment…
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
    <div className="flex min-h-[100dvh] h-[100dvh] overflow-hidden bg-luxury-ivory text-luxury-charcoal">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <Header
          onOpenQuickAction={() => {
            setQuickActionInitialTab("gold_stock");
            setQuickActionOpen(true);
          }}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto overscroll-y-contain pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl p-3 sm:p-6 lg:p-8 animate-fadeInUp">
            {children}
          </div>
        </main>

        {/* Dedicated Mobile Touch Navigation Bar for iOS & Android */}
        <MobileBottomNav onOpenMenu={() => setSidebarOpen(true)} />
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
