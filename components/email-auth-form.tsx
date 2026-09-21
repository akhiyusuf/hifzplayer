"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-root";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { isPasswordAcceptable, scorePassword } from "@/lib/auth/password-strength";

function authError(data: { error?: string; code?: string }, fallback: string) {
  if (data.code === "TURNSTILE") return "Confirm you are human, then try again.";
  if (data.code === "ACCOUNTS_OFF") return "Accounts are not configured yet.";
  return data.error || fallback;
}

type Step = "password" | "forgot" | "code";

export function EmailAuthForm({
  mode,
  redirectTo,
  googleOn = false,
  passwordOn = true,
  startError = "",
}: {
  mode: "sign-in" | "sign-up";
  redirectTo: string;
  googleOn?: boolean;
  passwordOn?: boolean;
  startError?: string;
}) {
  const { loaded, signedIn, refresh } = useAuth();
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(startError);

  useEffect(() => {
    if (loaded && signedIn) window.location.replace(redirectTo);
  }, [loaded, signedIn, redirectTo]);

  function resetChallenge() {
    setToken("");
    setResetKey((n) => n + 1);
  }

  async function submitPassword() {
    setError("");
    if (mode === "sign-up" && !isPasswordAcceptable(password)) {
      const { reasons } = scorePassword(password);
      setError(reasons[0] || "That password is too weak. Use at least 8 characters with a letter and a number.");
      return;
    }
    if (mode === "sign-up" && password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(mode === "sign-up" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password, turnstileToken: token }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) throw new Error(authError(data, "Could not sign in."));
      await refresh();
      window.location.assign(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      resetChallenge();
      setBusy(false);
    }
  }

  async function sendResetCode() {
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
      setStep("code");
      setCode("");
      setPassword("");
      resetChallenge();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
      resetChallenge();
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword() {
    setError("");
    if (!isPasswordAcceptable(password)) {
      const { reasons } = scorePassword(password);
      setError(reasons[0] || "That password is too weak. Use at least 8 characters with a letter and a number.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, code, password, turnstileToken: token || undefined }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) throw new Error(authError(data, "Could not reset that password."));
      await refresh();
      window.location.assign(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset that password.");
      setBusy(false);
    }
  }

  const otherHref = mode === "sign-in" ? "/sign-up" : "/sign-in";
  const otherLabel = mode === "sign-in" ? "Create an account" : "Sign in instead";
  const googleHref = `/api/auth/google?redirect_url=${encodeURIComponent(redirectTo)}`;

  // Password strength — only show on sign-up and password-reset (step === "code").
  // Sign-in users may have legacy weak passwords; we don't gate them at the UI.
  const enforceStrength = mode === "sign-up" || step === "code";
  const strength = useMemo(() => scorePassword(password), [password]);
  const showStrength = enforceStrength && password.length > 0;
  const strengthBars = [1, 2, 3, 4].map((n) => n <= strength.score);
  const strengthBlocked = enforceStrength && password.length > 0 && !strength.acceptable;

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "forgot") void sendResetCode();
        else if (step === "code") void submitNewPassword();
        else void submitPassword();
      }}
    >
      <p className="pricing-lead" style={{ textAlign: "center" }}>
        {step === "code"
          ? `We sent a 6-digit code to ${email}. Choose a new password.`
          : step === "forgot"
            ? "Enter your email. We send a code so you can set a new password."
            : passwordOn && googleOn
              ? mode === "sign-up"
                ? "Create an account with email and a password, or continue with Google."
                : "Sign in with email and password, or continue with Google."
              : googleOn
                ? "Continue with Google."
                : mode === "sign-up"
                  ? "Create an account with email and a password."
                  : "Sign in with email and password."}
      </p>

      {googleOn && step === "password" ? (
        <>
          <a className="btn-secondary" href={googleHref}>
            Continue with Google
          </a>
          {passwordOn ? <p className="auth-or">or</p> : null}
        </>
      ) : null}

      {passwordOn || step !== "password" ? (
      <label className="pricing-email">
        <span className="label-eyebrow">Email</span>
        <span className="field">
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            autoFocus={step !== "code"}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </span>
      </label>
      ) : null}

      {step === "code" ? (
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
      ) : null}

      {step === "code" || (passwordOn && step === "password") ? (
        <label className="pricing-email">
          <span className="label-eyebrow">{step === "code" ? "New password" : "Password"}</span>
          <span className="field">
            <input
              type="password"
              name="password"
              autoComplete={mode === "sign-up" || step === "code" ? "new-password" : "current-password"}
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </span>
          {showStrength ? (
            <span className="password-strength" data-score={strength.score} aria-live="polite">
              <span className="password-strength-bars">
                {strengthBars.map((on, i) => (
                  <span key={i} className={`password-strength-bar${on ? " on" : ""}`} />
                ))}
              </span>
              <span className="password-strength-label">{strength.label}</span>
              {strength.reasons[0] ? (
                <span className="password-strength-reason">{strength.reasons[0]}</span>
              ) : null}
            </span>
          ) : null}
        </label>
      ) : null}

      {passwordOn && mode === "sign-up" && step === "password" ? (
        <label className="pricing-email">
          <span className="label-eyebrow">Confirm password</span>
          <span className="field">
            <input
              type="password"
              name="confirm"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </span>
        </label>
      ) : null}

      {step === "code" || !passwordOn ? null : <TurnstileWidget onToken={setToken} resetKey={resetKey} />}

      {error ? (
        <p className="pricing-error" role="alert">
          {error}
        </p>
      ) : null}

      {passwordOn || step !== "password" ? (
      <button
        className="btn-primary"
        type="submit"
        disabled={
          busy ||
          (step !== "code" && !token) ||
          (step === "code" && code.length !== 6) ||
          strengthBlocked ||
          (mode === "sign-up" && step === "password" && password.length > 0 && password !== confirm)
        }
      >
        {busy
          ? "Please wait…"
          : step === "forgot"
            ? "Email me a code"
            : step === "code"
              ? "Save password"
              : mode === "sign-up"
                ? "Create account"
                : "Sign in"}
      </button>
      ) : null}

      {step === "password" && mode === "sign-in" && passwordOn ? (
        <button
          className="btn-secondary"
          type="button"
          disabled={busy}
          onClick={() => {
            setStep("forgot");
            setError("");
            resetChallenge();
          }}
        >
          Forgot password
        </button>
      ) : null}

      {step !== "password" ? (
        <button
          className="btn-secondary"
          type="button"
          disabled={busy}
          onClick={() => {
            setStep("password");
            setCode("");
            setError("");
            resetChallenge();
          }}
        >
          Back to password
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
