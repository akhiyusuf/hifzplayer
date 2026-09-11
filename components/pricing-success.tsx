"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { APP_NAME, PLUS_NAME } from "@/lib/brand";
import { PLUS_STORAGE_KEY } from "@/lib/billing/keys";
import { setStore } from "@/lib/storage";

type ConfirmState =
  | { status: "idle" | "working" }
  | { status: "ok"; planId: string; until: string | null }
  | { status: "err"; message: string };

async function confirmPayment(opts: { sessionId: string; reference: string }) {
  let lastMessage = "Payment could not be confirmed yet.";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("/api/billing/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    const data = (await res.json()) as {
      plus?: boolean;
      planId?: string;
      until?: string | null;
      error?: string;
    };
    if (res.ok && data.plus) return data;
    lastMessage = data.error || lastMessage;
    if (res.status !== 402 && res.status !== 502) break;
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
  }
  throw new Error(lastMessage);
}

export function PricingSuccess({
  sessionId,
  reference,
  granted,
  grantedPlan,
}: {
  sessionId: string;
  reference: string;
  granted?: boolean;
  grantedPlan?: string;
}) {
  const [paste, setPaste] = useState("");
  const [state, setState] = useState<ConfirmState>(() => {
    if (granted) return { status: "ok", planId: grantedPlan || "plus", until: null };
    if (sessionId || reference) return { status: "working" };
    return { status: "idle" };
  });

  useEffect(() => {
    if (!sessionId && !reference) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await confirmPayment({ sessionId, reference });
        if (cancelled) return;
        setStore(PLUS_STORAGE_KEY, { plus: true, planId: data.planId, until: data.until });
        setState({ status: "ok", planId: data.planId || "plus", until: data.until ?? null });
      } catch (err) {
        if (cancelled) return;
        if (granted) return;
        setState({
          status: "err",
          message: err instanceof Error ? err.message : "Could not reach the billing server.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, reference, granted]);

  async function recover(event: FormEvent) {
    event.preventDefault();
    const value = paste.trim();
    if (!value) return;
    setState({ status: "working" });
    try {
      const looksStripe = value.startsWith("cs_");
      const data = await confirmPayment({
        sessionId: looksStripe ? value : "",
        reference: looksStripe ? "" : value,
      });
      setStore(PLUS_STORAGE_KEY, { plus: true, planId: data.planId, until: data.until });
      setState({ status: "ok", planId: data.planId || "plus", until: data.until ?? null });
    } catch (err) {
      setState({
        status: "err",
        message: err instanceof Error ? err.message : "Could not confirm that reference.",
      });
    }
  }

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
        <h2>{PLUS_NAME} is active</h2>
        <p>
          {state.planId === "lifetime"
            ? "Lifetime access is saved on your account."
            : state.until
              ? `Your ${state.planId} plan is active until ${new Date(state.until).toLocaleDateString()}.`
              : `Your ${state.planId} plan is active.`}{" "}
          A {APP_NAME} confirmation email follows this — separate from the Paystack or Stripe receipt.
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

  const recoverForm = (
    <form className="recover-form" onSubmit={(e) => void recover(e)}>
      <p>
        Paid on Paystack or Stripe but Plus did not turn on? Paste the transaction reference from your receipt
        (Paystack) or the checkout session id (Stripe).
      </p>
      <label className="pricing-email">
        <span className="label-eyebrow">Payment reference</span>
        <span className="field">
          <input
            name="reference"
            autoComplete="off"
            placeholder="Paystack reference"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
        </span>
      </label>
      <button className="btn-primary" type="submit" disabled={!paste.trim()}>
        Confirm this payment
      </button>
    </form>
  );

  if (state.status === "err") {
    return (
      <div className="status-block">
        <span className="status-medallion">
          <Icon name="info" size={28} />
        </span>
        <h2>Not confirmed yet</h2>
        <p>{state.message}</p>
        {sessionId || reference ? (
          <div className="status-actions">
            <button
              className="btn-primary"
              type="button"
              onClick={() => {
                setState({ status: "working" });
                void confirmPayment({ sessionId, reference })
                  .then((data) => {
                    setStore(PLUS_STORAGE_KEY, { plus: true, planId: data.planId, until: data.until });
                    setState({ status: "ok", planId: data.planId || "plus", until: data.until ?? null });
                  })
                  .catch((err) =>
                    setState({
                      status: "err",
                      message: err instanceof Error ? err.message : "Could not confirm yet.",
                    }),
                  );
              }}
            >
              Try again
            </button>
          </div>
        ) : null}
        {recoverForm}
        <div className="status-actions">
          <Link className="btn-secondary" href="/pricing">
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
      <p>Open a plan from the pricing page, or paste a receipt reference if you already paid.</p>
      {recoverForm}
      <div className="status-actions">
        <Link className="btn-primary" href="/pricing">
          View plans
        </Link>
      </div>
    </div>
  );
}
