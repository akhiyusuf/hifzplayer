import { regionForCountry, type RegionId } from "./plans.ts";

export function countryFromHeaders(headers: Headers): string | null {
  const raw =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    "";
  const code = raw.trim().toUpperCase();
  return code && code !== "XX" && code !== "T1" ? code : null;
}

/** Checkout never trusts a client-supplied region. */
export function checkoutRegionId(headers: Headers, _clientRegion?: string | null): RegionId {
  return regionForCountry(countryFromHeaders(headers));
}
