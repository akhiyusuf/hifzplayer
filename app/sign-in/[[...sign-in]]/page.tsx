import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { APP_NAME } from "@/lib/brand";
import { clerkAppearance } from "@/lib/auth/appearance";
import { clerkBrowserReady } from "@/lib/auth/config";
import { AccountsNotConfigured, AuthShell } from "@/components/auth-shell";
import { safePath } from "@/lib/nav";

export const metadata: Metadata = {
  title: `Sign in — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  const next = safePath(redirect_url, "/");
  return (
    <AuthShell title="Sign in" backHref={next === "/" ? "/" : next}>
      {clerkBrowserReady() ? (
        <SignIn
          appearance={clerkAppearance}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl={next}
        />
      ) : (
        <AccountsNotConfigured />
      )}
    </AuthShell>
  );
}
