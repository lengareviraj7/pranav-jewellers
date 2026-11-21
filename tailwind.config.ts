import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          // ── Obsidian & Dark Graphite Surfaces ──
          obsidian: "#09090C",
          "obsidian-elevated": "#0F0E14",
          graphite: "#16151E",
          "graphite-card": "#1C1B26",
          "graphite-border": "rgba(255, 255, 255, 0.08)",
          "graphite-hover": "#242332",

          // ── 22K Warm Champagne Gold Spectrum ──
          gold: "#C9A84C",
          "gold-champagne": "#E5C583",
          "gold-bright": "#F3DB9E",
          "gold-dark": "#9E7B28",
          "gold-hover": "#D8B75B",
          "gold-subtle": "rgba(201, 168, 76, 0.12)",
          "gold-border": "rgba(201, 168, 76, 0.35)",

          // ── Silver Metallic Spectrum ──
          silver: "#C0C4CC",
          "silver-bright": "#E8ECF2",
          "silver-dark": "#7E8492",
          "silver-subtle": "rgba(192, 196, 204, 0.12)",
          "silver-border": "rgba(192, 196, 204, 0.30)",

          // ── Deep Velvet Onyx Legacy ──
          onyx: "#0B0A0E",
          "onyx-surface": "#15141C",
          "onyx-light": "#201F2B",
          charcoal: "#F2EFE9",
          "charcoal-muted": "#9E9993",

          // ── Neutral Canvas (Dark Mode Primary) ──
          ivory: "#0A090D",
          cream: "#14131B",
          champagne: "rgba(229, 197, 131, 0.20)",
          beige: "rgba(255, 255, 255, 0.08)",
          white: "#FFFFFF",
          muted: "#9E9993",

          // ── Semantic colors ──
          success: "#10B981", // Professional emerald green
          "success-subtle": "rgba(16, 185, 129, 0.12)",
          "success-border": "rgba(16, 185, 129, 0.30)",
          warning: "#F59E0B", // Controlled amber
          "warning-subtle": "rgba(245, 158, 11, 0.12)",
          "warning-border": "rgba(245, 158, 11, 0.30)",
          danger: "#EF4444",  // Clear red
          "danger-subtle": "rgba(239, 68, 68, 0.12)",
          "danger-border": "rgba(239, 68, 68, 0.30)",
        },
        border: "rgba(255, 255, 255, 0.08)",
        background: "#0A090D",
        foreground: "#F2EFE9",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Cinzel", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        // Luxury depth system
        luxury: "0 1px 4px rgba(15,13,10,0.04), 0 2px 8px rgba(201,168,76,0.06)",
        "luxury-md": "0 4px 16px rgba(15,13,10,0.06), 0 2px 8px rgba(201,168,76,0.08)",
        "luxury-lg": "0 12px 32px rgba(15,13,10,0.10), 0 4px 12px rgba(201,168,76,0.14)",
        "luxury-xl": "0 24px 64px rgba(15,13,10,0.14), 0 8px 24px rgba(201,168,76,0.18)",
        "gold-glow": "0 0 0 1px rgba(201,168,76,0.3), 0 0 20px rgba(201,168,76,0.2)",
        "gold-glow-lg": "0 0 0 2px rgba(201,168,76,0.4), 0 0 32px rgba(201,168,76,0.3)",
        "inset-gold": "inset 0 1px 0 rgba(201,168,76,0.2)",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #8B6914 0%, #C9A84C 50%, #8B6914 100%)",
        "gold-gradient-h": "linear-gradient(90deg, #8B6914 0%, #E8C97A 50%, #8B6914 100%)",
        "onyx-gradient": "linear-gradient(135deg, #0F0D0A 0%, #1A1714 50%, #0F0D0A 100%)",
        "ivory-gradient": "linear-gradient(180deg, #FAF7F2 0%, #FFFFFF 100%)",
      },
      animation: {
        "fadeInUp": "fadeInUp 0.35s ease-out both",
        "fadeIn": "fadeIn 0.25s ease-out both",
        "scaleIn": "scaleIn 0.25s ease-out both",
        "slideInRight": "slideInRight 0.3s ease-out both",
        "slideDown": "slideDown 0.25s ease-out both",
        "shimmer": "shimmer 3s linear infinite",
        "goldPulse": "goldPulse 2s infinite",
        "spin": "spin 1s linear infinite",
        "ping": "ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        goldPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(201,168,76,0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(201,168,76,0)" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        ping: {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
      },
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
