"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Sparkles, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@sidheshwar.com");
  const [password, setPassword] = useState("Admin@Sidheshwar2026");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || "Authentication failed. Check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-luxury-ivory via-white to-luxury-ivory p-4 sm:p-6 selection:bg-luxury-gold/30 selection:text-luxury-onyx">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-luxury-beige bg-white p-8 sm:p-10 shadow-luxury-lg">
          {/* Jeweller's Gold Medallion Crest */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-luxury-onyx via-luxury-onyx-surface to-luxury-onyx border-2 border-luxury-gold/60 text-luxury-gold shadow-gold-glow">
              <Sparkles className="h-8 w-8 text-luxury-gold" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold tracking-wider text-luxury-onyx sm:text-3xl">
              SIDHESHWAR
            </h1>
            <p className="mt-0.5 text-xs font-semibold tracking-widest text-luxury-gold-dark uppercase">
              Jewellers • ERP Portal
            </p>
            <p className="mt-2 text-xs text-luxury-muted">
              Sarafa Bazaar Gold, Silver & Finance Management System
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-luxury-charcoal mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-luxury-muted">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sidheshwar.com"
                  className="w-full rounded-xl border border-luxury-beige bg-luxury-ivory/40 py-2.5 pl-10 pr-3 text-xs text-luxury-charcoal placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold/30 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-luxury-charcoal mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-luxury-muted">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-luxury-beige bg-luxury-ivory/40 py-2.5 pl-10 pr-10 text-xs text-luxury-charcoal placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold/30 focus:bg-white focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-luxury-muted hover:text-luxury-charcoal transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark py-3 text-xs font-bold text-white shadow-luxury hover:brightness-105 active:scale-[0.99] transition disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-luxury-gold-light" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Hint */}
          <div className="mt-8 rounded-xl border border-luxury-gold/20 bg-luxury-gold-subtle p-3 text-center text-[11px] text-luxury-muted">
            <span className="font-semibold text-luxury-gold-dark">Default Administrator:</span>
            <p className="font-mono text-[10px] mt-0.5 text-luxury-charcoal">admin@sidheshwar.com / Admin@Sidheshwar2026</p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-luxury-muted">
          Protected by Server-Side JWT Authentication & MongoDB Encryption
        </p>
      </div>
    </div>
  );
}
