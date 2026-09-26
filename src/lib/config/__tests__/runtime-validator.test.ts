import {
  validateRuntimeConfiguration,
  assertValidRuntimeConfiguration,
} from '@/lib/config/runtime-validator';
import type { LoadedReleaseArtifacts } from '@/lib/contracts/types';

describe('Runtime Validator for Chain, API, and Contract Configuration', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('validates canonical default configuration successfully', () => {
    const result = validateRuntimeConfiguration();
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.diagnostics.activeChainId).toBe(10);
    expect(result.diagnostics.supportedChainIds).toEqual([10, 11155420]);
    expect(result.diagnostics.contracts.TruthBountyWeighted).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(result.diagnostics.protocolVersion).toBe('2.0.0');
  });

  it('assertValidRuntimeConfiguration returns diagnostics on success', () => {
    const diagnostics = assertValidRuntimeConfiguration();
    expect(diagnostics.protocolVersion).toBe('2.0.0');
    expect(diagnostics.activeChainId).toBe(10);
  });

  it('detects invalid contract addresses in release manifest', () => {
    const mockRelease: LoadedReleaseArtifacts = {
      manifest: {
        protocolVersion: '2.0.0',
        releaseId: 'test-release',
        gitCommit: 'abc',
        compilerVersion: '0.8.28',
        chainId: 11155420,
        deploymentBlock: 1,
        abiVersion: '1',
        eventSchemaVersion: '1',
        parameterSetVersion: '1',
        contracts: {
          Dummy: {
            proxy: '0x0000000000000000000000000000000000000000',
            implementation: 'GA5XIGA5C7QTPTWXQHY6MCJRMTRZDOSHR6EFIBNDQTCQHG262N4GGKIB',
          },
        },
      },
      addresses: {
        chainId: 11155420,
        TruthBountyWeighted: '0xYourContractAddressPlaceholder0000000000',
      },
      abis: {},
      events: { version: '1', events: [] },
      parameters: {},
      roles: {},
      checksums: { version: '1', files: {} },
    };

    const result = validateRuntimeConfiguration({ release: mockRelease });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('TruthBountyWeighted address invalid'),
        expect.stringContaining('Dummy.proxy address invalid'),
        expect.stringContaining('Dummy.implementation address invalid'),
      ])
    );
  });

  it('detects unsupported chain ID in release manifest', () => {
    const mockRelease: LoadedReleaseArtifacts = {
      manifest: {
        protocolVersion: '2.0.0',
        releaseId: 'test-release',
        gitCommit: 'abc',
        compilerVersion: '0.8.28',
        chainId: 9999,
        deploymentBlock: 1,
        abiVersion: '1',
        eventSchemaVersion: '1',
        parameterSetVersion: '1',
        contracts: {},
      },
      addresses: {
        chainId: 9999,
        TruthBountyWeighted: '0x1234567890123456789012345678901234567890',
      },
      abis: {},
      events: { version: '1', events: [] },
      parameters: {},
      roles: {},
      checksums: { version: '1', files: {} },
    };

    const result = validateRuntimeConfiguration({ release: mockRelease });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unsupported chain ID 9999'),
      ])
    );
  });

  it('assertValidRuntimeConfiguration throws when validation errors exist', () => {
    const mockBadRelease: LoadedReleaseArtifacts = {
      manifest: {
        protocolVersion: '2.0.0',
        releaseId: 'bad',
        gitCommit: 'abc',
        compilerVersion: '0.8.28',
        chainId: 999,
        deploymentBlock: 1,
        abiVersion: '1',
        eventSchemaVersion: '1',
        parameterSetVersion: '1',
        contracts: {},
      },
      addresses: {
        chainId: 999,
        TruthBountyWeighted: '0x0000000000000000000000000000000000000000',
      },
      abis: {},
      events: { version: '1', events: [] },
      parameters: {},
      roles: {},
      checksums: { version: '1', files: {} },
    };

    expect(() => assertValidRuntimeConfiguration({ release: mockBadRelease })).toThrow(
      /Runtime configuration validation failed/
    );
  });
});
