// scripts/sync-android-version.mjs
// Syncs Android versionName/versionCode from package.json version and build-info.json.

import { readFileSync, writeFileSync, existsSync } from 'fs';

function readJson(path, fallback = {}) {
  if (!existsSync(path)) {
    return fallback;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.warn(`[sync-android-version] Failed to parse ${path}. Using fallback.`, error);
    return fallback;
  }
}

function parseBaseVersion(version) {
  const [maj, min, patchMeta] = version.split('.');
  const patch = (patchMeta || '0').split('-')[0].split('+')[0];
  const major = parseInt(maj ?? '0', 10) || 0;
  const minor = parseInt(min ?? '0', 10) || 0;
  const patchNum = parseInt(patch ?? '0', 10) || 0;
  return { major, minor, patch: patchNum };
}

function computeVersionCode(base, buildNumber) {
  const baseCode = base.major * 10000 + base.minor * 100 + base.patch;
  const build = parseInt(buildNumber ?? '0', 10) || 0;
  return baseCode * 1000 + build;
}

function buildDisplayVersion(base, buildNumber) {
  if (!buildNumber || Number(buildNumber) === 0) {
    return `${base.major}.${base.minor}.${base.patch}`;
  }
  return `${base.major}.${base.minor}.${base.patch}.${buildNumber}`;
}

function replaceAll(content, pairs) {
  return pairs.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), content);
}

function syncAndroid(version) {
  const base = parseBaseVersion(version);
  const buildInfo = readJson('build-info.json', { buildNumber: 0 });
  const buildNumber = parseInt(buildInfo.buildNumber ?? '0', 10) || 0;
  const displayVersion = buildDisplayVersion(base, buildNumber);
  const versionCode = computeVersionCode(base, buildNumber);

  const ktsPath = 'android/app/build.gradle.kts';
  const groovyPath = 'android/app/build.gradle';
  const target = existsSync(ktsPath) ? ktsPath : groovyPath;

  if (!existsSync(target)) {
    console.warn(`[sync-android-version] No Gradle file found at ${ktsPath} or ${groovyPath}. Skipping.`);
    return;
  }

  const original = readFileSync(target, 'utf8');
  const updated = replaceAll(original, [
    [/(versionName\s*=\s*)".*?"/g, `$1"${displayVersion}"`],
    [/(versionCode\s*=\s*)\d+/g, `$1${versionCode}`],
  ]);

  if (updated !== original) {
    writeFileSync(target, updated, 'utf8');
    console.log(`[sync-android-version] Updated ${target} -> versionName=${displayVersion}, versionCode=${versionCode}`);
  } else {
    console.warn('[sync-android-version] No version fields replaced. Please verify Gradle file structure.');
  }
}

function main() {
  const pkg = readJson('package.json');
  const version = pkg.version;
  if (!version) {
    console.error('[sync-android-version] package.json has no "version" field.');
    process.exit(1);
  }
  syncAndroid(version);
}

main();
