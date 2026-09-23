"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { useAuth } from "@/components/auth-root";

export function AccountEntry({ compact = false }: { compact?: boolean }) {
  const { loaded, accountsOn, signedIn } = useAuth();
  const href = !loaded ? "/account" : signedIn ? "/account" : accountsOn ? "/sign-in" : "/account";
  const label = signedIn ? "Account" : "Sign in";
  return (
    <Link className={compact ? "icon-btn tap account-btn" : "icon-btn tap"} href={href} aria-label={label}>
      <Icon name="user" size={18} />
    </Link>
  );
}
