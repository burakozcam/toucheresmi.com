'use strict';
// Explicit server-side operator command only. Importing this module has no effects.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { parseEnv } = require('node:util');
const L = require('./deploy/lib.cjs');
const { assert, exists, json, atomicJson, inside, disjoint, absolute, noSymlinkParents, inventory, same, copy } = L;
const { validateEnvironment } = require('./deployment-preflight.cjs');
function canonical(value) { return Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value; }
const digest = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(canonical(value))).digest('hex');
const fingerprint = root => digest(inventory(root));
const journalPath = c => path.join(c.stateRoot, 'transaction.json');
const readyPath = c => path.join(c.stateRoot, 'ready.json');
const rootsIdentity = c => ({ source: c.sourceRoot, web: c.web.root, api: c.api.root, webModules: c.web.modules, apiModules: c.api.modules });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function sourceDigest(c) {
  const inputs = [...L.SOURCE_ENTRIES, 'scripts/manual-deploy.cjs', 'scripts/deploy/lib.cjs', 'scripts/deploy/veridyen.json', 'scripts/deployment-preflight.cjs', 'scripts/static-assets-preflight.cjs', 'scripts/pdf-assets-preflight.cjs'];
  return digest(inputs.map(p => inventory(path.join(c.sourceRoot, p))));
}
function loadConfig(file, sourceRoot = L.SOURCE) {
  const c = json(file);
  c.sourceRoot = absolute(c.sourceRoot); c.homeRoot = absolute(c.homeRoot);
  assert(c.sourceRoot === sourceRoot, 'Betik belirtilen hazırlık deposundan çalıştırılmalı');
  c.stateRoot = absolute(c.stateRoot || path.join(c.sourceRoot, '.manual-deploy'));
  assert(typeof c.user === 'string' && /^[a-z][a-z0-9_-]*$/.test(c.user), 'Geçersiz cPanel hesap adı');
  for (const app of ['web', 'api']) {
    const a = c[app]; assert(a && typeof a === 'object', 'Ayrı Web/API ayarları gerekli');
    for (const key of ['root', 'modules', 'node']) a[key] = absolute(a[key]);
    assert(inside(c.homeRoot, a.root) && inside(c.homeRoot, a.modules) && disjoint(a.root, a.modules), 'Uygulama ve nodevenv yolları hesap altında ayrı olmalı');
    assert(path.resolve(c.homeRoot, a.appRoot) === a.root, 'Selector appRoot gerçek uygulama köküyle uyuşmuyor');
    assert(disjoint(c.sourceRoot, a.root) && disjoint(c.stateRoot, a.root) && disjoint(c.sourceRoot, a.modules) && disjoint(c.stateRoot, a.modules), 'Hazırlık/yedek ve canlı yollar çakışıyor');
    for (const p of [a.root, a.modules]) { noSymlinkParents(p); assert(exists(p) && fs.statSync(p).isDirectory(), 'Canlı uygulama/nodevenv dizini yok'); }
    verifyModuleLink(a);
  }
  assert(disjoint(c.web.root, c.api.root) && disjoint(c.web.modules, c.api.modules), 'Web/API kökleri veya bağımlılıkları çakışıyor');
  for (const a of [c.web, c.api]) for (const b of [c.web, c.api]) assert(disjoint(a.root, b.modules), 'nodevenv uygulama kökü içinde olamaz');
  noSymlinkParents(c.sourceRoot); noSymlinkParents(c.stateRoot);
  const device = fs.statSync(exists(c.stateRoot) ? c.stateRoot : c.sourceRoot).dev;
  assert([c.web, c.api].every(a => fs.statSync(a.root).dev === device), 'Özel yedek ile iki uygulama aynı dosya sisteminde olmalı; atomik rename garanti edilemedi');
  assert(inside(c.sourceRoot, c.stateRoot) && !L.SOURCE_ENTRIES.some(p => inside(path.join(c.sourceRoot, p), c.stateRoot)), 'Özel durum alanı hazırlık deposunda, paket kaynaklarının dışında olmalı');
  c.documentRoots = (c.documentRoots || []).map(absolute);
  for (const root of c.documentRoots) assert(!inside(root, c.sourceRoot) && !inside(root, c.stateRoot), 'Hazırlık/yedek HTTP kökünde olamaz');
  c.protectedFiles = (c.protectedFiles || []).map(absolute);
  assert(c.dependencyPolicy === 'reuse-live-exact', 'Desteklenen politika: reuse-live-exact; canlı nodevenv değiştirilmez');
  return c;
}
function verifyModuleLink(a) {
  const link = path.join(a.root, 'node_modules');
  assert(exists(link) && fs.lstatSync(link).isSymbolicLink(), 'Canlı node_modules mevcut nodevenv symlink olmalı');
  assert(fs.realpathSync(link) === fs.realpathSync(a.modules), 'node_modules beklenmeyen nodevenv hedefine bağlı');
  return { path: link, target: fs.readlinkSync(link), real: fs.realpathSync(link) };
}
function validateDependencyTree(root) {
  for (const row of inventory(root)) if (row[1] === 'link') {
    const target = path.resolve(path.dirname(path.join(root, row[0])), row[2]);
    assert(!path.isAbsolute(row[2]) && inside(root, target) && exists(target) && inside(fs.realpathSync(root), fs.realpathSync(target)), 'nodevenv paket içi bağı dışarı taşıyor veya kırık; izole kopya güvenli değil');
  }
}
function resolvePackage(modules, name) {
  const p = path.join(modules, name, 'package.json');
  assert(exists(p) && inside(fs.realpathSync(modules), fs.realpathSync(p)), `Canlı bağımlılık eksik/dışarı bağlı: ${name}`);
  return json(p);
}
function checkDependencies(c, lock = json(path.join(c.sourceRoot, 'package-lock.json'))) {
  const summary = {};
  for (const app of ['api', 'web']) {
    const manifest = json(path.join(c.sourceRoot, `apps/${app}/package.json`));
    for (const name of Object.keys(manifest.dependencies || {})) {
      const expected = lock.packages[`apps/${app}/node_modules/${name}`] || lock.packages[`node_modules/${name}`];
      assert(expected?.version, `Lock bağımlılık kaydı eksik: ${name}`);
      const actual = resolvePackage(c[app].modules, name).version;
      assert(actual === expected.version, `${app}: ${name} sürümü canlı=${actual}, lock=${expected.version}. Canlıya npm install yapılmadı; yayın engellendi.`);
    }
    summary[app] = { version: json(path.join(c[app].root, 'package.json')).version, modules: fingerprint(c[app].modules) };
  }
  summary.next = resolvePackage(c.web.modules, 'next').version;
  assert(/^15\./.test(summary.next), 'Bu hazırlık Next 15 için doğrulandı');
  // Reuse the currently working generated client, never generate against the live DB.
  const schema = path.join(c.api.modules, '.prisma/client/schema.prisma');
  const sourceSchema = path.join(c.sourceRoot, 'apps/api/prisma/schema.prisma');
  assert(exists(schema) && fs.readFileSync(schema, 'utf8').replace(/\r\n/g, '\n').trim() === fs.readFileSync(sourceSchema, 'utf8').replace(/\r\n/g, '\n').trim(), 'Canlı Prisma istemcisi şemayla aynı değil; migration/generate yapılmadı');
  return summary;
}
function selectorApps(payload, user) {
  assert(payload?.result === 'success' && payload.selector_enabled !== false, 'Selector sorgusu başarısız veya devre dışı');
  const apps = [];
  for (const [version, entry] of Object.entries(payload.available_versions || {})) {
    for (const [key, a] of Object.entries(entry.users?.[user]?.applications || {})) apps.push({ key, ...a, selectedVersion: version });
  }
  // Some end-user Selector releases return only the selected account's applications.
  const direct = payload.applications || payload.data?.applications;
  for (const [key, a] of Object.entries(direct || {})) apps.push({ key, ...a, selectedVersion: a.version || a.nodejs_version });
  assert(apps.length, 'Selector JSON yapısı tanınmadı; durum varsayılmadı'); return apps;
}
function selected(c, apps, app) {
  const a = c[app], found = apps.filter(x => path.resolve(c.homeRoot, x.key) === a.root);
  assert(found.length === 1, `${app}: Selector kaydı yok veya birden fazla`);
  const item = found[0];
  assert(/^22(?:\.|$)/.test(String(item.selectedVersion)) && ['started', 'stopped'].includes(item.app_status), `${app}: Node 22/durum doğrulanamadı`);
  assert(item.app_mode === 'production', `${app}: mevcut Selector modu production olmalı`);
  assert(typeof item.startup_file === 'string' && !path.isAbsolute(item.startup_file), `${app}: Passenger başlangıç dosyası tanınmadı`);
  const startup = path.resolve(a.root, item.startup_file);
  assert(inside(a.root, startup) && startup !== a.root && exists(startup), `${app}: mevcut Passenger başlangıç dosyası yok`);
  noSymlinkParents(startup);
  return { ...item, startup };
}
function executable(name) {
  if (path.isAbsolute(name)) { fs.accessSync(name, fs.constants.X_OK); return name; }
  assert(name === 'cloudlinux-selector', 'Yalnız cloudlinux-selector PATH üzerinden bulunabilir');
  for (const dir of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) { const p = path.join(dir, name); try { fs.accessSync(p, fs.constants.X_OK); return p; } catch {} }
  throw new L.DeploymentError('CloudLinux Selector CLI bulunamadı; sadece hazırlık da güvenli durum sorgusu olmadan yapılmaz');
}
function run(label, bin, args, cwd, env = process.env, logFile = null) {
  console.log(label);
  const r = spawnSync(bin, args, { cwd, env, stdio: 'pipe', maxBuffer: 16 * 1024 * 1024, timeout: 30 * 60 * 1000 });
  if (logFile) {
    fs.mkdirSync(path.dirname(logFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(logFile, Buffer.concat([r.stdout || Buffer.alloc(0), r.stderr || Buffer.alloc(0)]), { mode: 0o600, flag: 'wx' });
  }
  const reason = r.error?.code === 'EAGAIN' || /\bEAGAIN\b/.test((r.stderr || '').toString() + (r.stdout || '').toString()) ? ' [EAGAIN: kaynak sınırı; otomatik tekrar yok]' : '';
  assert(!r.error && r.status === 0, `${label} başarısız${reason}; özel çıktı yazdırılmadı${logFile ? '; günlük: ' + logFile : ''}`);
  return r.stdout?.toString().trim();
}
function ioFor(c) {
  const bin = executable(c.selectorBin || 'cloudlinux-selector');
  const selector = action => JSON.parse(run(`Selector ${action}`, bin, [action, '--json', '--interpreter', 'nodejs', '--user', c.user], c.sourceRoot));
  return {
    get: () => selectorApps(selector('get'), c.user),
    control: (action, app) => {
      assert(['stop', 'start'].includes(action), 'Selector için izin verilmeyen işlem');
      const result = JSON.parse(run(`Selector ${action}: ${app}`, bin, [action, '--json', '--interpreter', 'nodejs', '--user', c.user, '--app-root', c[app].appRoot], c.sourceRoot));
      assert(result.result === 'success', `Selector ${action}: ${app} başarısız; kod değişimi durduruldu`);
    },
    processes: () => appProcesses(c), fetch: (...args) => fetch(...args), pause, run,
  };
}
function appProcesses(c) {
  assert(exists('/proc/self/status'), 'Süreç boşalma kontrolü için Linux /proc gerekli');
  const uid = process.getuid(), found = [];
  for (const name of fs.readdirSync('/proc').filter(p => /^\d+$/.test(p))) {
    const pid = Number(name); if (pid === process.pid) continue;
    const dir = `/proc/${name}`;
    try {
      if (fs.statSync(dir).uid !== uid) continue;
      const cwd = fs.readlinkSync(path.join(dir, 'cwd'));
      const cmd = fs.readFileSync(path.join(dir, 'cmdline'), 'utf8').split('\0');
      if ([c.web, c.api].some(a => inside(a.root, cwd) || cmd.some(arg => arg === a.root || arg.startsWith(a.root + '/') || arg.startsWith(a.modules + '/')))) found.push(pid);
    } catch (e) { if (['ENOENT', 'ESRCH'].includes(e.code)) continue; throw new L.DeploymentError('Hesap süreçleri okunamadı; durdukları varsayılmadı'); }
  }
  return found;
}
function appEnvironment(a, record, web = false) {
  const names = web ? ['.env', '.env.production', '.env.local', '.env.production.local'] : ['.env'];
  const env = {};
  for (const name of names) { const p = path.join(a.root, name); if (exists(p)) Object.assign(env, parseEnv(fs.readFileSync(p, 'utf8'))); }
  Object.assign(env, record.env_vars || {}); return env;
}
function environment(c, records) {
  const api = appEnvironment(c.api, records.api), web = appEnvironment(c.web, records.web, true);
  // Web public API must be explicitly configured; never silently compile localhost.
  const combined = { ...api, ...Object.fromEntries(Object.entries(web).filter(([k]) => k.startsWith('NEXT_PUBLIC_'))) };
  combined.STORAGE_DIR = path.resolve(c.api.root, api.STORAGE_DIR || './storage');
  const errors = validateEnvironment(combined, 22); assert(!errors.length, errors.join('; '));
  assert(exists(combined.STORAGE_DIR), 'Mevcut STORAGE_DIR bulunamadı; yeni storage oluşturulmadı');
  for (const a of [c.web, c.api]) assert(!['.next', 'public', 'dist', 'src', 'lib', 'assets', 'config', 'data', 'app', 'scripts', 'node_modules'].some(p => !disjoint(path.join(a.root, p), combined.STORAGE_DIR)), 'STORAGE_DIR kod değişim alanında olamaz');
  assert(disjoint(c.sourceRoot, combined.STORAGE_DIR), 'STORAGE_DIR hazırlık deposunda olamaz');
  return combined;
}
function protectedFiles(c, records) {
  const paths = [...c.protectedFiles];
  for (const app of ['api', 'web']) {
    paths.push(records[app].startup);
    for (const name of fs.readdirSync(c[app].root)) if (name === '.htaccess' || name === '.env' || name.startsWith('.env.')) paths.push(path.join(c[app].root, name));
    // Control files inside code/public trees must survive replacement as well.
    for (const dir of ['public', 'app', 'config', 'data', 'lib', 'assets', 'scripts', 'src', 'dist', '.next']) {
      const root = path.join(c[app].root, dir);
      for (const row of inventory(root)) if (row[1] === 'file' && /^(?:\.htaccess|\.env(?:\..*)?)$/.test(path.basename(row[0]))) paths.push(path.join(root, row[0]));
    }
  }
  for (const root of [...c.documentRoots, c.homeRoot]) {
    const file = path.join(root, '.htaccess'); if (exists(file)) paths.push(file);
    for (const app of ['api', 'web']) {
      const uri = records[app].app_uri || '';
      assert(!uri.split('/').includes('..'), 'Selector app_uri geçersiz');
      const nested = path.join(root, uri.replace(/^\/+/, ''), '.htaccess');
      if (exists(nested)) paths.push(nested);
    }
  }
  return [...new Set(paths)].map(p => { noSymlinkParents(p); assert(exists(p) && fs.statSync(p).isFile(), 'Korunacak ayar dosyası yok'); return { path: p, rows: inventory(p), selectorManaged: path.basename(p) === '.htaccess' }; });
}
function verifyProtected(files, stopped = false) {
  for (const f of files) if (!stopped || !f.selectorManaged) assert(same(inventory(f.path), f.rows), 'Korunan Passenger/ortam dosyası değişti; üstüne yazılmadı');
}
function selectorSettings(records) {
  const keys = ['key', 'selectedVersion', 'startup_file', 'startup', 'app_mode', 'domain', 'app_uri', 'env_vars'];
  return Object.fromEntries(['api', 'web'].map(app => [app, Object.fromEntries(keys.filter(k => records[app][k] !== undefined).map(k => [k, records[app][k]]))]));
}
function capture(c, io) {
  const apps = io.get(), records = { api: selected(c, apps, 'api'), web: selected(c, apps, 'web') };
  const env = environment(c, records), protectedList = protectedFiles(c, records);
  const nodes = ['web', 'api'].map(app => io.run(`${app}: Node uyumu`, c[app].node, ['-p', 'process.versions.node'], c.sourceRoot));
  assert(nodes[0] === nodes[1] && nodes[0] === process.versions.node && /^22\./.test(nodes[0]), 'Başlatıcı/Web/API Node 22 patch sürümleri aynı olmalı');
  for (const app of ['api', 'web']) { verifyModuleLink(c[app]); validateDependencyTree(c[app].modules); }
  const dependencies = checkDependencies(c);
  return { records, env, protectedList, nodes, dependencies, settingsDigest: digest(selectorSettings(records)), links: ['web', 'api'].map(app => verifyModuleLink(c[app])) };
}
function validatePrivateRecord(c, record) {
  assert(record.format === 2 && typeof record.release === 'string' && path.dirname(record.release) === c.stateRoot, 'İşlem kaydı özel durum dizinine ait değil');
  noSymlinkParents(record.release);
  if (record.backup) { assert(inside(record.release, record.backup) && record.backup !== record.release, 'Yedek özel release dizini dışında'); noSymlinkParents(record.backup); }
  for (const p of record.plan || []) assert(inside(path.join(record.release, 'workspace'), p.source), 'Aday dosya özel çalışma alanı dışında');
}
function assertUnchanged(c, ready, io, stopped = false) {
  validatePrivateRecord(c, ready);
  assert(same(rootsIdentity(c), ready.roots), 'İşlem farklı canlı dizinlere ait');
  for (const app of ['api', 'web']) {
    const link = ready.links.find(l => l.path === path.join(c[app].root, 'node_modules'));
    assert(link && same(verifyModuleLink(c[app]), link), 'Canlı nodevenv bağlantısı değişti');
    assert(fingerprint(c[app].modules) === ready.dependencies[app].modules, `${app}: nodevenv hazırlıktan sonra değişti; yeniden hazırlık gerekir`);
  }
  verifyProtected(ready.protected, stopped);
  for (const app of ['api', 'web']) assert(fingerprint(path.join(ready.release, 'dependencies', app)) === ready.dependencies[app].modules, 'Özel nodevenv yedeği bozulmuş');
  for (let i = 0; i < ready.protected.length; i++) assert(same(inventory(path.join(ready.release, 'protected', String(i))), ready.protected[i].rows), 'Korunan ayar yedeği bozulmuş');
  const apps = io.get();
  const records = Object.fromEntries(['api', 'web'].map(a => [a, selected(c, apps, a)]));
  const currentFiles = protectedFiles(c, records).filter(f => !stopped || !f.selectorManaged);
  assert(same(currentFiles.map(f => [f.path, f.rows]), ready.protected.filter(f => !stopped || !f.selectorManaged).map(f => [f.path, f.rows])), 'Korunan dosya envanteri değişti; yayın engellendi');
  assert(digest(selectorSettings(records)) === ready.settingsDigest, 'Selector başlangıç/ortam/Node ayarları değişti; yayın engellendi');
}
function runtimePlan(c, stage, records) {
  const plan = [], protectedList = protectedFiles(c, records);
  for (const app of ['web', 'api']) {
    const sourceApp = path.join(stage, 'apps', app), targetRoot = c[app].root;
    const names = app === 'web' ? ['.next', 'public', 'app', 'config', 'data', 'lib', 'scripts', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json'] : ['dist', 'src', 'lib', 'assets', 'scripts', 'tsconfig.json'];
    // Existing JSON/JS/MJS runtime config must not coexist with a newly introduced TS config.
    if (app === 'web') for (const name of ['next.config.js', 'next.config.mjs']) assert(!exists(path.join(targetRoot, name)), 'Özel Next config JS/MJS var; TS config ile güvenli eşleme önce incelenmeli');
    for (const name of names) {
      const source = path.join(sourceApp, name); if (!exists(source)) continue;
      const dest = path.join(targetRoot, name);
      // Startup under scripts/ is preserved at file granularity rather than replacing its parent.
      if (protectedList.some(f => inside(dest, f.path))) {
        assert(fs.statSync(source).isDirectory(), 'Paket Passenger başlangıç dosyasının üstüne yazamaz');
        for (const row of inventory(source).filter(r => r[1] === 'file')) {
          const to = path.join(dest, row[0]); if (protectedList.some(f => f.path === to)) continue;
          plan.push({ id: `${app}/${name}/${row[0]}`, source: path.join(source, row[0]), dest: to });
        }
      } else plan.push({ id: `${app}/${name}`, source, dest });
    }
    // Preserve cPanel custom scripts/dependency declarations; only the application version changes.
    const manifest = json(path.join(targetRoot, 'package.json'));
    const staged = path.join(stage, 'deploy-manifests', `${app}.json`); fs.mkdirSync(path.dirname(staged), { recursive: true });
    fs.writeFileSync(staged, JSON.stringify({ ...manifest, version: '1.4.3' }, null, 2) + '\n');
    plan.push({ id: `${app}/package.json`, source: staged, dest: path.join(targetRoot, 'package.json') });
  }
  validatePlan(c, plan, protectedList); return plan;
}
function validatePlan(c, plan, files) {
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    assert(plan.filter(x => x.id === p.id).length === 1 && /^[a-zA-Z0-9_./-]+$/.test(p.id) && !p.id.includes('..'), 'Geçersiz runtime kaydı');
    assert([c.web.root, c.api.root].some(root => inside(root, p.dest) && root !== p.dest), 'Runtime hedefi kayıtlı kök dışında');
    noSymlinkParents(p.dest);
    for (const a of [c.web, c.api]) assert(disjoint(p.dest, a.modules) && disjoint(p.dest, path.join(a.root, 'node_modules')), 'nodevenv veya symlink değişim planında olamaz');
    for (const f of files) assert(disjoint(p.dest, f.path), 'Korunan dosya runtime planıyla çakışıyor');
    for (let j = 0; j < i; j++) assert(disjoint(p.dest, plan[j].dest), 'Runtime planı kendi içinde çakışıyor');
  }
}
function adaptSplitSource(stage) {
  // Same version value, but the split Web app must not need /home/package.json.
  // Only the private build copy changes; product source and hover files stay untouched.
  const site = path.join(stage, 'apps/web/config/site.ts');
  const text = fs.readFileSync(site, 'utf8');
  assert(text.includes('import manifest from "../../../package.json";'), 'Web sürüm metadata importu beklenen biçimde değil; paketleme incelenmeli');
  fs.writeFileSync(site, text.replace('import manifest from "../../../package.json";', 'import manifest from "../package.json";'));
}
function checkRuntimeTraces(c, stage, plan) {
  const web = path.join(stage, 'apps/web'), manifests = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name), s = fs.lstatSync(file);
      assert(!s.isSymbolicLink(), 'Next çıktı ağacında incelenmemiş symlink');
      if (s.isDirectory()) { if (name !== 'cache' && name !== 'static') walk(file); }
      else if (name.endsWith('.nft.json')) manifests.push(file);
    }
  }
  walk(path.join(web, '.next')); assert(manifests.length, 'Next runtime trace manifestleri yok');
  for (const file of manifests) {
    const trace = json(file), list = trace.files; assert(Array.isArray(list), 'Next runtime trace eksik');
    const relocated = [];
    for (const relative of list) {
      let from = path.resolve(path.dirname(file), relative); assert(exists(from), 'Next trace dosyası derlemede eksik');
      if (from === path.join(stage, 'package.json')) {
        // NFT includes package-boundary metadata even for bundled JSON imports.
        // Rebind inert CommonJS metadata to the existing per-app boundary.
        const root = json(from), webFile = path.join(web, 'package.json'), app = json(webFile), live = json(path.join(c.web.root, 'package.json'));
        assert([root, app, live].every(p => !p.imports && !p.exports && (!p.type || p.type === 'commonjs')) && root.version === app.version && app.version === '1.4.3', 'Monorepo package metadata module davranışı taşıyor; güvenli taşınamaz');
        from = webFile;
      }
      relocated.push(path.relative(path.dirname(file), from).split(path.sep).join('/'));
      assert(fs.statSync(from).isFile(), 'Next trace dosya yerine dizin içeriyor; bağımlılık kopyası incelenmeli');
      if (plan.some(p => inside(p.source, from))) continue;
      let handled = false;
      for (const app of ['web', 'api']) {
        const modules = path.join(stage, 'apps', app, 'node_modules');
        if (inside(modules, from)) {
          const target = path.join(c[app].modules, path.relative(modules, from));
          assert(exists(target) && digest(fs.readFileSync(from)) === digest(fs.readFileSync(target)), 'Next trace bağımlılığı canlı nodevenv ile eşleşmiyor');
          handled = true;
        }
      }
      if (handled) continue;
      const tools = path.join(stage, 'node_modules');
      if (inside(tools, from)) {
        // A build-only hoisted external must also resolve in the unchanged Web nodevenv.
        const target = path.join(c.web.modules, path.relative(tools, from));
        assert(exists(target) && digest(fs.readFileSync(from)) === digest(fs.readFileSync(target)), 'Next trace yalnız derleme araçlarında olan modüle bağlı; canlı bağımlılıklar değiştirilmedi');
        continue;
      }
      // Source package metadata is replaced by the preserved per-app package manifest.
      const app = ['web', 'api'].find(a => from === path.join(stage, 'apps', a, 'package.json'));
      if (app) continue;
      throw new L.DeploymentError('Next trace ayrı Web/API planı dışında dosya gerektiriyor; eksik artifact yayımlanmaz');
    }
    if (!same(list, relocated)) atomicJson(file, { ...trace, files: [...new Set(relocated)] });
  }
  return manifests.length;
}
function preserveExtraPublic(c, stage, files) {
  const paths = new Set(inventory(path.join(stage, 'apps/web/public')).map(r => r[0]));
  for (const row of inventory(path.join(c.web.root, 'public'))) assert(paths.has(row[0]) || files.some(f => inside(path.join(c.web.root, 'public'), f.path) && inside(path.join(c.web.root, 'public', row[0]), f.path)), 'Canlı public içinde pakette olmayan kullanıcı dosyası var; yayın engellendi');
}
function snapshotPlan(plan, dir) {
  fs.mkdirSync(dir, { mode: 0o700 });
  const manifest = plan.map((p, index) => {
    const rows = inventory(p.dest), backup = String(index);
    if (rows.length) copy(p.dest, path.join(dir, backup));
    assert(same(inventory(path.join(dir, backup)), rows) && same(inventory(p.dest), rows), 'Canlı yedek bütünlük kontrolü başarısız');
    return { id: p.id, dest: p.dest, backup, rows };
  });
  atomicJson(path.join(dir, 'manifest.json'), manifest); return manifest;
}
function verifyBackup(tx) {
  const file = path.join(tx.backup, 'manifest.json');
  assert(digest(fs.readFileSync(file)) === tx.backupDigest, 'Yedek manifest SHA-256 uyuşmuyor');
  const manifest = json(file);
  assert(same(manifest.map(e => [e.id, e.dest]), tx.plan.map(e => [e.id, e.dest])), 'Yedek hedef yolları işlemle uyuşmuyor');
  assert(manifest.every(e => /^\d+$/.test(e.backup)) && new Set(manifest.map(e => e.backup)).size === manifest.length, 'Geçersiz yedek öğe yolu');
  for (const e of manifest) assert(same(inventory(path.join(tx.backup, e.backup)), e.rows), 'Yedek dosyası bozuk; canlı değiştirilmedi');
  return manifest;
}
function replaceEntry(c, tx, entry, source) {
  const index = tx.plan.findIndex(p => p.id === entry.id), dest = entry.dest;
  const candidate = path.join(path.dirname(dest), `.ks-${tx.id}-${index}.new`);
  const displaced = path.join(tx.release, 'displaced', tx.id, entry.id);
  fs.mkdirSync(path.dirname(displaced), { recursive: true, mode: 0o700 });
  assert(!exists(candidate) && !exists(displaced), 'Yarım değişim var; rollback gerekli');
  if (exists(source)) copy(source, candidate);
  tx.moves.push({ id: entry.id, candidate, displaced }); atomicJson(journalPath(c), tx);
  if (exists(dest)) fs.renameSync(dest, displaced);
  if (exists(candidate)) fs.renameSync(candidate, dest);
}
function restorePlan(c, tx) {
  validatePrivateRecord(c, tx);
  validatePlan(c, tx.plan, tx.protected);
  const manifest = verifyBackup(tx);
  tx.status = 'restoring'; atomicJson(journalPath(c), tx);
  for (const entry of manifest) {
    if (same(inventory(entry.dest), entry.rows)) continue;
    const temp = path.join(path.dirname(entry.dest), `.ks-restore-${crypto.randomUUID()}`);
    if (entry.rows.length) copy(path.join(tx.backup, entry.backup), temp);
    if (exists(entry.dest)) {
      const failed = path.join(tx.release, 'failed', crypto.randomUUID(), entry.id);
      fs.mkdirSync(path.dirname(failed), { recursive: true, mode: 0o700 }); fs.renameSync(entry.dest, failed);
    }
    if (exists(temp)) fs.renameSync(temp, entry.dest);
  }
  for (const e of manifest) assert(same(inventory(e.dest), e.rows), 'Geri dönüş bütünlüğü doğrulanamadı');
}
function healthURLs(env) {
  const web = env.WEB_ORIGIN.replace(/\/$/, ''), api = env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  return { web, api: `${api}/api/health`, stoppedWeb: `${web}/login` };
}
async function request(io, url) {
  const u = new URL(url); u.searchParams.set('_kscheck', crypto.randomUUID());
  return io.fetch(u.toString(), { headers: { 'Cache-Control': 'no-cache' }, redirect: 'error', signal: AbortSignal.timeout(8000) });
}
async function stopBoth(c, tx, io) {
  tx.status = 'stopping'; atomicJson(journalPath(c), tx);
  for (const app of ['web', 'api']) {
    if (selected(c, io.get(), app).app_status !== 'stopped') io.control('stop', app);
  }
  for (let i = 0; i < 30; i++) {
    const apps = io.get();
    if (['web', 'api'].every(a => selected(c, apps, a).app_status === 'stopped') && io.processes().length === 0) {
      for (const url of [tx.urls.api, tx.urls.stoppedWeb]) {
        const r = await request(io, url);
        assert([403, 404, 502, 503, 504].includes(r.status), 'Selector stopped olsa da uygulama HTTP kapısı kapanmadı; değişim yapılmaz');
      }
      verifyProtected(tx.protected, true); return;
    }
    await io.pause(500);
  }
  throw new L.DeploymentError('Passenger/worker süreçleri boşalmadı; dosya değişimi yapılmadı');
}
async function checkAPI(io, urls, version) {
  for (let i = 0; i < 8; i++) {
    try { const r = await request(io, urls.api), body = await r.json(); if (r.status === 200 && body.status === 'ok' && (version === '1.4.2' || body.version === version)) return; } catch {}
    await io.pause(500);
  }
  throw new L.DeploymentError('API HTTP sürüm/sağlık kontrolü başarısız');
}
async function checkWeb(c, io, urls, version) {
  for (let i = 0; i < 8; i++) {
    try { const r = await request(io, urls.web); if (r.status === 200 && (r.headers.get('content-type') || '').includes('text/html') && (await r.text()).includes(`v${version}`)) break; if (i === 7) throw Error(); } catch { if (i === 7) throw new L.DeploymentError('Web HTTP sürüm kontrolü başarısız'); }
    await io.pause(500);
  }
  for (const [rel, mime] of [['araclar/pdf-tools.html', 'text/html'], ['araclar/pdf-page-editor.html', 'text/html'], ['araclar/tool-theme.js', 'javascript'], ['vendor/pdfjs/pdf.min.mjs', 'javascript'], ['vendor/pdfjs/pdf.worker.min.mjs', 'javascript']]) {
    const r = await request(io, `${urls.web}/${rel}`);
    assert(r.status === 200 && (r.headers.get('content-type') || '').includes(mime), 'PDF araç HTTP/MIME kontrolü başarısız');
  }
  const build = json(path.join(c.web.root, '.next/build-manifest.json'));
  const app = json(path.join(c.web.root, '.next/app-build-manifest.json'));
  const assets = [...new Set([...(build.rootMainFiles || []), ...(app.pages?.['/layout'] || [])])].filter(f => /\.(js|css)$/.test(f));
  assert(assets.some(f => f.endsWith('.js')) && assets.some(f => f.endsWith('.css')), 'Next JS/CSS manifesti eksik');
  for (const asset of assets) {
    assert(/^static\/[a-zA-Z0-9_./-]+$/.test(asset) && !asset.includes('..'), 'Geçersiz Next asset yolu');
    const r = await request(io, `${urls.web}/_next/${asset}`), type = r.headers.get('content-type') || '';
    assert(r.status === 200 && (asset.endsWith('.css') ? type.includes('text/css') : /javascript|ecmascript/.test(type)), 'Yeni Next asset HTTP/MIME hatası');
    assert(digest(Buffer.from(await r.arrayBuffer())) === digest(fs.readFileSync(path.join(c.web.root, '.next', asset))), 'Next JS/CSS HTTP içerik SHA-256 uyuşmuyor');
  }
}
async function startAndCheck(c, tx, io, version) {
  if (selected(c, io.get(), 'api').app_status !== 'started') io.control('start', 'api');
  await checkAPI(io, tx.urls, version);
  if (selected(c, io.get(), 'web').app_status !== 'started') io.control('start', 'web');
  await checkWeb(c, io, tx.urls, version); verifyProtected(tx.protected);
}
async function rollback(c, tx, io) {
  validatePrivateRecord(c, tx);
  assert(same(rootsIdentity(c), tx.roots), 'Geri dönüş farklı köklere ait');
  if (tx.status === 'rolled-back') { console.log('Zaten geri alındı; önceki yedek korundu.'); return; }
  if (tx.backup) verifyBackup(tx);
  await stopBoth(c, tx, io); assertUnchanged(c, tx, io, true);
  if (tx.backup && tx.moves.length) restorePlan(c, tx);
  try { await startAndCheck(c, tx, io, '1.4.2'); }
  catch (e) { await stopBoth(c, tx, io); throw e; }
  tx.status = 'rolled-back'; atomicJson(journalPath(c), tx);
  console.log('API/Web v1.4.2 geri alındı. nodevenv bağlantıları ve yedekler korundu.');
}
async function prepare(c, io) {
  const old = exists(journalPath(c)) ? json(journalPath(c)) : null;
  assert(!old || ['healthy', 'rolled-back'].includes(old.status), 'Yarım işlem var; önce rollback gerekli');
  assert(['', 'apps/web', 'apps/api'].every(p => json(path.join(c.sourceRoot, p, 'package.json')).version === '1.4.3'), 'Hazırlık kaynak/API/Web sürümleri 1.4.3 olmalı');
  const captured = capture(c, io);
  assert(['api', 'web'].every(a => captured.records[a].app_status === 'started'), 'Hazırlık öncesi iki uygulama çalışır olmalı');
  assert(['api', 'web'].every(a => captured.dependencies[a].version === '1.4.2'), 'Bu geçiş yalnız v1.4.2 → v1.4.3 içindir');
  const source = sourceDigest(c), id = crypto.randomUUID(), release = path.join(c.stateRoot, id);
  const total = ['api', 'web'].flatMap(a => inventory(c[a].modules)).reduce((n, r) => n + (r[1] === 'file' ? r[3] : 0), 0), disk = fs.statfsSync(c.stateRoot);
  assert(Number(disk.bavail) * Number(disk.bsize) > total * 5 + 2 * 1024 ** 3, 'Bağımlılık kopyaları/yedek/build için disk yetersiz');
  fs.mkdirSync(release, { mode: 0o700 });
  const ready = { format: 2, id, release, roots: rootsIdentity(c), source, dependencies: captured.dependencies, links: captured.links, settingsDigest: captured.settingsDigest, protected: captured.protectedList, urls: healthURLs(captured.env) };
  // Private snapshots include the original dependencies and Passenger/.env files; no database backup is claimed.
  fs.mkdirSync(path.join(release, 'dependencies')); fs.mkdirSync(path.join(release, 'protected'), { mode: 0o700 });
  for (const app of ['api', 'web']) { copy(c[app].modules, path.join(release, 'dependencies', app)); assert(fingerprint(path.join(release, 'dependencies', app)) === ready.dependencies[app].modules, 'nodevenv yedeği doğrulanamadı'); }
  for (let i = 0; i < ready.protected.length; i++) { copy(ready.protected[i].path, path.join(release, 'protected', String(i))); assert(same(inventory(path.join(release, 'protected', String(i))), ready.protected[i].rows), 'Ayar yedeği doğrulanamadı'); }
  atomicJson(path.join(release, 'protected/manifest.json'), ready.protected);
  const stage = path.join(release, 'workspace'); L.copySource(stage); adaptSplitSource(stage);
  const env = { PATH: `${path.dirname(c.web.node)}:${process.env.PATH}`, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_ENV: 'production', KS_LOW_RESOURCE_BUILD: '1', NEXT_TELEMETRY_DISABLED: '1', NODE_OPTIONS: '--max-old-space-size=1536', UV_THREADPOOL_SIZE: '1', npm_config_jobs: '1', npm_config_cache: path.join(release, 'npm-cache'), ...Object.fromEntries(Object.entries(captured.env).filter(([k]) => k.startsWith('NEXT_PUBLIC_'))) };
  io.run('İzole kilitli derleme araçları', path.join(path.dirname(c.web.node), 'npm'), ['ci', '--include=dev', '--no-audit', '--no-fund'], stage, env, path.join(release, 'logs/npm-ci.log'));
  for (const app of ['api', 'web']) {
    const target = path.join(stage, 'apps', app, 'node_modules');
    if (exists(target)) fs.renameSync(target, path.join(stage, `unused-${app}-modules`));
    copy(path.join(release, 'dependencies', app), target);
  }
  const npm = path.join(path.dirname(c.web.node), 'npm');
  io.run('API build (canlı bağımlılık kopyası)', npm, ['run', 'build', '-w', '@optik/api'], stage, env, path.join(release, 'logs/api-build.log'));
  io.run('Web build (1 worker; EAGAIN tekrar edilmez)', npm, ['run', 'build', '-w', '@optik/web'], stage, env, path.join(release, 'logs/web-build.log'));
  L.assertArtifacts(stage, '1.4.3'); preserveExtraPublic(c, stage, captured.protectedList);
  const next = json(path.join(stage, 'apps/web/node_modules/next/package.json')).version;
  assert(next === captured.dependencies.next, 'Build Next ile canlı nodevenv Next farklı');
  const plan = runtimePlan(c, stage, captured.records);
  ready.runtimeTraceCount = checkRuntimeTraces(c, stage, plan);
  ready.plan = plan.map(p => ({ ...p, rows: inventory(p.source) }));
  assertUnchanged(c, ready, io); assert(source === sourceDigest(c), 'Hazırlık sırasında kaynak değişti');
  atomicJson(path.join(release, 'ready.json'), ready); atomicJson(readyPath(c), ready);
  console.log('Hazırlık tamamlandı. Canlı dosyalar, Selector durumu ve nodevenv değiştirilmedi.'); return ready;
}
async function deploy(c, io) {
  const previous = exists(journalPath(c)) ? json(journalPath(c)) : null;
  if (previous?.status === 'healthy' && previous.source === sourceDigest(c)) {
    assertUnchanged(c, previous, io);
    const apps = io.get();
    assert(['api', 'web'].every(a => selected(c, apps, a).app_status === 'started' && json(path.join(c[a].root, 'package.json')).version === '1.4.3'), 'Önceki başarılı yayın canlıyla uyuşmuyor; otomatik üstüne yazılmadı');
    await checkAPI(io, previous.urls, '1.4.3'); await checkWeb(c, io, previous.urls, '1.4.3');
    console.log('Aynı kaynak zaten yayımlandı; v1.4.2 geri dönüş noktası korundu.'); return;
  }
  assert(!previous || ['healthy', 'rolled-back'].includes(previous.status), 'Yarım işlem var; önce rollback gerekli');
  // Explicit prepare is optional; deploy performs the same safe preparation if absent/stale.
  let ready = exists(readyPath(c)) ? json(readyPath(c)) : null;
  if (!ready || ready.format !== 2 || ready.source !== sourceDigest(c) || !same(ready.roots, rootsIdentity(c))) ready = await prepare(c, io);
  assertUnchanged(c, ready, io); validatePlan(c, ready.plan, ready.protected);
  for (const p of ready.plan) assert(same(inventory(p.source), p.rows), 'Hazır artifact bozuk; canlı durdurulmadı');
  assert(['api', 'web'].every(a => json(path.join(c[a].root, 'package.json')).version === '1.4.2'), 'Canlı başlangıç sürümü v1.4.2 değil');
  const requiredBytes = ready.plan.reduce((total, p) => total + [...p.rows, ...inventory(p.dest)].reduce((n, r) => n + (r[1] === 'file' ? r[3] : 0), 0), 0);
  const disk = fs.statfsSync(c.stateRoot);
  assert(Number(disk.bavail) * Number(disk.bsize) > requiredBytes * 2 + 1024 ** 3, 'Aktivasyon/yedek/geri dönüş için disk yetersiz; uygulamalar durdurulmadı');
  const tx = { ...ready, id: crypto.randomUUID(), status: 'prepared', moves: [] };
  if (previous) atomicJson(path.join(ready.release, `previous-${crypto.randomUUID()}.json`), previous);
  atomicJson(journalPath(c), tx);
  try {
    await stopBoth(c, tx, io); assertUnchanged(c, tx, io, true);
    const backup = path.join(tx.release, `runtime-backup-${crypto.randomUUID()}`);
    snapshotPlan(tx.plan, backup);
    tx.backup = backup; tx.backupDigest = digest(fs.readFileSync(path.join(backup, 'manifest.json')));
    tx.status = 'activating'; atomicJson(journalPath(c), tx);
    for (const p of tx.plan) replaceEntry(c, tx, p, p.source);
    for (const p of tx.plan) assert(same(inventory(p.dest), p.rows), 'Hedef artifact doğrulanamadı');
    assertUnchanged(c, tx, io, true);
    await startAndCheck(c, tx, io, '1.4.3');
    tx.status = 'healthy'; atomicJson(journalPath(c), tx);
    console.log('API/Web v1.4.3 ve HTTP kontrolleri başarılı. v1.4.2 yedeği korundu.');
  } catch (e) {
    console.error('Geçiş başarısız; iki uygulama için geri dönüş deneniyor.');
    try { await rollback(c, tx, io); } catch { console.error('Geri dönüş doğrulanamadı. Uygulamalar durdurulmuş halde tutulmalı; aynı rollback komutu tekrar kullanılabilir.'); }
    throw e;
  }
}
async function main() {
  const [action, flag, file, ...extra] = process.argv.slice(2);
  assert(['prepare', 'deploy', 'rollback'].includes(action) && (!flag || (flag === '--config' && file)) && !extra.length, 'Kullanım: node scripts/manual-deploy.cjs prepare|deploy|rollback [--config /yol/config.json]');
  assert(Number(process.versions.node.split('.')[0]) === 22, 'Node.js 22 ile başlatın'); process.umask(0o022);
  const c = loadConfig(file ? absolute(file) : path.join(__dirname, 'deploy/veridyen.json'));
  assert(os.userInfo().username === c.user, 'Komut ilgili cPanel hesabının terminalinden çalıştırılmalı');
  fs.mkdirSync(c.stateRoot, { recursive: true, mode: 0o700 });
  assert((fs.statSync(c.stateRoot).mode & 0o077) === 0 && fs.statSync(c.stateRoot).uid === process.getuid(), 'Özel durum dizini hesap sahibine ait ve 700 olmalı');
  const unlock = L.acquireLock(c.stateRoot);
  try {
    const io = ioFor(c);
    if (action === 'prepare') await prepare(c, io);
    else if (action === 'deploy') await deploy(c, io);
    else { const tx = json(journalPath(c)); assert(tx.format === 2, 'Eski işlem günlüğü; otomatik farklı dizinlere uygulanmaz'); await rollback(c, tx, io); }
  } finally { unlock(); }
}
module.exports = { ...L, loadConfig, verifyModuleLink, validateDependencyTree, resolvePackage, checkDependencies, selectorApps, selected, environment, protectedFiles, verifyProtected, selectorSettings, capture, assertUnchanged, runtimePlan, validatePlan, validatePrivateRecord, adaptSplitSource, checkRuntimeTraces, snapshotPlan, verifyBackup, replaceEntry, restorePlan, stopBoth, startAndCheck, checkAPI, checkWeb, healthURLs, prepare, deploy, rollback, rootsIdentity, digest, sourceDigest };
if (require.main === module) main().catch(e => { if (e instanceof L.DeploymentError) console.error(e.message); console.error('İşlem başarısız; gizli çıktı yazdırılmadı. Canlı nodevenv üzerinde npm/paket güncellemesi yapılmaz.'); process.exitCode = 1; });
