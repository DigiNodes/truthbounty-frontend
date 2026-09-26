import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ChecksumsFile } from './types';

export function sha256FileContents(contents: string | Buffer): string {
  const str = typeof contents === 'string' ? contents : contents.toString('utf8');
  const normalized = str.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function verifyChecksums(
  releaseDir: string,
  checksums: ChecksumsFile,
): void {
  const entries = Object.entries(checksums.files).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [relativePath, expected] of entries) {
    const absolutePath = join(releaseDir, relativePath);
    const actual = sha256FileContents(readFileSync(absolutePath));
    if (actual !== expected) {
      throw new Error(
        `Checksum mismatch for ${relativePath}: expected ${expected}, got ${actual}`,
      );
    }
  }
}
