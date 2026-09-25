/**
 * Generates a cryptographically random nonce for CSP.
 * Used once per request in middleware — never reused.
 *
 * Uses the Web Crypto API (globalThis.crypto) which is available in both
 * Node.js 19+ and the Next.js Edge Runtime. No Node-only imports needed.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  // btoa works in both Edge Runtime and Node.js ≥ 16
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Builds the Content-Security-Policy header value for a given request.
 *
 * Sources are derived from environment variables so the policy stays
 * accurate across environments without hard-coding production URLs.
 *
 * Directives follow a least-privilege model:
 *  - script-src: nonce only (no 'unsafe-inline', no 'unsafe-eval')
 *  - style-src:  'self' + 'unsafe-inline' for Tailwind runtime class injection
 *  - connect-src: self + API/WS/RPC/WalletConnect/Worldcoin
 *  - frame-src:  Worldcoin IDKit widget iframe
 *  - everything else: 'self' or 'none'
 */
export function buildCsp(nonce: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? '';
  const optRpc = process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL ?? '';
  const sepRpc = process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL ?? '';

  // Collect connect-src origins, filtering empty strings
  const connectSources = [
    "'self'",
    apiUrl,
    wsUrl,
    optRpc,
    sepRpc,
    // Optimism public RPC fallbacks used by chains.ts
    'https://mainnet.optimism.io',
    'https://sepolia.optimism.io',
    // WalletConnect relay (both apex and wildcard subdomains)
    'https://*.walletconnect.org',
    'wss://*.walletconnect.org',
    'https://*.walletconnect.com',
    'wss://*.walletconnect.com',
    // WalletConnect cloud API
    'https://api.web3modal.org',
    // Worldcoin IDKit API calls
    'https://id.worldcoin.org',
  ].filter(Boolean);

  const directives: [string, string][] = [
    ['default-src', "'self'"],
    ['script-src', `'self' 'nonce-${nonce}'`],
    // Tailwind injects class-driven styles at runtime — unsafe-inline is required here
    ['style-src', "'self' 'unsafe-inline'"],
    ['img-src', "'self' data: blob:"],
    ['font-src', "'self'"],
    ['connect-src', [...new Set(connectSources)].join(' ')],
    // Worldcoin IDKit renders its widget in an iframe from this origin
    ['frame-src', 'https://id.worldcoin.org'],
    ['frame-ancestors', "'none'"],
    ['object-src', "'none'"],
    ['base-uri', "'self'"],
    ['form-action', "'self'"],
    ['upgrade-insecure-requests', ''],
  ];

  return directives
    .map(([key, val]) => (val ? `${key} ${val}` : key))
    .join('; ');
}
