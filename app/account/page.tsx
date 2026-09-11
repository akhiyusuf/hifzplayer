import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/auth/config";
import { resolveEntitlement } from "@/lib/auth/session";
import { AccountsNotConfigured, AuthShell } from "@/components/auth-shell";
import { publicEntitlement } from "@/lib/billing/entitlement";
import { APP_NAME, PLUS_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Account — ${APP_NAME}`,
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function plusLabel(plus: ReturnType<typeof publicEntitlement>) {
  if (!plus.plus) return "Free reading";
  const plan = plus.planId === "lifetime" ? "lifetime" : plus.planId || "Plus";
  const processor = plus.processor === "paystack" ? "Paystack" : plus.processor === "stripe" ? "Stripe" : null;
  const since = plus.grantedAt ? ` · since ${new Date(plus.grantedAt).toLocaleDateString()}` : "";
  return `${PLUS_NAME} · ${plan}${processor ? ` · ${processor}` : ""}${since}`;
}

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
        <span className="account-plus">{plusLabel(plus)}</span>
      </div>
      <p className="pricing-note" style={{ textAlign: "center", maxWidth: 360 }}>
        Reading history stays on this device. Plus is stored on your account, so it follows you after you sign
        in on another browser. Paystack and Stripe hold the payment ledger; this account shows the plan that was
        granted.
      </p>
    </AuthShell>
  );
}
