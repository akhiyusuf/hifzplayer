"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { KEYS } from "./constants";
import { DEFAULT_PALETTE, PALETTE_IDS, parsePalette, type PaletteId } from "./palettes";
import { setStore } from "./storage";

type ThemeValue = {
  dark: boolean;
  toggle: () => void;
  setDark: (next: boolean) => void;
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
};

const ThemeContext = createContext<ThemeValue>({
  dark: false,
  toggle: () => {},
  setDark: () => {},
  palette: DEFAULT_PALETTE,
  setPalette: () => {},
});

function applyTheme(dark: boolean, palette: PaletteId) {
  const root = document.documentElement;
  root.setAttribute("data-theme", dark ? "dark" : "light");
  root.setAttribute("data-palette", palette);
}

function readDarkFromDom() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function readPaletteFromDom(): PaletteId {
  return parsePalette(document.documentElement.getAttribute("data-palette"));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState(false);
  const [palette, setPaletteState] = useState<PaletteId>(DEFAULT_PALETTE);

  useEffect(() => {
    setDarkState(readDarkFromDom());
    setPaletteState(readPaletteFromDom());
  }, []);

  const setDark = useCallback((next: boolean) => {
    // Read palette from the DOM so we never lose a concurrent colour change.
    // Apply + persist outside setState so React Strict Mode cannot double-flip.
    applyTheme(next, readPaletteFromDom());
    setStore(KEYS.dark, next);
    setDarkState(next);
  }, []);

  const toggle = useCallback(() => {
    // Prefer the live DOM attribute over React state so a click before the
    // mount sync (or after a forced storage write) still lands on the right value.
    setDark(!readDarkFromDom());
  }, [setDark]);

  const setPalette = useCallback((next: PaletteId) => {
    const id = parsePalette(next);
    const night = readDarkFromDom();
    setPaletteState(id);
    applyTheme(night, id);
    setStore(KEYS.palette, id);
  }, []);

  const value = useMemo(
    () => ({ dark, toggle, setDark, palette, setPalette }),
    [dark, toggle, setDark, palette, setPalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export const themeInitScript = `(function(){try{var r=document.documentElement;var v=localStorage.getItem(${JSON.stringify(KEYS.dark)});var d=v?JSON.parse(v):false;r.setAttribute("data-theme",d?"dark":"light");var p=localStorage.getItem(${JSON.stringify(KEYS.palette)});p=p?JSON.parse(p):${JSON.stringify(DEFAULT_PALETTE)};if(${JSON.stringify(PALETTE_IDS)}.indexOf(p)<0)p=${JSON.stringify(DEFAULT_PALETTE)};r.setAttribute("data-palette",p);}catch(e){document.documentElement.setAttribute("data-theme","light");document.documentElement.setAttribute("data-palette",${JSON.stringify(DEFAULT_PALETTE)});}})();`;
