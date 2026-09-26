import fs from 'fs';
import path from 'path';

describe('Legacy Backend & Stellar Cleanup Regression', () => {
  const rootDir = process.cwd();

  it('ensures obsolete NestJS and Joi validation files are removed from src/config', () => {
    const legacyFiles = [
      'src/config/config.module.ts',
      'src/config/env.validation.ts',
      'src/config/tests/env.validation.spec.ts',
    ];

    for (const file of legacyFiles) {
      const fullPath = path.join(rootDir, file);
      expect(fs.existsSync(fullPath)).toBe(false);
    }
  });

  it('ensures package.json contains no backend NestJS, Joi, or Stellar dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    expect(allDeps['@nestjs/common']).toBeUndefined();
    expect(allDeps['@nestjs/config']).toBeUndefined();
    expect(allDeps['joi']).toBeUndefined();
    expect(allDeps['@stellar/stellar-sdk']).toBeUndefined();
    expect(allDeps['@stellar/freighter-api']).toBeUndefined();
  });
});
