import { NextResponse, type NextRequest } from "next/server";
import { PLUS_NAME } from "@/lib/brand";
import { accountsConfigured, SESSION_COOKIE } from "@/lib/auth/config";
import {
  applyContentSecurityPolicy,
  applySecurityHeaders,
  isPaymentReturnPath,
} from "@/lib/security/headers";

function secure(res: NextResponse, req: NextRequest) {
  const embeddable = isPaymentReturnPath(req.nextUrl.pathname);
  applySecurityHeaders(res.headers, { embeddable });
  if (embeddable) applyContentSecurityPolicy(res.headers, { embeddable: true });
  return res;
}

export default function middleware(req: NextRequest) {
  const embeddable = isPaymentReturnPath(req.nextUrl.pathname);
  if (accountsConfigured() && req.nextUrl.pathname === "/api/billing/checkout") {
    if (!req.cookies.get(SESSION_COOKIE)?.value) {
      return secure(
        NextResponse.json({ error: `Sign in to buy ${PLUS_NAME}`, code: "SIGN_IN_REQUIRED" }, { status: 401 }),
        req,
      );
    }
  }
  const res = NextResponse.next();
  applySecurityHeaders(res.headers, { embeddable });
  applyContentSecurityPolicy(res.headers, { embeddable });
  if (embeddable) {
    res.headers.delete("X-Frame-Options");
    res.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|.*\\.webmanifest).*)",
    "/(api|trpc)(.*)",
  ],
};
