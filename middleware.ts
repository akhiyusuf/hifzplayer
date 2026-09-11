import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from "next/server";
import { PLUS_NAME } from "@/lib/brand";
import { clerkConfigured } from "@/lib/auth/config";
import {
  applyContentSecurityPolicy,
  applySecurityHeaders,
  CLERK_CSP_EXTRAS,
  isPaymentReturnPath,
} from "@/lib/security/headers";

const isAccountRoute = createRouteMatcher(["/account(.*)"]);
const isCheckout = createRouteMatcher(["/api/billing/checkout"]);

function secure(res: NextResponse, req: NextRequest) {
  const embeddable = isPaymentReturnPath(req.nextUrl.pathname);
  applySecurityHeaders(res.headers, { embeddable });
  if (embeddable) applyContentSecurityPolicy(res.headers, { embeddable: true });
  return res;
}

function publicSecurity(req: NextRequest) {
  const res = NextResponse.next();
  const embeddable = isPaymentReturnPath(req.nextUrl.pathname);
  applySecurityHeaders(res.headers, { embeddable });
  applyContentSecurityPolicy(res.headers, { embeddable });
  return res;
}

let clerkHandler: NextMiddleware | undefined;

function getClerkHandler() {
  clerkHandler ??= clerkMiddleware(
    async (auth, req) => {
      if (isCheckout(req)) {
        const { userId } = await auth();
        if (!userId) {
          return secure(
            NextResponse.json({ error: `Sign in to buy ${PLUS_NAME}`, code: "SIGN_IN_REQUIRED" }, { status: 401 }),
            req,
          );
        }
      }
      if (isAccountRoute(req)) {
        const { userId } = await auth();
        if (!userId) {
          const url = new URL("/sign-in", req.url);
          url.searchParams.set("redirect_url", req.nextUrl.pathname);
          return secure(NextResponse.redirect(url), req);
        }
      }
      return secure(NextResponse.next(), req);
    },
    {
      contentSecurityPolicy: { directives: CLERK_CSP_EXTRAS },
    },
  );
  return clerkHandler;
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (clerkConfigured()) {
    return getClerkHandler()(req, event);
  }
  return publicSecurity(req);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|.*\\.webmanifest).*)",
    "/(api|trpc)(.*)",
  ],
};
