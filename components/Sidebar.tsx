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
  ClipboardCheck,
  ReceiptText,
  Scale,
  BookOpen,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Gold Stock", href: "/gold", icon: Coins, tag: "24K / 22K" },
  { name: "Silver Stock", href: "/silver", icon: Gem, tag: "999 / 925" },
  { name: "Sales", href: "/sales", icon: ShoppingBag, badge: "Billing" },
  { name: "Udhari Khata", href: "/udhari", icon: BookOpen, badge: "Dues" },
  { name: "Monthly Stock", href: "/inventory/monthly-stock", icon: ClipboardCheck, badge: "Audit" },
  { name: "Cash Book", href: "/cash-book", icon: Wallet, tag: "Rojmel" },
  { name: "Profit & Loss", href: "/profit-loss", icon: TrendingUp },
  { name: "Used Metal", href: "/used-metal", icon: RefreshCw },
  { name: "Gold Finance", href: "/finance", icon: Landmark, badge: "Khata Book" },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const renderNavItem = (
    item: { name: string; href: string; icon: any; tag?: string; badge?: string },
    index: number
  ) => {
    const Icon = item.icon;
    const isActive =
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onClose}
        className={`relative flex items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium transition-colors duration-150 group overflow-hidden ${
          isActive
            ? "bg-gradient-to-r from-luxury-gold/20 via-luxury-gold/10 to-transparent text-luxury-gold-bright shadow-xs border border-luxury-gold/30"
            : "text-luxury-charcoal/80 hover:bg-white/[0.05] hover:text-white"
        }`}
      >
        {/* Active left indicator with glow */}
        {isActive && (
          <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-luxury-gold shadow-[0_0_8px_rgba(201,168,76,0.8)]" />
        )}

        <div className="flex items-center gap-2.5 pl-1">
          <Icon
            className={`h-4 w-4 shrink-0 transition-colors ${
              isActive
                ? "text-luxury-gold"
                : "text-luxury-muted group-hover:text-luxury-gold-champagne"
            }`}
          />
          <span className="truncate">{item.name}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {item.badge && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                isActive
                  ? "bg-luxury-gold/25 text-luxury-gold-bright border border-luxury-gold/40"
                  : "bg-white/[0.06] text-luxury-gold-champagne border border-white/[0.08]"
              }`}
            >
              {item.badge}
            </span>
          )}
          {item.tag && !isActive && (
            <span className="text-[10px] text-luxury-muted/70 font-normal">
              {item.tag}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md lg:hidden animate-fadeIn"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] min-h-[100dvh] h-[100dvh] shrink-0 flex-col border-r border-white/[0.08] bg-luxury-obsidian/95 backdrop-blur-xl transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* ── Brand Crest ── */}
        <div className="flex h-[76px] items-center justify-between border-b border-white/[0.08] px-4 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 group min-w-0"
            onClick={onClose}
          >
            {/* Official Jewellers Logo */}
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-luxury-gold/60 shadow-gold-glow overflow-hidden shrink-0 bg-white p-0.5 group-hover:scale-105 transition-transform duration-200">
              <img
                src="/logo.png"
                alt="Siddheshwar Jewellers & Finance"
                className="h-full w-full object-cover rounded-full"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-[13px] font-bold tracking-[0.10em] text-white leading-none truncate">
                SIDDESHWAR
              </h1>
              <p className="text-[8.5px] font-semibold tracking-[0.12em] text-luxury-gold-champagne uppercase mt-1 truncate">
                Jewellers &amp; Finance • 2009
              </p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-luxury-muted hover:bg-white/[0.08] hover:text-white transition-colors lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── All Navigation Options (Static & Always Visible) ── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-none">
          <div className="px-2 pb-2 pt-0.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold-champagne">
              Showroom &amp; Ledgers
            </span>
            <span className="rounded bg-luxury-gold/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-luxury-gold-bright border border-luxury-gold/30">
              Static
            </span>
          </div>
          <nav className="space-y-1">
            {navigationItems.map((item, i) => renderNavItem(item, i))}
          </nav>
        </div>

        {/* ── Footer Status ── */}
        <div className="border-t border-white/[0.08] px-4 py-3 shrink-0">
          <div className="rounded-xl border border-luxury-gold/30 bg-luxury-gold-subtle/50 px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <span className="font-serif text-[11px] font-bold text-white tracking-wide">
                Sarafa ERP • Offline
              </span>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-luxury-muted leading-relaxed">
              MongoDB Live • Port 27017
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
