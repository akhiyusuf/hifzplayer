import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";
import { accountsBrowserReady, accountsConfigured, googleConfigured } from "@/lib/auth/config";
import { AccountsNotConfigured, AuthShell } from "@/components/auth-shell";
import { EmailAuthForm } from "@/components/email-auth-form";
import { safePath } from "@/lib/nav";

export const metadata: Metadata = {
  title: `Create account — ${APP_NAME}`,
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  const next = safePath(redirect_url, "/");
  const ready = accountsConfigured() && (accountsBrowserReady() || googleConfigured());
  return (
    <AuthShell title="Create account" backHref={next === "/" ? "/" : next}>
      {ready ? (
        <EmailAuthForm
          mode="sign-up"
          redirectTo={next}
          googleOn={googleConfigured()}
          passwordOn={accountsBrowserReady()}
        />
      ) : (
        <AccountsNotConfigured />
      )}
    </AuthShell>
  );
}
