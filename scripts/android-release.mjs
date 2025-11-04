#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
const isWindows = process.platform === 'win32';

function run(cmd, args = [], options = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: isWindows, ...options });
  if (res.status !== 0) {
    const e = new Error(`[android-release] Command failed: ${cmd} ${args.join(' ')}`.trim());
    e.exitCode = res.status ?? 1;
    throw e;
  }
}

function runOut(cmd, args = [], options = {}) {
  const res = spawnSync(cmd, args, { shell: isWindows, encoding: 'utf8', ...options });
  if (res.status !== 0) {
    const e = new Error(`[android-release] Command failed: ${cmd} ${args.join(' ')}`.trim());
    e.exitCode = res.status ?? 1;
    throw e;
  }
  return (res.stdout || '').toString().trim();
}

function ensureCleanGit() {
  const status = runOut('git', ['status', '--porcelain']);
  if (status) {
    throw new Error('[android-release] Repositorio con cambios sin commit. Haz commit o stash antes de continuar.');
  }
}

function readJson(path, fallback = {}) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return fallback; }
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function getBaseVersion() {
  const pkg = readJson('package.json');
  const v = pkg?.version;
  if (!v) throw new Error('[android-release] package.json no tiene "version".');
  if (!/^\d+\.\d+\.\d+$/.test(v)) throw new Error(`[android-release] "version" (${v}) no es SemVer base X.Y.Z`);
  return v;
}

function bumpBuild(baseVersion) {
  const infoPath = 'build-info.json';
  const prev = readJson(infoPath, { base: null, build: 0 });
  const build = (prev.base === baseVersion) ? (Number(prev.build || 0) + 1) : 1;
  const info = { base: baseVersion, build };
  writeJson(infoPath, info);
  return { build, prevBuild: prev.build || 0 };
}

function composeDisplayUI(base, build) {
  return `${base}+${build}`; // UI (SemVer + build metadata)
}

function composeDisplayAndroid(base, build) {
  return `${base}.${build}`; // Android versionName
}

function updateEnvVersion(display) {
  // Actualiza o crea .env con VITE_APP_VERSION
  const path = '.env';
  let content = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (content.includes('VITE_APP_VERSION=')) {
    content = content.replace(/^VITE_APP_VERSION=.*$/m, `VITE_APP_VERSION=${display}`);
  } else {
    if (content && !content.endsWith('\n')) content += '\n';
    content += `VITE_APP_VERSION=${display}\n`;
  }
  writeFileSync(path, content, 'utf8');
  console.log(`[android-release] VITE_APP_VERSION=${display}`);
}

function commitAndTag(baseVersion, displayVersion) {
  run('git', ['add', '-A']);
  const msg = `chore: android build v${displayVersion}`;
  let commitCreated = false;
  try {
    run('git', ['commit', '-m', msg]);
    commitCreated = true;

    // Tag SOLO con la base (vX.Y.Z). Si ya existe, no falla.
    const tagName = `v${baseVersion}`;
    const exists = spawnSync('git', ['rev-parse', '--verify', '--quiet', tagName], { shell: isWindows }).status === 0;

    run('git', ['push']);
    if (!exists) {
      run('git', ['tag', '-a', tagName, '-m', tagName]);
      run('git', ['push', '--tags']);
      console.log(`[android-release] Creado tag ${tagName}`);
    } else {
      console.log(`[android-release] Tag ${tagName} ya existía; no se crea de nuevo.`);
    }
    return true;
  } catch (error) {
    error.commitCreated = commitCreated;
    throw error;
  }
}

function restoreBuildVersion(prevBase, prevBuild) {
  // Vuelve al build anterior si falló antes de commitear
  writeJson('build-info.json', { base: prevBase, build: prevBuild });
  const display = composeDisplay(prevBase, prevBuild || 1);
  updateEnvVersion(display);
}

function main() {
  ensureCleanGit();

const baseVersion = getBaseVersion();
const { build, prevBuild } = bumpBuild(baseVersion);
const uiVersion = composeDisplayUI(baseVersion, build);
const androidVersion = composeDisplayAndroid(baseVersion, build);

updateEnvVersion(uiVersion);

  let commitCreated = false;
  try {
    // sincroniza versiones Android desde base+build
    run('npm', ['run', 'sync:android-version']);
    // build web
    run('npm', ['run', 'build']);
    // sync Capacitor
    run('npx', ['cap', 'sync', 'android']);

    commitCreated = commitAndTag(baseVersion, androidVersion);
  } catch (error) {
    const committed = error?.commitCreated ?? commitCreated;
    if (!committed) {
      restoreBuildVersion(baseVersion, prevBuild);
    }
    console.error(error.message ?? error);
    process.exit(error.exitCode ?? 1);
  }

  // Abre Android Studio
  run('npx', ['cap', 'open', 'android']);
}

main();
