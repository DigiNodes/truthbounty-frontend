/**
 * Responsible Disclosure & Security Policy Types
 *
 * Authority: Batch 6 Support & Legal (08-security-reporting.svg)
 * Spec: Issue #609 (UI-FE-040)
 * Architecture & Security Constraints:
 *   - Optimism/EVM only
 *   - Contracts are canonical for mutations; release manifests are canonical for versions/addresses
 *   - Protected channel state: unverified channels must render explicit 'unavailable' state
 *   - Forms MUST NOT collect vulnerability data until approved endpoints/retention exist
 *   - Submissions must remain isolated outside ordinary support/telemetry pipelines
 *   - Zero bounty amount or SLA response promise without verified DAO/maintainer authority
 */

export type SourceClass =
  | 'pinned-contracts'
  | 'verified-release-manifest'
  | 'fresh-api-projection'
  | 'approved-content'
  | 'wallet-session-state';

export type ProtectedChannelState = 'unavailable' | 'ready' | 'loading' | 'error';

export type ScopeCategory =
  | 'smart-contract'
  | 'frontend'
  | 'subgraph'
  | 'relayer'
  | 'infrastructure';

export type TargetEnvironment = 'optimism-mainnet' | 'optimism-sepolia' | 'production-web';

export interface SecurityScopeTarget {
  id: string;
  name: string;
  category: ScopeCategory;
  targetIdentifier: string; // Contract address, domain, or repository
  environment: TargetEnvironment;
  inScope: boolean;
  notes: string;
  sourceClass: SourceClass;
  contractAddress?: `0x${string}`;
}

export type ProhibitedSeverity = 'critical' | 'high' | 'prohibited';

export interface ProhibitedActivity {
  id: string;
  title: string;
  description: string;
  category: 'denial-of-service' | 'social-engineering' | 'private-key-compromise' | 'data-destruction' | 'unauthorized-disclosure';
  dangerLevel: ProhibitedSeverity;
}

export interface SafeHarborPledge {
  title: string;
  summary: string;
  clauses: readonly string[];
  legalNotice: string;
}

export interface VulnerabilityReportRequirement {
  id: string;
  field: string;
  requirement: string;
  guidance: string;
  mandatory: boolean;
}

export interface VerifiedPgpKey {
  keyId: string;
  fingerprint: string;
  armoredPublicKey: string;
  algorithm: string;
  expiresAt: string;
  canonicalVerificationUrl: string;
}

export interface ProtectedIntakeStatus {
  state: ProtectedChannelState;
  /** Explains why channel is unavailable (e.g. protocol#24 intake decision pending) */
  unavailableReason?: string;
  /** Explicit warning that submissions are blocked to prevent unencrypted plaintext leak */
  failClosedNotice?: string;
  /** Verified PGP and offline destination when state === 'ready' */
  verifiedPgpKey?: VerifiedPgpKey;
  /** Approved repository for private security advisories when ready */
  privateAdvisoryUrl?: string;
  /** Last audit / verification timestamp */
  verifiedAt?: string;
}

export interface SecurityPolicyMetadata {
  policyVersion: string;
  releaseManifestVersion: string;
  supportedChainId: number;
  supportedChainName: string;
  lastAuditedDate: string;
  sourceClass: SourceClass;
  telemetryIsolated: boolean;
  bountyGovernanceDisclaimer: string;
}

export interface ResponsibleDisclosureData {
  metadata: SecurityPolicyMetadata;
  scopeTargets: readonly SecurityScopeTarget[];
  safeHarbor: SafeHarborPledge;
  prohibitedActivities: readonly ProhibitedActivity[];
  reportRequirements: readonly VulnerabilityReportRequirement[];
  channelStatus: ProtectedIntakeStatus;
}
