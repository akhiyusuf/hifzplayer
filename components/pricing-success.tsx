"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { PLUS_STORAGE_KEY } from "@/lib/billing/keys";
import { setStore } from "@/lib/storage";

type ConfirmState =
  | { status: "idle" | "working" }
  | { status: "ok"; planId: string; until: string | null }
  | { status: "err"; message: string };

export function PricingSuccess({
  sessionId,
  reference,
}: {
  sessionId: string;
  reference: string;
}) {
  const [state, setState] = useState<ConfirmState>({
    status: sessionId || reference ? "working" : "idle",
  });

  useEffect(() => {
    if (!sessionId && !reference) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, reference }),
        });
        const data = (await res.json()) as {
          plus?: boolean;
          planId?: string;
          until?: string | null;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.plus) {
          setState({ status: "err", message: data.error || "Payment could not be confirmed yet." });
          return;
        }
        setStore(PLUS_STORAGE_KEY, { plus: true, planId: data.planId, until: data.until });
        setState({ status: "ok", planId: data.planId || "plus", until: data.until ?? null });
      } catch {
        if (!cancelled) setState({ status: "err", message: "Could not reach the billing server." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, reference]);

  if (state.status === "working") {
    return (
      <div className="status-block">
        <span className="spinner" aria-hidden="true" />
        <h2>Confirming your payment</h2>
        <p>Checking with the payment provider. This only takes a moment.</p>
      </div>
    );
  }

  if (state.status === "ok") {
    return (
      <div className="status-block">
        <span className="status-medallion" style={{ color: "var(--state-success)" }}>
          <Icon name="sparkles" size={28} />
        </span>
        <h2>Hifz Plus is active</h2>
        <p>
          {state.planId === "lifetime"
            ? "Lifetime access is saved on this device."
            : state.until
              ? `Your ${state.planId} plan is active until ${new Date(state.until).toLocaleDateString()}.`
              : `Your ${state.planId} plan is active on this device.`}
        </p>
        <div className="status-actions">
          <Link className="btn-primary" href="/">
            Back to reading
          </Link>
          <Link className="btn-secondary" href="/settings">
            Settings
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "err") {
    return (
      <div className="status-block">
        <span className="status-medallion">
          <Icon name="info" size={28} />
        </span>
        <h2>Not confirmed yet</h2>
        <p>{state.message}</p>
        <div className="status-actions">
          <Link className="btn-primary" href="/pricing">
            Return to pricing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="status-block">
      <span className="status-medallion">
        <Icon name="credit-card" size={28} />
      </span>
      <h2>No checkout to confirm</h2>
      <p>Open a plan from the pricing page to pay with Paystack or Stripe.</p>
      <div className="status-actions">
        <Link className="btn-primary" href="/pricing">
          View plans
        </Link>
      </div>
    </div>
  );
}
