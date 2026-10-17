import { renderHook, act } from '@testing-library/react';
import { useSecurityDisclosure } from '../useSecurityDisclosure';
import {
  CANONICAL_SECURITY_POLICY,
  VERIFIED_READY_CHANNEL_FIXTURE,
} from '@/config/security-policy';

describe('useSecurityDisclosure', () => {
  it('initializes with canonical policy data and unavailable channel state by default', () => {
    const { result } = renderHook(() => useSecurityDisclosure());

    expect(result.current.data.metadata.policyVersion).toBe('1.0.0-draft');
    expect(result.current.data.metadata.supportedChainId).toBe(11155420);
    expect(result.current.activeChannelState).toBe('unavailable');
    expect(result.current.isChannelUnavailable).toBe(true);
    expect(result.current.isChannelReady).toBe(false);
    expect(result.current.scopeFilter).toBe('all');
    expect(result.current.categoryFilter).toBe('all');
    expect(result.current.filteredScopeTargets.length).toBe(
      CANONICAL_SECURITY_POLICY.scopeTargets.length
    );
  });

  it('supports channelStateOverride for testing ready state', () => {
    const { result } = renderHook(() =>
      useSecurityDisclosure({ channelStateOverride: 'ready' })
    );

    expect(result.current.activeChannelState).toBe('ready');
    expect(result.current.isChannelReady).toBe(true);
    expect(result.current.isChannelUnavailable).toBe(false);
    expect(result.current.data.channelStatus.verifiedPgpKey).toBeDefined();
  });

  it('filters targets by in-scope and out-of-scope correctly', () => {
    const { result } = renderHook(() => useSecurityDisclosure());

    // Filter to in-scope
    act(() => {
      result.current.setScopeFilter('in-scope');
    });
    expect(result.current.scopeFilter).toBe('in-scope');
    expect(result.current.filteredScopeTargets.every((t) => t.inScope)).toBe(true);
    expect(result.current.filteredScopeTargets.length).toBe(3);

    // Filter to out-of-scope
    act(() => {
      result.current.setScopeFilter('out-of-scope');
    });
    expect(result.current.scopeFilter).toBe('out-of-scope');
    expect(result.current.filteredScopeTargets.every((t) => !t.inScope)).toBe(true);
    expect(result.current.filteredScopeTargets.length).toBe(3);

    // Reset to all
    act(() => {
      result.current.setScopeFilter('all');
    });
    expect(result.current.filteredScopeTargets.length).toBe(6);
  });

  it('filters targets by category correctly', () => {
    const { result } = renderHook(() => useSecurityDisclosure());

    act(() => {
      result.current.setCategoryFilter('smart-contract');
    });
    expect(result.current.categoryFilter).toBe('smart-contract');
    expect(
      result.current.filteredScopeTargets.every((t) => t.category === 'smart-contract')
    ).toBe(true);
    expect(result.current.filteredScopeTargets.length).toBe(2);
  });

  it('copies text to clipboard and manages copiedTargetId state', async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const { result } = renderHook(() => useSecurityDisclosure());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.copyToClipboard('0x1A2B...5678', 'target-core');
    });

    expect(success).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('0x1A2B...5678');
    expect(result.current.copiedTargetId).toBe('target-core');
  });
});
