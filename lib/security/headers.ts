import { AUDIO_MIRROR_ORIGIN } from "../constants.ts";
import { r2PublicOrigin } from "../files/r2.ts";

/** Browser security headers. CSP is applied in middleware so Clerk can merge its own directives. */

export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

function extraCdnOrigins() {
  const origin = r2PublicOrigin();
  return origin ? [origin] : [];
}

function cspBase() {
  const extra = extraCdnOrigins().join(" ");
  const connect = [
    "'self'",
    "https://api.quran.com",
    "https://verses.quran.com",
    AUDIO_MIRROR_ORIGIN,
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
  const media = ["'self'", "https://verses.quran.com", AUDIO_MIRROR_ORIGIN, extra, "blob:"]
    .filter(Boolean)
    .join(" ");
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connect}`,
    `media-src ${media}`,
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ];
}

export function isPaymentReturnPath(pathname: string) {
  return pathname === "/pricing/success" || pathname === "/api/billing/return";
}

export function contentSecurityPolicy(embeddable: boolean) {
  const frame = embeddable
    ? "frame-ancestors 'self' https://checkout.paystack.com https://standard.paystack.co https://paystack.com"
    : "frame-ancestors 'none'";
  return [...cspBase(), frame].join("; ");
}

/** Used when Clerk is not on this deployment. Clerk middleware supplies a compatible CSP when accounts are enabled. */
export const CONTENT_SECURITY_POLICY = contentSecurityPolicy(false);

export function clerkCspExtras() {
  return {
    "connect-src": [
      "https://api.quran.com",
      "https://verses.quran.com",
      AUDIO_MIRROR_ORIGIN,
      "https://va.vercel-scripts.com",
      "https://vitals.vercel-insights.com",
      ...extraCdnOrigins(),
    ],
    "script-src": ["https://va.vercel-scripts.com"],
    "media-src": ["'self'", "https://verses.quran.com", AUDIO_MIRROR_ORIGIN, ...extraCdnOrigins(), "blob:"],
    "frame-ancestors": [
      "'self'",
      "https://checkout.paystack.com",
      "https://standard.paystack.co",
      "https://paystack.com",
    ],
    "object-src": ["'none'"],
  };
}

/** @deprecated Use clerkCspExtras() so R2 origins are read at request time. */
export const CLERK_CSP_EXTRAS = clerkCspExtras();

export function applySecurityHeaders(headers: Headers, opts?: { embeddable?: boolean }) {
  for (const h of SECURITY_HEADERS) headers.set(h.key, h.value);
  if (opts?.embeddable) {
    headers.delete("X-Frame-Options");
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  } else {
    headers.set("X-Frame-Options", "DENY");
  }
}

export function applyContentSecurityPolicy(headers: Headers, opts?: { embeddable?: boolean }) {
  headers.set("Content-Security-Policy", contentSecurityPolicy(Boolean(opts?.embeddable)));
}
