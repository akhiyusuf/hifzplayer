"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
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
import { clerkBrowserReady } from "@/lib/auth/config";
import { PLUS_NAME } from "@/lib/brand";
import { PLUS_COPY, type PlusFeature } from "@/lib/billing/gates";
import { PLUS_STORAGE_KEY } from "@/lib/billing/keys";
import { trialSignInHref, trialSignUpHref } from "@/lib/billing/trial-path";
import { getStore, setStore } from "@/lib/storage";

type PlusCtx = {
  plus: boolean;
  ready: boolean;
  trialAvailable: boolean;
  askPlus: (feature: PlusFeature) => void;
  startTrial: () => Promise<boolean>;
  refreshPlus: () => Promise<void>;
};

export const PLUS_GATE_EVENT = "hifz:plus-gate";

const Ctx = createContext<PlusCtx | null>(null);

function cachedPlus() {
  const hit = getStore<{ plus?: boolean; until?: string | null }>(PLUS_STORAGE_KEY);
  if (!hit?.plus) return false;
  if (hit.until && Date.parse(hit.until) <= Date.now()) return false;
  return true;
}

/** Dev-only: sessionStorage hifz.plus.preview=1. Compiled out of production. */
function previewPlus() {
  if (process.env.NODE_ENV !== "development") return false;
  try {
    return sessionStorage.getItem("hifz.plus.preview") === "1";
  } catch {
    return false;
  }
}

type StatusPayload = {
  plus?: boolean;
  until?: string | null;
  planId?: string | null;
  trialAvailable?: boolean;
};

export function PlusProvider({ children }: { children: ReactNode }) {
  if (clerkBrowserReady()) return <PlusProviderSigned>{children}</PlusProviderSigned>;
  return <PlusProviderInner accountsOn={false} clerkLoaded signedIn={false}>{children}</PlusProviderInner>;
}

function PlusProviderSigned({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  return (
    <PlusProviderInner accountsOn clerkLoaded={isLoaded} signedIn={Boolean(isLoaded && isSignedIn)}>
      {children}
    </PlusProviderInner>
  );
}

function PlusProviderInner({
  children,
  accountsOn,
  clerkLoaded,
  signedIn,
}: {
  children: ReactNode;
  accountsOn: boolean;
  clerkLoaded: boolean;
  signedIn: boolean;
}) {
  const [plus, setPlus] = useState(false);
  const [ready, setReady] = useState(false);
  const [trialAvailable, setTrialAvailable] = useState(false);
  const [feature, setFeature] = useState<PlusFeature | null>(null);
  const [trialBusy, setTrialBusy] = useState(false);
  const [trialError, setTrialError] = useState("");

  const applyStatus = useCallback((data: StatusPayload) => {
    const on = previewPlus() || Boolean(data.plus);
    setPlus(on);
    setTrialAvailable(!on && Boolean(data.trialAvailable));
    if (on) {
      setStore(PLUS_STORAGE_KEY, { plus: true, until: data.until ?? null, planId: data.planId ?? null });
    } else {
      setStore(PLUS_STORAGE_KEY, { plus: false });
    }
  }, []);

  const refreshPlus = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status");
      const data = (await res.json()) as StatusPayload;
      applyStatus(data);
    } catch {
      /* keep cache */
    }
  }, [applyStatus]);

  useEffect(() => {
    setPlus(cachedPlus() || previewPlus());
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/status");
        const data = (await res.json()) as StatusPayload;
        if (cancelled) return;
        applyStatus(data);
      } catch {
        /* keep cache */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyStatus]);

  const askPlus = useCallback((next: PlusFeature) => {
    setTrialError("");
    setFeature(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(PLUS_GATE_EVENT));
    }
  }, []);

  const startTrial = useCallback(async () => {
    if (accountsOn && !clerkLoaded) return false;
    if (!signedIn) {
      window.location.assign(trialSignInHref());
      return false;
    }
    setTrialBusy(true);
    setTrialError("");
    try {
      const res = await fetch("/api/billing/trial", { method: "POST" });
      const data = (await res.json()) as StatusPayload & { error?: string; code?: string };
      if (data.code === "SIGN_IN_REQUIRED" || res.status === 401) {
        window.location.assign(trialSignInHref());
        return false;
      }
      if (!res.ok) {
        setTrialError(data.error || "Could not start the free trial.");
        return false;
      }
      applyStatus({ ...data, trialAvailable: false });
      setFeature(null);
      return true;
    } catch {
      setTrialError("Could not start the free trial.");
      return false;
    } finally {
      setTrialBusy(false);
    }
  }, [accountsOn, applyStatus, clerkLoaded, signedIn]);

  const dismiss = useCallback(() => {
    setFeature(null);
    setTrialError("");
  }, []);

  const value = useMemo(
    () => ({ plus, ready, trialAvailable, askPlus, startTrial, refreshPlus }),
    [plus, ready, trialAvailable, askPlus, startTrial, refreshPlus],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {feature ? (
        <PlusGate
          feature={feature}
          trialAvailable={trialAvailable}
          trialBusy={trialBusy}
          trialError={trialError}
          signedIn={signedIn}
          clerkLoaded={clerkLoaded}
          accountsOn={accountsOn}
          onStartTrial={() => void startTrial()}
          onClose={dismiss}
        />
      ) : null}
    </Ctx.Provider>
  );
}

export function usePlus() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlus must be used inside PlusProvider");
  return v;
}

function PlusGate({
  feature,
  trialAvailable,
  trialBusy,
  trialError,
  signedIn,
  clerkLoaded,
  accountsOn,
  onStartTrial,
  onClose,
}: {
  feature: PlusFeature;
  trialAvailable: boolean;
  trialBusy: boolean;
  trialError: string;
  signedIn: boolean;
  clerkLoaded: boolean;
  accountsOn: boolean;
  onStartTrial: () => void;
  onClose: () => void;
}) {
  const copy = PLUS_COPY[feature];
  const showTrial = trialAvailable && (!accountsOn || clerkLoaded);
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
        {trialError ? (
          <p className="pricing-error" role="alert">
            {trialError}
          </p>
        ) : null}
        {showTrial ? (
          signedIn ? (
            <button className="btn-primary" type="button" disabled={trialBusy} onClick={onStartTrial}>
              {trialBusy ? "Starting trial…" : "Try free for 1 day"}
            </button>
          ) : (
            <>
              <Link className="btn-primary" href={trialSignInHref()} onClick={onClose}>
                Sign in to try free for 1 day
              </Link>
              <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                New here?{" "}
                <Link href={trialSignUpHref()} onClick={onClose} style={{ color: "inherit", fontWeight: 600 }}>
                  Create an account
                </Link>
                . No card required. One trial per account.
              </p>
            </>
          )
        ) : null}
        <Link
          className={trialAvailable ? "btn-secondary" : "btn-primary"}
          href="/pricing"
          onClick={onClose}
        >
          See plans
        </Link>
        <button className="btn-secondary" type="button" onClick={onClose}>
          {feature === "focus" || feature === "playlists" ? "Keep looking around" : "Keep using free"}
        </button>
      </div>
    </Sheet>
  );
}
