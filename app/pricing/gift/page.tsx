import type { Metadata } from "next";
import Link from "next/link";
import { GiftAssign } from "@/components/gift-assign";
import { Icon } from "@/components/icon";
import { PLUS_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: `Gift ${PLUS_NAME}` };
export const dynamic = "force-dynamic";

export default async function GiftPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; reference?: string; trxref?: string }>;
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
        <h1>Gift {PLUS_NAME}</h1>
      </nav>
      <GiftAssign sessionId={sessionId} reference={reference} />
    </main>
  );
}
