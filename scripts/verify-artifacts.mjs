#!/usr/bin/env node
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PLACEHOLDER = /yourcontract|placeholder|dummy/i;
const releaseDir = process.env.TRUTHBOUNTY_ARTIFACT_DIR ?? join(process.cwd(), 'release');
const expectedVersion = process.env.NEXT_PUBLIC_PROTOCOL_RELEASE;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256(contents) {
  const normalized = typeof contents === 'string'
    ? contents.replace(/\r\n/g, '\n')
    : contents.toString('utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

function assertAddress(value, label) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`Invalid address for ${label}: ${value}`);
  }
  if (value.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Zero address for ${label}`);
  }
  if (PLACEHOLDER.test(value)) {
    throw new Error(`Placeholder address for ${label}: ${value}`);
  }
}

try {
  const checksums = readJson(join(releaseDir, 'checksums.json'));
  for (const [relativePath, expected] of Object.entries(checksums.files)) {
    const filePath = join(releaseDir, relativePath);
    if (!existsSync(filePath)) {
      throw new Error(`Missing tracked artifact: ${relativePath}`);
    }
    const actual = sha256(readFileSync(filePath));
    if (actual !== expected) {
      throw new Error(`Checksum mismatch for ${relativePath}`);
    }
  }

  const manifest = readJson(join(releaseDir, 'manifest.json'));
  if (expectedVersion && manifest.protocolVersion !== expectedVersion) {
    throw new Error(
      `Stale release: manifest=${manifest.protocolVersion}, expected=${expectedVersion}`,
    );
  }

  const addresses = readJson(join(releaseDir, `addresses/${manifest.chainId}.json`));
  if (addresses.chainId !== manifest.chainId) {
    throw new Error('Address map chainId mismatch');
  }

  assertAddress(addresses.TruthBountyWeighted, 'TruthBountyWeighted');
  for (const [name, entry] of Object.entries(manifest.contracts)) {
    assertAddress(entry.proxy, `${name}.proxy`);
    assertAddress(entry.implementation, `${name}.implementation`);
  }

  console.log(
    `Verified TruthBounty release ${manifest.releaseId} (${manifest.protocolVersion}) on chain ${manifest.chainId}`,
  );
} catch (error) {
  console.error('Artifact verification failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
