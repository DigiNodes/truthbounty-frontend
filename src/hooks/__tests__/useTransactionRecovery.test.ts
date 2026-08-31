import { renderHook } from '@testing-library/react';
import { useTransactionRecovery } from '../useTransactionRecovery';

describe('useTransactionRecovery', () => {
  it('detects a replaced transaction and updates the persisted identity', () => {
    const { result } = renderHook(() =>
      useTransactionRecovery({
        txHash: '0xold',
        chainId: 10,
        status: 'replaced',
        replacementHash: '0xnew',
        persistedEntries: [
          { id: 'tx:1', hash: '0xold', status: 'pending', chainId: 10 },
        ],
      }),
    );

    expect(result.current.state).toBe('replaced');
    expect(result.current.shouldDuplicateSubmit).toBe(false);
    expect(result.current.replacementHash).toBe('0xnew');
  });

  it('blocks duplicate submissions when the original hash was dropped', () => {
    const { result } = renderHook(() =>
      useTransactionRecovery({
        txHash: '0xdropped',
        chainId: 10,
        status: 'dropped',
        persistedEntries: [
          { id: 'tx:2', hash: '0xdropped', status: 'dropped', chainId: 10 },
        ],
      }),
    );

    expect(result.current.state).toBe('dropped');
    expect(result.current.shouldDuplicateSubmit).toBe(true);
    expect(result.current.isProtocolDisabled).toBe(true);
  });

  it('treats a repriced tx as pending until the final receipt arrives', () => {
    const { result } = renderHook(() =>
      useTransactionRecovery({
        txHash: '0xrepriced',
        chainId: 10,
        status: 'repriced',
        persistedEntries: [
          { id: 'tx:3', hash: '0xrepriced', status: 'pending', chainId: 10 },
        ],
      }),
    );

    expect(result.current.state).toBe('repriced');
    expect(result.current.isPending).toBe(true);
    expect(result.current.shouldDuplicateSubmit).toBe(false);
  });

  it('flags wrong-network states before accepting a recovered transaction', () => {
    const { result } = renderHook(() =>
      useTransactionRecovery({
        txHash: '0xwrong',
        chainId: 1,
        status: 'pending',
        persistedEntries: [
          { id: 'tx:4', hash: '0xwrong', status: 'pending', chainId: 1 },
        ],
      }),
    );

    expect(result.current.state).toBe('wrong-network');
    expect(result.current.isWrongNetwork).toBe(true);
    expect(result.current.isProtocolDisabled).toBe(true);
  });

  it('returns idle when no transaction state exists', () => {
    const { result } = renderHook(() =>
      useTransactionRecovery({
        txHash: undefined,
        chainId: 10,
        status: undefined,
        persistedEntries: [],
      }),
    );

    expect(result.current.state).toBe('idle');
    expect(result.current.shouldDuplicateSubmit).toBe(false);
  });
});
