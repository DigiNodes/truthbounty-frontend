import { generateNonce, buildCsp } from '@/lib/csp';

describe('generateNonce', () => {
  it('returns a non-empty base64 string', () => {
    const nonce = generateNonce();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
    // base64 characters only
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('returns a unique value on each call', () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
  });

  it('is 24 characters long (16 bytes → base64)', () => {
    // 16 bytes → ceil(16/3)*4 = 24 base64 chars (with padding)
    expect(generateNonce()).toHaveLength(24);
  });
});

describe('buildCsp', () => {
  const nonce = 'test-nonce-abc123==';

  it('includes the nonce in script-src', () => {
    const csp = buildCsp(nonce);
    expect(csp).toContain(`'nonce-${nonce}'`);
  });

  it('does NOT include unsafe-inline in script-src', () => {
    const csp = buildCsp(nonce);
    // Parse just the script-src directive to be precise
    const scriptSrc = csp
      .split(';')
      .map((d) => d.trim())
      .find((d) => d.startsWith('script-src'));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it('does NOT include unsafe-eval anywhere', () => {
    expect(buildCsp(nonce)).not.toContain("'unsafe-eval'");
  });

  it('blocks framing via frame-ancestors none', () => {
    const csp = buildCsp(nonce);
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('allows Worldcoin IDKit iframe in frame-src', () => {
    const csp = buildCsp(nonce);
    const frameSrc = csp
      .split(';')
      .map((d) => d.trim())
      .find((d) => d.startsWith('frame-src'));
    expect(frameSrc).toContain('https://id.worldcoin.org');
  });

  it('includes WalletConnect relay origins in connect-src', () => {
    const csp = buildCsp(nonce);
    const connectSrc = csp
      .split(';')
      .map((d) => d.trim())
      .find((d) => d.startsWith('connect-src'));
    expect(connectSrc).toContain('wss://*.walletconnect.org');
    expect(connectSrc).toContain('https://*.walletconnect.com');
  });

  it('includes Optimism public RPC fallbacks in connect-src', () => {
    const csp = buildCsp(nonce);
    const connectSrc = csp
      .split(';')
      .map((d) => d.trim())
      .find((d) => d.startsWith('connect-src'));
    expect(connectSrc).toContain('https://mainnet.optimism.io');
    expect(connectSrc).toContain('https://sepolia.optimism.io');
  });

  it('picks up NEXT_PUBLIC_API_URL from environment', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    const csp = buildCsp(nonce);
    expect(csp).toContain('https://api.example.com');
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('picks up NEXT_PUBLIC_WS_URL from environment', () => {
    process.env.NEXT_PUBLIC_WS_URL = 'wss://ws.example.com';
    const csp = buildCsp(nonce);
    expect(csp).toContain('wss://ws.example.com');
    delete process.env.NEXT_PUBLIC_WS_URL;
  });

  it('includes upgrade-insecure-requests directive', () => {
    expect(buildCsp(nonce)).toContain('upgrade-insecure-requests');
  });

  it('sets object-src to none', () => {
    const csp = buildCsp(nonce);
    expect(csp).toContain("object-src 'none'");
  });

  it('restricts base-uri to self', () => {
    const csp = buildCsp(nonce);
    expect(csp).toContain("base-uri 'self'");
  });

  it('deduplicates connect-src origins when env vars overlap with fallbacks', () => {
    process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL = 'https://mainnet.optimism.io';
    const csp = buildCsp(nonce);
    const connectSrc = csp
      .split(';')
      .map((d) => d.trim())
      .find((d) => d.startsWith('connect-src')) ?? '';
    const count = (connectSrc.match(/https:\/\/mainnet\.optimism\.io/g) ?? []).length;
    expect(count).toBe(1);
    delete process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL;
  });
});
