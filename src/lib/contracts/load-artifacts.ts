import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { assertValidContractAddress } from './address-guard';
import { verifyChecksums } from './checksum';
import type {
  AddressMap,
  ChecksumsFile,
  LoadedReleaseArtifacts,
  ReleaseManifest,
} from './types';

const TRACKED_FILES = [
  'manifest.json',
  'addresses/11155420.json',
  'abi/TruthBountyWeighted.json',
  'events/event-schema.json',
  'parameters/11155420.json',
  'roles/11155420.json',
] as const;

function readJson<T>(filePath: string): T {
  if (!existsSync(filePath)) {
    throw new Error(`Missing release artifact: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

export function resolveReleaseDir(customDir?: string): string {
  return customDir ?? process.env.TRUTHBOUNTY_ARTIFACT_DIR ?? join(process.cwd(), 'release');
}

export function loadReleaseArtifacts(options?: {
  releaseDir?: string;
  expectedProtocolVersion?: string;
}): LoadedReleaseArtifacts {
  const releaseDir = resolveReleaseDir(options?.releaseDir);
  const checksums = readJson<ChecksumsFile>(join(releaseDir, 'checksums.json'));
  verifyChecksums(releaseDir, checksums);

  for (const relativePath of TRACKED_FILES) {
    if (!checksums.files[relativePath]) {
      throw new Error(`checksums.json missing entry for ${relativePath}`);
    }
  }

  const manifest = readJson<ReleaseManifest>(join(releaseDir, 'manifest.json'));
  const expectedVersion =
    options?.expectedProtocolVersion ??
    process.env.NEXT_PUBLIC_PROTOCOL_RELEASE ??
    manifest.protocolVersion;

  if (manifest.protocolVersion !== expectedVersion) {
    throw new Error(
      `Stale protocol release: manifest has ${manifest.protocolVersion}, expected ${expectedVersion}`,
    );
  }

  const addresses = readJson<AddressMap>(
    join(releaseDir, `addresses/${manifest.chainId}.json`),
  );

  if (addresses.chainId !== manifest.chainId) {
    throw new Error(
      `Chain ID mismatch: manifest=${manifest.chainId}, addresses=${addresses.chainId}`,
    );
  }

  assertValidContractAddress(addresses.TruthBountyWeighted, 'TruthBountyWeighted');

  for (const [name, entry] of Object.entries(manifest.contracts)) {
    assertValidContractAddress(entry.proxy, `${name}.proxy`);
    assertValidContractAddress(entry.implementation, `${name}.implementation`);
  }

  const abis: Record<string, readonly unknown[]> = {
    TruthBountyWeighted: readJson<readonly unknown[]>(
      join(releaseDir, 'abi/TruthBountyWeighted.json'),
    ),
  };

  return {
    manifest,
    addresses,
    abis,
    events: readJson(join(releaseDir, 'events/event-schema.json')),
    parameters: readJson(join(releaseDir, `parameters/${manifest.chainId}.json`)),
    roles: readJson(join(releaseDir, `roles/${manifest.chainId}.json`)),
    checksums,
  };
}
