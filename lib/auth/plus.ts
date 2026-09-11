import { clerkClient } from "@clerk/nextjs/server";
import { clerkConfigured } from "@/lib/auth/config";
import {
  type Entitlement,
  grantFromPayment,
  isPlusActive,
} from "@/lib/billing/entitlement";
import type { PlanId, Processor, RegionId } from "@/lib/billing/plans";
import { isPlanId, isRegionId } from "@/lib/billing/plans";

type StoredPlus = {
  plus?: boolean;
  planId?: PlanId;
  regionId?: RegionId;
  processor?: Processor;
  until?: string | null;
  ref?: string;
  grantedAt?: string;
};

export async function savePlusToClerk(userId: string, ent: Entitlement) {
  if (!clerkConfigured()) return;
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      hifzPlus: {
        plus: true,
        planId: ent.planId,
        regionId: ent.regionId,
        processor: ent.processor,
        until: ent.until,
        ref: ent.ref,
        grantedAt: ent.grantedAt,
      } satisfies StoredPlus,
    },
  });
}

export async function plusFromClerk(userId: string): Promise<Entitlement | null> {
  if (!clerkConfigured()) return null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const raw = (user.privateMetadata as { hifzPlus?: StoredPlus } | undefined)?.hifzPlus;
    if (!raw?.plus || !raw.planId || !raw.regionId || !raw.processor || !raw.ref) return null;
    if (!isPlanId(raw.planId) || !isRegionId(raw.regionId)) return null;
    if (raw.processor !== "stripe" && raw.processor !== "paystack") return null;
    const ent = grantFromPayment({
      planId: raw.planId,
      regionId: raw.regionId,
      processor: raw.processor,
      ref: raw.ref,
      until: raw.until,
    });
    ent.userId = userId;
    if (raw.grantedAt) ent.grantedAt = raw.grantedAt;
    return isPlusActive(ent) ? ent : null;
  } catch {
    return null;
  }
}
