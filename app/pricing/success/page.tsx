import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PricingSuccess } from "@/components/pricing-success";
import { PLUS_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: `Payment — ${PLUS_NAME}` };
export const dynamic = "force-dynamic";

export default async function PricingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    session_id?: string;
    reference?: string;
    trxref?: string;
    granted?: string;
    plan?: string;
    gift?: string;
    trial?: string;
    until?: string;
  }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id || "";
  const reference = params.reference || params.trxref || "";
  const trial = params.trial === "1";
  const untilParam = params.until && Number.isFinite(Date.parse(params.until)) ? params.until : "";

  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href="/pricing" aria-label="Back to pricing">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>{trial ? "Free trial" : "Payment"}</h1>
      </nav>
      <PricingSuccess
        sessionId={sessionId}
        reference={reference}
        granted={params.granted === "1"}
        grantedPlan={params.plan || ""}
        gifted={params.gift === "1"}
        trial={trial}
        trialUntil={untilParam}
      />
    </main>
  );
}
