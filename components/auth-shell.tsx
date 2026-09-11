import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { PLUS_NAME } from "@/lib/brand";

export function AuthShell({
  title,
  backHref = "/",
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
        Sign-in is two keys. Add the Clerk integration on this Vercel project (or paste the publishable and
        secret keys), redeploy, and this page becomes a real sign-in form.
      </p>
      <p className="pricing-note" style={{ textAlign: "center", maxWidth: 360 }}>
        Quran reading stays open either way. Accounts lock {PLUS_NAME} to you, not to a shared browser cookie.
      </p>
    </>
  );
}
