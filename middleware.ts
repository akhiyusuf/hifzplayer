import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from "next/server";
import { clerkConfigured } from "@/lib/auth/config";
import { applyContentSecurityPolicy, applySecurityHeaders, CLERK_CSP_EXTRAS } from "@/lib/security/headers";

const isAccountRoute = createRouteMatcher(["/account(.*)"]);
const isCheckout = createRouteMatcher(["/api/billing/checkout"]);

function secure(res: NextResponse) {
  applySecurityHeaders(res.headers);
  return res;
}

function publicSecurity() {
  const res = NextResponse.next();
  applySecurityHeaders(res.headers);
  applyContentSecurityPolicy(res.headers);
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
            NextResponse.json({ error: "Sign in to buy Hifz Plus", code: "SIGN_IN_REQUIRED" }, { status: 401 }),
          );
        }
      }
      if (isAccountRoute(req)) {
        const { userId } = await auth();
        if (!userId) {
          const url = new URL("/sign-in", req.url);
          url.searchParams.set("redirect_url", req.nextUrl.pathname);
          return secure(NextResponse.redirect(url));
        }
      }
      return secure(NextResponse.next());
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
  return publicSecurity();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|.*\\.webmanifest).*)",
    "/(api|trpc)(.*)",
  ],
};
