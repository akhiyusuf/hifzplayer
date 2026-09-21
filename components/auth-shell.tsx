import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { PLUS_NAME } from "@/lib/brand";

export function AuthShell({
  title,
  backHref = "/home",
  children,
}: {
  title: string;
  backHref?: string;
  children: ReactNode;
}) {
  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href={backHref} aria-label="Back">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>{title}</h1>
      </nav>
      <div className="auth-shell">{children}</div>
    </main>
  );
}

export function AccountsNotConfigured() {
  return (
    <>
      <p className="pricing-lead" style={{ textAlign: "center", maxWidth: 360 }}>
        Sign-in runs on the Cloudflare Worker. Accounts live in Neon. Add <code>DATABASE_URL</code> and{" "}
        <code>AUTH_SECRET</code> (or <code>BILLING_SIGNING_SECRET</code>). Password forms also need Turnstile{" "}
        (<code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code>, <code>TURNSTILE_SECRET_KEY</code>). Continue with Google
        needs <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code>. Tables are created on first
        sign-in — you do not paste SQL.
      </p>
      <p className="pricing-note" style={{ textAlign: "center", maxWidth: 360 }}>
        Quran reading stays open either way. Accounts lock {PLUS_NAME} to you, not to a shared browser cookie.
      </p>
    </>
  );
}
