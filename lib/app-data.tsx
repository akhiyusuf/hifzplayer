"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchChapters, fetchRecitations } from "./api";
import { KEYS } from "./constants";
import { getStore, setStore } from "./storage";
import type { Chapter, Recitation, Recent } from "./types";

type Status = "loading" | "ready" | "error";

type AppData = {
  chapters: Chapter[];
  recitations: Recitation[];
  status: Status;
  reload: () => void;
  reciterId: number | null;
  setReciterId: (id: number) => void;
  reciterName: (id: number | null | undefined) => string;
  recents: Recent[];
  pushRecent: (r: Recent) => void;
  online: boolean;
};

const Ctx = createContext<AppData | null>(null);

function pickDefaultReciter(list: Recitation[]): number | null {
  const saved = getStore<number>(KEYS.reciter);
  if (saved && list.some((r) => r.id === saved)) return saved;
  const find = (part: string) => list.find((r) => (r.name || "").toLowerCase().includes(part))?.id;
  return find("minshawi") ?? find("husary") ?? find("alafasy") ?? list[0]?.id ?? null;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [recitations, setRecitations] = useState<Recitation[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [reciterId, setReciterIdState] = useState<number | null>(null);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [online, setOnline] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setRecents(getStore<Recent[]>(KEYS.recents) || []);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.all([fetchChapters(), fetchRecitations()])
      .then(([chs, recs]) => {
        if (cancelled) return;
        setChapters(chs);
        setRecitations(recs);
        setReciterIdState((cur) => (cur != null ? cur : pickDefaultReciter(recs)));
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const setReciterId = useCallback((id: number) => {
    setReciterIdState(id);
    setStore(KEYS.reciter, id);
  }, []);

  const reciterName = useCallback(
    (id: number | null | undefined) => recitations.find((r) => r.id === id)?.name || "—",
    [recitations],
  );

  const pushRecent = useCallback((item: Recent) => {
    setRecents((prev) => {
      const next = [
        item,
        ...prev.filter((r) => !(r.chapter === item.chapter && r.from === item.from && r.to === item.to)),
      ].slice(0, 6);
      setStore(KEYS.recents, next);
      return next;
    });
  }, []);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  return (
    <Ctx.Provider
      value={{
        chapters,
        recitations,
        status,
        reload,
        reciterId,
        setReciterId,
        reciterName,
        recents,
        pushRecent,
        online,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppData must be used inside AppDataProvider");
  return v;
}
