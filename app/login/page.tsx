"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { Sparkles, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { TiltCard } from "@/components/Motion";

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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-luxury-obsidian p-4 sm:p-6 overflow-hidden">
      {/* Background Luxury Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(201,168,76,0.12),rgba(9,9,12,0.95))]" />
      <div className="pointer-events-none fixed -top-40 -right-40 h-96 w-96 rounded-full bg-luxury-gold/10 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 h-96 w-96 rounded-full bg-luxury-gold/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm animate-scaleIn">
        {/* 3D Glass Login Card */}
        <TiltCard
          maxTilt={6}
          glare={true}
          className="rounded-3xl border border-luxury-gold/40 bg-luxury-graphite/90 backdrop-blur-2xl shadow-gold-glow-lg p-8 sm:p-10 card-3d-gold"
        >
          {/* Brand crest */}
          <div className="flex flex-col items-center text-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-luxury-gold/60 shadow-gold-glow-lg overflow-hidden bg-white p-1">
              <img
                src="/logo.png"
                alt="Siddheshwar Jewellers & Finance"
                className="h-full w-full object-cover rounded-full"
              />
              <span className="absolute bottom-0.5 right-1 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
              </span>
            </div>

            <div className="mt-5">
              <div className="gold-divider w-16 mb-4 mx-auto" />
              <h1 className="font-serif text-2xl font-bold tracking-[0.14em] text-white">
                SIDDESHWAR
              </h1>
              <p className="mt-1 text-[10px] font-bold tracking-[0.22em] text-luxury-gold-champagne uppercase">
                Jewellers &amp; Finance &bull; Since 2009
              </p>
              <p className="mt-2 text-[12px] text-luxury-muted">
                Sarafa Bazaar Gold, Silver &amp; Mortgage Finance System
              </p>
              <div className="gold-divider w-16 mt-4 mx-auto" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-3.5 py-3 text-[12px] text-red-300 backdrop-blur-md animate-slideDown">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-luxury-gold-champagne">
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
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 py-2.5 pl-10 pr-4 text-[13px] text-white placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-luxury-gold-champagne">
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
                  className="w-full rounded-xl border border-white/[0.12] bg-luxury-obsidian/70 py-2.5 pl-10 pr-10 text-[13px] text-white placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-luxury-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-luxury-gold-dark via-luxury-gold to-luxury-gold-dark py-3 text-[12px] font-bold text-black shadow-gold-glow hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed btn-3d"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-black/40 border-t-black animate-spin" />
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
        </TiltCard>

        {/* Footer */}
        <p className="mt-5 text-center text-[10px] text-luxury-muted/70 tracking-wide">
          SIDHESHWAR JEWELLERS SARAFA ERP &bull; EST. 1994
        </p>
      </div>
    </div>
  );
}
