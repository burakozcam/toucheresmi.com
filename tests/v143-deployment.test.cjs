'use strict';
// Local synthetic files and a simulated Selector/HTTP adapter only. No deployment CLI,
// real cloudlinux-selector, npm install, server connection, or database access.
const { test } = require('node:test');
const A = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const d = require('../scripts/manual-deploy.cjs');
function put(file, body, mode = 0o644) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body, { mode }); return file; }
function data(file, value) { return put(file, JSON.stringify(value)); }
function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-veridyen-')); t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const sourceRoot = path.join(home, 'github-deploy'), stateRoot = path.join(sourceRoot, '.manual-deploy'); fs.mkdirSync(stateRoot, { recursive: true, mode: 0o700 });
  const c = { user: os.userInfo().username, homeRoot: home, sourceRoot, stateRoot, dependencyPolicy: 'reuse-live-exact', protectedFiles: [], documentRoots: [] };
  const versions = { next: '15.5.29', react: '19.3.1', 'react-dom': '19.3.1', express: '5.1.0', '@prisma/client': '6.19.3' }, lock = { packages: {} };
  for (const app of ['web', 'api']) {
    const root = path.join(home, app), modules = path.join(home, 'nodevenv', app, '22/lib/node_modules'); fs.mkdirSync(modules, { recursive: true }); fs.mkdirSync(root);
    c[app] = { appRoot: app, root, modules, node: process.execPath }; c.documentRoots.push(root);
    fs.symlinkSync(app === 'web' ? path.relative(root, modules) : modules, path.join(root, 'node_modules'));
    const dependencies = app === 'web' ? { next: '15.5.29', react: '^19.1.0', 'react-dom': '^19.1.0' } : { express: '^5.1.0', '@prisma/client': '^6.8.2' };
    data(path.join(root, 'package.json'), { version: '1.4.2', scripts: { start: 'node custom.cjs' }, dependencies });
    data(path.join(sourceRoot, 'apps', app, 'package.json'), { version: '1.4.3', dependencies });
    for (const name of Object.keys(dependencies)) { data(path.join(modules, name, 'package.json'), { name, version: versions[name] }); lock.packages['node_modules/' + name] = { version: versions[name] }; }
    put(path.join(root, `${app}-custom.cjs`), `existing ${app} Passenger entry`); put(path.join(root, '.env'), 'SYNTHETIC_ONLY=unchanged\n', 0o600); put(path.join(root, '.htaccess'), `original ${app} rules`);
  }
  data(path.join(sourceRoot, 'package.json'), { version: '1.4.3' }); data(path.join(sourceRoot, 'package-lock.json'), lock);
  put(path.join(sourceRoot, 'apps/api/prisma/schema.prisma'), 'synthetic schema'); put(path.join(c.api.modules, '.prisma/client/schema.prisma'), 'synthetic schema');
  put(path.join(c.api.root, 'storage/student.enc'), 'synthetic user content'); put(path.join(c.api.root, 'dist/src/server.js'), 'old-api');
  buildWeb(c.web.root, 'old-web');
  const statuses = { api: 'started', web: 'started' }, calls = [], initialHtaccess = Object.fromEntries(['api', 'web'].map(a => [a, fs.readFileSync(path.join(c[a].root, '.htaccess'))]));
  const apiEnv = { NEXT_PUBLIC_API_URL: 'https://api.example.test', WEB_ORIGIN: 'https://web.example.test', DATABASE_URL: 'postgresql://synthetic-only', JWT_SECRET: 'synthetic-jwt', TXT_STORAGE_KEY: 'synthetic-txt', MFA_ENCRYPTION_KEY: 'synthetic-mfa', RATE_LIMIT_STORE: 'database', RECAPTCHA_ENABLED: 'true', RECAPTCHA_SITE_KEY: 'synthetic-public', RECAPTCHA_SECRET_KEY: 'synthetic-private', STORAGE_DIR: './storage' };
  function payload() { return { result: 'success', available_versions: { [process.versions.node]: { users: { [c.user]: { applications: Object.fromEntries(['web', 'api'].map(app => [app, { domain: `${app}.example.test`, app_uri: '', startup_file: `${app}-custom.cjs`, app_mode: 'production', app_status: statuses[app], env_vars: app === 'api' ? apiEnv : { NEXT_PUBLIC_API_URL: apiEnv.NEXT_PUBLIC_API_URL } }])) } } } } }; }
  const io = {
    get: () => d.selectorApps(payload(), c.user),
    control: (action, app) => { calls.push([action, app]); statuses[app] = action === 'stop' ? 'stopped' : 'started'; if (io.selectorChangesHtaccess) put(path.join(c[app].root, '.htaccess'), action === 'stop' ? 'Selector disabled' : initialHtaccess[app]); },
    processes: () => [], pause: async () => {},
    run: label => { if (label.includes('Node uyumu')) return process.versions.node; throw new d.DeploymentError('EAGAIN: synthetic build failure'); },
    fetch: async url => {
      const u = new URL(url), app = u.hostname.startsWith('api.') ? 'api' : 'web';
      if (statuses[app] === 'stopped') return new Response('stopped', { status: 503 });
      const version = JSON.parse(fs.readFileSync(path.join(c[app].root, 'package.json'))).version;
      if (app === 'api') return Response.json(version === '1.4.2' ? { status: 'ok' } : { status: 'ok', version });
      if (u.pathname === '/') return new Response(`<html>v${version}</html>`, { headers: { 'content-type': 'text/html' } });
      if (u.pathname.startsWith('/_next/')) {
        const bytes = fs.readFileSync(path.join(c.web.root, '.next', u.pathname.slice('/_next/'.length)));
        return new Response(bytes, { headers: { 'content-type': u.pathname.endsWith('.css') ? 'text/css' : 'application/javascript' } });
      }
      return new Response('synthetic asset', { headers: { 'content-type': u.pathname.endsWith('.html') ? 'text/html' : 'application/javascript' } });
    },
  };
  const file = path.join(sourceRoot, 'deploy.json'); data(file, c);
  return { home, c, io, calls, statuses, apiEnv, payload, configFile: file, rewrite: () => data(file, c) };
}
function buildWeb(root, label) {
  put(path.join(root, '.next/BUILD_ID'), label); put(path.join(root, '.next/static/main.js'), `console.log('${label}');`); put(path.join(root, '.next/static/main.css'), `body{color:${label === 'old-web' ? 'black' : 'navy'}}`);
  data(path.join(root, '.next/build-manifest.json'), { rootMainFiles: ['static/main.js'] }); data(path.join(root, '.next/app-build-manifest.json'), { pages: { '/layout': ['static/main.css'] } });
}
function ready(f) {
  const { c, io } = f, cap = d.capture(c, io), release = path.join(c.stateRoot, 'ready-fixture'), stage = path.join(release, 'workspace'); fs.mkdirSync(path.join(release, 'dependencies'), { recursive: true }); fs.mkdirSync(path.join(release, 'protected'));
  for (const app of ['api', 'web']) d.copy(c[app].modules, path.join(release, 'dependencies', app));
  cap.protectedList.forEach((file, i) => d.copy(file.path, path.join(release, 'protected', String(i))));
  const w = path.join(stage, 'apps/web'); buildWeb(w, 'new-web'); put(path.join(w, 'next.config.ts'), 'new config'); put(path.join(w, 'public/araclar/tool-theme.js'), 'new asset');
  put(path.join(stage, 'apps/api/dist/src/server.js'), 'new-api'); put(path.join(stage, 'apps/api/scripts/copy-assets.cjs'), 'copy assets');
  const plan = d.runtimePlan(c, stage, cap.records).map(e => ({ ...e, rows: d.inventory(e.source) }));
  const r = { format: 2, id: 'prepared-fixture', release, roots: d.rootsIdentity(c), source: d.sourceDigest(c), dependencies: cap.dependencies, links: cap.links, settingsDigest: cap.settingsDigest, protected: cap.protectedList, urls: d.healthURLs(cap.env), plan };
  data(path.join(c.stateRoot, 'ready.json'), r); return r;
}
function transaction(f) {
  const r = ready(f), backup = path.join(r.release, 'backup'); d.snapshotPlan(r.plan, backup);
  return { ...r, id: 'test', moves: [], status: 'activating', backup, backupDigest: d.digest(fs.readFileSync(path.join(backup, 'manifest.json'))) };
}
const oldApi = c => fs.readFileSync(path.join(c.api.root, 'dist/src/server.js'), 'utf8');
const oldWeb = c => fs.readFileSync(path.join(c.web.root, '.next/BUILD_ID'), 'utf8');

test('real Veridyen config pins the supplied split roots and nodevenv paths', () => {
  const c = require('../scripts/deploy/veridyen.json'); A.equal(c.sourceRoot, '/home/kurums22/github-deploy'); A.equal(c.web.root, '/home/kurums22/web'); A.equal(c.api.root, '/home/kurums22/api'); A.equal(c.web.modules, '/home/kurums22/nodevenv/web/22/lib/node_modules'); A.equal(c.api.modules, '/home/kurums22/nodevenv/api/22/lib/node_modules'); A(!c.hooks);
});
test('config accepts absolute and relative existing nodevenv links without mutation', t => {
  const f = fixture(t), before = d.inventory(f.home); d.loadConfig(f.configFile, f.c.sourceRoot); A.deepEqual(d.inventory(f.home), before);
});
test('unexpected nodevenv link target is rejected without following/modifying it', t => {
  const f = fixture(t), link = path.join(f.c.web.root, 'node_modules'); fs.unlinkSync(link); fs.symlinkSync(f.c.api.modules, link); A.throws(() => d.loadConfig(f.configFile, f.c.sourceRoot), /beklenmeyen/); A.equal(fs.realpathSync(link), f.c.api.modules);
});
test('state/source/live overlap and source inside HTTP document root are rejected', t => {
  const f = fixture(t); f.c.stateRoot = path.join(f.c.web.root, 'backups'); f.rewrite(); A.throws(() => d.loadConfig(f.configFile, f.c.sourceRoot), /çakışıyor/);
  f.c.stateRoot = path.join(f.c.sourceRoot, '.manual-deploy'); f.c.documentRoots = [f.home]; f.rewrite(); A.throws(() => d.loadConfig(f.configFile, f.c.sourceRoot), /HTTP/);
});
test('Next patch mismatch is diagnosed before any native stop or live installation', t => {
  const f = fixture(t); data(path.join(f.c.web.modules, 'next/package.json'), { version: '15.5.28' }); A.throws(() => d.checkDependencies(f.c), /canlı=15.5.28, lock=15.5.29/); A.deepEqual(f.calls, []); A.equal(oldApi(f.c), 'old-api');
});
test('API dependency and generated Prisma schema mismatches fail closed', t => {
  const f = fixture(t); data(path.join(f.c.api.modules, 'express/package.json'), { version: '4.0.0' }); A.throws(() => d.checkDependencies(f.c), /express/);
  data(path.join(f.c.api.modules, 'express/package.json'), { version: '5.1.0' }); put(path.join(f.c.api.modules, '.prisma/client/schema.prisma'), 'different'); A.throws(() => d.checkDependencies(f.c), /Prisma/);
});
test('dependency clone permits internal relative links and rejects escaping/absolute links', t => {
  const f = fixture(t); fs.mkdirSync(path.join(f.c.web.modules, '.bin')); put(path.join(f.c.web.modules, 'next/cli.js'), 'CLI'); fs.symlinkSync('../next/cli.js', path.join(f.c.web.modules, '.bin/next')); d.validateDependencyTree(f.c.web.modules);
  fs.symlinkSync(f.c.api.modules, path.join(f.c.web.modules, 'external')); A.throws(() => d.validateDependencyTree(f.c.web.modules), /dışarı/);
});
test('documented Selector JSON and account-only variant are parsed; unknown output is refused', t => {
  const f = fixture(t); A.equal(d.selectorApps(f.payload(), f.c.user).length, 2); A.equal(d.selectorApps({ result: 'success', applications: { web: { version: '22' } } }, f.c.user).length, 1); A.throws(() => d.selectorApps({ result: 'success', data: [] }, f.c.user), /tanınmadı/);
});
test('Selector startup escape, wrong Node and development mode are rejected', t => {
  const f = fixture(t), apps = f.io.get(); apps[0].startup_file = '../outside.cjs'; A.throws(() => d.selected(f.c, apps, apps[0].key), /başlangıç/); apps[0].startup_file = `${apps[0].key}-custom.cjs`; apps[0].selectedVersion = '20'; A.throws(() => d.selected(f.c, apps, apps[0].key), /Node/); apps[0].selectedVersion = '22'; apps[0].app_mode = 'development'; A.throws(() => d.selected(f.c, apps, apps[0].key), /production/);
});
test('effective environment rejects frontend secrets and storage/code overlap', t => {
  const f = fixture(t), records = Object.fromEntries(['web', 'api'].map(a => [a, d.selected(f.c, f.io.get(), a)])); records.web.env_vars.NEXT_PUBLIC_SECRET_KEY = 'synthetic-private'; A.throws(() => d.environment(f.c, records), /frontend/); delete records.web.env_vars.NEXT_PUBLIC_SECRET_KEY; records.api.env_vars.STORAGE_DIR = '.'; A.throws(() => d.environment(f.c, records), /STORAGE_DIR kod/);
});
test('runtime plan preserves custom Passenger files, nested htaccess and nodevenv links', t => {
  const f = fixture(t); put(path.join(f.c.web.root, 'public/.htaccess'), 'private rules'); const r = ready(f);
  A(r.protected.some(p => p.path === path.join(f.c.web.root, 'public/.htaccess'))); A(r.plan.every(p => !p.dest.includes('node_modules') && !p.dest.endsWith('.env') && !p.dest.endsWith('.htaccess') && !p.dest.endsWith('-custom.cjs')));
});
test('existing startup under scripts is preserved while other script files can deploy', t => {
  const f = fixture(t); put(path.join(f.c.api.root, 'scripts/start.cjs'), 'custom API bootstrap');
  const get = f.io.get; f.io.get = () => get().map(a => a.key === 'api' ? { ...a, startup_file: 'scripts/start.cjs' } : a);
  const r = ready(f); A(r.plan.some(p => p.id === 'api/scripts/copy-assets.cjs')); A(r.plan.every(p => p.dest !== path.join(f.c.api.root, 'scripts/start.cjs')));
});
test('application package metadata preserves cPanel scripts and dependencies, changing only version', t => {
  const f = fixture(t), r = ready(f), item = r.plan.find(p => p.id === 'web/package.json'); const before = JSON.parse(fs.readFileSync(item.dest)), after = JSON.parse(fs.readFileSync(item.source)); A.deepEqual(after, { ...before, version: '1.4.3' });
});
test('corrupt backup payload or manifest is rejected before any live mutation', t => {
  const f = fixture(t), tx = transaction(f), manifest = JSON.parse(fs.readFileSync(path.join(tx.backup, 'manifest.json'))), item = manifest.find(e => e.id === 'api/dist');
  put(path.join(tx.backup, item.backup, 'src/server.js'), 'corrupt'); A.throws(() => d.restorePlan(f.c, tx), /bozuk/); A.equal(oldApi(f.c), 'old-api');
  put(path.join(tx.backup, 'manifest.json'), '[]'); A.throws(() => d.restorePlan(f.c, tx), /SHA-256/);
});
test('write-ahead replacement keeps old content and restores Web/API together', t => {
  const f = fixture(t), tx = transaction(f); for (const p of tx.plan) d.replaceEntry(f.c, tx, p, p.source);
  A.equal(oldApi(f.c), 'new-api'); A.equal(oldWeb(f.c), 'new-web'); A.equal(JSON.parse(fs.readFileSync(path.join(f.c.stateRoot, 'transaction.json'))).moves.length, tx.plan.length);
  d.restorePlan(f.c, tx); A.equal(oldApi(f.c), 'old-api'); A.equal(oldWeb(f.c), 'old-web'); A(tx.moves.every(m => fs.existsSync(m.displaced) || !d.inventory(m.displaced).length));
});
test('rollback after a missing live entry is retryable and never deletes its backup', t => {
  const f = fixture(t), tx = transaction(f); fs.renameSync(path.join(f.c.api.root, 'dist'), path.join(f.c.api.root, '.interrupted-dist')); d.restorePlan(f.c, tx); const hash = d.digest(d.inventory(tx.backup)); d.restorePlan(f.c, tx); A.equal(oldApi(f.c), 'old-api'); A.equal(d.digest(d.inventory(tx.backup)), hash);
});
test('concurrent operation lock and serialized stale-lock recovery preserve previous lock files', t => {
  const f = fixture(t), unlock = d.acquireLock(f.c.stateRoot); A.throws(() => d.acquireLock(f.c.stateRoot), /Başka bir/); unlock();
  const lock = path.join(f.c.stateRoot, 'lock'); fs.mkdirSync(lock); data(path.join(lock, 'owner.json'), { pid: 2147483647 }); const release = d.acquireLock(f.c.stateRoot); A(fs.readdirSync(f.c.stateRoot).some(n => n.startsWith('lock.abandoned-'))); release();
});
test('native stop verifies both statuses, process drain and blocked dynamic HTTP routes', async t => {
  const f = fixture(t), tx = { ...ready(f), moves: [] }; await d.stopBoth(f.c, tx, f.io); A.deepEqual(f.statuses, { api: 'stopped', web: 'stopped' }); A.equal(oldWeb(f.c), 'old-web'); A.deepEqual(f.calls, [['stop', 'web'], ['stop', 'api']]);
});
test('remaining processes prevent every artifact mutation', async t => {
  const f = fixture(t), tx = { ...ready(f), moves: [] }; f.io.processes = () => [123]; await A.rejects(d.stopBoth(f.c, tx, f.io), /boşalmadı/); A.equal(oldApi(f.c), 'old-api'); A.equal(oldWeb(f.c), 'old-web');
});
test('a stopped status with an HTTP 200 response is never considered a safe gate', async t => {
  const f = fixture(t), tx = { ...ready(f), moves: [] }; f.io.fetch = async () => new Response('still live'); await A.rejects(d.stopBoth(f.c, tx, f.io), /HTTP kapısı/); A.equal(oldApi(f.c), 'old-api');
});
test('successful split deployment preserves both nodevenv targets, env, startup, htaccess and storage', async t => {
  const f = fixture(t); ready(f); f.io.selectorChangesHtaccess = true; const modules = ['web', 'api'].map(a => d.inventory(f.c[a].modules)), links = ['web', 'api'].map(a => fs.readlinkSync(path.join(f.c[a].root, 'node_modules')));
  await d.deploy(f.c, f.io); A.equal(oldApi(f.c), 'new-api'); A.equal(oldWeb(f.c), 'new-web'); A.deepEqual(['web', 'api'].map(a => d.inventory(f.c[a].modules)), modules); A.deepEqual(['web', 'api'].map(a => fs.readlinkSync(path.join(f.c[a].root, 'node_modules'))), links);
  A.equal(fs.readFileSync(path.join(f.c.api.root, 'storage/student.enc'), 'utf8'), 'synthetic user content'); A.equal(fs.readFileSync(path.join(f.c.web.root, '.htaccess'), 'utf8'), 'original web rules'); A.equal(fs.statSync(path.join(f.c.api.root, '.env')).mode & 0o777, 0o600);
  const tx = JSON.parse(fs.readFileSync(path.join(f.c.stateRoot, 'transaction.json'))); A.equal(tx.status, 'healthy'); d.verifyBackup(tx);
});
test('same successful source deploy is a no-op retaining the original v1.4.2 recovery point', async t => {
  const f = fixture(t); ready(f); await d.deploy(f.c, f.io); const journal = fs.readFileSync(path.join(f.c.stateRoot, 'transaction.json'), 'utf8'), count = f.calls.length; await d.deploy(f.c, f.io); A.equal(f.calls.length, count); A.equal(fs.readFileSync(path.join(f.c.stateRoot, 'transaction.json'), 'utf8'), journal);
});
test('Web health failure automatically restores both v1.4.2 artifacts', async t => {
  const f = fixture(t); ready(f); const fetch = f.io.fetch;
  f.io.fetch = async url => new URL(url).hostname.startsWith('web.') && JSON.parse(fs.readFileSync(path.join(f.c.web.root, 'package.json'))).version === '1.4.3' && f.statuses.web === 'started' ? new Response('unhealthy', { status: 500 }) : fetch(url);
  await A.rejects(d.deploy(f.c, f.io), /Web HTTP/); A.equal(oldApi(f.c), 'old-api'); A.equal(oldWeb(f.c), 'old-web'); A.equal(JSON.parse(fs.readFileSync(path.join(f.c.stateRoot, 'transaction.json'))).status, 'rolled-back'); A.deepEqual(f.statuses, { api: 'started', web: 'started' });
});
test('manual rollback is repeatable and leaves user files written after prepare intact', async t => {
  const f = fixture(t); ready(f); await d.deploy(f.c, f.io); put(path.join(f.c.api.root, 'storage/new.enc'), 'new user write'); const tx = JSON.parse(fs.readFileSync(path.join(f.c.stateRoot, 'transaction.json'))); await d.rollback(f.c, tx, f.io); const count = f.calls.length; await d.rollback(f.c, tx, f.io); A.equal(f.calls.length, count); A.equal(oldWeb(f.c), 'old-web'); A.equal(fs.readFileSync(path.join(f.c.api.root, 'storage/new.enc'), 'utf8'), 'new user write');
});
test('changed live dependencies or corrupted candidate block deploy before stopping services', async t => {
  const f = fixture(t), r = ready(f); put(path.join(f.c.web.modules, 'next/new-file.js'), 'unexpected'); await A.rejects(d.deploy(f.c, f.io), /nodevenv hazırlıktan sonra/); A.equal(f.calls.length, 0);
  fs.unlinkSync(path.join(f.c.web.modules, 'next/new-file.js')); put(r.plan.find(p => p.id === 'api/dist').source + '/src/server.js', 'corrupt'); await A.rejects(d.deploy(f.c, f.io), /artifact bozuk/); A.equal(f.calls.length, 0);
});
test('a changed protected startup or private backup blocks publication before native stop', async t => {
  const f = fixture(t), r = ready(f); put(path.join(f.c.api.root, 'api-custom.cjs'), 'external edit'); await A.rejects(d.deploy(f.c, f.io), /Korunan/); A.equal(f.calls.length, 0); put(path.join(f.c.api.root, 'api-custom.cjs'), 'existing api Passenger entry');
  put(path.join(r.release, 'dependencies/web/next/package.json'), '{}'); await A.rejects(d.deploy(f.c, f.io), /nodevenv yedeği/); A.equal(f.calls.length, 0);
});
test('prepare build/EAGAIN failure never stops or mutates live v1.4.2', async t => {
  const f = fixture(t), web = d.inventory(f.c.web.root), api = d.inventory(f.c.api.root); await A.rejects(d.prepare(f.c, f.io), /EAGAIN/); A.deepEqual(f.calls, []); A.deepEqual(d.inventory(f.c.web.root), web); A.deepEqual(d.inventory(f.c.api.root), api); A(!fs.existsSync(path.join(f.c.stateRoot, 'ready.json')));
});
test('rollback refuses another live mapping or corrupted backup before stopping anything', async t => {
  const f = fixture(t), tx = transaction(f); tx.roots.web = '/different/web'; await A.rejects(d.rollback(f.c, tx, f.io), /farklı kök/); A.equal(f.calls.length, 0); tx.roots = d.rootsIdentity(f.c); put(path.join(tx.backup, 'manifest.json'), 'corrupt'); await A.rejects(d.rollback(f.c, tx, f.io), /SHA-256/); A.equal(f.calls.length, 0);
});
test('runtime plan cannot target nodevenv, env or overlapping paths', t => {
  const f = fixture(t), r = ready(f); A.throws(() => d.validatePlan(f.c, [{ id: 'web/node_modules', dest: path.join(f.c.web.root, 'node_modules') }], r.protected), /symlink|nodevenv/); A.throws(() => d.validatePlan(f.c, [{ id: 'api/env', dest: path.join(f.c.api.root, '.env') }], r.protected), /Korunan/);
});
test('source packaging includes Web data but excludes env and generated build/dependencies', t => {
  const f = fixture(t), stage = path.join(f.c.stateRoot, 'source-copy'); d.copySource(stage); A(fs.existsSync(path.join(stage, 'apps/web/data/motivational-quotes.json'))); A(!fs.existsSync(path.join(stage, '.env'))); A(!fs.existsSync(path.join(stage, 'apps/web/.next'))); A(!fs.existsSync(path.join(stage, 'node_modules')));
});
test('recovery health failure keeps both applications stopped and retains verified backups', async t => {
  const f = fixture(t); ready(f); await d.deploy(f.c, f.io); const tx = JSON.parse(fs.readFileSync(path.join(f.c.stateRoot, 'transaction.json'))), fetch = f.io.fetch;
  f.io.fetch = async url => new URL(url).hostname.startsWith('api.') && f.statuses.api === 'started' ? new Response('unhealthy', { status: 500 }) : fetch(url);
  await A.rejects(d.rollback(f.c, tx, f.io), /API HTTP/); A.deepEqual(f.statuses, { api: 'stopped', web: 'stopped' }); A.equal(oldApi(f.c), 'old-api'); A.equal(oldWeb(f.c), 'old-web'); d.verifyBackup(tx);
});
test('a newly introduced env file is detected before native stop', async t => {
  const f = fixture(t); ready(f); put(path.join(f.c.web.root, '.env.production.local'), 'NEXT_PUBLIC_API_URL=https://different.example.test'); await A.rejects(d.deploy(f.c, f.io), /envanteri değişti/); A.equal(f.calls.length, 0);
});
test('split metadata adaptation changes only the private build copy and keeps version meaning', t => {
  const f = fixture(t), stage = path.join(f.c.stateRoot, 'adapt-copy'), file = path.join(stage, 'apps/web/config/site.ts'); put(file, 'import manifest from "../../../package.json";\nexport const SITE_VERSION=`v${manifest.version}`;\n');
  d.adaptSplitSource(stage); A(fs.readFileSync(file,'utf8').includes('import manifest from "../package.json";')); A(!fs.existsSync(path.join(f.c.sourceRoot,'apps/web/config/site.ts')));
});
test('runtime trace validates split app files and rejects build-only or unmapped dependencies', t => {
  const f = fixture(t), r = ready(f), stage = path.join(r.release,'workspace'), manifest = path.join(stage,'apps/web/.next/server/page.js.nft.json');
  const refer = file => path.relative(path.dirname(manifest),file); const dep = path.join(stage,'node_modules/extra/index.js');put(dep,'extra dependency');
  data(manifest,{files:[refer(path.join(stage,'apps/api/dist/src/server.js'))]});A.equal(d.checkRuntimeTraces(f.c,stage,r.plan),1);
  data(manifest,{files:[refer(dep)]}); A.throws(()=>d.checkRuntimeTraces(f.c,stage,r.plan),/derleme araçlarında/);
  put(path.join(f.c.web.modules,'extra/index.js'),'extra dependency');A.equal(d.checkRuntimeTraces(f.c,stage,r.plan),1);
  const rootPackage=path.join(stage,'package.json');data(rootPackage,{version:'1.4.3',type:'module'});data(path.join(stage,'apps/web/package.json'),{version:'1.4.3'});data(manifest,{files:[refer(rootPackage)]});A.throws(()=>d.checkRuntimeTraces(f.c,stage,r.plan),/module davranışı/);
  data(rootPackage,{version:'1.4.3'});A.equal(d.checkRuntimeTraces(f.c,stage,r.plan),1);A.deepEqual(JSON.parse(fs.readFileSync(manifest)).files,[refer(path.join(stage,'apps/web/package.json'))]);
});
test('ready/rollback journal cannot redirect source or backup paths outside private state', async t => {
  const f = fixture(t), tx = transaction(f); tx.release = f.c.web.root; await A.rejects(d.rollback(f.c, tx, f.io), /özel durum/); A.equal(f.calls.length, 0);
  tx.release = path.dirname(tx.backup); tx.backup = f.c.api.root; await A.rejects(d.rollback(f.c, tx, f.io), /Yedek özel/); A.equal(f.calls.length, 0);
});
test('Next 15.5.29 and existing React/React DOM 19.3.1 pass without changing nodevenv', t => {
  const f = fixture(t), before = ['web', 'api'].map(a => d.inventory(f.c[a].modules));
  A.equal(d.checkDependencies(f.c).next, '15.5.29');
  A.equal(d.resolvePackage(f.c.web.modules, 'react').version, '19.3.1');
  A.equal(d.resolvePackage(f.c.web.modules, 'react-dom').version, '19.3.1');
  A.deepEqual(['web', 'api'].map(a => d.inventory(f.c[a].modules)), before); A.deepEqual(f.calls, []);
});
test('preflight permits absent/empty TXT_STORAGE_KEY while still requiring JWT_SECRET', t => {
  const f = fixture(t), { validateEnvironment } = require('../scripts/deployment-preflight.cjs');
  const originalJWT = f.apiEnv.JWT_SECRET; delete f.apiEnv.TXT_STORAGE_KEY;
  const records = Object.fromEntries(['web', 'api'].map(a => [a, d.selected(f.c, f.io.get(), a)]));
  const env = d.environment(f.c, records); A.equal(env.JWT_SECRET, originalJWT); A.equal(env.TXT_STORAGE_KEY, undefined);
  A.deepEqual(validateEnvironment({ ...env, TXT_STORAGE_KEY: '' }, 22), []);
  A(validateEnvironment({ ...env, JWT_SECRET: '', TXT_STORAGE_KEY: 'synthetic-txt' }, 22).includes('JWT_SECRET eksik'));
});
test('public_html alias stays intact and real Web htaccess stays protected during deploy', async t => {
  const actual = require('../scripts/deploy/veridyen.json'); A.deepEqual(actual.documentRoots, ['/home/kurums22/web', '/home/kurums22/api']);
  const f = fixture(t), alias = path.join(f.home, 'public_html'); fs.symlinkSync('web', alias);
  d.loadConfig(f.configFile, f.c.sourceRoot); const r = ready(f);
  A(r.protected.some(p => p.path === path.join(f.c.web.root, '.htaccess')));
  A(r.protected.every(p => !p.path.startsWith(alias + '/')));
  await d.deploy(f.c, f.io); A.equal(fs.readlinkSync(alias), 'web');
  A.equal(fs.readFileSync(path.join(alias, '.htaccess'), 'utf8'), 'original web rules');
});
test('repository lock pins Next and required Next packages to 15.5.29, retaining React 19.3.1', t => {
  const lock = require('../package-lock.json'), web = require('../apps/web/package.json'), next = lock.packages['node_modules/next'];
  A.equal(web.dependencies.next, '15.5.29'); A.equal(lock.packages['apps/web'].dependencies.next, '15.5.29'); A.equal(next.version, '15.5.29');
  const required = { '@next/env': next.dependencies['@next/env'], ...Object.fromEntries(Object.entries(next.optionalDependencies).filter(([name]) => name.startsWith('@next/swc-'))) };
  for (const [name, version] of Object.entries(required)) { A.equal(version, '15.5.29'); const pkg = lock.packages['node_modules/' + name]; A.equal(pkg.version, version); A(pkg.resolved.endsWith('-15.5.29.tgz')); A.match(pkg.integrity, /^sha512-/); }
  A.equal(lock.packages['node_modules/react'].version, '19.3.1'); A.equal(lock.packages['node_modules/react-dom'].version, '19.3.1');
  const f = fixture(t), apps = f.io.get().map(a => ({ ...a, selectedVersion: '22.23.3' })); A.equal(d.selected(f.c, apps, 'web').selectedVersion, '22.23.3');
});
