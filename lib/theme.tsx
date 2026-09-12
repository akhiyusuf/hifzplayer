"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { KEYS } from "./constants";
import { DEFAULT_PALETTE, PALETTE_IDS, parsePalette, type PaletteId } from "./palettes";
import { setStore } from "./storage";

type ThemeValue = {
  dark: boolean;
  toggle: () => void;
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
};

const ThemeContext = createContext<ThemeValue>({
  dark: false,
  toggle: () => {},
  palette: DEFAULT_PALETTE,
  setPalette: () => {},
});

function applyTheme(dark: boolean, palette: PaletteId) {
  const root = document.documentElement;
  root.setAttribute("data-theme", dark ? "dark" : "light");
  root.setAttribute("data-palette", palette);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [palette, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE);

  useEffect(() => {
    const root = document.documentElement;
    setDark(root.getAttribute("data-theme") === "dark");
    setPaletteState(parsePalette(root.getAttribute("data-palette")));
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      const current = parsePalette(document.documentElement.getAttribute("data-palette"));
      applyTheme(next, current);
      setStore(KEYS.dark, next);
      return next;
    });
  }, []);

  const setPalette = useCallback((next: PaletteId) => {
    const id = parsePalette(next);
    const night = document.documentElement.getAttribute("data-theme") === "dark";
    setPaletteState(id);
    applyTheme(night, id);
    setStore(KEYS.palette, id);
  }, []);

  const value = useMemo(
    () => ({ dark, toggle, palette, setPalette }),
    [dark, toggle, palette, setPalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export const themeInitScript = `(function(){try{var r=document.documentElement;var v=localStorage.getItem(${JSON.stringify(KEYS.dark)});var d=v?JSON.parse(v):false;r.setAttribute("data-theme",d?"dark":"light");var p=localStorage.getItem(${JSON.stringify(KEYS.palette)});p=p?JSON.parse(p):${JSON.stringify(DEFAULT_PALETTE)};if(${JSON.stringify(PALETTE_IDS)}.indexOf(p)<0)p=${JSON.stringify(DEFAULT_PALETTE)};r.setAttribute("data-palette",p);}catch(e){document.documentElement.setAttribute("data-theme","light");document.documentElement.setAttribute("data-palette",${JSON.stringify(DEFAULT_PALETTE)});}})();`;
