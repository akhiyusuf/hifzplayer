"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Icon } from "@/components/icon";
import { accountRowCopy } from "@/lib/account";
import { clerkBrowserReady } from "@/lib/auth/config";

export function AccountRow() {
  return (
    <Link
      href="/account?from=settings"
      className="settings-row"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span className="st">
        <b>Account</b>
        <span>
          <AccountRowCopy />
        </span>
      </span>
      <Icon name="user" size={17} style={{ color: "var(--action-primary)", flex: "none" }} />
    </Link>
  );
}

function AccountRowCopy() {
  if (!clerkBrowserReady()) return accountRowCopy(false);
  return <AccountRowCopyClerk />;
}

function AccountRowCopyClerk() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return accountRowCopy(null);
  return accountRowCopy(Boolean(isSignedIn));
}
