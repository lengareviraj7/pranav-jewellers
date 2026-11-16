"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import QuickActionModal from "./QuickActionModal";
import { useAuth } from "./AuthContext";

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
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-luxury-gold border-t-transparent animate-spin"></div>
          <p className="font-serif text-lg font-semibold text-luxury-green">SIDHESHWAR JEWELLERS</p>
          <p className="text-xs text-luxury-muted">Initializing secure ERP environment...</p>
        </div>
      </div>
    );
  }

  if (isLoginPage || !user) {
    return <>{children}</>;
  }

  const openAction = (
    tab: "gold_stock" | "silver_stock" | "used_purchase" | "finance_client" | "finance_payment"
  ) => {
    setQuickActionInitialTab(tab);
    setQuickActionOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-luxury-ivory text-luxury-charcoal">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onOpenQuickAction={() => {
            setQuickActionInitialTab("gold_stock");
            setQuickActionOpen(true);
          }}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <QuickActionModal
        isOpen={quickActionOpen}
        initialTab={quickActionInitialTab}
        onClose={() => setQuickActionOpen(false)}
        onSuccess={() => {
          // Trigger custom refresh event
          window.dispatchEvent(new Event("sj-refresh-data"));
        }}
      />
    </div>
  );
}
