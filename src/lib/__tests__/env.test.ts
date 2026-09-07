import { getClientEnv, getServerEnv, validateEnv, publicEnv } from '@/lib/env';

describe('Environment Configuration & Isolation', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('getClientEnv & publicEnv', () => {
    it('returns valid public configuration defaults when unset', () => {
      const clientEnv = getClientEnv();
      expect(clientEnv.NEXT_PUBLIC_API_URL).toBeDefined();
      expect(clientEnv.NEXT_PUBLIC_WS_URL).toBeDefined();
      expect(clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN_ID).toBe(10);
      expect(clientEnv.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS).toEqual([10, 11155420]);
      expect(clientEnv.NEXT_PUBLIC_WORLDCOIN_ACTION).toBe('verify-identity');
      expect(clientEnv.NEXT_PUBLIC_WORLDCOIN_TEST_MODE).toBe(false);
    });

    it('parses custom valid public environment overrides', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.truthbounty.io';
      process.env.NEXT_PUBLIC_WS_URL = 'wss://ws.truthbounty.io/ws';
      process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID = '11155420';
      process.env.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS = '11155420, 10';
      process.env.NEXT_PUBLIC_WORLDCOIN_TEST_MODE = 'true';

      const clientEnv = getClientEnv();
      expect(clientEnv.NEXT_PUBLIC_API_URL).toBe('https://api.truthbounty.io');
      expect(clientEnv.NEXT_PUBLIC_WS_URL).toBe('wss://ws.truthbounty.io/ws');
      expect(clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN_ID).toBe(11155420);
      expect(clientEnv.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS).toEqual([11155420, 10]);
      expect(clientEnv.NEXT_PUBLIC_WORLDCOIN_TEST_MODE).toBe(true);
    });

    it('falls back to default chain if an unsupported chain is set in default chain', () => {
      process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID = '999999';
      const clientEnv = getClientEnv();
      expect(clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN_ID).toBe(10);
    });
  });

  describe('getServerEnv', () => {
    it('allows server environment access in Node/server environment', () => {
      process.env.TRUTHBOUNTY_ARTIFACT_DIR = '/custom/release';
      process.env.WORLDCOIN_RP_CONTEXT_JSON = '{"action":"test"}';

      const serverEnv = getServerEnv();
      expect(serverEnv.TRUTHBOUNTY_ARTIFACT_DIR).toBe('/custom/release');
      expect(serverEnv.WORLDCOIN_RP_CONTEXT_JSON).toBe('{"action":"test"}');
      expect(serverEnv.NODE_ENV).toBeDefined();
    });

    it('throws security error when attempted to be accessed in browser context', () => {
      try {
        (window as unknown as { __isBrowserEnv?: boolean }).__isBrowserEnv = true;
        expect(() => getServerEnv()).toThrow(/Security violation/);
      } finally {
        delete (window as unknown as { __isBrowserEnv?: boolean }).__isBrowserEnv;
      }
    });
  });

  describe('validateEnv', () => {
    it('passes for valid environment configurations', () => {
      const result = validateEnv({
        NEXT_PUBLIC_API_URL: 'https://api.truthbounty.io',
        NEXT_PUBLIC_WS_URL: 'wss://ws.truthbounty.io',
        NEXT_PUBLIC_OPTIMISM_RPC_URL: 'https://mainnet.optimism.io',
        NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL: 'https://sepolia.optimism.io',
        NEXT_PUBLIC_DEFAULT_CHAIN_ID: '10',
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid URLs and unsupported default chain ID', () => {
      const result = validateEnv({
        NEXT_PUBLIC_API_URL: 'not-a-url',
        NEXT_PUBLIC_WS_URL: 'invalid-ws',
        NEXT_PUBLIC_OPTIMISM_RPC_URL: 'ftp://bad-proto',
        NEXT_PUBLIC_DEFAULT_CHAIN_ID: '1',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('NEXT_PUBLIC_API_URL'),
          expect.stringContaining('NEXT_PUBLIC_WS_URL'),
          expect.stringContaining('NEXT_PUBLIC_OPTIMISM_RPC_URL'),
          expect.stringContaining('NEXT_PUBLIC_DEFAULT_CHAIN_ID'),
        ])
      );
    });
  });
});
