import { act, renderHook } from '@testing-library/react';
import { useWalletNetwork } from '../useWalletNetwork';

describe('useWalletNetwork', () => {
  it('detects unsupported and wrong-network states', () => {
    const { result } = renderHook(() =>
      useWalletNetwork({
        chainId: 1,
        isConnected: true,
        switchChain: jest.fn(),
        addChain: jest.fn(),
        clearCache: jest.fn(),
      }),
    );

    expect(result.current.isUnsupported).toBe(true);
    expect(result.current.isWrongNetwork).toBe(true);
    expect(result.current.isProtocolDisabled).toBe(true);
    expect(result.current.action).toBe('switch');
  });

  it('switches to an approved Optimism chain when the wallet supports it', async () => {
    const switchChain = jest.fn().mockResolvedValue({ id: 10 });

    const { result } = renderHook(() =>
      useWalletNetwork({
        chainId: 1,
        isConnected: true,
        switchChain,
        addChain: jest.fn(),
        clearCache: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.switchToSupportedNetwork();
    });

    expect(switchChain).toHaveBeenCalledWith({ chainId: 10 });
  });

  it('rethrows a rejected switch attempt without mutating the allowed state', async () => {
    const switchChain = jest.fn().mockRejectedValue(new Error('User rejected the request'));
    const { result } = renderHook(() =>
      useWalletNetwork({
        chainId: 1,
        isConnected: true,
        switchChain,
        addChain: jest.fn(),
        clearCache: jest.fn(),
      }),
    );

    await expect(result.current.switchToSupportedNetwork()).rejects.toThrow('User rejected the request');
  });

  it('adds the preferred Optimism network when switch is unavailable', async () => {
    const addChain = jest.fn().mockResolvedValue({ id: 11155420 });

    const { result } = renderHook(() =>
      useWalletNetwork({
        chainId: 1,
        isConnected: true,
        switchChain: undefined,
        addChain,
        clearCache: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.addSupportedNetwork();
    });

    expect(addChain).toHaveBeenCalledWith(expect.objectContaining({ chainId: 11155420 }));
  });

  it('clears chain-scoped caches when unsupported', () => {
    const clearCache = jest.fn();

    const { result } = renderHook(() =>
      useWalletNetwork({
        chainId: 1,
        isConnected: true,
        switchChain: jest.fn(),
        addChain: jest.fn(),
        clearCache,
      }),
    );

    act(() => {
      result.current.clearChainScopedCaches();
    });

    expect(clearCache).toHaveBeenCalledTimes(1);
  });
});
