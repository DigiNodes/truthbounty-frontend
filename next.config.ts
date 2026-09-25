import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent the page from being embedded in any frame (belt-and-suspenders alongside CSP frame-ancestors)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Block MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Restrict referrer to same-origin only
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // HSTS — 1 year, include subdomains, preload-ready
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Limit browser features to what the app actually needs
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['wagmi', '@wagmi/core', '@wagmi/connectors', 'viem'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
