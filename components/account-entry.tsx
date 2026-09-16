"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Icon } from "@/components/icon";
import { clerkBrowserReady } from "@/lib/auth/config";
import { signInHref } from "@/lib/nav";

export function AccountEntry({ compact = false }: { compact?: boolean }) {
  if (!clerkBrowserReady()) {
    return (
      <Link className="icon-btn tap" href="/account" aria-label="Account">
        <Icon name="user" size={18} />
      </Link>
    );
  }
  return <AccountEntryClerk compact={compact} />;
}

function AccountEntryClerk({ compact }: { compact: boolean }) {
  const path = usePathname() || "/home";
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded || !isSignedIn) {
    return (
      <Link
        className="icon-btn tap"
        href={isLoaded ? signInHref(path) : "/account"}
        aria-label={isLoaded ? "Sign in" : "Account"}
      >
        <Icon name="user" size={18} />
      </Link>
    );
  }
  return (
    <span className={compact ? "account-btn" : undefined}>
      <UserButton
        appearance={{
          elements: {
            avatarBox: { width: 32, height: 32 },
          },
        }}
      />
    </span>
  );
}
