"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "vaulten_admin_theme";

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}
const ThemeContext = createContext<ThemeState | null>(null);

function apply(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  document.documentElement.style.colorScheme = t;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document !== "undefined") {
      const cur = document.documentElement.getAttribute("data-theme");
      if (cur === "dark" || cur === "light") return cur;
    }
    return "light";
  });
  useEffect(() => apply(theme), [theme]);
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);
  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}

/** Render-blocking snippet: stamps the stored theme before first paint (no white flash). */
export function ThemeScript() {
  const code = `(function(){try{var k="${STORAGE_KEY}",v=localStorage.getItem(k);if(v!=="dark"&&v!=="light"){v=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",v);document.documentElement.style.colorScheme=v}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
