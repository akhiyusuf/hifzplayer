"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { accountRowCopy } from "@/lib/account";
import { useAuth } from "@/components/auth-root";

export function AccountRow() {
  const { loaded, signedIn } = useAuth();
  const copy = accountRowCopy(loaded ? Boolean(signedIn) : null);
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
        <span>{copy}</span>
      </span>
      <Icon name="user" size={17} style={{ color: "var(--action-primary)", flex: "none" }} />
    </Link>
  );
}
