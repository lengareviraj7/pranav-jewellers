"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Coins,
  Gem,
  RefreshCw,
  Landmark,
  Settings,
  X,
  Sparkles,
  ShoppingBag,
  Wallet,
  TrendingUp,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Gold", href: "/gold", icon: Coins, highlight: "24K / 22K" },
    { name: "Silver", href: "/silver", icon: Gem, highlight: "999 / 925" },
    { name: "Sales & Udhari", href: "/sales", icon: ShoppingBag, badge: "Billing" },
    { name: "Cash Book", href: "/cash-book", icon: Wallet, highlight: "Rojmel" },
    { name: "Profit & Loss", href: "/profit-loss", icon: TrendingUp },
    { name: "Used Gold & Silver", href: "/used-metal", icon: RefreshCw },
    { name: "Gold Finance", href: "/finance", icon: Landmark, badge: "Mortgage" },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-luxury-beige bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand Identity / Crest */}
          <div className="flex h-24 items-center justify-between border-b border-luxury-beige px-6 bg-gradient-to-b from-luxury-ivory/80 via-white to-white">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-luxury-onyx via-luxury-onyx-surface to-luxury-onyx border border-luxury-gold/50 shadow-gold-glow text-luxury-gold">
                <Sparkles className="h-6 w-6 text-luxury-gold" />
              </div>
              <div>
                <h1 className="font-serif text-base font-bold tracking-wider text-luxury-onyx">
                  SIDHESHWAR
                </h1>
                <p className="text-[10px] font-semibold tracking-widest text-luxury-gold-dark uppercase">
                  Jewellers • Estd 1994
                </p>
              </div>
            </Link>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-luxury-muted hover:bg-luxury-ivory lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-4 py-6">
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-wider text-luxury-muted">
              Main Modules
            </p>
            <nav className="space-y-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={`group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-luxury-onyx to-luxury-onyx-surface text-luxury-gold font-bold shadow-luxury border-l-4 border-luxury-gold"
                        : "text-luxury-charcoal hover:bg-luxury-gold-subtle hover:text-luxury-gold-dark font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-5 w-5 transition-colors ${
                          isActive
                            ? "text-luxury-gold"
                            : "text-luxury-muted group-hover:text-luxury-gold-dark"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isActive
                            ? "bg-luxury-gold/20 text-luxury-gold-light border border-luxury-gold/40"
                            : "bg-luxury-gold-subtle border border-luxury-beige text-luxury-gold-dark"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.highlight && !isActive && (
                      <span className="text-[11px] text-luxury-muted font-normal">
                        {item.highlight}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer info in sidebar */}
        <div className="border-t border-luxury-beige p-5 bg-luxury-ivory/50">
          <div className="rounded-xl border border-luxury-gold/30 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-luxury-onyx font-serif">Sarafa Edition</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-luxury-gold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-luxury-gold"></span>
              </span>
            </div>
            <p className="mt-1 text-[11px] text-luxury-muted leading-relaxed font-medium">
              Live Jewellery Database Connected
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
