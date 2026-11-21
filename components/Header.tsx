"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";
import { Clock, Plus, LogOut, Shield, Menu, Sun, Moon } from "lucide-react";

interface HeaderProps {
  onOpenQuickAction: () => void;
  onToggleSidebar?: () => void;
}

export default function Header({ onOpenQuickAction, onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-white/[0.08] bg-luxury-obsidian/85 px-4 backdrop-blur-xl sm:px-6 shadow-2xl">
      {/* Left: menu + logo + title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="shrink-0 rounded-lg p-2 text-luxury-charcoal hover:bg-white/[0.08] transition-colors lg:hidden"
            aria-label="Toggle Navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-luxury-gold/50 shadow-gold-glow overflow-hidden shrink-0 bg-white p-0.5">
            <img
              src="/logo.png"
              alt="Siddheshwar Jewellers & Finance"
              className="h-full w-full object-cover rounded-full"
            />
          </div>
          <div className="min-w-0">
            <span className="block text-[9.5px] font-semibold uppercase tracking-[0.14em] text-luxury-gold-champagne leading-none truncate">
              Jewellers &amp; Finance • Since 2009
            </span>
            <h2 className="font-serif text-sm font-bold tracking-[0.10em] text-white sm:text-base leading-tight truncate mt-0.5">
              SIDDESHWAR JEWELLERS
            </h2>
          </div>
        </div>
      </div>

      {/* Right: time + actions */}
      <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
        {/* Day / Night Mode Toggle */}
        <button
          onClick={toggleTheme}
          type="button"
          title={theme === "dark" ? "Switch to Day Mode (Light Pearl Ivory)" : "Switch to Night Mode (Dark Obsidian)"}
          className="btn-3d flex items-center gap-1.5 rounded-xl border border-luxury-gold/35 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-luxury-gold-champagne shadow-xs hover:border-luxury-gold hover:text-white transition-all backdrop-blur-md cursor-pointer"
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline font-medium text-amber-300">Day Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="hidden sm:inline font-medium text-neutral-800">Night Mode</span>
            </>
          )}
        </button>

        {/* Live IST Clock with Pulse */}
        <div className="hidden items-center gap-2 rounded-full border border-luxury-gold/30 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium text-luxury-gold-champagne sm:flex backdrop-blur-md">
          <Clock className="h-3.5 w-3.5 text-luxury-gold shrink-0 animate-pulse" />
          <span className="whitespace-nowrap font-mono">{istTime || "Loading..."}</span>
          <span className="rounded bg-luxury-gold/20 px-1.5 py-0.2 text-[9px] font-bold text-luxury-gold-bright tracking-wider">
            IST
          </span>
        </div>

        {/* Quick Action 3D Button */}
        <button
          onClick={onOpenQuickAction}
          className="btn-3d flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark px-3 py-2 text-[11px] font-bold text-luxury-obsidian shadow-gold-glow hover:brightness-110 active:scale-95 transition-all sm:px-4"
        >
          <Plus className="h-4 w-4 shrink-0 text-luxury-obsidian stroke-[2.5]" />
          <span className="hidden sm:inline whitespace-nowrap">Quick Action</span>
        </button>

        {/* User pill + logout */}
        {user && (
          <div className="flex items-center gap-2 border-l border-white/[0.10] pl-3 sm:pl-4">
            {/* Avatar with gold border */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-luxury-gold/40 bg-luxury-graphite text-luxury-gold-champagne font-serif font-bold text-sm shrink-0 shadow-gold-glow">
              {user.name.charAt(0).toUpperCase()}
            </div>

            {/* Name + role (xl+) */}
            <div className="hidden text-left xl:block">
              <p className="text-[11px] font-semibold text-white leading-tight truncate max-w-[110px]">
                {user.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="h-2.5 w-2.5 text-luxury-gold" />
                <span className="text-[9px] uppercase tracking-wider text-luxury-muted font-medium">
                  {user.role}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="rounded-lg p-1.5 text-luxury-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
