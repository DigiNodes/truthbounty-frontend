/**
 * Worldcoin client configuration for IDKit integration
 */

export interface WorldcoinClientConfig {
  appId: string;
  action: string;
  signInWithWorldcoin?: boolean;
  enableTestMode?: boolean;
}

export function getWorldcoinConfig(): WorldcoinClientConfig {
  const appId = process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID;
  const action = process.env.NEXT_PUBLIC_WORLDCOIN_ACTION || 'verify-identity';

  if (!appId) {
    console.warn(
      'NEXT_PUBLIC_WORLDCOIN_APP_ID is not set. Worldcoin verification will be unavailable.'
    );
  }

  return {
    appId: appId || '',
    action,
    signInWithWorldcoin: false,
    enableTestMode: process.env.NEXT_PUBLIC_WORLDCOIN_TEST_MODE === 'true',
  };
}

export function isWorldcoinConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID;
}

export function shouldUseMockVerification(): boolean {
  // Mocks are development/test fixtures only (V2-FE-016). In production the
  // mock path is never used: absent configuration surfaces as an unavailable
  // verification button rather than a fabricated SUCCESS verification.
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // Development/test environments may use the mock when Worldcoin is not
  // configured, or always in dev/test.
  const isDevMode =
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  return !isWorldcoinConfigured() || isDevMode;
}
