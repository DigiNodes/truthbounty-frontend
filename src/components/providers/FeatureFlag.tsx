'use client';

import React, { ReactNode } from 'react';
import { useFeatureFlags } from './FeatureFlagProvider';
import { FeatureFlag } from '@/config/feature-flags';

interface FeatureFlagGateProps {
  /** The feature flag to check */
  flag: FeatureFlag;
  /** Content to render when flag is enabled */
  children: ReactNode;
  /** Optional fallback content when flag is disabled */
  fallback?: ReactNode;
  /** Require all flags to be enabled (when multiple flags provided) */
  requireAll?: boolean;
  /** Additional flags to check (along with primary flag) */
  flags?: FeatureFlag[];
}

/**
 * FeatureFlagGate
 * 
 * Conditionally renders children based on feature flag status.
 * Supports single or multiple flag checks.
 * 
 * @example
 * ```tsx
 * // Single flag
 * <FeatureFlagGate flag="CLAIM_SUBMISSION">
 *   <ClaimSubmissionForm />
 * </FeatureFlagGate>
 * 
 * // With fallback
 * <FeatureFlagGate flag="BETA_FEATURES" fallback={<ComingSoon />}>
 *   <BetaFeature />
 * </FeatureFlagGate>
 * 
 * // Multiple flags (require all)
 * <FeatureFlagGate flag="CLAIM_SUBMISSION" flags={['WALLET_CONNECTION']} requireAll>
 *   <ClaimSubmissionWithWallet />
 * </FeatureFlagGate>
 * ```
 */
export function FeatureFlagGate({
  flag,
  children,
  fallback = null,
  requireAll = false,
  flags = [],
}: FeatureFlagGateProps) {
  const { isEnabled } = useFeatureFlags();
  
  // Check primary flag
  const primaryEnabled = isEnabled(flag);
  
  // Check additional flags
  const allFlags = [flag, ...flags];
  
  let shouldRender: boolean;
  if (requireAll) {
    shouldRender = allFlags.every(f => isEnabled(f));
  } else {
    shouldRender = allFlags.some(f => isEnabled(f));
  }
  
  if (shouldRender) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

interface FeatureFlagSwitchProps {
  /** The feature flag to check */
  flag: FeatureFlag;
  /** Content when flag is enabled */
  whenEnabled: ReactNode;
  /** Content when flag is disabled */
  whenDisabled: ReactNode;
}

/**
 * FeatureFlagSwitch
 * 
 * Renders different content based on feature flag status.
 * More explicit than FeatureFlagGate for when you need both states.
 * 
 * @example
 * ```tsx
 * <FeatureFlagSwitch
 *   flag="REALTIME_UPDATES"
 *   whenEnabled={<RealtimeFeed />}
 *   whenDisabled={<PollingFeed />}
 * />
 * ```
 */
export function FeatureFlagSwitch({
  flag,
  whenEnabled,
  whenDisabled,
}: FeatureFlagSwitchProps) {
  const isEnabled = useFeatureFlag(flag);
  
  return <>{isEnabled ? whenEnabled : whenDisabled}</>;
}

/**
 * useFeatureFlag
 * 
 * Re-export the hook for convenience
 */
export { useFeatureFlag } from './FeatureFlagProvider';

/**
 * FeatureFlagDisabled
 * 
 * Renders children only when the specified flag is DISABLED.
 * 
 * @example
 * ```tsx
 * <FeatureFlagDisabled flag="BETA_FEATURES">
 *   <LegacyUI />
 * </FeatureFlagDisabled>
 * ```
 */
interface FeatureFlagDisabledProps {
  flag: FeatureFlag;
  children: ReactNode;
}

export function FeatureFlagDisabled({ flag, children }: FeatureFlagDisabledProps) {
  const isEnabled = useFeatureFlag(flag);
  
  if (!isEnabled) {
    return <>{children}</>;
  }
  
  return null;
}
