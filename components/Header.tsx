"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { Clock, Plus, LogOut, Shield, Menu } from "lucide-react";

interface HeaderProps {
  onOpenQuickAction: () => void;
  onToggleSidebar?: () => void;
}

export default function Header({ onOpenQuickAction, onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const [istTime, setIstTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setIstTime(formatter.format(now));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-luxury-champagne bg-white/95 px-4 backdrop-blur-md sm:px-6 shadow-luxury">
      {/* Left: menu + title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="shrink-0 rounded-lg p-2 text-luxury-charcoal hover:bg-luxury-ivory transition-colors lg:hidden"
            aria-label="Toggle Navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-luxury-gold-dark leading-none">
            Enterprise ERP
          </span>
          <h2 className="font-serif text-base font-bold tracking-[0.08em] text-luxury-onyx sm:text-lg leading-tight truncate">
            SIDHESHWAR JEWELLERS
          </h2>
        </div>
      </div>

      {/* Right: time + actions */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Live IST Clock */}
        <div className="hidden items-center gap-1.5 rounded-full border border-luxury-champagne bg-luxury-gold-subtle px-3 py-1.5 text-[11px] font-medium text-luxury-charcoal sm:flex">
          <Clock className="h-3 w-3 text-luxury-gold-dark shrink-0" />
          <span className="whitespace-nowrap">{istTime || "Loading..."}</span>
          <span className="rounded bg-luxury-gold/20 px-1 py-0.5 text-[9px] font-bold text-luxury-gold-dark tracking-wider">
            IST
          </span>
        </div>

        {/* Quick Action */}
        <button
          onClick={onOpenQuickAction}
          className="flex items-center gap-1.5 rounded-xl bg-luxury-onyx px-3 py-2 text-[11px] font-semibold text-luxury-gold border border-luxury-gold/30 hover:bg-luxury-onyx-surface transition-all duration-200 hover:shadow-gold-glow active:scale-95 sm:px-4"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Quick Action</span>
        </button>

        {/* User pill + logout */}
        {user && (
          <div className="flex items-center gap-2 border-l border-luxury-champagne pl-3 sm:pl-4">
            {/* Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-luxury-champagne bg-luxury-gold-subtle text-luxury-gold-dark font-serif font-bold text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>

            {/* Name + role (xl+) */}
            <div className="hidden text-left xl:block">
              <p className="text-[11px] font-semibold text-luxury-charcoal leading-tight truncate max-w-[100px]">
                {user.name}
              </p>
              <div className="flex items-center gap-1">
                <Shield className="h-2.5 w-2.5 text-luxury-gold-dark" />
                <span className="text-[9px] capitalize text-luxury-muted">{user.role}</span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="rounded-lg p-1.5 text-luxury-muted hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
