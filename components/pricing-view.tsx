"use client";

import { useUser } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { clerkBrowserReady } from "@/lib/auth/config";
import type { Catalog, PlanId, RegionId } from "@/lib/billing/plans";

type Processors = { stripe: boolean; paystack: boolean };

export function PricingView(props: {
  initialRegion: RegionId;
  catalog: Catalog;
  processors: Processors;
  canceled?: boolean;
}) {
  if (clerkBrowserReady()) return <PricingViewSigned {...props} />;
  return <PricingForm {...props} accountsOn={false} signedIn={false} accountEmail="" />;
}

function PricingViewSigned(props: {
  initialRegion: RegionId;
  catalog: Catalog;
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

function PricingForm({
  initialRegion,
  catalog: regions,
  processors,
  canceled,
  accountsOn,
  signedIn,
  accountEmail,
}: {
  initialRegion: RegionId;
  catalog: Catalog;
  processors: Processors;
  canceled?: boolean;
  accountsOn: boolean;
  signedIn: boolean;
  accountEmail: string;
}) {
  const [regionId, setRegionId] = useState<RegionId>(initialRegion);
  const [planId, setPlanId] = useState<PlanId>("annual");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(canceled ? "Checkout was canceled. Nothing was charged." : "");

  const region = useMemo(() => regions.find((r) => r.id === regionId) ?? regions[0], [regions, regionId]);
  const selected = region.plans.find((p) => p.planId === planId) ?? region.plans[1];
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
        body: JSON.stringify({ planId, regionId, email: receiptEmail }),
      });
      const data = (await res.json()) as { url?: string; error?: string; code?: string };
      if (data.code === "SIGN_IN_REQUIRED" || res.status === 401) {
        window.location.assign("/sign-in?redirect_url=/pricing");
        return;
      }
      if (!res.ok || !data.url) {
        throw new Error(
          data.error ||
            (res.status === 503
              ? "This payment provider is not configured yet."
              : "Could not start checkout."),
        );
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <div className="pricing">
      <p className="pricing-lead">
        Quran reading, audio, translation, tajweed, masked recall, and relay with one qari stay free. Hifz Plus
        unlocks Focus mode, three or more repeats of any loop, and more than one qari in relay.
      </p>
      <ul className="pricing-includes">
        <li>Focus mode — one phrase at a time</li>
        <li>3×, 5×, 10× and unlimited repeats</li>
        <li>Relay with more than one qari</li>
      </ul>
      <p className="pricing-note">
        Recurring phrases and near-twin words are coming soon, and stay off the paywall.
      </p>

      <label className="pricing-region">
        <span className="label-eyebrow">Price for</span>
        <span className="select-box">
          {region.label}
          <Icon name="chevron-down" size={16} />
          <select
            value={regionId}
            aria-label="Price region"
            onChange={(e) => setRegionId(e.target.value as RegionId)}
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} · {r.currency}
              </option>
            ))}
          </select>
        </span>
      </label>

      <p className="pricing-processor">
        <Icon name="credit-card" size={14} />
        {region.processor === "paystack" ? "Paystack" : "Stripe"} · {region.currency}
      </p>

      <div className="pricing-plans" role="radiogroup" aria-label="Plan">
        {region.plans.map((plan) => {
          const on = plan.planId === planId;
          return (
            <button
              key={plan.planId}
              type="button"
              role="radio"
              aria-checked={on}
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
          {region.processor === "paystack" ? "Paystack" : "Stripe"} keys are not on this deployment yet.
          Checkout for this region will open once they are added.
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
        You will finish payment on {region.processor === "paystack" ? "Paystack" : "Stripe"}. Card details never
        touch Hifz servers. Quran reading stays free either way.
      </p>
    </div>
  );
}
