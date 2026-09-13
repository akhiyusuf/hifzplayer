"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export function LegalChecks({
  actionLabel,
  busy,
  error,
  onSubmit,
}: {
  actionLabel: string;
  busy?: boolean;
  error?: string;
  onSubmit: () => void | Promise<void>;
}) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const ready = terms && privacy && !busy;

  return (
    <form
      className="legal-check"
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready) return;
        void onSubmit();
      }}
    >
      <label>
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        <span>
          I have read and agree to the{" "}
          <Link href="/terms?from=agree" target="_blank" rel="noreferrer">
            usage policy
          </Link>
          .
        </span>
      </label>
      <label>
        <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
        <span>
          I have read and agree to the{" "}
          <Link href="/privacy?from=agree" target="_blank" rel="noreferrer">
            privacy policy
          </Link>
          .
        </span>
      </label>
      {error ? (
        <p className="pricing-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn-primary" type="submit" disabled={!ready}>
        {busy ? "Saving…" : actionLabel}
      </button>
    </form>
  );
}

export function LegalBeforeAuth({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(false);
  if (ok) return <>{children}</>;
  return (
    <>
      <p className="pricing-note" style={{ textAlign: "center", maxWidth: 400 }}>
        Quran reading stays free. An account is for Plus, gifts, and moving your plan between browsers. Agree to
        both policies before you create it.
      </p>
      <LegalChecks actionLabel="Continue to create account" onSubmit={() => setOk(true)} />
    </>
  );
}
