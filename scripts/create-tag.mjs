#!/usr/bin/env node

import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';

const isWindows = process.platform === 'win32';

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: isWindows });
  if (result.status !== 0) {
    const error = new Error(`[tag] Command failed: ${cmd} ${args.join(' ')}`.trim());
    error.exitCode = result.status ?? 1;
    throw error;
  }
}

function gitHasTag(tag) {
  const result = spawnSync('git', ['rev-parse', '--verify', '--quiet', tag], {
    shell: isWindows,
  });
  return result.status === 0;
}

function readVersion() {
  const raw = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  const pkg = JSON.parse(raw);
  if (!pkg?.version) {
    throw new Error('[tag] package.json no define "version".');
  }
  return pkg.version;
}

function main() {
  const version = readVersion();
  const tagName = `v${version}`;

  if (gitHasTag(tagName)) {
    console.log(`[tag] El tag ${tagName} ya existe. No se realizan cambios.`);
    return;
  }

  run('git', ['tag', '-a', tagName, '-m', tagName]);
  console.log(`[tag] Creado tag ${tagName}. Ejecuta "git push --tags" para publicarlo.`);
}

try {
  main();
} catch (error) {
  console.error(error.message ?? error);
  process.exit(error.exitCode ?? 1);
}

