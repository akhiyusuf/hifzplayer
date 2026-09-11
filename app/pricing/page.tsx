import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { PricingView } from "@/components/pricing-view";
import { Icon } from "@/components/icon";
import { PLUS_NAME } from "@/lib/brand";
import { countryFromHeaders } from "@/lib/billing/country";
import { processorsReady } from "@/lib/billing/env";
import { catalog, regionForCountry } from "@/lib/billing/plans";

export const metadata: Metadata = { title: `${PLUS_NAME} — pricing` };
export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const headerList = await headers();
  const params = await searchParams;
  const regionId = regionForCountry(countryFromHeaders(headerList));
  const region = catalog().find((r) => r.id === regionId) ?? catalog()[0];

  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href="/" aria-label="Back">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>{PLUS_NAME}</h1>
      </nav>
      <PricingView region={region} processors={processorsReady()} canceled={params.canceled === "1"} />
    </main>
  );
}
