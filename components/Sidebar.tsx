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

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, group: "overview" },
  { name: "Gold Stock", href: "/gold", icon: Coins, tag: "24K / 22K", group: "stock" },
  { name: "Silver Stock", href: "/silver", icon: Gem, tag: "999 / 925", group: "stock" },
  { name: "Sales & Udhari", href: "/sales", icon: ShoppingBag, badge: "Billing", group: "sales" },
  { name: "Cash Book", href: "/cash-book", icon: Wallet, tag: "Rojmel", group: "sales" },
  { name: "Profit & Loss", href: "/profit-loss", icon: TrendingUp, group: "sales" },
  { name: "Used Metal", href: "/used-metal", icon: RefreshCw, group: "operations" },
  { name: "Gold Finance", href: "/finance", icon: Landmark, badge: "Mortgage", group: "operations" },
  { name: "Settings", href: "/settings", icon: Settings, group: "system" },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fadeIn"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-luxury-champagne bg-white transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-luxury-xl" : "-translate-x-full"
        }`}
      >
        {/* ── Brand Crest ── */}
        <div className="flex h-[72px] items-center justify-between border-b border-luxury-champagne px-5 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-3 group"
            onClick={onClose}
          >
            {/* Gold medallion */}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-luxury-onyx border border-luxury-gold/40 shadow-gold-glow group-hover:shadow-gold-glow-lg transition-shadow duration-300">
              <Sparkles className="h-5 w-5 text-luxury-gold" />
            </div>
            <div>
              <h1 className="font-serif text-sm font-bold tracking-[0.12em] text-luxury-onyx leading-none">
                SIDHESHWAR
              </h1>
              <p className="text-[9px] font-semibold tracking-[0.18em] text-luxury-gold-dark uppercase mt-0.5">
                Jewellers • Est. 1994
              </p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-luxury-muted hover:bg-luxury-ivory hover:text-luxury-onyx transition-colors lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <nav className="space-y-1">
            {navigation.map((item, i) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`relative flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 group overflow-hidden ${
                    isActive
                      ? "bg-luxury-onyx text-white"
                      : "text-luxury-charcoal hover:bg-luxury-cream hover:text-luxury-onyx"
                  }`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  {/* Active left indicator — no layout shift */}
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full bg-luxury-gold" />
                  )}

                  <div className="flex items-center gap-2.5 pl-1">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive
                          ? "text-luxury-gold"
                          : "text-luxury-muted group-hover:text-luxury-gold-dark"
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                          isActive
                            ? "bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/30"
                            : "bg-luxury-gold-subtle text-luxury-gold-dark border border-luxury-champagne"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.tag && !isActive && (
                      <span className="text-[10px] text-luxury-muted/80 font-normal">
                        {item.tag}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Footer Status ── */}
        <div className="border-t border-luxury-champagne px-4 py-4 shrink-0">
          <div className="rounded-xl border border-luxury-gold/25 bg-luxury-gold-subtle px-3.5 py-3">
            <div className="flex items-center justify-between">
              <span className="font-serif text-[11px] font-bold text-luxury-onyx tracking-wide">
                Sarafa ERP
              </span>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-luxury-gold opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-luxury-gold" />
              </span>
            </div>
            <p className="mt-1 text-[10px] text-luxury-muted leading-relaxed">
              MongoDB Live • Secure Session
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
