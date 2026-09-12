"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { PLUS_NAME } from "@/lib/brand";

type GiftState =
  | { status: "working" }
  | { status: "form"; planId: string }
  | { status: "sent"; existingAccount: boolean }
  | { status: "err"; message: string };

export function GiftAssign({ sessionId, reference }: { sessionId: string; reference: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<GiftState>({ status: "working" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionId && !reference) {
        setState({ status: "err", message: "Open this page from checkout after you pay." });
        return;
      }
      try {
        const res = await fetch("/api/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, reference }),
        });
        const data = (await res.json()) as { gift?: boolean; plus?: boolean; planId?: string; error?: string };
        if (cancelled) return;
        if (data.plus && !data.gift) {
          window.location.assign("/pricing/success?granted=1");
          return;
        }
        if (res.status === 401 || data.error?.toLowerCase().includes("sign in")) {
          window.location.assign(
            `/sign-in?redirect_url=${encodeURIComponent(`/pricing/gift?${sessionId ? `session_id=${sessionId}` : `reference=${reference}`}`)}`,
          );
          return;
        }
        if (!res.ok || !data.gift) {
          setState({ status: "err", message: data.error || "This payment is not a gift yet." });
          return;
        }
        setState({ status: "form", planId: data.planId || "plus" });
      } catch {
        if (!cancelled) setState({ status: "err", message: "Could not confirm that gift payment." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, reference]);

  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/billing/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, reference, email }),
      });
      const data = (await res.json()) as { sent?: boolean; existingAccount?: boolean; error?: string };
      if (!res.ok || !data.sent) throw new Error(data.error || "Could not send the gift.");
      setState({ status: "sent", existingAccount: Boolean(data.existingAccount) });
    } catch (err) {
      setState({
        status: "err",
        message: err instanceof Error ? err.message : "Could not send the gift.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (state.status === "working") {
    return (
      <div className="status-block">
        <span className="spinner" aria-hidden="true" />
        <h2>Payment received</h2>
        <p>Confirming the gift. You add their email next — not before you paid.</p>
      </div>
    );
  }

  if (state.status === "sent") {
    return (
      <div className="status-block">
        <span className="status-medallion" style={{ color: "var(--state-success)" }}>
          <Icon name="gift" size={28} />
        </span>
        <h2>Gift sent</h2>
        <p>
          {state.existingAccount
            ? "They already have a Diras account on that email. They should sign in with it — Google is fine if it uses the same address."
            : "They will get an email. They only need to create a Diras account with that same address, with Google or without."}
        </p>
        <div className="status-actions">
          <Link className="btn-primary" href="/">
            Back to reading
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
        <h2>Gift not sent yet</h2>
        <p>{state.message}</p>
        <div className="status-actions">
          <Link className="btn-secondary" href="/pricing">
            Return to pricing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="recover-form" onSubmit={(e) => void send(e)}>
      <span className="label-eyebrow">Gift {PLUS_NAME}</span>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, margin: 0 }}>
        Who is this for?
      </h2>
      <p>
        Payment is done. Add their email now. They will get a note to sign up with that exact address — Google is
        fine if the Google account uses it.
      </p>
      <label className="pricing-email">
        <span className="label-eyebrow">Their email</span>
        <span className="field">
          <input
            type="email"
            name="gift-email"
            autoComplete="email"
            required
            placeholder="them@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </span>
      </label>
      <button className="btn-primary" type="submit" disabled={busy || !email.trim()}>
        {busy ? "Sending…" : "Send the gift"}
      </button>
    </form>
  );
}
