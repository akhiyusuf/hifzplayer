"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import { APP_NAME } from "@/lib/brand";
import { clerkBrowserReady } from "@/lib/auth/config";
import { PLUS_EXPLAIN } from "@/lib/billing/gates";
import { GIFT_SEATS, parseGiftEmails } from "@/lib/billing/gift";
import { formatMoney, type Catalog, type PlanId } from "@/lib/billing/plans";

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
  const [gift, setGift] = useState(false);
  const [giftSeats, setGiftSeats] = useState(1);
  const [giftEmails, setGiftEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(canceled ? "Checkout was canceled. Nothing was charged." : "");

  const selected = useMemo(
    () => region.plans.find((p) => p.planId === planId) ?? region.plans[1],
    [region, planId],
  );
  const ready = region.processor === "paystack" ? processors.paystack : processors.stripe;
  const receiptEmail = accountEmail || email;
  const parsedGiftEmails = parseGiftEmails(giftEmails);
  const giftTotal = formatMoney(selected.amount * giftSeats, region.currency);

  function setSeats(n: number) {
    const seats = Math.min(GIFT_SEATS, Math.max(1, n));
    setGiftSeats(seats);
  }

  function onGiftEmailsChange(value: string) {
    setGiftEmails(value);
    const n = parseGiftEmails(value).length;
    if (n > giftSeats && n <= GIFT_SEATS) setGiftSeats(n);
  }

  async function checkout() {
    setError("");
    if (accountsOn && !signedIn) {
      window.location.assign("/sign-in?redirect_url=/pricing");
      return;
    }
    setBusy(true);
    try {
      if (gift) {
        const look = await fetch("/api/billing/gift-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: giftEmails, seats: giftSeats }),
        });
        const looked = (await look.json()) as { error?: string; code?: string };
        if (looked.code === "SIGN_IN_REQUIRED" || look.status === 401) {
          window.location.assign("/sign-in?redirect_url=/pricing");
          return;
        }
        if (!look.ok) throw new Error(looked.error || "Could not check those emails.");
      }
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          email: receiptEmail,
          gift,
          ...(gift ? { recipientEmails: parsedGiftEmails, seats: giftSeats } : {}),
        }),
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
          <p className="pricing-note">
            {gift
              ? "Sign in to gift someone. Then paste their emails and pay."
              : "Sign in first so Plus is stored on your account, not only this browser."}
          </p>
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

        <div className="pricing-who" role="radiogroup" aria-label="Who is this Plus for">
          <button
            type="button"
            role="radio"
            aria-checked={!gift}
            className={`pricing-who-btn tap${!gift ? " on" : ""}`}
            onClick={() => setGift(false)}
          >
            For me
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={gift}
            className={`pricing-who-btn tap${gift ? " on" : ""}`}
            onClick={() => setGift(true)}
          >
            Gift someone
          </button>
        </div>
        {gift && signedIn ? (
          <>
            <div className="gift-seats" role="radiogroup" aria-label="How many people">
              {Array.from({ length: GIFT_SEATS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={giftSeats === n}
                  className={`gift-seat tap${giftSeats === n ? " on" : ""}`}
                  onClick={() => setSeats(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <label className="pricing-email">
              <span className="label-eyebrow">{giftSeats === 1 ? "Their email" : `${giftSeats} emails`}</span>
              <span className="field">
                <textarea
                  name="gift-emails"
                  rows={Math.min(6, Math.max(3, giftSeats))}
                  required
                  placeholder={giftSeats === 1 ? "them@example.com" : "one email per line, or commas"}
                  value={giftEmails}
                  onChange={(e) => onGiftEmailsChange(e.target.value)}
                />
              </span>
            </label>
          </>
        ) : null}
        {gift ? (
          <p className="pricing-note">
            {signedIn
              ? "Paste the emails first. We check who already has a Diras account — they do not need one yet. If they already have Plus, extra time stacks on top. For me still buys Plus for you."
              : "Sign in to gift someone. You can gift an email even if they have not signed up yet."}
          </p>
        ) : null}

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

        <button
          className="btn-primary"
          type="button"
          disabled={busy || !ready || (gift && signedIn && parsedGiftEmails.length !== giftSeats)}
          onClick={() => void checkout()}
        >
          {busy
            ? gift
              ? "Checking emails…"
              : "Opening checkout…"
            : accountsOn && !signedIn
              ? gift
                ? "Sign in to gift someone"
                : `Sign in to continue · ${selected.label}`
              : gift
                ? `Gift ${giftSeats > 1 ? `${giftSeats} · ` : ""}${giftTotal}`
                : `Continue · ${selected.label}`}
        </button>

        <p className="pricing-foot">
          Card details never touch {APP_NAME}. Quran reading stays free either way.
        </p>
      </div>

      <p className="pricing-soon">
        Recurring phrases and near-twin words are coming soon, and stay free. Voice recognition and Ask the Quran
        will be {PLUS_EXPLAIN.plusTitle}.{" "}
        <Link href="/roadmap">See what&apos;s coming</Link>
      </p>
    </div>
  );
}
