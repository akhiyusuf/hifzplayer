"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-root";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { isPasswordAcceptable, scorePassword } from "@/lib/auth/password-strength";

function authError(data: { error?: string; code?: string }, fallback: string) {
  if (data.code === "TURNSTILE") return "Confirm you are human, then try again.";
  if (data.code === "ACCOUNTS_OFF") return "Accounts are not configured yet.";
  return data.error || fallback;
}

type Step = "password" | "forgot" | "code" | "verify";

const RESEND_COOLDOWN_S = 30;

export function EmailAuthForm({
  mode,
  redirectTo,
  googleOn = false,
  passwordOn = true,
  startError = "",
  turnstileSiteKey = "",
}: {
  mode: "sign-in" | "sign-up";
  redirectTo: string;
  googleOn?: boolean;
  passwordOn?: boolean;
  startError?: string;
  /** Server-passed Turnstile site key (Worker vars). Empty = skip client challenge. */
  turnstileSiteKey?: string;
}) {
  const challengeOn = Boolean(turnstileSiteKey.trim());
  const { loaded, signedIn, refresh } = useAuth();
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(startError);
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [needsResendChallenge, setNeedsResendChallenge] = useState(false);
  const pendingResendRef = useRef(false);

  useEffect(() => {
    if (loaded && signedIn) window.location.replace(redirectTo);
  }, [loaded, signedIn, redirectTo]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  function resetChallenge() {
    setToken("");
    setResetKey((n) => n + 1);
  }

  function beginCodeStep(next: "code" | "verify") {
    setStep(next);
    setCode("");
    setNeedsResendChallenge(false);
    pendingResendRef.current = false;
    setCooldown(RESEND_COOLDOWN_S);
    resetChallenge();
  }

  async function submitPassword() {
    setError("");
    setInfo("");
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
        body: JSON.stringify({ email, password, name: mode === "sign-up" ? name : undefined, turnstileToken: token }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        verifyRequired?: boolean;
        throttled?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(authError(data, "Could not sign in."));
      // Sign-up now requires email verification — move to the verify step
      // instead of signing in immediately.
      if (mode === "sign-up" && data.verifyRequired) {
        setPassword("");
        setConfirm("");
        beginCodeStep("verify");
        // Keep instructional copy in the neutral lead above — only surface
        // real failures (e.g. throttled) in red.
        if (data.throttled) setError(data.message || "We sent too many codes to this email. Try again in an hour.");
        else setError("");
        setInfo("");
        setBusy(false);
        return;
      }
      await refresh();
      window.location.assign(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      resetChallenge();
      setBusy(false);
    }
  }

  async function submitVerificationCode() {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, code, flow: "register", turnstileToken: token || undefined }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) throw new Error(authError(data, "Could not verify that code."));
      await refresh();
      window.location.assign(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify that code.");
      resetChallenge();
      setBusy(false);
    }
  }

  async function sendResetCode(turnstileToken = token) {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, turnstileToken }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) throw new Error(authError(data, "Could not send the code."));
      beginCodeStep("code");
      setPassword("");
      setInfo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
      resetChallenge();
    } finally {
      setBusy(false);
    }
  }

  async function resendCode(turnstileToken = token) {
    setError("");
    setInfo("");
    if (challengeOn && !turnstileToken) {
      setNeedsResendChallenge(true);
      pendingResendRef.current = true;
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, turnstileToken }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) throw new Error(authError(data, "Could not resend the code."));
      setCooldown(RESEND_COOLDOWN_S);
      setNeedsResendChallenge(false);
      pendingResendRef.current = false;
      setInfo("We sent a new code.");
      resetChallenge();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
      pendingResendRef.current = false;
      resetChallenge();
    } finally {
      setBusy(false);
    }
  }

  function onTurnstileToken(next: string) {
    setToken(next);
    if (next && pendingResendRef.current) {
      pendingResendRef.current = false;
      void resendCode(next);
    }
  }

  async function submitNewPassword() {
    setError("");
    setInfo("");
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
  const onCodeStep = step === "code" || step === "verify";
  const showChallenge =
    challengeOn &&
    (onCodeStep ? needsResendChallenge : Boolean(passwordOn));

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
        else if (step === "verify") void submitVerificationCode();
        else void submitPassword();
      }}
    >
      <p className="pricing-lead" style={{ textAlign: "center" }}>
        {step === "code"
          ? `We sent a 6-digit code to ${email}. Choose a new password.`
          : step === "verify"
            ? `We sent a 6-digit code to ${email}. Enter it to finish creating your account.`
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
            autoFocus={step !== "code" && step !== "verify"}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={onCodeStep}
          />
        </span>
      </label>
      ) : null}

      {mode === "sign-up" && step === "password" && passwordOn ? (
      <label className="pricing-email">
        <span className="label-eyebrow">Name (optional)</span>
        <span className="field">
          <input
            type="text"
            name="name"
            autoComplete="given-name"
            placeholder="What should we call you?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
        </span>
      </label>
      ) : null}

      {onCodeStep ? (
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

      {showChallenge ? (
        <TurnstileWidget
          siteKey={turnstileSiteKey}
          onToken={onTurnstileToken}
          resetKey={resetKey}
          action={mode === "sign-up" ? "signup" : "login"}
        />
      ) : null}

      {error ? (
        <p className="pricing-error" role="alert">
          {error}
        </p>
      ) : null}

      {info && !error ? (
        <p className="pricing-note" role="status">
          {info}
        </p>
      ) : null}

      {passwordOn || step !== "password" ? (
      <button
        className="btn-primary"
        type="submit"
        disabled={
          busy ||
          (challengeOn && !onCodeStep && !token) ||
          (onCodeStep && code.length !== 6) ||
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
              : step === "verify"
                ? "Verify and sign in"
                : mode === "sign-up"
                  ? "Create account"
                  : "Sign in"}
      </button>
      ) : null}

      {onCodeStep ? (
        <button
          className="btn-secondary"
          type="button"
          disabled={busy || cooldown > 0}
          onClick={() => void resendCode()}
        >
          {cooldown > 0
            ? `Resend code in ${cooldown}s`
            : needsResendChallenge && challengeOn && !token
              ? "Confirm you are human above"
              : "Resend code"}
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
            setInfo("");
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
            setInfo("");
            setNeedsResendChallenge(false);
            pendingResendRef.current = false;
            setCooldown(0);
            resetChallenge();
          }}
        >
          {step === "verify" ? "Back to account details" : "Back to password"}
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
