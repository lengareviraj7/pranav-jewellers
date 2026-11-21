"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sj_theme") as Theme | null;
      const initialTheme: Theme = saved === "light" ? "light" : "dark";
      setThemeState(initialTheme);
      applyThemeClass(initialTheme);
    } catch (_) {
      applyThemeClass("dark");
    }
    setMounted(true);
  }, []);

  const applyThemeClass = (t: Theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(t);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem("sj_theme", t);
    } catch (_) {}
    applyThemeClass(t);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
