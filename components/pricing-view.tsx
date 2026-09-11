"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import type { Catalog, PlanId, RegionId } from "@/lib/billing/plans";

type Processors = { stripe: boolean; paystack: boolean };

export function PricingView({
  initialRegion,
  catalog: regions,
  processors,
  canceled,
}: {
  initialRegion: RegionId;
  catalog: Catalog;
  processors: Processors;
  canceled?: boolean;
}) {
  const [regionId, setRegionId] = useState<RegionId>(initialRegion);
  const [planId, setPlanId] = useState<PlanId>("annual");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(canceled ? "Checkout was canceled. Nothing was charged." : "");

  const region = useMemo(() => regions.find((r) => r.id === regionId) ?? regions[0], [regions, regionId]);
  const selected = region.plans.find((p) => p.planId === planId) ?? region.plans[1];
  const ready = region.processor === "paystack" ? processors.paystack : processors.stripe;

  async function checkout() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, regionId, email }),
      });
      const data = (await res.json()) as { url?: string; error?: string; code?: string };
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
        Hifz Plus is optional. Quran text, audio, and study tools stay free. Plus is a way to support the
        project on a plan that matches where you pay from.
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
        {busy ? "Opening checkout…" : `Continue · ${selected.label}`}
      </button>

      <p className="pricing-foot">
        You will finish payment on {region.processor === "paystack" ? "Paystack" : "Stripe"}. Card details never
        touch Hifz servers. Quran reading stays free either way.
      </p>
    </div>
  );
}
