"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { Icon } from "@/components/icon";
import { clerkBrowserReady } from "@/lib/auth/config";

export function AccountEntry({ compact = false }: { compact?: boolean }) {
  if (!clerkBrowserReady()) {
    return (
      <Link className="icon-btn tap" href="/account" aria-label="Account">
        <Icon name="user" size={18} />
      </Link>
    );
  }
  return (
    <>
      <Show when="signed-out">
        <Link className="icon-btn tap" href="/sign-in" aria-label="Sign in">
          <Icon name="user" size={18} />
        </Link>
      </Show>
      <Show when="signed-in">
        <span className={compact ? "account-btn" : undefined}>
          <UserButton
            appearance={{
              elements: {
                avatarBox: { width: 32, height: 32 },
              },
            }}
          />
        </span>
      </Show>
    </>
  );
}
