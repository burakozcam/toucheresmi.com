'use strict';
// Synthetic local applications only. No live paths, network, Selector or database.
const { test } = require('node:test');
const A = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawnSync } = require('node:child_process');
const d = require('../scripts/quick-deploy.cjs');
function put(file, body) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); }
const read = p => fs.readFileSync(p, 'utf8');
function snapshot(root) {
  const result = {};
  function walk(p) {
    const stat = fs.lstatSync(p), key = path.relative(root, p);
    if (stat.isSymbolicLink()) result[key] = ['link', fs.readlinkSync(p)];
    else if (stat.isDirectory()) { result[key] = ['dir']; for (const n of fs.readdirSync(p)) walk(path.join(p, n)); }
    else result[key] = ['file', read(p)];
  }
  walk(root); return result;
}
function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-quick-test-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const c = { source: path.join(home, 'github-deploy') };
  put(path.join(c.source, 'package.json'), '{"version":"1.4.3"}');
  for (const name of ['web', 'api']) {
    const root = path.join(home, name), modules = path.join(home, 'nodevenv', name, '22/lib/node_modules');
    c[name] = { root, node: process.execPath };
    const source = path.join(c.source, 'apps', name);
    const deps = name === 'web' ? ['next', 'react', 'react-dom'] : ['express', '@prisma/client'];
    put(path.join(source, 'package.json'), JSON.stringify({ version: '1.4.3', dependencies: Object.fromEntries(deps.map(n => [n, '*'])) }));
    put(path.join(root, 'package.json'), JSON.stringify({ version: '1.4.2', scripts: { start: 'node custom.cjs' }, dependencies: { keep: 'unchanged' } }));
    for (const dep of [...deps, 'typescript', '@types/node', '@types/react', '@types/react-dom']) put(path.join(modules, dep, 'package.json'), JSON.stringify({ name: dep, version: '0.0.0' }));
    put(path.join(modules, 'typescript/bin/tsc'), '/* synthetic compiler */');
    if (name === 'web') {
      put(path.join(modules, 'next/dist/bin/next'), '/* synthetic next */');
      put(path.join(modules, `@next/swc-linux-${process.arch}-gnu/index.js`), 'module.exports = {};');
    }
    else put(path.join(modules, '.prisma/client/default.js'), '/* synthetic generated client */');
    fs.symlinkSync(name === 'web' ? path.relative(root, modules) : modules, path.join(root, 'node_modules'));
    put(path.join(root, '.env'), name === 'web' ? 'NEXT_PUBLIC_API_URL=https://api.example.test\n' : 'DATABASE_URL=must-not-reach-build\n');
    put(path.join(root, '.htaccess'), 'PassengerStartupFile scripts/custom.cjs\n# original rules\n');
    put(path.join(root, 'scripts/custom.cjs'), 'existing Passenger entry');
    put(path.join(source, 'scripts/custom.cjs'), 'must not replace Passenger entry');
    put(path.join(source, '.env'), 'must not deploy');
    put(path.join(root, 'storage/student.enc'), 'private data');
    put(path.join(root, 'uploads/user.pdf'), 'user PDF');
    put(path.join(root, 'private/key'), 'private key');
  }
  fs.symlinkSync(c.web.root, path.join(home, 'public_html'));
  put(path.join(c.source, 'apps/web/config/site.ts'), 'import manifest from "../../../package.json";\n');
  put(path.join(c.source, 'apps/web/next.config.ts'), 'export default {experimental:process.env.KS_LOW_RESOURCE_BUILD ? {cpus:1}: {}};');
  put(path.join(c.source, 'apps/web/scripts/prepare-ocr.cjs'), '// fixture');
  put(path.join(c.source, 'apps/api/scripts/copy-assets.cjs'), '// fixture');
  put(path.join(c.source, 'apps/web/app/interactions.css'), '.card:hover { transform: scale(1.02) }');
  put(path.join(c.web.root, '.next/BUILD_ID'), 'old-web');
  put(path.join(c.web.root, '.next/static/old.js'), 'keep old chunk');
  put(path.join(c.web.root, '.next/server/route-cache/APP_PAGE/arbitrary-old-hash/panel.html'), 'old cached panel');
  put(path.join(c.web.root, '.next/server/route-cache/APP_PAGE/arbitrary-old-hash/panel.rsc'), 'old cached RSC');
  put(path.join(c.api.root, 'dist/src/server.js'), 'old-api');
  put(path.join(c.web.root, 'public/uploads/user.pdf'), 'nested user PDF');
  put(path.join(c.web.root, 'public/custom-user-file.pdf'), 'unknown user PDF');
  put(path.join(c.web.root, 'public/araclar/.htaccess'), 'nested rules');
  const calls = [];
  function execute(label, node, args, cwd, env) {
    calls.push({ label, node, args, cwd, env });
    A.equal(node, process.execPath); A.equal(env.KS_LOW_RESOURCE_BUILD, '1');
    A.equal(env.NODE_OPTIONS, '--max-old-space-size=768'); A.equal(env.UV_THREADPOOL_SIZE, '1');
    A.equal(env.DATABASE_URL, undefined); A.equal(env.JWT_SECRET, undefined);
    A(!args.some(a => /^(?:install|generate|migrate|db:generate)$/.test(a)));
    if (label === 'API TypeScript derlemesi') put(path.join(cwd, 'dist/src/server.js'), 'new-api');
    if (label === 'API statik dosyaları') {
      put(path.join(cwd, 'dist/lib/pdf-text.cjs'), 'PDF helper');
      put(path.join(cwd, 'dist/assets/fonts/LiberationSans-Regular.ttf'), 'font');
    }
    if (label === 'Web OCR/PDF dosyaları') {
      for (const file of d.PDF_FILES) put(path.join(cwd, 'public', file), 'new PDF asset');
      put(path.join(cwd, 'public/araclar/pdf-text-recovery.js'), 'generated recovery');
      put(path.join(cwd, 'public/vendor/ocr/worker.min.js'), 'generated OCR');
    }
    if (label === 'Web Next.js derlemesi') {
      put(path.join(cwd, '.next/BUILD_ID'), 'new-web');
      for (const n of ['build-manifest.json', 'routes-manifest.json', 'required-server-files.json']) put(path.join(cwd, '.next', n), '{}');
      put(path.join(cwd, '.next/server/app/page.js'), 'new server');
      put(path.join(cwd, '.next/static/new.js'), 'new chunk');
      put(path.join(cwd, '.next/app-build-manifest.json'), JSON.stringify({ pages: { '/panel/page': ['static/chunks/app/panel/page-new.js'] } }));
      put(path.join(cwd, '.next/static/chunks/app/panel/page-new.js'), 'new panel chunk');
      put(path.join(cwd, '.next/cache/large-cache'), 'do not transfer');
    }
  }
  return { home, c, calls, execute, before: () => ({ web: snapshot(c.web.root), api: snapshot(c.api.root) }) };
}

test('server constants keep the supplied source, live roots and absolute node paths', () => {
  A.equal(d.SERVER.source, '/home/kurums22/github-deploy');
  for (const name of ['api', 'web']) {
    A.equal(d.SERVER[name].root, '/home/kurums22/' + name);
    A.equal(d.SERVER[name].node, `/home/kurums22/nodevenv/${name}/22/bin/node`);
  }
});
for (const failing of ['API TypeScript derlemesi', 'API statik dosyaları', 'Web OCR/PDF dosyaları', 'Web Next.js derlemesi']) {
  test(`${failing} failure leaves both live trees unchanged`, t => {
    const f = fixture(t), before = f.before();
    A.throws(() => d.deploy(f.c, (...args) => { if (args[0] === failing) throw Error('synthetic build failure'); f.execute(...args); }), /synthetic build failure.*\nCanlı dosyalar değiştirilmedi/);
    A.deepEqual(f.before(), before);
    A(!fs.existsSync(path.join(f.c.source, '.quick-deploy.lock')));
  });
}
test('success transfers both apps, PDF/OCR assets and hover code after all build commands', t => {
  const f = fixture(t);
  d.deploy(f.c, (...args) => {
    A.equal(read(path.join(f.c.api.root, 'dist/src/server.js')), 'old-api');
    A.equal(read(path.join(f.c.web.root, '.next/BUILD_ID')), 'old-web');
    f.execute(...args);
  });
  A.equal(f.calls.length, 4);
  A.equal(read(path.join(f.c.api.root, 'dist/src/server.js')), 'new-api');
  A.equal(read(path.join(f.c.web.root, '.next/BUILD_ID')), 'new-web');
  for (const file of d.PDF_FILES) A.equal(read(path.join(f.c.web.root, 'public', file)), 'new PDF asset');
  A.equal(read(path.join(f.c.web.root, 'public/araclar/pdf-text-recovery.js')), 'generated recovery');
  A.equal(read(path.join(f.c.web.root, 'app/interactions.css')), '.card:hover { transform: scale(1.02) }');
  A(!fs.existsSync(path.join(f.c.web.root, '.next/cache')));
  A.equal(read(path.join(f.c.web.root, '.next/static/old.js')), 'keep old chunk');
  const manifest = JSON.parse(read(path.join(f.c.web.root, 'package.json')));
  A.equal(manifest.version, '1.4.3'); A.deepEqual(manifest.scripts, { start: 'node custom.cjs' }); A.deepEqual(manifest.dependencies, { keep: 'unchanged' });
});
test('module links, dependencies, env, htaccess, startup, storage and unknown user files survive two runs', t => {
  const f = fixture(t), saved = {};
  for (const name of ['api', 'web']) {
    saved[name] = {};
    for (const file of ['.env', '.htaccess', 'scripts/custom.cjs', 'storage/student.enc', 'uploads/user.pdf', 'private/key']) saved[name][file] = read(path.join(f.c[name].root, file));
    saved[name].link = fs.readlinkSync(path.join(f.c[name].root, 'node_modules'));
    saved[name].modules = snapshot(fs.realpathSync(path.join(f.c[name].root, 'node_modules')));
  }
  for (let i = 0; i < 2; i++) d.deploy(f.c, f.execute);
  for (const name of ['api', 'web']) {
    for (const [file, text] of Object.entries(saved[name]).filter(([key]) => !['link', 'modules'].includes(key))) A.equal(read(path.join(f.c[name].root, file)), text);
    A.equal(fs.readlinkSync(path.join(f.c[name].root, 'node_modules')), saved[name].link);
    A.deepEqual(snapshot(fs.realpathSync(path.join(f.c[name].root, 'node_modules'))), saved[name].modules);
  }
  A.equal(fs.readlinkSync(path.join(f.home, 'public_html')), f.c.web.root);
  A.equal(read(path.join(f.c.web.root, 'public/uploads/user.pdf')), 'nested user PDF');
  A.equal(read(path.join(f.c.web.root, 'public/custom-user-file.pdf')), 'unknown user PDF');
  A.equal(read(path.join(f.c.web.root, 'public/araclar/.htaccess')), 'nested rules');
});
test('missing build artifact prevents every live write and restart', t => {
  const f = fixture(t), before = f.before();
  A.throws(() => d.deploy(f.c, (...args) => { f.execute(...args); if (args[0] === 'Web Next.js derlemesi') fs.unlinkSync(path.join(args[3], '.next/BUILD_ID')); }), /Derleme dosyası eksik/);
  A.deepEqual(f.before(), before);
});
test('missing PDF asset prevents publication', t => {
  const f = fixture(t), before = f.before();
  A.throws(() => d.deploy(f.c, (...args) => { f.execute(...args); if (args[0] === 'Web Next.js derlemesi') fs.unlinkSync(path.join(args[3], 'public/vendor/pdfjs/pdf.worker.min.mjs')); }), /pdf.worker.min.mjs/);
  A.deepEqual(f.before(), before);
});
for (const dep of ['next', 'typescript', '@types/react', '@types/react-dom']) {
  test(`missing ${dep} fails without installing or changing live code`, t => {
    const f = fixture(t);
    fs.rmSync(path.join(f.c.web.root, 'node_modules', dep), { recursive: true });
    const before = f.before();
    A.throws(() => d.deploy(f.c, f.execute), /bağımlılık eksik/);
    A.deepEqual(f.before(), before); A.equal(f.calls.length, 0);
  });
}
test('missing generated Prisma client fails without generate or DB access', t => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.c.api.root, 'node_modules/.prisma/client/default.js'));
  const before = f.before(); A.throws(() => d.deploy(f.c, f.execute), /Prisma Client eksik/); A.deepEqual(f.before(), before);
});
test('shared source .env public fallback works without passing DB secrets', t => {
  const f = fixture(t);
  put(path.join(f.c.web.root, '.env'), '');
  put(path.join(f.c.source, '.env'), 'NEXT_PUBLIC_API_URL=https://api.example.test\nDATABASE_URL=not-for-build\n');
  d.deploy(f.c, f.execute);
  A.equal(f.calls[0].env.NEXT_PUBLIC_API_URL, 'https://api.example.test');
  A.equal(f.calls[0].env.DATABASE_URL, undefined);
});
test('missing SWC fails without allowing Next to download into live dependencies', t => {
  const f = fixture(t);
  fs.rmSync(path.join(f.c.web.root, `node_modules/@next/swc-linux-${process.arch}-gnu`), { recursive: true });
  const before = f.before(); A.throws(() => d.deploy(f.c, f.execute), /SWC derleyicisi yüklenemedi/); A.deepEqual(f.before(), before);
});
test('destination symlink collision is found before any live write', t => {
  const f = fixture(t);
  put(path.join(f.home, 'private-outside/pdf-tools.html'), 'private outside');
  fs.symlinkSync(path.join(f.home, 'private-outside'), path.join(f.c.web.root, 'public/araclar/link'));
  put(path.join(f.c.source, 'apps/web/public/araclar/link/pdf-tools.html'), 'must not overwrite private');
  const before = f.before(); A.throws(() => d.deploy(f.c, f.execute), /hedefi symlink/); A.deepEqual(f.before(), before);
  A.equal(read(path.join(f.home, 'private-outside/pdf-tools.html')), 'private outside');
});
test('custom storage directory is protected even if source contains a matching file', t => {
  const f = fixture(t);
  put(path.join(f.c.api.root, '.env'), 'STORAGE_DIR=assets/customer-data\n');
  put(path.join(f.c.api.root, 'assets/customer-data/a.txt'), 'private content');
  put(path.join(f.c.source, 'apps/api/assets/customer-data/a.txt'), 'must not overwrite');
  d.deploy(f.c, f.execute);
  A.equal(read(path.join(f.c.api.root, 'assets/customer-data/a.txt')), 'private content');
});
test('Passenger touch markers advance for both apps and custom restart dirs are honored', t => {
  const f = fixture(t);
  put(path.join(f.c.api.root, '.htaccess'), 'PassengerRestartDir "passenger-state"\n');
  d.deploy(f.c, f.execute);
  const file = path.join(f.c.api.root, 'passenger-state/restart.txt'), before = fs.statSync(file).mtimeMs;
  A(fs.existsSync(path.join(f.c.web.root, 'tmp/restart.txt')));
  d.deploy(f.c, f.execute); A(fs.statSync(file).mtimeMs > before);
});
test('restart path collision prevents publication before live code changes', t => {
  const f = fixture(t); put(path.join(f.c.api.root, 'tmp'), 'not a directory');
  const before = f.before(); A.throws(() => d.deploy(f.c, f.execute), /dosya\/dizin çakışması/); A.deepEqual(f.before(), before);
});
test('existing custom Next config is kept and staged with low-worker wrapper', t => {
  const f = fixture(t), config = 'module.exports = { async redirects() { return [{source:"/old",destination:"/new",permanent:false}] } };';
  put(path.join(f.c.web.root, 'next.config.js'), config);
  d.deploy(f.c, (...args) => {
    if (args[0] === 'Web Next.js derlemesi') {
      A.match(read(path.join(args[3], 'next.config.ts')), /cpus: 1/);
      A.equal(read(path.join(args[3], 'quick-original-next.config.js')), config);
    }
    f.execute(...args);
  });
  A.equal(read(path.join(f.c.web.root, 'next.config.js')), config);
  A(!fs.existsSync(path.join(f.c.web.root, 'next.config.ts')));
});
test('transfer/restart errors are reported as potentially partial, never as success', t => {
  const f = fixture(t);
  // Inject a late write failure after preflight by replacing the prepared restart directory.
  const original = fs.utimesSync;
  fs.utimesSync = () => { throw Error('synthetic restart write denied'); };
  try { A.throws(() => d.deploy(f.c, f.execute), /synthetic restart write denied.*\nAktarma\/yeniden başlatma tamamlanamadı/); }
  finally { fs.utimesSync = original; }
});
test('actual child process failure is printed and produces a failed command', () => {
  const script = `const d=require(${JSON.stringify(path.resolve(__dirname, '../scripts/quick-deploy.cjs'))}); d.run('failed-build',process.execPath,['-e','console.error("visible-build-error");process.exit(23)'],process.cwd(),process.env);`;
  const r = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  A.notEqual(r.status, 0); A.match(r.stderr, /visible-build-error/); A.match(r.stderr, /failed-build başarısız \(23\)/);
});
test('the real CLI refuses the local workspace without touching any server path', () => {
  const r = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/quick-deploy.cjs')], { encoding: 'utf8' });
  A.equal(r.status, 1); A.match(r.stderr, /yalnız \/home\/kurums22\/github-deploy/);
});

test('old APP_PAGE cache is quarantined after successful builds, independent of hash', t => {
  const f = fixture(t);
  const cache = path.join(f.c.web.root, '.next/server/route-cache');
  d.deploy(f.c, (...args) => {
    A.equal(read(path.join(cache, 'APP_PAGE/arbitrary-old-hash/panel.html')), 'old cached panel');
    f.execute(...args);
    if (args[0] === 'Web Next.js derlemesi') {
      put(path.join(args[3], '.next/server/app/panel.html'), 'new panel HTML');
      put(path.join(args[3], '.next/server/route-cache/new-build/entry'), 'new build cache');
    }
  });
  A(!fs.existsSync(path.join(cache, 'APP_PAGE')));
  A.equal(read(path.join(cache, 'new-build/entry')), 'new build cache');
  A.equal(read(path.join(f.c.web.root, '.next/server/app/panel.html')), 'new panel HTML');
  const root = path.join(f.c.source, '.quick-deploy-route-cache');
  const saved = path.join(root, fs.readdirSync(root)[0]);
  A.equal(read(path.join(saved, 'route-cache/APP_PAGE/arbitrary-old-hash/panel.rsc')), 'old cached RSC');
  A.equal(JSON.parse(read(path.join(saved, 'restore.json'))).original, cache);
  A.equal(fs.statSync(root).mode & 0o777, 0o700);
});
test('a symlink route cache is refused before artifact transfer', t => {
  const f = fixture(t), cache = path.join(f.c.web.root, '.next/server/route-cache');
  fs.renameSync(cache, path.join(f.home, 'external-cache'));
  fs.symlinkSync(path.join(f.home, 'external-cache'), cache);
  const before = f.before();
  A.throws(() => d.deploy(f.c, f.execute), /hedefi symlink/);
  A.deepEqual(f.before(), before);
});
