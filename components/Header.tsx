"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { Clock, Plus, LogOut, Shield, User as UserIcon, Menu } from "lucide-react";

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
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setIstTime(formatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-luxury-beige bg-white/95 px-4 backdrop-blur-md sm:px-8 shadow-sm">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-luxury-charcoal hover:bg-luxury-ivory lg:hidden transition"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <span className="text-xs uppercase tracking-widest text-luxury-gold font-semibold">
            Enterprise Gold & Silver ERP
          </span>
          <h2 className="font-serif text-lg font-bold tracking-tight text-luxury-green sm:text-xl">
            SIDHESHWAR JEWELLERS
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        {/* Live Asia/Kolkata Time display */}
        <div className="hidden items-center gap-2 rounded-full border border-luxury-beige bg-luxury-ivory/80 px-3.5 py-1.5 text-xs font-medium text-luxury-charcoal md:flex shadow-xs">
          <Clock className="h-3.5 w-3.5 text-luxury-gold animate-pulse" />
          <span>{istTime || "Loading IST..."}</span>
          <span className="rounded bg-luxury-gold/20 px-1 py-0.5 text-[10px] font-bold text-luxury-green">
            IST
          </span>
        </div>

        {/* Quick Action Button */}
        <button
          onClick={onOpenQuickAction}
          className="flex items-center gap-1.5 rounded-lg bg-luxury-green px-3.5 py-2 text-xs font-semibold text-white shadow-luxury hover:bg-luxury-green-light transition active:scale-95"
        >
          <Plus className="h-4 w-4 text-luxury-gold" />
          <span className="hidden sm:inline">Quick Action</span>
        </button>

        {/* User Profile Pill & Logout */}
        {user && (
          <div className="flex items-center gap-3 border-l border-luxury-beige pl-3 sm:pl-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-luxury-green/10 border border-luxury-gold/30 text-luxury-green font-serif font-bold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-left xl:block">
                <p className="text-xs font-semibold text-luxury-charcoal leading-tight">{user.name}</p>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-luxury-gold" />
                  <span className="text-[10px] capitalize text-luxury-muted">{user.role}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="rounded-lg p-2 text-luxury-muted hover:bg-luxury-ivory hover:text-red-700 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
