// scripts/sync-android-version.mjs
// Sincroniza Android versionName/versionCode a partir de package.json (base) y build-info.json (build).

import { readFileSync, writeFileSync, existsSync } from 'fs';

function readJson(path, fallback = {}) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return fallback; }
}

function calcVersionCode(base, build) {
  const [MAJOR, MINOR, PATCH] = base.split('.').map(n => parseInt(n, 10));
  if ([MAJOR, MINOR, PATCH].some(Number.isNaN)) {
    throw new Error(`[sync-android-version] Base inválida: ${base}`);
  }
  const b = parseInt(build, 10) || 1;
  // MAJOR (x1e6) + MINOR (x1e4) + PATCH (x1e2) + BUILD
  return MAJOR * 1_000_000 + MINOR * 10_000 + PATCH * 100 + b;
}

function findGradleFile() {
  const kts = 'android/app/build.gradle.kts';
  const groovy = 'android/app/build.gradle';
  if (existsSync(kts)) return { path: kts, kts: true };
  if (existsSync(groovy)) return { path: groovy, kts: false };
  throw new Error('[sync-android-version] No se encontró android/app/build.gradle(.kts)');
}

function replaceGradleVersion(content, versionName, versionCode, isKts) {
  // Reemplazos robustos para ambas sintaxis.
  // Groovy:
  //   versionName "1.2.3.4"
  //   versionCode 1020304
  // Kotlin (kts):
  //   versionName = "1.2.3.4"
  //   versionCode = 1020304
  const nameRegex = isKts
    ? /versionName\s*=\s*".*?"/
    : /versionName\s*"[^"]*"/;
  const codeRegex = isKts
    ? /versionCode\s*=\s*\d+/
    : /versionCode\s*\d+/;

  let out = content;

  if (nameRegex.test(out)) {
    out = out.replace(nameRegex, isKts ? `versionName = "${versionName}"` : `versionName "${versionName}"`);
  } else {
    // Inserta si no existe (dentro de defaultConfig)
    out = out.replace(/defaultConfig\s*{/, (m) => `${m}\n        ${isKts ? `versionName = "${versionName}"` : `versionName "${versionName}"`}`);
  }

  if (codeRegex.test(out)) {
    out = out.replace(codeRegex, isKts ? `versionCode = ${versionCode}` : `versionCode ${versionCode}`);
  } else {
    out = out.replace(/defaultConfig\s*{/, (m) => `${m}\n        ${isKts ? `versionCode = ${versionCode}` : `versionCode ${versionCode}`}`);
  }

  return out;
}

function syncAndroid(baseVersion) {
  const info = readJson('build-info.json', { base: baseVersion, build: 1 });
  const build = (info.base === baseVersion) ? (info.build || 1) : 1;
  const versionName = `${baseVersion}.${build}`;
  const versionCode = calcVersionCode(baseVersion, build);

  const { path, kts } = findGradleFile();
  const gradle = readFileSync(path, 'utf8');
  const updated = replaceGradleVersion(gradle, versionName, versionCode, kts);
  writeFileSync(path, updated, 'utf8');

  console.log(`[sync-android-version] versionName=${versionName} versionCode=${versionCode} -> ${path}`);
}

function main() {
  const pkg = readJson('package.json');
  const base = pkg?.version;
  if (!base) {
    console.error('[sync-android-version] package.json no tiene "version".');
    process.exit(1);
  }
  if (!/^\d+\.\d+\.\d+$/.test(base)) {
    console.error(`[sync-android-version] "version" (${base}) no es SemVer base X.Y.Z`);
    process.exit(1);
  }
  syncAndroid(base);
}

main();
