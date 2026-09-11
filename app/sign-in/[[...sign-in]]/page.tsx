import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/auth/appearance";
import { clerkBrowserReady } from "@/lib/auth/config";
import { AccountsNotConfigured, AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Sign in — Hifz",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <AuthShell title="Sign in">
      {clerkBrowserReady() ? (
        <SignIn
          appearance={clerkAppearance}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
        />
      ) : (
        <AccountsNotConfigured />
      )}
    </AuthShell>
  );
}
