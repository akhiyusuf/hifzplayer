import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/auth/config";
import { resolveEntitlement } from "@/lib/auth/session";
import { AccountsNotConfigured, AuthShell } from "@/components/auth-shell";
import { publicEntitlement } from "@/lib/billing/entitlement";

export const metadata: Metadata = {
  title: "Account — Hifz",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (!clerkConfigured()) {
    return (
      <AuthShell title="Account">
        <AccountsNotConfigured />
      </AuthShell>
    );
  }

  const user = await currentUser();
  const plus = publicEntitlement(await resolveEntitlement());
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.firstName || user?.username || "Signed in";

  return (
    <AuthShell title="Account">
      <div className="account-card">
        <b>{name}</b>
        {email ? <span>{email}</span> : null}
        <span className="account-plus">
          {plus.plus
            ? plus.planId === "lifetime"
              ? "Hifz Plus · lifetime"
              : `Hifz Plus · ${plus.planId}`
            : "Free reading"}
        </span>
      </div>
      <p className="pricing-note" style={{ textAlign: "center", maxWidth: 360 }}>
        Reading history stays on this device. Plus is stored on your account, so it follows you after you sign
        in on another browser.
      </p>
    </AuthShell>
  );
}
