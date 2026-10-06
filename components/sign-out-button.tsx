"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-root";

export function SignOutButton() {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn-secondary"
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        window.location.assign("/");
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
