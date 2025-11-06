#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const packageJsonPath = resolve(rootDir, 'package.json');
const buildInfoPath = resolve(rootDir, 'build-info.json');

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function readVersion() {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const version = pkg?.version;
  if (!version) {
    throw new Error('[reset-build-info] package.json no define "version".');
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`[reset-build-info] "version" (${version}) no cumple el formato X.Y.Z.`);
  }
  return version;
}

function main() {
  const version = readVersion();
  const current = readJson(buildInfoPath);
  const next = {
    base: version,
    build: 0,
  };

  if (current?.base === version && current?.build === 0) {
    console.log('[reset-build-info] build-info.json ya esta actualizado.');
    return;
  }

  writeJson(buildInfoPath, next);
  console.log(`[reset-build-info] build-info.json actualizado a base=${version} build=0`);
}

try {
  main();
} catch (error) {
  console.error(error.message ?? error);
  process.exit(error.exitCode ?? 1);
}
