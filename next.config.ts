import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildStaticSecurityHeaders } from "./src/lib/security/headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const staticSecurityHeaders = Object.entries(buildStaticSecurityHeaders()).map(
  ([key, value]) => ({ key, value }),
);

const securityHeaders = [
  // Prevent the page from being embedded in any frame
  { key: "X-Frame-Options", value: "DENY" },
  // Block MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Restrict referrer to same-origin only
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HSTS — 1 year, include subdomains, preload-ready
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Limit browser features to what the app actually needs
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["wagmi", "@wagmi/core", "@wagmi/connectors", "viem"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...staticSecurityHeaders, ...securityHeaders],
      },
    ];
  },
};

export default withNextIntl(nextConfig);