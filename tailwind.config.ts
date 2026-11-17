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
          // Rich Jeweller's Gold Spectrum
          gold: "#C89B38", // Royal Jeweller's Gold (Primary Accent)
          "gold-light": "#F0E4C8", // Soft Champagne Light Gold
          "gold-bright": "#DDB455", // Bright 24K Lustre
          "gold-dark": "#9A7220", // Deep Antique Gold (High Contrast)
          "gold-hover": "#B38728", // Hover State Gold
          "gold-subtle": "#FAF5EB", // Ultra Soft Gold Wash

          // Deep Velvet Onyx & Obsidian (The Jeweller's Velvet Base - No Green)
          onyx: "#14120E", // Deepest Jeweller's Black
          "onyx-surface": "#1F1B16", // Card Header & Elevated Surfaces
          "onyx-light": "#2E2822",
          charcoal: "#292524", // Secondary Charcoal Text

          // Neutral Luxury Canvas
          ivory: "#F8F6F0", // Warm Cashmere Alabaster Background
          white: "#FFFFFF", // Crisp White Cards
          beige: "#E6DFD3", // Subtle Gold-Beige Hairline Borders
          muted: "#78716C", // Warm Bronze-Stone Secondary Text

          // Aliases for seamless migration (strictly non-green!)
          green: "#1E1B16", // Mapped to Deep Velvet Onyx (zero green!)
          "green-dark": "#14120E",
          "green-light": "#2E2822",
        },
        border: "#E6DFD3",
        background: "#F8F6F0",
        foreground: "#1C1917",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Cinzel", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        luxury: "0 2px 10px rgba(20, 18, 14, 0.04), 0 1px 3px rgba(200, 155, 56, 0.06)",
        "luxury-lg": "0 10px 30px rgba(20, 18, 14, 0.08), 0 3px 10px rgba(200, 155, 56, 0.1)",
        "gold-glow": "0 0 20px rgba(200, 155, 56, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
