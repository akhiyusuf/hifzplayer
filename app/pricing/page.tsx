import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { PricingView } from "@/components/pricing-view";
import { Icon } from "@/components/icon";
import { PLUS_NAME } from "@/lib/brand";
import { accountsConfigured } from "@/lib/auth/config";
import { trialUsedAt } from "@/lib/auth/plus";
import { resolveEntitlement, signedInUserId } from "@/lib/auth/session";
import { countryFromHeaders } from "@/lib/billing/country";
import { processorsReady } from "@/lib/billing/env";
import { catalog, regionForCountry } from "@/lib/billing/plans";
import { openTrialUsed, trialAvailable, TRIAL_USED_COOKIE } from "@/lib/billing/trial";
import { backHref } from "@/lib/nav";

export const metadata: Metadata = { title: `${PLUS_NAME} — pricing` };
export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string; from?: string }>;
}) {
  const headerList = await headers();
  const params = await searchParams;
  const regionId = regionForCountry(countryFromHeaders(headerList));
  const region = catalog().find((r) => r.id === regionId) ?? catalog()[0];
  const ent = await resolveEntitlement();
  const accountsOn = accountsConfigured();
  const userId = accountsOn ? await signedInUserId() : null;
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const cookieUsed = Boolean(openTrialUsed(jar.get(TRIAL_USED_COOKIE)?.value));
  const accountUsed = userId ? Boolean(await trialUsedAt(userId)) : false;
  const canTrial = trialAvailable({
    entitlement: ent,
    trialUsed: cookieUsed || accountUsed,
  });

  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href={backHref(params.from)} aria-label="Back">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>{PLUS_NAME}</h1>
      </nav>
      <PricingView
        region={region}
        processors={processorsReady()}
        canceled={params.canceled === "1"}
        trialAvailable={canTrial}
        plusOn={Boolean(ent)}
        accountsOn={accountsOn}
      />
    </main>
  );
}
