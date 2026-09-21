"use client";

import { useAuth } from "@/components/auth-root";

export function AccountSignOut() {
  const { signedIn, signOut } = useAuth();
  if (!signedIn) return null;
  return (
    <button
      type="button"
      className="btn-secondary account-sign-out"
      aria-label="Sign out"
      onClick={() => signOut()}
    >
      Sign out
    </button>
  );
}
