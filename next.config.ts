import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { buildStaticSecurityHeaders } from "./src/lib/security/headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const staticSecurityHeaders = Object.entries(buildStaticSecurityHeaders()).map(
  ([key, value]) => ({ key, value }),
);

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["wagmi", "@wagmi/core", "@wagmi/connectors", "viem"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: staticSecurityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);