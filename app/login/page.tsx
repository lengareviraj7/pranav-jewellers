"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Sparkles, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || "Authentication failed. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-luxury-ivory via-white to-luxury-ivory p-4 sm:p-6">
      <div className="w-full max-w-sm animate-scaleIn">

        {/* Card */}
        <div className="rounded-3xl border border-luxury-champagne bg-white shadow-luxury-xl p-8 sm:p-10">

          {/* Brand crest */}
          <div className="flex flex-col items-center text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-luxury-onyx border-2 border-luxury-gold/40 shadow-gold-glow-lg">
              <Sparkles className="h-8 w-8 text-luxury-gold" />
              <span className="absolute -bottom-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-luxury-gold opacity-75 animate-ping" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-luxury-gold" />
              </span>
            </div>

            <div className="mt-5">
              <div className="gold-divider w-16 mb-4" />
              <h1 className="font-serif text-2xl font-bold tracking-[0.12em] text-luxury-onyx">
                SIDHESHWAR
              </h1>
              <p className="mt-1 text-[10px] font-bold tracking-[0.2em] text-luxury-gold-dark uppercase">
                Jewellers &bull; ERP Portal
              </p>
              <p className="mt-2.5 text-[12px] text-luxury-muted">
                Sarafa Bazaar Gold, Silver &amp; Finance System
              </p>
              <div className="gold-divider w-16 mt-4" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[12px] text-red-700 animate-slideDown">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-luxury-charcoal">
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
                  className="w-full rounded-xl border border-luxury-champagne bg-luxury-ivory/50 py-2.5 pl-10 pr-4 text-[13px] text-luxury-charcoal placeholder:text-luxury-muted focus:outline-none transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-luxury-charcoal">
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
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-luxury-champagne bg-luxury-ivory/50 py-2.5 pl-10 pr-10 text-[13px] text-luxury-charcoal placeholder:text-luxury-muted focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-luxury-muted hover:text-luxury-charcoal transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-luxury-onyx py-3 text-[12px] font-bold text-luxury-gold border border-luxury-gold/30 shadow-luxury hover:shadow-gold-glow active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-luxury-gold/30 border-t-luxury-gold animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <p className="mt-6 text-center text-[10px] text-luxury-muted">
            Protected by JWT Authentication &amp; Secure MongoDB
          </p>
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-[10px] text-luxury-muted/60 tracking-wide">
          SIDHESHWAR JEWELLERS SARAFA ERP &bull; EST. 1994
        </p>
      </div>
    </div>
  );
}
