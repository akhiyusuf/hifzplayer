"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import { APP_NAME } from "@/lib/brand";
import { clerkBrowserReady } from "@/lib/auth/config";
import { PLUS_EXPLAIN } from "@/lib/billing/gates";
import type { Catalog, PlanId } from "@/lib/billing/plans";

type Processors = { stripe: boolean; paystack: boolean };
type RegionQuote = Catalog[number];

export function PricingView(props: {
  region: RegionQuote;
  processors: Processors;
  canceled?: boolean;
}) {
  if (clerkBrowserReady()) return <PricingViewSigned {...props} />;
  return <PricingForm {...props} accountsOn={false} signedIn={false} accountEmail="" />;
}

function PricingViewSigned(props: {
  region: RegionQuote;
  processors: Processors;
  canceled?: boolean;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  return (
    <PricingForm
      {...props}
      accountsOn
      signedIn={Boolean(isLoaded && isSignedIn)}
      accountEmail={user?.primaryEmailAddress?.emailAddress || ""}
    />
  );
}

function checkoutError(data: { error?: string; code?: string }, status: number) {
  if (data.code === "PROCESSOR_NOT_CONFIGURED" || status === 503) {
    return "Checkout isn’t ready on this deployment yet.";
  }
  return data.error || "Could not start checkout.";
}

function PricingForm({
  region,
  processors,
  canceled,
  accountsOn,
  signedIn,
  accountEmail,
}: {
  region: RegionQuote;
  processors: Processors;
  canceled?: boolean;
  accountsOn: boolean;
  signedIn: boolean;
  accountEmail: string;
}) {
  const [planId, setPlanId] = useState<PlanId>("annual");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(canceled ? "Checkout was canceled. Nothing was charged." : "");

  const selected = useMemo(
    () => region.plans.find((p) => p.planId === planId) ?? region.plans[1],
    [region, planId],
  );
  const ready = region.processor === "paystack" ? processors.paystack : processors.stripe;
  const receiptEmail = accountEmail || email;

  async function checkout() {
    setError("");
    if (accountsOn && !signedIn) {
      window.location.assign("/sign-in?redirect_url=/pricing");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, email: receiptEmail }),
      });
      const data = (await res.json()) as { url?: string; error?: string; code?: string };
      if (data.code === "SIGN_IN_REQUIRED" || res.status === 401) {
        window.location.assign("/sign-in?redirect_url=/pricing");
        return;
      }
      if (!res.ok || !data.url) throw new Error(checkoutError(data, res.status));
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <div className="pricing">
      <header className="pricing-hero">
        <p className="pricing-lead">{PLUS_EXPLAIN.lead}</p>
      </header>

      <div className="pricing-split">
        <section className="pricing-split-col">
          <span className="label-eyebrow">{PLUS_EXPLAIN.freeTitle}</span>
          <ul>
            {PLUS_EXPLAIN.free.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <section className="pricing-split-col plus">
          <span className="label-eyebrow">{PLUS_EXPLAIN.plusTitle}</span>
          <ul>
            {PLUS_EXPLAIN.plus.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="pricing-buy">
        <div className="pricing-plans" role="radiogroup" aria-label="Plan">
          {region.plans.map((plan) => {
            const on = plan.planId === planId;
            return (
              <button
                key={plan.planId}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${plan.name}, ${plan.label}`}
                className={`pricing-card${on ? " on" : ""}`}
                onClick={() => setPlanId(plan.planId)}
              >
                <span className="pricing-card-top">
                  <b>{plan.name}</b>
                  {plan.planId === "annual" ? <span className="badge-beta">Best value</span> : null}
                </span>
                <strong className="pricing-price">{plan.label}</strong>
                <span className="pricing-blurb">{plan.blurb}</span>
              </button>
            );
          })}
        </div>

        {accountsOn && signedIn && accountEmail ? (
          <p className="pricing-note">Receipt goes to {accountEmail}.</p>
        ) : accountsOn && !signedIn ? (
          <p className="pricing-note">Sign in first so Plus is stored on your account, not only this browser.</p>
        ) : (
          <label className="pricing-email">
            <span className="label-eyebrow">Email for receipt</span>
            <span className="field">
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </span>
          </label>
        )}

        {!ready ? (
          <p className="pricing-note" role="status">
            Checkout isn’t ready on this deployment yet.
          </p>
        ) : null}

        {error ? (
          <p className="pricing-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="btn-primary" type="button" disabled={busy || !ready} onClick={() => void checkout()}>
          {busy
            ? "Opening checkout…"
            : accountsOn && !signedIn
              ? `Sign in to continue · ${selected.label}`
              : `Continue · ${selected.label}`}
        </button>

        <p className="pricing-foot">
          Card details never touch {APP_NAME}. Quran reading stays free either way.
        </p>
      </div>

      <p className="pricing-soon">
        Recurring phrases and near-twin words are coming soon, and stay free. Ask the Quran will be {PLUS_EXPLAIN.plusTitle}.{" "}
        <Link href="/roadmap">See what&apos;s coming</Link>
      </p>
    </div>
  );
}
