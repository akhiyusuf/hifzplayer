"use client";

import { useClerk } from "@clerk/nextjs";
import { clerkBrowserReady } from "@/lib/auth/config";

export function AccountSignOut() {
  if (!clerkBrowserReady()) return null;
  return <AccountSignOutClerk />;
}

function AccountSignOutClerk() {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      className="btn-secondary account-sign-out"
      aria-label="Sign out"
      onClick={() => signOut({ redirectUrl: "/" })}
    >
      Sign out
    </button>
  );
}
