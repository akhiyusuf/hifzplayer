"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { KEYS } from "./constants";
import { setStore } from "./storage";

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);
  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      setStore(KEYS.dark, next);
      return next;
    });
  }, []);
  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export const themeInitScript = `(function(){try{var v=localStorage.getItem(${JSON.stringify(KEYS.dark)});var d=v?JSON.parse(v):false;document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
