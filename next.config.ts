import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./lib/security/headers";

const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/pricing/success",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "cross-origin" }],
      },
      {
        source: "/api/billing/return",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "cross-origin" }],
      },
      { source: "/api/:path*", headers: noIndex },
      { source: "/account", headers: noIndex },
      { source: "/account/:path*", headers: noIndex },
      { source: "/sign-in", headers: noIndex },
      { source: "/sign-in/:path*", headers: noIndex },
      { source: "/sign-up", headers: noIndex },
      { source: "/sign-up/:path*", headers: noIndex },
    ];
  },
};

export default nextConfig;
