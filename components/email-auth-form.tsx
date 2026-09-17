"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-root";
import { TurnstileWidget } from "@/components/turnstile-widget";

function authError(data: { error?: string; code?: string }, fallback: string) {
  if (data.code === "TURNSTILE") return "Confirm you are human, then try again.";
  if (data.code === "ACCOUNTS_OFF") return "Accounts are not configured yet.";
  return data.error || fallback;
}

export function EmailAuthForm({
  mode,
  redirectTo,
}: {
  mode: "sign-in" | "sign-up";
  redirectTo: string;
}) {
  const { loaded, signedIn, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loaded && signedIn) window.location.replace(redirectTo);
  }, [loaded, signedIn, redirectTo]);

  function resetChallenge() {
    setToken("");
    setResetKey((n) => n + 1);
  }

  async function sendCode() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, turnstileToken: token }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) throw new Error(authError(data, "Could not send the code."));
      setSent(true);
      setCode("");
      resetChallenge();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
      resetChallenge();
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, code, turnstileToken: token || undefined }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) throw new Error(authError(data, "That code is wrong or expired."));
      await refresh();
      window.location.assign(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code is wrong or expired.");
      setBusy(false);
    }
  }

  const otherHref = mode === "sign-in" ? "/sign-up" : "/sign-in";
  const otherLabel = mode === "sign-in" ? "Create an account" : "Sign in instead";
  const submitLabel = sent
    ? busy
      ? "Checking…"
      : "Continue"
    : busy
      ? "Sending code…"
      : "Email me a code";

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (sent) void verifyCode();
        else void sendCode();
      }}
    >
      <p className="pricing-lead" style={{ textAlign: "center" }}>
        {sent
          ? `We sent a 6-digit code to ${email}. It expires in 10 minutes.`
          : "Enter your email. We send a 6-digit code — no password."}
      </p>

      {sent ? (
        <label className="pricing-email">
          <span className="label-eyebrow">Code</span>
          <span className="field">
            <input
              className="auth-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </span>
        </label>
      ) : (
        <label className="pricing-email">
          <span className="label-eyebrow">Email</span>
          <span className="field">
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </span>
        </label>
      )}

      {sent ? null : <TurnstileWidget onToken={setToken} resetKey={resetKey} />}

      {error ? (
        <p className="pricing-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="btn-primary" type="submit" disabled={busy || (!sent && !token) || (sent && code.length !== 6)}>
        {submitLabel}
      </button>

      {sent ? (
        <button
          className="btn-secondary"
          type="button"
          disabled={busy}
          onClick={() => {
            setSent(false);
            setCode("");
            setError("");
            resetChallenge();
          }}
        >
          Use a different email
        </button>
      ) : (
        <p className="auth-switch">
          {mode === "sign-in" ? "New here?" : "Already have an account?"}{" "}
          <Link href={`${otherHref}?redirect_url=${encodeURIComponent(redirectTo)}`}>{otherLabel}</Link>
        </p>
      )}
    </form>
  );
}
