'use client';

/**
 * useSecurityDisclosure — Hook for Responsible Disclosure & Protected Intake Boundary
 *
 * Authority: Batch 6 Support & Legal (08-security-reporting.svg)
 * Spec: Issue #609 (UI-FE-040)
 *
 * Constraints:
 *   - Protected boundary defaults to 'unavailable' unless verified via protocol#24
 *   - Strictly isolated from standard telemetry/analytics logging
 *   - Provides deterministic state, clipboard feedback, and scope filtering
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  ResponsibleDisclosureData,
  ProtectedChannelState,
  ScopeCategory,
  SecurityScopeTarget,
} from '@/app/types/security-disclosure';
import {
  CANONICAL_SECURITY_POLICY,
  VERIFIED_READY_CHANNEL_FIXTURE,
} from '@/config/security-policy';

export interface UseSecurityDisclosureOptions {
  /** Optional override for testing verified/ready or error states */
  channelStateOverride?: ProtectedChannelState;
  /** Custom data fixture if testing */
  initialData?: ResponsibleDisclosureData;
}

export interface UseSecurityDisclosureReturn {
  data: ResponsibleDisclosureData;
  activeChannelState: ProtectedChannelState;
  scopeFilter: 'all' | 'in-scope' | 'out-of-scope';
  setScopeFilter: (filter: 'all' | 'in-scope' | 'out-of-scope') => void;
  categoryFilter: ScopeCategory | 'all';
  setCategoryFilter: (category: ScopeCategory | 'all') => void;
  filteredScopeTargets: readonly SecurityScopeTarget[];
  copiedTargetId: string | null;
  copyToClipboard: (text: string, targetId: string) => Promise<boolean>;
  isChannelReady: boolean;
  isChannelUnavailable: boolean;
}

export function useSecurityDisclosure(
  options: UseSecurityDisclosureOptions = {}
): UseSecurityDisclosureReturn {
  const { channelStateOverride, initialData } = options;

  const baseData = useMemo(() => {
    if (initialData) return initialData;
    if (channelStateOverride === 'ready') return VERIFIED_READY_CHANNEL_FIXTURE;
    return CANONICAL_SECURITY_POLICY;
  }, [initialData, channelStateOverride]);

  const activeChannelState: ProtectedChannelState = useMemo(() => {
    if (channelStateOverride) return channelStateOverride;
    return baseData.channelStatus.state;
  }, [channelStateOverride, baseData.channelStatus.state]);

  const [scopeFilter, setScopeFilter] = useState<'all' | 'in-scope' | 'out-of-scope'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ScopeCategory | 'all'>('all');
  const [copiedTargetId, setCopiedTargetId] = useState<string | null>(null);

  const filteredScopeTargets = useMemo(() => {
    return baseData.scopeTargets.filter((target) => {
      if (scopeFilter === 'in-scope' && !target.inScope) return false;
      if (scopeFilter === 'out-of-scope' && target.inScope) return false;
      if (categoryFilter !== 'all' && target.category !== categoryFilter) return false;
      return true;
    });
  }, [baseData.scopeTargets, scopeFilter, categoryFilter]);

  const copyToClipboard = useCallback(async (text: string, targetId: string): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedTargetId(targetId);
        setTimeout(() => {
          setCopiedTargetId((prev) => (prev === targetId ? null : prev));
        }, 2000);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    data: baseData,
    activeChannelState,
    scopeFilter,
    setScopeFilter,
    categoryFilter,
    setCategoryFilter,
    filteredScopeTargets,
    copiedTargetId,
    copyToClipboard,
    isChannelReady: activeChannelState === 'ready',
    isChannelUnavailable: activeChannelState === 'unavailable',
  };
}
