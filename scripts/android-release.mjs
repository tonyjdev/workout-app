#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
const isWindows = process.platform === 'win32';

function run(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    ...options,
  });

  if (result.status !== 0) {
    const error = new Error(`[android-release] Command failed: ${command} ${args.join(' ')}`.trim());
    error.exitCode = result.status ?? 1;
    throw error;
  }
}

function runCapture(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    shell: isWindows,
    ...options,
  });
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(result.stderr || `Command ${command} ${args.join(' ')} failed`);
  }
  return (result.stdout ?? '').trim();
}

function ensureCleanGit() {
  const status = runCapture('git', ['status', '--porcelain']);
  if (status) {
    console.error('[android-release] Working tree has uncommitted changes. Please commit or stash before running this command.');
    process.exit(1);
  }
}

function readJson(file, fallback = {}) {
  if (!existsSync(file)) {
    return fallback;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    console.warn(`[android-release] Unable to parse ${file}. Using fallback.`);
    return fallback;
  }
}

function writeJson(file, data) {
  const json = `${JSON.stringify(data, null, 2)}\n`;
  writeFileSync(file, json, 'utf8');
}

function composeDisplayVersion(baseVersion, buildNumber) {
  return buildNumber > 0 ? `${baseVersion}.${buildNumber}` : baseVersion;
}

function updateEnvVersion(version) {
  const envPath = '.env';
  const line = `VITE_APP_VERSION=${version}`;
  let content = '';

  if (existsSync(envPath)) {
    content = readFileSync(envPath, 'utf8');
  }

  if (content.includes('VITE_APP_VERSION=')) {
    content = content.replace(/VITE_APP_VERSION=.*/g, line);
  } else {
    content = `${content.trim() ? `${content.trimEnd()}\n` : ''}${line}\n`;
  }

  writeFileSync(envPath, content, 'utf8');
}

function bumpBuildVersion() {
  const pkg = readJson('package.json');
  const baseVersion = pkg.version;
  if (!baseVersion) {
    console.error('[android-release] package.json requires a valid "version".');
    process.exit(1);
  }

  const buildInfoPath = 'build-info.json';
  const buildInfo = readJson(buildInfoPath, { buildNumber: 0 });
  const previousBuildNumber = parseInt(buildInfo.buildNumber ?? '0', 10) || 0;
  const nextBuild = previousBuildNumber + 1;

  buildInfo.buildNumber = nextBuild;
  writeJson(buildInfoPath, buildInfo);

  const displayVersion = composeDisplayVersion(baseVersion, nextBuild);
  updateEnvVersion(displayVersion);

  console.log(`[android-release] Using version ${displayVersion}`);
  return { displayVersion, buildNumber: nextBuild, baseVersion, previousBuildNumber };
}

function commitAndTag(displayVersion) {
  run('git', ['add', '-A']);

  const hasChanges = spawnSync('git', ['diff', '--cached', '--quiet'], {
    shell: isWindows,
  });

  if (hasChanges.status === 0) {
    console.log('[android-release] Nothing to commit.');
    return false;
  }

  const commitMessage = `chore: android build v${displayVersion}`;
  let commitCreated = false;
  try {
    run('git', ['commit', '-m', commitMessage]);
    commitCreated = true;

    const tagName = `v${displayVersion}`;
    run('git', ['tag', '-a', tagName, '-m', tagName]);
    run('git', ['push']);
    run('git', ['push', '--tags']);
    return true;
  } catch (error) {
    error.commitCreated = commitCreated;
    throw error;
  }
}

function restoreBuildVersion(baseVersion, previousBuildNumber) {
  const info = { buildNumber: previousBuildNumber };
  writeJson('build-info.json', info);
  const display = composeDisplayVersion(baseVersion, previousBuildNumber);
  updateEnvVersion(display);
  try {
    run('npm', ['run', '--silent', 'sync:android-version']);
  } catch (error) {
    console.warn('[android-release] Failed to resync Android version during rollback.', error.message ?? error);
  }
}

function main() {
  ensureCleanGit();
  const { displayVersion, baseVersion, previousBuildNumber } = bumpBuildVersion();

  let commitCreated = false;
  try {
    run('npm', ['run', 'sync:android-version']);
    run('npm', ['run', 'build']);
    run('npx', ['cap', 'sync', 'android']);
    commitCreated = commitAndTag(displayVersion);
  } catch (error) {
    const committed = error?.commitCreated ?? commitCreated;
    if (!committed) {
      restoreBuildVersion(baseVersion, previousBuildNumber);
    }
    console.error(error.message ?? error);
    process.exit(error.exitCode ?? 1);
  }

  run('npx', ['cap', 'open', 'android']);
}

main();
