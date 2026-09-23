import type { Metadata } from "next";
import Link from "next/link";
import { accountsConfigured } from "@/lib/auth/config";
import { resolveEntitlement, signedInUser } from "@/lib/auth/session";
import { AccountId } from "@/components/account-id";
import { AccountsNotConfigured, AuthShell } from "@/components/auth-shell";
import { SignOutButton } from "@/components/sign-out-button";
import { publicEntitlement } from "@/lib/billing/entitlement";
import { APP_NAME, PLUS_NAME } from "@/lib/brand";
import { backHref } from "@/lib/nav";

export const metadata: Metadata = {
  title: `Account — ${APP_NAME}`,
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function plusLabel(plus: ReturnType<typeof publicEntitlement>) {
  if (!plus.plus) return "Free reading";
  const plan =
    plus.planId === "lifetime" ? "lifetime" : plus.planId === "trial" ? "free trial" : plus.planId || "Plus";
  const processor =
    plus.processor === "paystack" ? "Paystack" : plus.processor === "stripe" ? "Stripe" : null;
  const until =
    plus.planId === "lifetime"
      ? ""
      : plus.until
        ? ` · until ${new Date(plus.until).toLocaleDateString()}`
        : "";
  const since = plus.grantedAt ? ` · since ${new Date(plus.grantedAt).toLocaleDateString()}` : "";
  return `${PLUS_NAME} · ${plan}${processor ? ` · ${processor}` : ""}${until}${since}`;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const back = backHref(from);

  if (!accountsConfigured()) {
    return (
      <AuthShell title="Account" backHref={back}>
        <AccountsNotConfigured />
      </AuthShell>
    );
  }

  const user = await signedInUser();
  if (!user) {
    const next = encodeURIComponent(`/account?from=${from || "settings"}`);
    return (
      <AuthShell title="Account" backHref={back}>
        <p className="pricing-lead" style={{ textAlign: "center", maxWidth: 360 }}>
          Sign in so {PLUS_NAME} follows you, not just this browser.
        </p>
        <Link className="btn-primary" href={`/sign-in?redirect_url=${next}`}>
          Sign in
        </Link>
      </AuthShell>
    );
  }

  const plus = publicEntitlement(await resolveEntitlement());

  return (
    <AuthShell title="Account" backHref={back}>
      <div className="account-card">
        <b>{user.name}</b>
        {user.email ? <span>{user.email}</span> : null}
        <span className="account-plus">{plusLabel(plus)}</span>
        <AccountId id={user.id} />
      </div>
      <p className="pricing-note" style={{ textAlign: "center", maxWidth: 360 }}>
        Reading history stays on this device. Plus is stored on your account, so it follows you after you sign
        in on another browser. Quote your account ID if something goes wrong — it is the same id in our logs.
        Paystack and Stripe hold the payment ledger; this account shows the plan that was granted.
      </p>
      <SignOutButton />
    </AuthShell>
  );
}
