"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LegalChecks } from "@/components/legal-checks";

export function AgreeForm({ next }: { next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms: true, privacy: true }),
      });
      const data = (await res.json()) as { error?: string; accepted?: boolean };
      if (res.status === 401) {
        window.location.assign(`/sign-in?redirect_url=${encodeURIComponent(`/agree?next=${encodeURIComponent(next)}`)}`);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Could not save your agreement.");
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your agreement.");
      setBusy(false);
    }
  }

  return (
    <LegalChecks
      actionLabel="Agree and continue"
      busy={busy}
      error={error}
      onSubmit={submit}
    />
  );
}
