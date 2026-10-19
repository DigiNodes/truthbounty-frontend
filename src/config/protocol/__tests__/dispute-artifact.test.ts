import {
  DISPUTE_ARTIFACT_VERSION,
  DISPUTE_SUPPORTED_CHAINS,
  DisputeArtifact,
  resolveDisputeArtifact,
} from '@/config/protocol/dispute-artifact';

const addr = (char: string) => `0x${char.repeat(40)}`;

const DEPLOYED_ENV = {
  NEXT_PUBLIC_TRUTHBOUNTY_PROTOCOL_RELEASE_TAG: 'v2-sc-014@v0.1.0',
  NEXT_PUBLIC_TRUTHBOUNTY_DISPUTE_ADDRESS: addr('1'),
  NEXT_PUBLIC_TRUTHBOUNTY_STAKING_TOKEN_ADDRESS: addr('3'),
};

const expectDisabled = (artifact: DisputeArtifact, reason: RegExp) => {
  expect(artifact.isDeployed).toBe(false);
  expect(artifact.disabledReasons.length).toBeGreaterThan(0);
  expect(artifact.disabledReasons.join('; ')).toMatch(reason);
};

describe('resolveDisputeArtifact', () => {
  it('resolves a deployed artifact when the release is fully pinned', () => {
    const artifact = resolveDisputeArtifact(DEPLOYED_ENV, 11155420);

    expect(artifact.isDeployed).toBe(true);
    expect(artifact.chainId).toBe(11155420);
    expect(artifact.releaseTag).toBe('v2-sc-014@v0.1.0');
    expect(artifact.artifactVersion).toBe(DISPUTE_ARTIFACT_VERSION);
    expect(artifact.disabledReasons).toHaveLength(0);
  });

  it('normalizes addresses to lowercase', () => {
    const artifact = resolveDisputeArtifact(
      {
        ...DEPLOYED_ENV,
        NEXT_PUBLIC_TRUTHBOUNTY_DISPUTE_ADDRESS: addr('A'),
      },
      10
    );

    expect(artifact.addresses.dispute).toBe(addr('a'));
  });

  it('prefers per-chain address suffixes over generic values', () => {
    const artifact = resolveDisputeArtifact(
      {
        ...DEPLOYED_ENV,
        NEXT_PUBLIC_TRUTHBOUNTY_DISPUTE_ADDRESS_10: addr('b'),
      },
      10
    );

    expect(artifact.addresses.dispute).toBe(addr('b'));
  });

  it('fails closed on an unsupported chain', () => {
    expectDisabled(
      resolveDisputeArtifact(DEPLOYED_ENV, 1),
      /not a supported dispute chain/
    );
  });

  it('fails closed when no environment is pinned at all', () => {
    expectDisabled(resolveDisputeArtifact({}, 10), /not pinned/);
  });

  it('fails closed when the release tag is missing', () => {
    const env: Record<string, string | undefined> = { ...DEPLOYED_ENV };
    delete env.NEXT_PUBLIC_TRUTHBOUNTY_PROTOCOL_RELEASE_TAG;
    expectDisabled(resolveDisputeArtifact(env, 10), /release tag/);
  });

  it('fails closed on dummy/placeholder release tags', () => {
    expectDisabled(
      resolveDisputeArtifact(
        { ...DEPLOYED_ENV, NEXT_PUBLIC_TRUTHBOUNTY_PROTOCOL_RELEASE_TAG: 'placeholder' },
        10
      ),
      /not a real release/
    );
  });

  it('fails closed when any required address is missing', () => {
    const env: Record<string, string | undefined> = { ...DEPLOYED_ENV };
    delete env.NEXT_PUBLIC_TRUTHBOUNTY_STAKING_TOKEN_ADDRESS;
    expectDisabled(resolveDisputeArtifact(env, 10), /StakingToken/);
  });

  it('fails closed on malformed addresses', () => {
    expectDisabled(
      resolveDisputeArtifact(
        { ...DEPLOYED_ENV, NEXT_PUBLIC_TRUTHBOUNTY_DISPUTE_ADDRESS: '0xshort' },
        10
      ),
      /VerificationDispute.*valid EVM address/
    );
  });

  it('lists every supported chain', () => {
    // Optimism mainnet + Sepolia only; never fabricate chain support.
    expect(DISPUTE_SUPPORTED_CHAINS).toEqual([10, 11155420]);
  });
});
