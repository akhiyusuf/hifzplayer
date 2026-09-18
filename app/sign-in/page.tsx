import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";
import { accountsBrowserReady, accountsConfigured, googleConfigured } from "@/lib/auth/config";
import { AccountsNotConfigured, AuthShell } from "@/components/auth-shell";
import { EmailAuthForm } from "@/components/email-auth-form";
import { safePath } from "@/lib/nav";

export const metadata: Metadata = {
  title: `Sign in — ${APP_NAME}`,
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function googleError(raw?: string) {
  if (!raw) return "";
  if (raw === "google") return "Google sign-in was cancelled or failed.";
  return raw;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string; error?: string }>;
}) {
  const { redirect_url, error } = await searchParams;
  const next = safePath(redirect_url, "/");
  const ready = accountsConfigured() && (accountsBrowserReady() || googleConfigured());
  return (
    <AuthShell title="Sign in" backHref={next === "/" ? "/" : next}>
      {ready ? (
        <EmailAuthForm
          mode="sign-in"
          redirectTo={next}
          googleOn={googleConfigured()}
          passwordOn={accountsBrowserReady()}
          startError={googleError(error)}
        />
      ) : (
        <AccountsNotConfigured />
      )}
    </AuthShell>
  );
}
