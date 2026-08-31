/**
 * Runtime Configuration Validator for TruthBounty V2
 * Validates active chain, API endpoints, contract addresses, explorers, and artifact integrity at startup.
 */

import { getAddressValidationError } from '@/lib/contracts/address-guard';
import { getClientEnv, validateEnv } from '@/lib/env';
import { OPTIMISM_EXPLORERS } from '@/lib/explorer';
import { getProtocolRelease } from '@/lib/contracts/registry';
import type { LoadedReleaseArtifacts } from '@/lib/contracts/types';

export interface RuntimeDiagnostics {
  protocolVersion: string;
  releaseId: string;
  activeChainId: number;
  supportedChainIds: number[];
  apiUrl: string;
  wsUrl: string;
  contracts: Record<string, string>;
  explorerUrl: string;
  verifiedAt: string;
}

export interface RuntimeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  diagnostics: RuntimeDiagnostics;
}

export interface ValidateRuntimeOptions {
  release?: LoadedReleaseArtifacts;
  customEnv?: Record<string, string | undefined>;
}

const CANONICAL_OPTIMISM_CHAINS = [10, 11155420];

/**
 * Validates the full runtime setup including env, contracts, chains, and endpoints
 */
export function validateRuntimeConfiguration(options?: ValidateRuntimeOptions): RuntimeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const clientEnv = getClientEnv();

  // 1. Validate Environment Variables
  const envValidation = validateEnv(options?.customEnv);
  if (!envValidation.isValid) {
    errors.push(...envValidation.errors);
  }

  // 2. Validate Default & Supported Chain IDs
  if (!CANONICAL_OPTIMISM_CHAINS.includes(clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN_ID)) {
    errors.push(
      `Unsupported default chain ID ${clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN_ID}. Canonical chains are Optimism Mainnet (10) and Optimism Sepolia (11155420).`
    );
  }

  for (const chainId of clientEnv.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS) {
    if (!CANONICAL_OPTIMISM_CHAINS.includes(chainId)) {
      errors.push(
        `Unsupported chain ID in NEXT_PUBLIC_SUPPORTED_CHAIN_IDS: ${chainId}. Only Optimism (10, 11155420) are supported.`
      );
    }
  }

  // 3. Validate Contract Artifacts and Addresses
  let release: LoadedReleaseArtifacts | undefined = options?.release;
  if (!release) {
    try {
      release = getProtocolRelease();
    } catch (err: unknown) {
      errors.push(`Failed to load protocol release artifacts: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const contractsMap: Record<string, string> = {};

  if (release) {
    // Validate Release Chain ID
    if (!CANONICAL_OPTIMISM_CHAINS.includes(release.manifest.chainId)) {
      errors.push(
        `Release manifest configured with unsupported chain ID ${release.manifest.chainId}. Expected 10 or 11155420.`
      );
    }

    // Validate Contract Addresses in Address Map
    const mainAddress = release.addresses.TruthBountyWeighted;
    const mainAddressError = getAddressValidationError(mainAddress);
    if (mainAddressError) {
      errors.push(`TruthBountyWeighted address invalid: ${mainAddressError}`);
    } else {
      contractsMap.TruthBountyWeighted = mainAddress;
    }

    // Validate Manifest Contracts
    for (const [name, contractEntry] of Object.entries(release.manifest.contracts || {})) {
      const proxyError = getAddressValidationError(contractEntry.proxy);
      if (proxyError) {
        errors.push(`Contract ${name}.proxy address invalid: ${proxyError}`);
      }
      const implError = getAddressValidationError(contractEntry.implementation);
      if (implError) {
        errors.push(`Contract ${name}.implementation address invalid: ${implError}`);
      }
    }
  }

  // 4. Validate Explorer Configuration
  const defaultExplorer = OPTIMISM_EXPLORERS[clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN_ID];
  if (!defaultExplorer) {
    errors.push(
      `No explorer configuration defined for default chain ID ${clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN_ID}`
    );
  }

  // 5. Build Diagnostics
  const diagnostics: RuntimeDiagnostics = {
    protocolVersion: release?.manifest.protocolVersion || 'unknown',
    releaseId: release?.manifest.releaseId || 'unknown',
    activeChainId: clientEnv.NEXT_PUBLIC_DEFAULT_CHAIN_ID,
    supportedChainIds: clientEnv.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS,
    apiUrl: clientEnv.NEXT_PUBLIC_API_URL,
    wsUrl: clientEnv.NEXT_PUBLIC_WS_URL,
    contracts: contractsMap,
    explorerUrl: defaultExplorer?.baseUrl || '',
    verifiedAt: new Date().toISOString(),
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    diagnostics,
  };
}

/**
 * Asserts runtime configuration validity or throws descriptive startup error
 */
export function assertValidRuntimeConfiguration(options?: ValidateRuntimeOptions): RuntimeDiagnostics {
  const result = validateRuntimeConfiguration(options);
  if (!result.isValid) {
    throw new Error(`Runtime configuration validation failed:\n  - ${result.errors.join('\n  - ')}`);
  }
  return result.diagnostics;
}
