import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { APP_NAME } from "@/lib/brand";
import { clerkAppearance } from "@/lib/auth/appearance";
import { clerkBrowserReady } from "@/lib/auth/config";
import { AccountsNotConfigured, AuthShell } from "@/components/auth-shell";
import { safePath } from "@/lib/nav";

export const metadata: Metadata = {
  title: `Create account — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  const next = safePath(redirect_url, "/");
  return (
    <AuthShell title="Create account" backHref={next === "/" ? "/" : next}>
      {clerkBrowserReady() ? (
        <SignUp
          appearance={clerkAppearance}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl={next}
        />
      ) : (
        <AccountsNotConfigured />
      )}
    </AuthShell>
  );
}
