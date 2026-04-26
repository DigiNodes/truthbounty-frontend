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
  // Use mock verification in development or test environments, or if not configured
  const isDevMode = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const hasConfig = isWorldcoinConfigured();

  // Disable mock in production if configured
  if (process.env.NODE_ENV === 'production' && hasConfig) {
    return false;
  }

  return !hasConfig || isDevMode;
}
