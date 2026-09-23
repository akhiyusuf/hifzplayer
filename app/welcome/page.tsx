"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-root";
import { safePath } from "@/lib/nav";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextParam } = await searchParams;
  const next = safePath(nextParam, "/home");

  return <WelcomeForm next={next} />;
}

function WelcomeForm({ next }: { next: string }) {
  const { refresh, name: existingName } = useAuth();
  const [name, setName] = useState(existingName || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = name.trim();
    if (!trimmed) {
      // Skip — just go to the next page
      window.location.assign(next);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save your name");
      }
      await refresh();
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your name");
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <p className="pricing-lead" style={{ textAlign: "center" }}>
        Assalamu alaikum — welcome to Diras.
      </p>
      <p className="pricing-lead" style={{ textAlign: "center", fontSize: 15 }}>
        What should we call you? Your name shows on your account, in emails, and on the payment screen.
      </p>
      <label className="pricing-email">
        <span className="label-eyebrow">Name</span>
        <span className="field">
          <input
            type="text"
            name="name"
            autoComplete="given-name"
            autoFocus
            placeholder="Your first name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
        </span>
      </label>
      {error ? (
        <p className="pricing-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Please wait…" : "Save name"}
      </button>
      <button
        className="btn-secondary"
        type="button"
        disabled={busy}
        onClick={() => window.location.assign(next)}
      >
        Skip for now
      </button>
    </form>
  );
}
