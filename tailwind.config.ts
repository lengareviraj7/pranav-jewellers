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
          green: "#183A35", // Deep Forest Green (Primary)
          "green-dark": "#0F2622",
          "green-light": "#234F49",
          charcoal: "#252522", // Secondary Charcoal
          gold: "#C5A46D", // Champagne Gold (Accent)
          "gold-light": "#E3CFA8",
          "gold-dark": "#A8874E",
          ivory: "#F7F5F0", // Warm Ivory (Background)
          white: "#FFFFFF", // Pure White cards
          beige: "#E8E1D5", // Soft Beige borders
          muted: "#77766F", // Muted text
        },
        border: "#E8E1D5",
        background: "#F7F5F0",
        foreground: "#252522",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Cinzel", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        luxury: "0 2px 10px rgba(24, 58, 53, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)",
        "luxury-lg": "0 10px 30px rgba(24, 58, 53, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
