/**
 * Unit tests for canonical query key factory (queryKeys.ts)
 *
 * Verifies:
 *  - Every domain has a stable root key for coarse invalidation.
 *  - Scoped keys include the discriminant so they never collide.
 *  - Tuple shapes are readonly and type-safe.
 */

import {
  claimsKeys,
  evidenceKeys,
  roundsKeys,
  disputesKeys,
  verificationsKeys,
  rewardsKeys,
  reputationKeys,
  walletKeys,
  leaderboardKeys,
  userKeys,
  queryKeys,
} from '@/app/queries/queryKeys';

describe('queryKeys — canonical key factory', () => {
  // -------------------------------------------------------------------------
  // Claims
  // -------------------------------------------------------------------------
  describe('claimsKeys', () => {
    it('all is a stable root key', () => {
      expect(claimsKeys.all).toEqual(['claims']);
    });

    it('lists() returns a stable lists key', () => {
      expect(claimsKeys.lists()).toEqual(['claims', 'list']);
    });

    it('list(filters) encodes filters into the key', () => {
      const key = claimsKeys.list({ status: 'OPEN' });
      expect(key).toEqual(['claims', 'list', { status: 'OPEN' }]);
    });

    it('detail(claimId) includes the discriminant', () => {
      expect(claimsKeys.detail('claim-1')).toEqual(['claims', 'detail', 'claim-1']);
    });

    it('byStatus(status) scopes to a status bucket', () => {
      expect(claimsKeys.byStatus('OPEN')).toEqual(['claims', 'status', 'OPEN']);
    });

    it('finality(claimId) creates an isolated projection key', () => {
      expect(claimsKeys.finality('claim-1')).toEqual(['claims', 'finality', 'claim-1']);
    });

    it('detail and finality keys never collide for the same claimId', () => {
      const detail = JSON.stringify(claimsKeys.detail('claim-1'));
      const finality = JSON.stringify(claimsKeys.finality('claim-1'));
      expect(detail).not.toBe(finality);
    });
  });

  // -------------------------------------------------------------------------
  // Evidence
  // -------------------------------------------------------------------------
  describe('evidenceKeys', () => {
    it('all is the root key', () => {
      expect(evidenceKeys.all).toEqual(['evidence']);
    });

    it('byClaim(claimId) scopes to the claim', () => {
      expect(evidenceKeys.byClaim('claim-2')).toEqual(['evidence', 'claim', 'claim-2']);
    });

    it('detail(evidenceId) is claim-independent', () => {
      expect(evidenceKeys.detail('ev-1')).toEqual(['evidence', 'detail', 'ev-1']);
    });
  });

  // -------------------------------------------------------------------------
  // Rounds
  // -------------------------------------------------------------------------
  describe('roundsKeys', () => {
    it('all is the root key', () => {
      expect(roundsKeys.all).toEqual(['rounds']);
    });

    it('byClaim(claimId) scopes correctly', () => {
      expect(roundsKeys.byClaim('claim-3')).toEqual(['rounds', 'claim', 'claim-3']);
    });

    it('detail(roundId) is distinct from byClaim', () => {
      const byClaim = JSON.stringify(roundsKeys.byClaim('r1'));
      const detail = JSON.stringify(roundsKeys.detail('r1'));
      expect(byClaim).not.toBe(detail);
    });
  });

  // -------------------------------------------------------------------------
  // Disputes
  // -------------------------------------------------------------------------
  describe('disputesKeys', () => {
    it('all is the root key', () => {
      expect(disputesKeys.all).toEqual(['disputes']);
    });

    it('byClaim(claimId) scopes to the claim', () => {
      expect(disputesKeys.byClaim('claim-4')).toEqual(['disputes', 'claim', 'claim-4']);
    });

    it('detail(disputeId) is included', () => {
      expect(disputesKeys.detail('d-1')).toEqual(['disputes', 'detail', 'd-1']);
    });

    it('finality(disputeId) is isolated', () => {
      expect(disputesKeys.finality('d-1')).toEqual(['disputes', 'finality', 'd-1']);
    });
  });

  // -------------------------------------------------------------------------
  // Verifications
  // -------------------------------------------------------------------------
  describe('verificationsKeys', () => {
    it('all is the root key', () => {
      expect(verificationsKeys.all).toEqual(['verifications']);
    });

    it('byClaim scopes to claim', () => {
      expect(verificationsKeys.byClaim('claim-5')).toEqual([
        'verifications',
        'claim',
        'claim-5',
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Rewards
  // -------------------------------------------------------------------------
  describe('rewardsKeys', () => {
    it('all is the root key', () => {
      expect(rewardsKeys.all).toEqual(['rewards']);
    });

    it('claimable(address) includes the address', () => {
      const addr = '0xabc';
      expect(rewardsKeys.claimable(addr)).toEqual(['rewards', 'claimable', addr]);
    });

    it('history(address) is distinct from claimable(address)', () => {
      const addr = '0xabc';
      expect(rewardsKeys.claimable(addr)).not.toEqual(rewardsKeys.history(addr));
    });

    it('byClaim(claimId) is claim-scoped', () => {
      expect(rewardsKeys.byClaim('claim-6')).toEqual(['rewards', 'claim', 'claim-6']);
    });
  });

  // -------------------------------------------------------------------------
  // Reputation
  // -------------------------------------------------------------------------
  describe('reputationKeys', () => {
    it('all is the root key', () => {
      expect(reputationKeys.all).toEqual(['reputation']);
    });

    it('byUser(userId) includes the userId', () => {
      expect(reputationKeys.byUser('user-1')).toEqual(['reputation', 'user', 'user-1']);
    });

    it('leaderboard is stable', () => {
      expect(reputationKeys.leaderboard).toEqual(['reputation', 'leaderboard']);
    });
  });

  // -------------------------------------------------------------------------
  // Wallet
  // -------------------------------------------------------------------------
  describe('walletKeys', () => {
    it('all is the root key', () => {
      expect(walletKeys.all).toEqual(['wallet']);
    });

    it('balance(address, chainId) encodes both dimensions', () => {
      expect(walletKeys.balance('0xabc', 10)).toEqual([
        'wallet',
        'balance',
        '0xabc',
        10,
      ]);
    });

    it('balance keys for different chains do not collide', () => {
      const mainnet = JSON.stringify(walletKeys.balance('0xabc', 1));
      const op = JSON.stringify(walletKeys.balance('0xabc', 10));
      expect(mainnet).not.toBe(op);
    });

    it('tokenBalance includes token address', () => {
      const key = walletKeys.tokenBalance('0xabc', '0xtoken', 10);
      expect(key).toEqual(['wallet', 'token', '0xabc', '0xtoken', 10]);
    });

    it('nonce(address, chainId) is distinct from balance', () => {
      const balance = JSON.stringify(walletKeys.balance('0xabc', 10));
      const nonce = JSON.stringify(walletKeys.nonce('0xabc', 10));
      expect(balance).not.toBe(nonce);
    });
  });

  // -------------------------------------------------------------------------
  // Leaderboard
  // -------------------------------------------------------------------------
  describe('leaderboardKeys', () => {
    it('all is the root key', () => {
      expect(leaderboardKeys.all).toEqual(['leaderboard']);
    });
  });

  // -------------------------------------------------------------------------
  // User
  // -------------------------------------------------------------------------
  describe('userKeys', () => {
    it('profile(userId) includes the userId', () => {
      expect(userKeys.profile('u1')).toEqual(['user', 'u1']);
    });

    it('reputation(userId) nests under profile', () => {
      expect(userKeys.reputation('u1')).toEqual(['user', 'u1', 'reputation']);
    });

    it('rewards(userId) does not collide with reputation', () => {
      expect(userKeys.reputation('u1')).not.toEqual(userKeys.rewards('u1'));
    });
  });

  // -------------------------------------------------------------------------
  // Unified queryKeys object backward-compat
  // -------------------------------------------------------------------------
  describe('queryKeys unified export', () => {
    it('exposes all domains', () => {
      expect(queryKeys.claims).toBeDefined();
      expect(queryKeys.evidence).toBeDefined();
      expect(queryKeys.rounds).toBeDefined();
      expect(queryKeys.disputes).toBeDefined();
      expect(queryKeys.verifications).toBeDefined();
      expect(queryKeys.rewards).toBeDefined();
      expect(queryKeys.reputation).toBeDefined();
      expect(queryKeys.wallet).toBeDefined();
      expect(queryKeys.leaderboard).toBeDefined();
      expect(queryKeys.user).toBeDefined();
    });

    it('leaderboard root key matches direct access', () => {
      expect(queryKeys.leaderboard).toEqual(leaderboardKeys.all);
    });
  });
});
