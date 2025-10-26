// scripts/sync-android-version.mjs
// Syncs Android versionName/versionCode from package.json version.
// versionCode = major*10000 + minor*100 + patch (e.g., 1.2.3 -> 10203)

import { readFileSync, writeFileSync, existsSync } from 'fs';

function semverToCode(v) {
  const [maj, min, patWithMeta] = v.split('.');
  const pat = (patWithMeta || '0').split('-')[0].split('+')[0];
  const major = parseInt(maj ?? '0', 10) || 0;
  const minor = parseInt(min ?? '0', 10) || 0;
  const patch = parseInt(pat ?? '0', 10) || 0;
  return major * 10000 + minor * 100 + patch;
}

function replaceAll(content, pairs) {
  let out = content;
  for (const [pattern, repl] of pairs) {
    out = out.replace(pattern, repl);
  }
  return out;
}

function syncAndroid(version) {
  const code = semverToCode(version);

  // Detect Gradle file (Kotlin DSL preferred in newer Capacitor)
  const ktsPath = 'android/app/build.gradle.kts';
  const groovyPath = 'android/app/build.gradle';
  const target = existsSync(ktsPath) ? ktsPath : groovyPath;

  if (!existsSync(target)) {
    console.warn(`[sync-android-version] No Gradle file found at ${ktsPath} or ${groovyPath}. Skipping.`);
    return;
  }

  let gradle = readFileSync(target, 'utf8');
  const original = gradle;

  // Kotlin DSL patterns
  gradle = replaceAll(gradle, [
    [/(versionName\s*=\s*)".*?"/, `$1"${version}"`],
    [/(versionCode\s*=\s*)\d+/, `$1${code}`],
    // Groovy fallback patterns
    [/(versionName\s*)".*?"/, `$1"${version}"`],
    [/(versionCode\s*)\d+/, `$1${code}`],
  ]);

  if (gradle !== original) {
    writeFileSync(target, gradle, 'utf8');
    console.log(`[sync-android-version] Updated ${target} → versionName=${version}, versionCode=${code}`);
  } else {
    console.warn('[sync-android-version] No version fields replaced. Please verify Gradle file structure.');
  }
}

function main() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const version = pkg.version;
  if (!version) {
    console.error('[sync-android-version] package.json has no "version" field.');
    process.exit(1);
  }
  syncAndroid(version);
}

main();
