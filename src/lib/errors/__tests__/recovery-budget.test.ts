import {
  MAX_RELOAD_ATTEMPTS,
  MAX_RETRY_ATTEMPTS,
  RECOVERY_WINDOW_MS,
  RecoveryBudget,
  __resetRecoveryBudgetMemory,
} from '../recovery-budget';

describe('RecoveryBudget', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    __resetRecoveryBudgetMemory();
  });

  it('has bounded defaults', () => {
    expect(MAX_RETRY_ATTEMPTS).toBe(3);
    expect(MAX_RELOAD_ATTEMPTS).toBe(2);
    expect(RECOVERY_WINDOW_MS).toBe(5 * 60 * 1000);
  });

  it('allows exactly `max` attempts then refuses without spending more', () => {
    const b = new RecoveryBudget({ max: 3 });
    expect([b.record(), b.record(), b.record(), b.record(), b.record()]).toEqual([true, true, true, false, false]);
    expect(b.used()).toBe(3);
    expect(b.remaining()).toBe(0);
    expect(b.canAttempt()).toBe(false);
  });

  it('refills as attempts age out of the sliding window', () => {
    let t = 1_000_000;
    const b = new RecoveryBudget({ max: 2, windowMs: 1000, now: () => t });
    expect(b.record()).toBe(true);
    t += 400;
    expect(b.record()).toBe(true);
    expect(b.record()).toBe(false);
    t += 700; // first attempt now > 1000ms old
    expect(b.remaining()).toBe(1);
    expect(b.record()).toBe(true);
  });

  it('reset() restores the full budget', () => {
    const b = new RecoveryBudget({ max: 1 });
    b.record();
    b.reset();
    expect(b.canAttempt()).toBe(true);
  });

  it('persists across instances (i.e. across a page reload) via sessionStorage', () => {
    new RecoveryBudget({ max: 2, persistScope: 'route:content:reload' }).record();
    const afterReload = new RecoveryBudget({ max: 2, persistScope: 'route:content:reload' });
    expect(afterReload.used()).toBe(1);
    afterReload.record();
    expect(new RecoveryBudget({ max: 2, persistScope: 'route:content:reload' }).canAttempt()).toBe(false);
  });

  it('keeps scopes independent', () => {
    new RecoveryBudget({ max: 1, persistScope: 'a' }).record();
    expect(new RecoveryBudget({ max: 1, persistScope: 'b' }).canAttempt()).toBe(true);
  });

  it('falls back to memory when sessionStorage throws', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const b = new RecoveryBudget({ max: 1, persistScope: 'no-storage' });
    expect(b.record()).toBe(true);
    expect(new RecoveryBudget({ max: 1, persistScope: 'no-storage' }).canAttempt()).toBe(false);
    spy.mockRestore();
  });

  it('ignores corrupt stored data instead of throwing', () => {
    window.sessionStorage.setItem('tb-err-budget:x', '{not json');
    expect(() => new RecoveryBudget({ max: 1, persistScope: 'x' }).canAttempt()).not.toThrow();
    window.sessionStorage.setItem('tb-err-budget:x', JSON.stringify({ a: 1 }));
    expect(new RecoveryBudget({ max: 1, persistScope: 'x' }).canAttempt()).toBe(true);
  });

  it('never reads or writes pending-transaction recovery keys', () => {
    window.localStorage.setItem('truthbounty-pending-transactions-v2', '["tx-1"]');
    window.localStorage.setItem('tb-tx-v2:tx-1', '{"v":2}');
    const b = new RecoveryBudget({ max: 2, persistScope: 'tx-safety' });
    b.record();
    b.reset();
    expect(window.localStorage.getItem('truthbounty-pending-transactions-v2')).toBe('["tx-1"]');
    expect(window.localStorage.getItem('tb-tx-v2:tx-1')).toBe('{"v":2}');
    expect(Object.keys(window.localStorage)).toEqual(
      expect.not.arrayContaining([expect.stringMatching(/^tb-err-budget:/)]),
    );
  });
});
