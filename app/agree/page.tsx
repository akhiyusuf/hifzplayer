import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { AgreeForm } from "@/components/agree-form";
import { AuthShell } from "@/components/auth-shell";
import { clerkConfigured } from "@/lib/auth/config";
import { legalFromPrivateMetadata } from "@/lib/auth/legal";
import { APP_NAME } from "@/lib/brand";
import { isLegalCurrent, legalReturnPath } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Usage and privacy — ${APP_NAME}`,
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AgreePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: rawNext } = await searchParams;
  const next = legalReturnPath(rawNext);
  const signIn = `/sign-in?redirect_url=${encodeURIComponent(`/agree?next=${encodeURIComponent(next)}`)}`;

  if (!clerkConfigured()) {
    redirect(next);
  }

  const user = await currentUser();
  if (!user) redirect(signIn);

  if (isLegalCurrent(legalFromPrivateMetadata(user.privateMetadata))) {
    redirect(next);
  }

  return (
    <AuthShell title="Agree to continue" backHref={next}>
      <p className="pricing-lead" style={{ textAlign: "center", maxWidth: 400 }}>
        Quran reading stays free. To keep an account, buy or gift Plus, we need a record that you agreed to the
        usage policy and the privacy policy.
      </p>
      <p className="pricing-note" style={{ textAlign: "center", maxWidth: 400 }}>
        Open{" "}
        <Link href="/terms?from=agree" target="_blank" rel="noreferrer">
          usage
        </Link>
        {" · "}
        <Link href="/privacy?from=agree" target="_blank" rel="noreferrer">
          privacy
        </Link>
        , then tick both boxes. We store the policy versions and the time — not a scan of your signature.
      </p>
      <AgreeForm next={next} />
    </AuthShell>
  );
}
