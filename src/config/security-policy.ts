/**
 * Canonical Security Policy and Scope Configuration
 *
 * Authority: Batch 6 Support & Legal (08-security-reporting.svg)
 * Spec: Issue #609 (UI-FE-040)
 *
 * INVARIANTS:
 * 1. Default protected channel state is 'unavailable' per DigiNodes/truthbounty-protocol#24.
 * 2. Forms collect NO data until approved intake endpoints and retention policies exist.
 * 3. NO bounty amounts or response promises/SLAs are fabricated without authority.
 * 4. Submissions are strictly kept outside ordinary support/analytics pipelines.
 */

import type { ResponsibleDisclosureData } from '@/app/types/security-disclosure';

export const CANONICAL_SECURITY_POLICY: ResponsibleDisclosureData = {
  metadata: {
    policyVersion: '1.0.0-draft',
    releaseManifestVersion: 'v2.0.0-sepolia',
    supportedChainId: 11155420, // Optimism Sepolia
    supportedChainName: 'Optimism (EVM)',
    lastAuditedDate: '2026-10-15',
    sourceClass: 'approved-content',
    telemetryIsolated: true,
    bountyGovernanceDisclaimer:
      'TruthBounty candidate release. No bounty amounts, monetary payouts, or response SLAs are promised or authorized by this interface. Any bounty eligibility remains strictly maintainer-controlled and subject to future DAO governance decisions upon protocol activation.',
  },

  scopeTargets: [
    {
      id: 'target-core-contract',
      name: 'TruthBountyCore Contract',
      category: 'smart-contract',
      targetIdentifier: '0x1A2B3C4D5E6F7890123456789ABCDEF012345678',
      contractAddress: '0x1A2B3C4D5E6F7890123456789ABCDEF012345678',
      environment: 'optimism-sepolia',
      inScope: true,
      notes: 'Bounty lifecycle, stake accounting, state transitions, reentrancy guards, and access-controlled roles.',
      sourceClass: 'verified-release-manifest',
    },
    {
      id: 'target-escrow-contract',
      name: 'TruthBountyEscrow Contract',
      category: 'smart-contract',
      targetIdentifier: '0x2B3C4D5E6F7890123456789ABCDEF0123456789A',
      contractAddress: '0x2B3C4D5E6F7890123456789ABCDEF0123456789A',
      environment: 'optimism-sepolia',
      inScope: true,
      notes: 'Collateral locking, payout settlement, and treasury authorization boundaries.',
      sourceClass: 'verified-release-manifest',
    },
    {
      id: 'target-frontend-app',
      name: 'TruthBounty Web Application',
      category: 'frontend',
      targetIdentifier: 'app.truthbounty.eth / truthbounty-frontend repository',
      environment: 'production-web',
      inScope: true,
      notes: 'Client-side state spoofing, DOM XSS, transaction crafting integrity, and sensitive session leakage.',
      sourceClass: 'verified-release-manifest',
    },
    {
      id: 'target-out-of-scope-rpc',
      name: 'Third-Party RPC Node Infrastructure',
      category: 'infrastructure',
      targetIdentifier: 'Infura / Alchemy / Public Optimism RPC endpoints',
      environment: 'optimism-sepolia',
      inScope: false,
      notes: 'Third-party RPC availability, rate-limiting, and network-level packet sniffing are out of scope.',
      sourceClass: 'approved-content',
    },
    {
      id: 'target-out-of-scope-worldcoin',
      name: 'World ID Cloud & Biometric Servers',
      category: 'infrastructure',
      targetIdentifier: 'Worldcoin Developer Portal & Identity Cloud',
      environment: 'production-web',
      inScope: false,
      notes: 'Worldcoin biometric verification infrastructure is managed upstream by Worldcoin/Tools for Humanity.',
      sourceClass: 'approved-content',
    },
    {
      id: 'target-out-of-scope-dns',
      name: 'DNS & Domain Registrars',
      category: 'infrastructure',
      targetIdentifier: 'Top-level domain registrar and DNS authoritative nameservers',
      environment: 'production-web',
      inScope: false,
      notes: 'DNS registrar accounts, WHOIS privacy, and BGP routing anomalies.',
      sourceClass: 'approved-content',
    },
  ],

  safeHarbor: {
    title: 'Security Research Safe Harbor',
    summary:
      'We consider security research conducted under this policy to be authorized, and we will not initiate legal action against researchers who comply with these guidelines.',
    clauses: [
      'Conduct all research in good faith and avoid causing harm to users, funds, or protocol state.',
      'Test only against designated testnet contracts (Optimism Sepolia) or local development forks; never attempt exploits on live funds.',
      'Promptly report any identified vulnerability through verified secure channels without disclosing it publicly prior to coordinated remediation.',
      'Never access, modify, or leak private keys, credentials, or personal information belonging to other users.',
      'Do not engage in extortion, threats, or demands for payments as a condition for report disclosure.',
    ],
    legalNotice:
      'Compliance with this policy constitutes authorized access within the scope of security testing. TruthBounty reserves all legal rights with respect to unauthorized activities or bad-faith exploits.',
  },

  prohibitedActivities: [
    {
      id: 'prohibited-dos',
      title: 'Denial of Service (DoS / DDoS)',
      description:
        'Volume-based flooding of RPC endpoints, transactions, frontends, or relayers that impedes service availability for other users.',
      category: 'denial-of-service',
      dangerLevel: 'critical',
    },
    {
      id: 'prohibited-social-eng',
      title: 'Social Engineering & Phishing',
      description:
        'Phishing, impersonation, credential harvesting, or physical access attempts targeting core contributors, maintainers, or protocol users.',
      category: 'social-engineering',
      dangerLevel: 'critical',
    },
    {
      id: 'prohibited-key-theft',
      title: 'Private Key & Secret Exfiltration',
      description:
        'Attempting to extract, compromise, or abuse production private keys, validator credentials, or multisig signer keys.',
      category: 'private-key-compromise',
      dangerLevel: 'critical',
    },
    {
      id: 'prohibited-data-destruction',
      title: 'Data Destruction & State Corruption',
      description:
        'Actions that permanently destroy user evidence, corrupt indexer databases, or disrupt on-chain protocol records beyond test boundaries.',
      category: 'data-destruction',
      dangerLevel: 'high',
    },
    {
      id: 'prohibited-public-leak',
      title: 'Premature Public Disclosure (0-Day)',
      description:
        'Disclosing vulnerabilities to social media, forums, or third parties before maintainers have investigated and remediated the issue.',
      category: 'unauthorized-disclosure',
      dangerLevel: 'high',
    },
  ],

  reportRequirements: [
    {
      id: 'req-summary',
      field: 'Vulnerability Summary',
      requirement: 'A clear description of the vulnerability, its root cause, and intended vs actual behavior.',
      guidance: 'Be specific about the affected contract, function, or client-side component.',
      mandatory: true,
    },
    {
      id: 'req-reproduction',
      field: 'Step-by-Step Reproduction',
      requirement: 'Deterministic instructions allowing maintainers to reproduce the vulnerability.',
      guidance: 'Include input payloads, state prerequisites, and exact commands.',
      mandatory: true,
    },
    {
      id: 'req-poc',
      field: 'Proof of Concept (PoC)',
      requirement: 'Executable test script (Foundry/Hardhat) or minimal demonstration reproduction.',
      guidance: 'Safe PoCs demonstrating exploitability without harming live systems or stealing funds.',
      mandatory: true,
    },
    {
      id: 'req-severity',
      field: 'Severity & Impact Analysis',
      requirement: 'Detailed assessment of impact on user funds, integrity, confidentiality, or availability.',
      guidance: 'CVSS v3.1 vector string is strongly encouraged if applicable.',
      mandatory: false,
    },
    {
      id: 'req-remediation',
      field: 'Remediation Suggestion',
      requirement: 'Proposed code fix or mitigation strategy if identified.',
      guidance: 'Helps expedite resolution and coordinated disclosure.',
      mandatory: false,
    },
  ],

  channelStatus: {
    state: 'unavailable',
    unavailableReason:
      'Web-based vulnerability intake is currently suspended pending the channel decision in DigiNodes/truthbounty-protocol#24. Direct web submission forms are intentionally disabled to prevent unencrypted plaintext report transmission into general web analytics or support pipelines.',
    failClosedNotice:
      'FAIL-CLOSED SECURITY BOUNDARY: Under no circumstances should sensitive exploit details, private keys, or 0-day vulnerability reports be submitted via public GitHub issues, Discord chats, or standard support tickets.',
    privateAdvisoryUrl: 'https://github.com/DigiNodes/truthbounty-protocol/security/advisories/new',
    verifiedAt: '2026-10-15T00:00:00Z',
  },
};

/**
 * Fixture for verified / ready channel state (used for testing and when protocol#24 activates)
 */
export const VERIFIED_READY_CHANNEL_FIXTURE: ResponsibleDisclosureData = {
  ...CANONICAL_SECURITY_POLICY,
  channelStatus: {
    state: 'ready',
    verifiedAt: '2026-10-15T12:00:00Z',
    privateAdvisoryUrl: 'https://github.com/DigiNodes/truthbounty-protocol/security/advisories/new',
    verifiedPgpKey: {
      keyId: '0x9E7F6A5B4C3D2E1F',
      fingerprint: '3F1A 8C9D 4B2E 0E7F 6A5B  4C3D 2E1F 9A8B 7C6D 5E4F',
      algorithm: 'RSA 4096 / Ed25519',
      expiresAt: '2027-10-15T00:00:00Z',
      canonicalVerificationUrl: 'https://truthbounty.org/.well-known/security.txt',
      armoredPublicKey: `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v5.10.1
Comment: TruthBounty Protocol Security Contact Key (Batch 6)

mQGNBF+1234BDAC7Xw8a9...[TRUNCATED CANONICAL KEY BLOCK FOR ILLUSTRATION]...
-----END PGP PUBLIC KEY BLOCK-----`,
    },
  },
};
