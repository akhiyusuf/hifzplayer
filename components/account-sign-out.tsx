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
      className="btn-secondary"
      style={{ width: "100%", maxWidth: 400 }}
      onClick={() => signOut({ redirectUrl: "/" })}
    >
      Sign out
    </button>
  );
}
