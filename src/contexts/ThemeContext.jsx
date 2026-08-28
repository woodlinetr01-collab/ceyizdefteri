import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);
const KEY = "ceyiz_defteri_theme";

export function ThemeProvider({ children }) {
  const [pref, setPref] = useState(() => localStorage.getItem(KEY) || "system");

  useEffect(() => {
    localStorage.setItem(KEY, pref);
    const apply = () => {
      const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      const resolved = pref === "system" ? system : pref;
      document.documentElement.setAttribute("data-theme", resolved);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (pref === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [pref]);

  return <ThemeCtx.Provider value={{ pref, setPref }}>{children}</ThemeCtx.Provider>;
}
