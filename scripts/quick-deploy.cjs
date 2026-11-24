'use strict';
// Explicit server-side command only. No install, generate, migration, backup or rollback.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { parseEnv } = require('node:util');
const { createRequire } = require('node:module');

const SERVER = {
  source: '/home/kurums22/github-deploy',
  web: { root: '/home/kurums22/web', node: '/home/kurums22/nodevenv/web/22/bin/node' },
  api: { root: '/home/kurums22/api', node: '/home/kurums22/nodevenv/api/22/bin/node' },
};
const INPUTS = {
  web: ['app', 'lib', 'config', 'data', 'public', 'scripts', 'next.config.ts', 'next-env.d.ts', 'tsconfig.json', 'package.json'],
  api: ['src', 'lib', 'assets', 'prisma', 'scripts', 'tsconfig.json', 'package.json'],
};
const PRIVATE = /^(?:node_modules|storage|uploads?|private|tmp|logs?|\.git|\.env(?:\..*)?|\.htaccess|\.user\.ini)$/i;
const PDF_FILES = ['araclar/pdf-tools.html', 'araclar/pdf-page-editor.html', 'araclar/pdf-page-editor.js', 'araclar/pdf-text-selection.js', 'araclar/tool-theme.js', 'araclar/tool-theme.css', 'vendor/pdfjs/pdf.min.mjs', 'vendor/pdfjs/pdf.worker.min.mjs'];
const exists = p => { try { return fs.lstatSync(p); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const inside = (root, file) => file === root || file.startsWith(root + path.sep);
function need(ok, message) { if (!ok) throw Error(message); }

function run(label, node, args, cwd, env) {
  console.log(`\n${label}`);
  const result = spawnSync(node, ['--max-old-space-size=768', ...args], { cwd, env, stdio: 'inherit' });
  need(!result.error && result.status === 0, `${label} başarısız (${result.error?.message || result.signal || result.status}). Yukarıdaki derleme çıktısını inceleyin.`);
}

function liveSettings(app) {
  const env = {};
  for (const name of ['.env', '.env.production', '.env.local', '.env.production.local']) {
    const file = path.join(app.root, name);
    if (exists(file)) Object.assign(env, parseEnv(fs.readFileSync(file, 'utf8')));
  }
  // Only explicit Passenger directives are read; no Selector inventory is needed.
  const protectedPaths = [];
  let restart = path.join(app.root, 'tmp');
  for (const file of [path.join(path.dirname(app.root), '.htaccess'), path.join(app.root, '.htaccess')]) {
    if (!exists(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/^\s*Passenger(StartupFile|RestartDir)\s+(?:"([^"]+)"|'([^']+)'|([^\s#]+))/gmi)) {
      const target = path.resolve(app.root, match[2] || match[3] || match[4]);
      if (match[1].toLowerCase() === 'startupfile') protectedPaths.push(target);
      else restart = target;
    }
  }
  if (env.STORAGE_DIR) protectedPaths.push(path.resolve(app.root, env.STORAGE_DIR));
  if (process.env.STORAGE_DIR) protectedPaths.push(path.resolve(app.root, process.env.STORAGE_DIR));
  protectedPaths.push(restart);
  return { env, protectedPaths, restart };
}

function copySource(from, to) {
  const stat = fs.lstatSync(from);
  need(!stat.isSymbolicLink(), `Kaynak dosya symlink; kopyalanmadı: ${from}`);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) {
      if (!PRIVATE.test(name) && !['.next', 'dist', 'cache'].includes(name) && !name.endsWith('.tsbuildinfo')) copySource(path.join(from, name), path.join(to, name));
    }
  } else {
    need(stat.isFile(), `Desteklenmeyen kaynak dosya: ${from}`);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

function stageSource(c, stage, settings) {
  copySource(path.join(c.source, 'package.json'), path.join(stage, 'package.json'));
  for (const name of ['web', 'api']) {
    const app = path.join(stage, 'apps', name);
    fs.mkdirSync(app, { recursive: true });
    for (const entry of INPUTS[name]) {
      const source = path.join(c.source, 'apps', name, entry);
      if (exists(source)) copySource(source, path.join(app, entry));
    }
    const modules = path.join(c[name].root, 'node_modules');
    need(exists(modules)?.isSymbolicLink() && fs.statSync(modules).isDirectory(), `${name}: mevcut node_modules bağlantısı eksik veya kırık: ${modules}`);
    fs.symlinkSync(fs.realpathSync(modules), path.join(app, 'node_modules'));
    // Presence only: no lock/version comparison or dependency writes.
    const manifest = json(path.join(app, 'package.json'));
    for (const dep of [...Object.keys(manifest.dependencies || {}), 'typescript', '@types/node', ...(name === 'web' ? ['@types/react', '@types/react-dom'] : [])]) {
      need(exists(path.join(modules, dep, 'package.json')), `${name}: bağımlılık eksik: ${dep}. Canlıya paket kurulmadı.`);
    }
    if (name === 'api') {
      const client = createRequire(path.join(modules, '@prisma/client/default.js'));
      try { client.resolve('.prisma/client/default'); } catch { throw Error('API: üretilmiş Prisma Client eksik. Otomatik generate yapılmadı.'); }
    } else {
      // Next otherwise attempts to download missing SWC into its live package.
      try { createRequire(path.join(modules, 'next/package.json'))(`@next/swc-linux-${process.arch}-gnu`); }
      catch (e) { throw Error(`Web: yerel SWC derleyicisi yüklenemedi; canlı bağımlılıklara indirme yapılmadı: ${e.message}`); }
    }
  }
  // Keep the currently installed Next routing/configuration, including custom redirects.
  const configs = ['next.config.ts', 'next.config.js', 'next.config.mjs'].filter(n => exists(path.join(c.web.root, n)));
  need(configs.length <= 1, 'Web: birden fazla next.config dosyası var; hangi yapılandırmanın kullanılacağı belirsiz.');
  if (configs.length) {
    for (const n of ['next.config.ts', 'next.config.js', 'next.config.mjs']) fs.rmSync(path.join(stage, 'apps/web', n), { force: true });
    copySource(path.join(c.web.root, configs[0]), path.join(stage, 'apps/web', configs[0]));
  }
  const configFile = path.join(stage, 'apps/web', configs[0] || 'next.config.ts');
  if (configs.length && !fs.readFileSync(configFile, 'utf8').includes('KS_LOW_RESOURCE_BUILD')) {
    // Wrap only the temporary config; retain all routing functions and live settings.
    const original = `quick-original-${configs[0]}`;
    fs.renameSync(configFile, path.join(path.dirname(configFile), original));
    fs.writeFileSync(path.join(path.dirname(configFile), 'next.config.ts'), `// @ts-nocheck\nimport original from './${original}';\nexport default async (phase, context) => {\n  const config = await (typeof original === 'function' ? original(phase, context) : original);\n  return { ...config, experimental: { ...config.experimental, cpus: 1, workerThreads: false, memoryBasedWorkersCount: false, webpackBuildWorker: false } };\n};\n`);
  }
  // Split Web has its own package.json; change only the disposable build copy.
  const site = path.join(stage, 'apps/web/config/site.ts');
  fs.writeFileSync(site, fs.readFileSync(site, 'utf8').replace('"../../../package.json"', '"../package.json"'));
  const sourceEnv = {};
  // Match the existing runner's shared-root .env fallback, without copying secrets.
  const sharedEnv = path.join(c.source, '.env');
  if (exists(sharedEnv)) Object.assign(sourceEnv, parseEnv(fs.readFileSync(sharedEnv, 'utf8')));
  const publicEnv = Object.fromEntries(Object.entries({ ...sourceEnv, ...settings.web.env, ...process.env }).filter(([key]) => key.startsWith('NEXT_PUBLIC_')));
  need(publicEnv.NEXT_PUBLIC_API_URL, 'NEXT_PUBLIC_API_URL eksik. Mevcut Web/kaynak .env dosyasında veya komut ortamında tanımlı olmalı.');
  // Do not pass DB credentials to build children. Runtime .env files remain in place.
  const env = {
    PATH: `${path.dirname(c.web.node)}${path.delimiter}${process.env.PATH || ''}`,
    HOME: process.env.HOME || os.homedir(), TMPDIR: process.env.TMPDIR || os.tmpdir(),
    LANG: process.env.LANG || 'C.UTF-8', ...publicEnv,
    NODE_ENV: 'production', NODE_OPTIONS: '--max-old-space-size=768',
    KS_LOW_RESOURCE_BUILD: '1', UV_THREADPOOL_SIZE: '1', RAYON_NUM_THREADS: '1',
    NEXT_TELEMETRY_DISABLED: '1', CI: '1', npm_config_offline: 'true', npm_config_ignore_scripts: 'true',
    NEXT_DISABLE_SWC_WASM: '1',
  };
  return env;
}

function build(c, stage, env, execute) {
  const web = path.join(stage, 'apps/web'), api = path.join(stage, 'apps/api');
  const resolve = (app, file) => createRequire(path.join(app, 'package.json')).resolve(file);
  execute('API TypeScript derlemesi', c.api.node, [resolve(api, 'typescript/bin/tsc'), '-p', 'tsconfig.json'], api, env);
  execute('API statik dosyaları', c.api.node, ['scripts/copy-assets.cjs'], api, env);
  execute('Web OCR/PDF dosyaları', c.web.node, ['scripts/prepare-ocr.cjs'], web, env);
  // Direct Next invocation, without npm install/prebuild/generate hooks.
  execute('Web Next.js derlemesi', c.web.node, [resolve(web, 'next/dist/bin/next'), 'build'], web, env);
}

function artifacts(stage) {
  for (const file of ['apps/api/dist/src/server.js', 'apps/api/dist/lib/pdf-text.cjs', 'apps/api/dist/assets/fonts/LiberationSans-Regular.ttf', 'apps/web/.next/BUILD_ID', 'apps/web/.next/build-manifest.json', 'apps/web/.next/routes-manifest.json', 'apps/web/.next/required-server-files.json', ...PDF_FILES.map(p => 'apps/web/public/' + p)]) {
    const stat = exists(path.join(stage, file));
    need(stat?.isFile() && stat.size > 0, `Derleme dosyası eksik/boş: ${file}`);
  }
  for (const dir of ['apps/web/.next/server', 'apps/web/.next/static']) need(exists(path.join(stage, dir))?.isDirectory() && fs.readdirSync(path.join(stage, dir)).length, `Derleme dizini eksik/boş: ${dir}`);
  require('./verify-release.cjs').panelChunks(path.join(stage, 'apps/web/.next'));
}

// Refuse to write through any destination symlink, especially a private-data link.
function destination(file, directory = false) {
  for (let p = file; ; p = path.dirname(p)) {
    const stat = exists(p);
    need(!stat?.isSymbolicLink(), `Aktarma hedefi symlink; üzerine yazılmadı: ${p}`);
    if (stat) need(p === file && !directory ? stat.isFile() : stat.isDirectory(), `Aktarma hedefinde dosya/dizin çakışması: ${p}`);
    if (path.dirname(p) === p) break;
  }
}

function transferPlan(c, stage, settings) {
  const plan = [];
  for (const name of ['api', 'web']) {
    const app = path.join(stage, 'apps', name), live = c[name].root;
    const protectedPaths = settings[name].protectedPaths;
    const walk = (from, to) => {
      if (PRIVATE.test(path.basename(to)) || protectedPaths.some(p => inside(p, to))) return;
      const stat = fs.lstatSync(from);
      need(!stat.isSymbolicLink(), `Derleme çıktısı symlink: ${from}`);
      destination(to, stat.isDirectory());
      if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(from)) {
          if (to === path.join(live, '.next') && entry === 'cache') continue;
          walk(path.join(from, entry), path.join(to, entry));
        }
      } else {
        need(stat.isFile(), `Desteklenmeyen derleme dosyası: ${from}`);
        plan.push({ from, to });
      }
    };
    const entries = name === 'web'
      ? ['.next', ...INPUTS.web.filter(p => p !== 'package.json' && !p.startsWith('next.config.'))]
      : ['dist', 'src', 'lib', 'assets', 'scripts'];
    // Live Next config and startup/package scripts are preserved.
    if (name === 'web' && !['next.config.ts', 'next.config.js', 'next.config.mjs'].some(n => exists(path.join(live, n)))) entries.push('next.config.ts');
    for (const entry of entries) if (exists(path.join(app, entry))) walk(path.join(app, entry), path.join(live, entry));
    const manifest = json(path.join(live, 'package.json'));
    manifest.version = json(path.join(app, 'package.json')).version;
    const output = path.join(stage, `${name}-live-package.json`);
    fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
    destination(path.join(live, 'package.json'));
    plan.push({ from: output, to: path.join(live, 'package.json') });
    destination(settings[name].restart, true);
    destination(path.join(settings[name].restart, 'restart.txt'));
  }
  return plan;
}

function transfer(plan) {
  // Merge only. Unknown live files and old hashed static assets are never deleted.
  for (const { from, to } of plan) {
    destination(to);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    const temporary = path.join(path.dirname(to), `.ks-quick-${process.pid}.tmp`);
    try {
      fs.copyFileSync(from, temporary, fs.constants.COPYFILE_EXCL);
      fs.chmodSync(temporary, (exists(to) || fs.statSync(from)).mode & 0o777);
      fs.renameSync(temporary, to);
    } finally { if (exists(temporary)) fs.unlinkSync(temporary); }
  }
}

function quarantineRouteCache(c, settings) {
  // The cache hash is generated by Next. Move the whole old cache, never a fixed hash.
  const cache = path.join(c.web.root, '.next/server/route-cache');
  const stat = exists(cache);
  if (!stat) return null;
  destination(cache, true);
  need(!settings.web.protectedPaths.some(p => inside(cache, p) || inside(p, cache)), 'Route cache korunan bir canlı yolla çakışıyor; ayrılmadı.');
  const root = path.join(c.source, '.quick-deploy-route-cache');
  destination(root, true);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.chmodSync(root, 0o700);
  const backup = fs.mkdtempSync(path.join(root, 'cache-'));
  fs.chmodSync(backup, 0o700);
  fs.writeFileSync(path.join(backup, 'restore.json'), JSON.stringify({ original: cache, saved: path.join(backup, 'route-cache'), createdAt: new Date().toISOString() }, null, 2) + '\n', { mode: 0o600 });
  // Rename fails before transfer if the filesystem cannot support this operation.
  fs.renameSync(cache, path.join(backup, 'route-cache'));
  console.log(`Eski route cache geri alınabilir biçimde ayrıldı: ${backup}`);
  return backup;
}

function restart(settings) {
  // Passenger/cPanel documented touch method: restart is triggered on the next request.
  for (const name of ['api', 'web']) {
    const dir = settings[name].restart, file = path.join(dir, 'restart.txt');
    destination(dir, true); destination(file);
    fs.mkdirSync(dir, { recursive: true });
    const previous = exists(file);
    fs.closeSync(fs.openSync(file, 'a'));
    const time = new Date(Math.max(Date.now(), previous ? previous.mtimeMs + 1000 : 0));
    fs.utimesSync(file, time, time);
    console.log(`${name}: Passenger yeniden başlatma işareti yazıldı: ${file}`);
  }
}

function deploy(c = SERVER, execute = run) {
  const lock = path.join(c.source, '.quick-deploy.lock');
  let stage, updating = false;
  try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx', mode: 0o600 }); }
  catch (e) { throw Error(`Yayın kilidi alınamadı: ${lock} (${e.code}). Başka bir yayın veya yarım kalmış işlem olabilir.`); }
  try {
    const settings = { web: liveSettings(c.web), api: liveSettings(c.api) };
    stage = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-quick-deploy-'));
    fs.chmodSync(stage, 0o700);
    const env = stageSource(c, stage, settings);
    build(c, stage, env, execute);
    artifacts(stage);
    const plan = transferPlan(c, stage, settings);
    console.log('\nİki derleme başarılı. Web/API dosyaları aktarılıyor.');
    updating = true;
    quarantineRouteCache(c, settings);
    transfer(plan);
    restart(settings);
    console.log('Aktarma tamamlandı. Passenger sonraki istekte yeniden başlayacak; canlı doğrulama henüz yapılmadı. API/Web açıldıktan sonra scripts/verify-release.cjs çalıştırın.');
  } catch (e) {
    throw Error(`${e.message}\n${updating ? 'Aktarma/yeniden başlatma tamamlanamadı; canlı kod kısmen güncellenmiş olabilir. Otomatik rollback yok.' : 'Canlı dosyalar değiştirilmedi.'}`, { cause: e });
  } finally {
    if (stage) fs.rmSync(stage, { recursive: true, force: true });
    fs.unlinkSync(lock);
  }
}

module.exports = { SERVER, PDF_FILES, deploy, run, stageSource, build, artifacts, liveSettings, transferPlan, transfer, quarantineRouteCache, restart };
if (require.main === module) {
  try {
    need(path.resolve(__dirname, '..') === SERVER.source, `Bu komut yalnız ${SERVER.source} deposunda çalıştırılmalı.`);
    deploy();
  } catch (error) { console.error(`\nYAYIN BAŞARISIZ: ${error.message}`); process.exitCode = 1; }
}
