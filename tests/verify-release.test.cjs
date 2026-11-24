const { test } = require('node:test');
const A = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http');
const { verifyRelease, panelChunks } = require('../scripts/verify-release.cjs');
const chunk = 'static/chunks/app/panel/page-new123.js';
async function fixture(t, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-verify-test-'));
  fs.mkdirSync(path.dirname(path.join(dir, chunk)), { recursive: true });
  fs.writeFileSync(path.join(dir, chunk), 'console.log("new panel")');
  fs.writeFileSync(path.join(dir, 'app-build-manifest.json'), JSON.stringify({ pages: { '/panel/page': ['static/chunks/main.js', chunk] } }));
  const requests = [], logs = [];
  const server = http.createServer((req, res) => {
    requests.push(req.url);
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/health') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ status: 'ok', version: options.version || '1.4.5' })); }
    if (url.pathname === '/panel') {
      if (options.redirect) { res.writeHead(302, { Location: '/login' }); return res.end(); }
      res.setHeader('Content-Type', options.mime || 'text/html');
      return res.end(`<html><script src="/_next/${options.old ? 'static/chunks/app/panel/page-old444.js' : chunk}" async></script></html>`);
    }
    res.setHeader('Content-Type', 'application/javascript');
    res.end(options.corrupt ? 'old bytes at new path' : fs.readFileSync(path.join(dir, chunk)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { dir, logs, requests, verify: () => verifyRelease({ api: origin, web: origin, buildDir: dir, version: '1.4.5' }, fetch, line => logs.push(line)) };
}
test('live HTTP API, HTML and actual panel bytes must match the local build', async t => {
  const f = await fixture(t);
  A.deepEqual((await f.verify()).panelChunks, [chunk]);
  A.equal(f.requests.length, 3);
  A(f.requests.every(url => url.includes('ks_release_check=')));
  A(f.logs.some(line => line.startsWith('Canlı yayın doğrulandı')));
});
for (const [name, options, error] of [
  ['stale APP_PAGE HTML even with new files on disk', { old: true }, /eski veya farklı/],
  ['wrong API version', { version: '1.4.4' }, /API sürümü/],
  ['wrong content at new chunk URL', { corrupt: true }, /JS içeriği/],
  ['login redirect', { redirect: true }, /Panel doğrulanamadı/],
  ['non HTML response', { mime: 'application/json' }, /HTML değil/],
]) test(name + ' fails live verification', async t => {
  const f = await fixture(t, options);
  await A.rejects(f.verify(), error);
  A(!f.logs.some(line => line.startsWith('Canlı yayın doğrulandı')));
  A(f.logs.some(line => line.includes('beklenen: ' + chunk)));
  if (options.old) A(f.logs.some(line => line.includes('bulunan: static/chunks/app/panel/page-old444.js')));
});
test('missing or ambiguous manifest fails before claiming live success', async t => {
  const f = await fixture(t);
  fs.writeFileSync(path.join(f.dir, 'app-build-manifest.json'), '{}');
  A.throws(() => panelChunks(f.dir), /manifestinde bulunamadı/);
});
