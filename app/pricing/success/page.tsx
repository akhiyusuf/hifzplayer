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
  }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id || "";
  const reference = params.reference || params.trxref || "";

  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href="/pricing" aria-label="Back to pricing">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>Payment</h1>
      </nav>
      <PricingSuccess
        sessionId={sessionId}
        reference={reference}
        granted={params.granted === "1"}
        grantedPlan={params.plan || ""}
      />
    </main>
  );
}
