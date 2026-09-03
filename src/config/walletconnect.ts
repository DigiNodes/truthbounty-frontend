/**
 * WalletConnect Cloud project ID (public, dapp-scoped — not a secret).
 *
 * Required for RainbowKit wallet connectivity. A placeholder is NEVER
 * substituted silently (V2-FE-016 web3 cleanup): with real Web3
 * configuration absent the app fails clearly instead of degrading to a
 * non-functional dummy project ID.
 *
 * The browser throw is intentional — during SSR / `next build` (no
 * `window`) we must not crash compilation, so the guard only throws on the
 * client where the missing configuration would otherwise surface as a
 * confusing RainbowKit failure.
 */
export function getWalletConnectProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

  if (!projectId && typeof window !== 'undefined') {
    throw new Error(
      '[TruthBounty] Real Web3 configuration is required: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. ' +
        'Copy .env.example to .env.local and set it to your WalletConnect Cloud project ID ' +
        '(https://cloud.walletconnect.com). No placeholder project ID is used.',
    );
  }

  return projectId ?? '';
}