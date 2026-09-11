/** Browser security headers. CSP is applied in middleware so Clerk can merge its own directives. */

export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
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

/** Used when Clerk is not on this deployment. Clerk middleware supplies a compatible CSP when accounts are enabled. */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.quran.com https://verses.quran.com",
  "media-src 'self' https://verses.quran.com blob:",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

export const CLERK_CSP_EXTRAS = {
  "connect-src": ["https://api.quran.com", "https://verses.quran.com"],
  "media-src": ["'self'", "https://verses.quran.com", "blob:"],
  "frame-ancestors": ["'none'"],
  "object-src": ["'none'"],
};

export function applySecurityHeaders(headers: Headers) {
  for (const h of SECURITY_HEADERS) headers.set(h.key, h.value);
}

export function applyContentSecurityPolicy(headers: Headers) {
  headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
}
