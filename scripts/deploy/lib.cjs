'use strict';
// Explicit, local-to-the-server operator entry point. Importing this module does nothing.
// No SSH, Git, SQL, migration, deletion/retention job or production build on import.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { checkStaticAssets } = require('../static-assets-preflight.cjs');
const { checkPdfAssets } = require('../pdf-assets-preflight.cjs');
const SOURCE = path.resolve(__dirname, '../..');
const SOURCE_ENTRIES = [
  'package.json', 'package-lock.json',
  ...['src', 'lib', 'assets', 'prisma', 'scripts', 'tsconfig.json', 'package.json'].map(p => `apps/api/${p}`),
  ...['app', 'lib', 'config', 'data', 'public', 'scripts', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'package.json'].map(p => `apps/web/${p}`),
];
class DeploymentError extends Error {}
function assert(ok, message) { if (!ok) throw new DeploymentError(message); }
function exists(p) { try { fs.lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }
function json(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function atomicJson(p, value) {
  const temp = `${p}.${crypto.randomUUID()}.tmp`;
  const fd = fs.openSync(temp, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temp, p);
  const dir = fs.openSync(path.dirname(p), 'r');
  try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
}
function inside(parent, child) { return child === parent || child.startsWith(parent + path.sep); }
function disjoint(a, b) { return !inside(a, b) && !inside(b, a); }
function absolute(p) { assert(typeof p === 'string' && path.isAbsolute(p), 'Yapılandırmada mutlak yol gerekli'); return path.resolve(p); }
function noSymlinkParents(p) {
  for (let current = p; ; current = path.dirname(current)) {
    if (exists(current)) assert(!fs.lstatSync(current).isSymbolicLink(), 'Kök/üst dizin symlink: güvenli yol eşlemesi gerekli');
    if (path.dirname(current) === current) break;
  }
}
// Hash file contents, directory membership, modes and link targets. Never dereference links.
function inventory(root) {
  const rows = [];
  function walk(p, relative) {
    const s = fs.lstatSync(p), mode = s.mode & 0o777;
    if (s.isSymbolicLink()) rows.push([relative, 'link', fs.readlinkSync(p)]);
    else if (s.isDirectory()) { rows.push([relative, 'dir', mode]); for (const name of fs.readdirSync(p).sort()) walk(path.join(p, name), path.join(relative, name)); }
    else { assert(s.isFile(), 'Özel dosya türü reddedildi'); const h = crypto.createHash('sha256'), fd = fs.openSync(p, 'r'), buf = Buffer.alloc(128 * 1024); try { let n; while ((n = fs.readSync(fd, buf, 0, buf.length, null))) h.update(buf.subarray(0, n)); } finally { fs.closeSync(fd); } rows.push([relative, 'file', mode, s.size, h.digest('hex')]); }
  }
  if (exists(root)) walk(root, '.');
  return rows;
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true, verbatimSymlinks: true, preserveTimestamps: true, errorOnExist: true, force: false });
}
function acquireLock(state) {
  const dir = path.join(state, 'lock');
  let ownerWritten = false;
  try { fs.mkdirSync(dir, { mode: 0o700 }); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    // Serialize stale-lock recovery, so two retrying operators cannot rename
    // each other's newly acquired lock after checking the same dead PID.
    const recovery = path.join(state, 'lock-recovery');
    try { fs.mkdirSync(recovery, { mode: 0o700 }); }
    catch { throw new DeploymentError('Kilit kurtarma devam ediyor veya yarım kalmış; operatör incelemesi gerekli'); }
    try {
      const owner = json(path.join(dir, 'owner.json'));
      assert(Number.isSafeInteger(owner.pid) && owner.pid > 0, 'Kilit sahibi belirsiz; operatör incelemesi gerekli');
      let alive = true;
      try { process.kill(owner.pid, 0); } catch (e) { if (e.code === 'ESRCH') alive = false; else throw e; }
      assert(!alive, 'Başka bir dağıtım/geri dönüş çalışıyor');
      fs.renameSync(dir, `${dir}.abandoned-${crypto.randomUUID()}`);
      fs.mkdirSync(dir, { mode: 0o700 });
      atomicJson(path.join(dir, 'owner.json'), { pid: process.pid });
      ownerWritten = true;
    } finally { fs.rmdirSync(recovery); }
  }
  if (!ownerWritten) atomicJson(path.join(dir, 'owner.json'), { pid: process.pid });
  return () => { fs.unlinkSync(path.join(dir, 'owner.json')); fs.rmdirSync(dir); };
}

function copySource(stage) {
  fs.mkdirSync(stage, { mode: 0o755 });
  for (const name of SOURCE_ENTRIES) {
    const from = path.join(SOURCE, name);
    assert(exists(from), 'Derleme kaynak dosyası eksik');
    for (const row of inventory(from)) assert(row[1] !== 'link', 'Kaynakta symlink reddedildi');
    fs.mkdirSync(path.dirname(path.join(stage, name)), { recursive: true });
    fs.cpSync(from, path.join(stage, name), { recursive: true, filter: p => !/^\.env(?:\.|$)/.test(path.basename(p)) });
  }
}

function assertArtifacts(root, expectedVersion) {
  for (const file of ['apps/api/dist/src/server.js', 'apps/api/dist/src/cpu-worker.js', 'apps/web/.next/BUILD_ID', 'apps/web/.next/build-manifest.json', 'apps/web/.next/prerender-manifest.json', 'apps/web/.next/routes-manifest.json', 'apps/web/.next/required-server-files.json']) assert(exists(path.join(root, file)) && fs.statSync(path.join(root, file)).size > 0, 'Eksik/boş derleme artifactı');
  for (const app of ['', 'apps/api', 'apps/web']) assert(json(path.join(root, app, 'package.json')).version === expectedVersion, 'API/Web/proje sürümleri uyuşmuyor');
  for (const rel of ['apps/api/dist/lib', 'apps/api/dist/assets', 'apps/web/public', 'apps/web/.next/static']) assert(inventory(path.join(root, rel)).some(row => row[1] === 'file'), 'Eksik runtime asset dizini');
  for (const result of checkPdfAssets(path.join(root, 'apps/web/public'))) assert(result.exists && result.size > 0 && result.readableByOthers && result.parents.every(p => p.searchableByOthers), 'PDF araç dosyası/izni eksik');
  const nextFiles = json(path.join(root, 'apps/web/.next/required-server-files.json'));
  assert(Array.isArray(nextFiles.files) && nextFiles.files.length > 5, 'Next gerekli sunucu dosyaları manifesti eksik');
  for (const file of nextFiles.files || []) assert(inside(path.join(root, 'apps/web'), path.resolve(root, 'apps/web', file)) && exists(path.resolve(root, 'apps/web', file)), 'Next sunucu artifact dosyası eksik');
  const appPaths = json(path.join(root, 'apps/web/.next/server/app-paths-manifest.json'));
  assert(Object.keys(appPaths).length > 0, 'Next sunucu route manifesti boş');
  for (const file of Object.values(appPaths)) { const p = path.resolve(root, 'apps/web/.next/server', file); assert(inside(path.join(root, 'apps/web/.next/server'), p) && exists(p) && fs.statSync(p).size > 0, 'Next derlenmiş route dosyası eksik'); }
  for (const rel of ['apps/web/public', 'apps/web/.next/static']) assert(!checkStaticAssets(path.join(root, rel)).failures.length, 'Public/static izin kontrolü başarısız (yalnız genel dosya 644/dizin 755)');
}

module.exports = { SOURCE, SOURCE_ENTRIES, DeploymentError, assert, exists, json, atomicJson, inside, disjoint, absolute, noSymlinkParents, inventory, same, copy, acquireLock, copySource, assertArtifacts };
