"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { PLUS_NAME } from "@/lib/brand";
import { PLUS_COPY, type PlusFeature } from "@/lib/billing/gates";
import { PLUS_STORAGE_KEY } from "@/lib/billing/keys";
import { getStore, setStore } from "@/lib/storage";

type PlusCtx = {
  plus: boolean;
  ready: boolean;
  askPlus: (feature: PlusFeature) => void;
};

const Ctx = createContext<PlusCtx | null>(null);

function cachedPlus() {
  const hit = getStore<{ plus?: boolean; until?: string | null }>(PLUS_STORAGE_KEY);
  if (!hit?.plus) return false;
  if (hit.until && Date.parse(hit.until) <= Date.now()) return false;
  return true;
}

export function PlusProvider({ children }: { children: ReactNode }) {
  const [plus, setPlus] = useState(false);
  const [ready, setReady] = useState(false);
  const [feature, setFeature] = useState<PlusFeature | null>(null);

  useEffect(() => {
    setPlus(cachedPlus());
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/status");
        const data = (await res.json()) as { plus?: boolean };
        if (cancelled) return;
        const on = Boolean(data.plus);
        setPlus(on);
        if (!on) setStore(PLUS_STORAGE_KEY, { plus: false });
      } catch {
        /* keep cache */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const askPlus = useCallback((next: PlusFeature) => setFeature(next), []);
  const dismiss = useCallback(() => setFeature(null), []);
  const value = useMemo(() => ({ plus, ready, askPlus }), [plus, ready, askPlus]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {feature ? <PlusGate feature={feature} onClose={dismiss} /> : null}
    </Ctx.Provider>
  );
}

export function usePlus() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlus must be used inside PlusProvider");
  return v;
}

function PlusGate({ feature, onClose }: { feature: PlusFeature; onClose: () => void }) {
  const copy = PLUS_COPY[feature];
  return (
    <Sheet title={PLUS_NAME} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <span
          className="status-medallion"
          style={{ alignSelf: "center", color: "var(--action-primary)" }}
        >
          <Icon name="sparkles" size={28} />
        </span>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
          <b style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{copy.title}</b>
          <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text-secondary)" }}>{copy.body}</p>
        </div>
        <Link className="btn-primary" href="/pricing" onClick={onClose}>
          See plans
        </Link>
        <button className="btn-secondary" type="button" onClick={onClose}>
          {feature === "focus" ? "Keep looking around" : "Keep using free"}
        </button>
      </div>
    </Sheet>
  );
}
