import { isSensitivePath, requiresManualReview } from '@/lib/security/sensitive-paths';

describe('sensitive path policy', () => {
  it('flags wallet, auth, transaction, artifact and security paths as sensitive', () => {
    expect(isSensitivePath('src/app/auth/login/page.tsx')).toBe(true);
    expect(isSensitivePath('src/hooks/useWallet.ts')).toBe(true);
    expect(isSensitivePath('src/lib/transaction-simulator.ts')).toBe(true);
    expect(isSensitivePath('src/lib/artifacts/verify.ts')).toBe(true);
    expect(isSensitivePath('src/lib/security/headers.ts')).toBe(true);
    expect(isSensitivePath('src/components/common/Card.tsx')).toBe(false);
  });

  it('requires manual review for sensitive changes unless explicitly approved', () => {
    expect(requiresManualReview(['src/app/auth/login/page.tsx'], [])).toBe(true);
    expect(requiresManualReview(['src/app/auth/login/page.tsx'], ['manual-review'])).toBe(false);
    expect(requiresManualReview(['src/components/common/Card.tsx'], [])).toBe(false);
  });
});
