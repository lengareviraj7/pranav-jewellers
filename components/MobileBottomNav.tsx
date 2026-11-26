"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Coins,
  Gem,
  ShoppingBag,
  Menu,
} from "lucide-react";

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export default function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      isActive: pathname === "/",
    },
    {
      name: "Gold",
      href: "/gold",
      icon: Coins,
      isActive: pathname.startsWith("/gold"),
    },
    {
      name: "Silver",
      href: "/silver",
      icon: Gem,
      isActive: pathname.startsWith("/silver"),
    },
    {
      name: "Sales",
      href: "/sales",
      icon: ShoppingBag,
      isActive: pathname.startsWith("/sales"),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-luxury-gold/30 bg-luxury-obsidian/95 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.8)]"
      style={{
        paddingBottom: "max(10px, env(safe-area-inset-bottom, 10px))",
      }}
    >
      <div className="grid grid-cols-5 items-center justify-around px-1 pt-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 select-none ${
                item.isActive
                  ? "text-luxury-gold-bright"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {item.isActive && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-luxury-gold shadow-[0_0_10px_rgba(201,168,76,0.9)]" />
              )}
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-transform ${
                  item.isActive
                    ? "bg-luxury-gold/15 text-luxury-gold-bright scale-110"
                    : "text-neutral-400"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={`text-[10px] font-semibold mt-1 tracking-tight truncate max-w-full ${
                  item.isActive
                    ? "text-luxury-gold-bright font-bold"
                    : "text-neutral-400"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* 5th Button: Open Full Menu / All Ledgers Drawer */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open Full Menu"
          className="relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-neutral-400 hover:text-white transition-all duration-200 select-none"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-neutral-300">
            <Menu className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold mt-1 tracking-tight truncate max-w-full text-neutral-400">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
}
