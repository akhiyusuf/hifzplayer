import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/auth/appearance";
import { clerkBrowserReady } from "@/lib/auth/config";
import { AccountsNotConfigured, AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Create account — Hifz",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <AuthShell title="Create account">
      {clerkBrowserReady() ? (
        <SignUp
          appearance={clerkAppearance}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
        />
      ) : (
        <AccountsNotConfigured />
      )}
    </AuthShell>
  );
}
