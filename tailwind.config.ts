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
          // ── 22K Warm Jewelry Gold Spectrum ──
          gold: "#C9A84C",           // Primary jewelry gold
          "gold-bright": "#E8C97A",  // Shimmer / hover
          "gold-dark": "#8B6914",    // Deep antique text
          "gold-hover": "#B5921E",   // Button hover
          "gold-subtle": "#FAF4E6",  // Ultra soft wash
          "gold-champagne": "#F0E4C4", // Borders & dividers

          // ── Deep Velvet Onyx (Jewelry Display Case) ──
          onyx: "#0F0D0A",           // Deepest black
          "onyx-surface": "#1A1714", // Elevated surfaces
          "onyx-light": "#2A2420",   // Charcoal variant
          charcoal: "#2A2420",       // Primary body text

          // ── Neutral Luxury Canvas ──
          ivory: "#FAF7F2",          // Warm page background
          cream: "#F5EFE0",          // Card backgrounds
          champagne: "#EDE0C4",      // Borders / hairlines
          beige: "#E8DED0",          // Subtle separators
          white: "#FFFFFF",          // Pure white
          muted: "#6B6460",          // Secondary text

          // ── Semantic colors ──
          green: "#1A1714",          // Mapped to onyx (no green!)
          "green-dark": "#0F0D0A",
          "green-light": "#2A2420",
        },
        border: "#E8DED0",
        background: "#FAF7F2",
        foreground: "#2A2420",
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
