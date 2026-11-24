'use strict';
// Read-only, explicitly invoked after the operator starts API and Web.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { parseArgs } = require('node:util');
const digest = value => createHash('sha256').update(value).digest('hex');
function panelChunks(buildDir) {
  const file = path.join(buildDir, 'app-build-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const files = manifest.pages?.['/panel/page'] || manifest.pages?.['/panel'];
  const chunks = [...new Set((Array.isArray(files) ? files : []).filter(f => /^static\/chunks\/app\/panel\/page-[^/]+\.js$/.test(f)))];
  if (!chunks.length) throw Error(`Panel JS dosyası yeni derleme manifestinde bulunamadı: ${file}`);
  for (const name of chunks) if (!fs.statSync(path.join(buildDir, name)).isFile()) throw Error(`Beklenen panel JS dosyası eksik: ${name}`);
  return chunks.sort();
}
function htmlPanelChunks(html, base) {
  const found = [];
  for (const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const url = new URL(match[1].replace(/&amp;/g, '&'), base);
    const file = decodeURIComponent(url.pathname).replace(/^\/_next\//, '');
    if (/^static\/chunks\/app\/panel\/page-[^/]+\.js$/.test(file)) found.push({ file, url: url.href });
  }
  return found;
}
async function verifyRelease({ api, web, buildDir, version }, request = fetch, log = console.log) {
  const expected = panelChunks(buildDir), errors = [];
  const get = async (url, type) => {
    const target = new URL(url); target.searchParams.set('ks_release_check', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const response = await request(target, { headers: { 'Cache-Control': 'no-cache, no-store', Accept: type }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error(`${target.pathname}: HTTP ${response.status}`);
    return response;
  };
  try {
    const response = await get(new URL('/api/health', api), 'application/json');
    const health = await response.json();
    log(`API sürümü — beklenen: ${version}; bulunan: ${health.version ?? '(yok)'}`);
    if (health.status !== 'ok' || health.version !== version) errors.push('Canlı API sürümü/sağlık yanıtı eşleşmiyor.');
  } catch (e) { errors.push(`API doğrulanamadı: ${e.message}`); }
  log(`Panel JS — beklenen: ${expected.join(', ')}`);
  try {
    const response = await get(new URL('/panel', web), 'text/html');
    if (!/text\/html/i.test(response.headers.get('content-type') || '')) throw Error('Panel yanıtı HTML değil.');
    const found = htmlPanelChunks(await response.text(), web), names = [...new Set(found.map(f => f.file))].sort();
    log(`Panel JS — bulunan: ${names.join(', ') || '(yok)'}`);
    if (JSON.stringify(expected) !== JSON.stringify(names)) errors.push('Canlı /panel HTML eski veya farklı panel JS dosyası yüklüyor.');
    else for (const chunk of expected) {
      const script = found.find(f => f.file === chunk);
      if (new URL(script.url).origin !== new URL(web).origin) throw Error(`Panel JS farklı kaynaktan yükleniyor: ${script.url}`);
      const asset = await get(script.url, 'application/javascript');
      if (!/(?:javascript|ecmascript)/i.test(asset.headers.get('content-type') || '')) throw Error(`Panel JS MIME türü yanlış: ${chunk}`);
      if (digest(Buffer.from(await asset.arrayBuffer())) !== digest(fs.readFileSync(path.join(buildDir, chunk)))) errors.push(`Canlı panel JS içeriği yeni derlemeyle eşleşmiyor: ${chunk}`);
    }
  } catch (e) { log('Panel JS — bulunan: (doğrulanamadı)'); errors.push(`Panel doğrulanamadı: ${e.message}`); }
  if (errors.length) throw Error(errors.join('\n'));
  log(`Canlı yayın doğrulandı: API ${version}, /panel HTML ve panel JS içeriği yeni derlemeyle eşleşiyor.`);
  return { version, panelChunks: expected };
}
module.exports = { panelChunks, htmlPanelChunks, verifyRelease };
if (require.main === module) {
  (async () => {
    const { values } = parseArgs({ options: { api: { type: 'string', default: 'https://api.kurumsalsinav.com' }, web: { type: 'string', default: 'https://kurumsalsinav.com' }, 'build-dir': { type: 'string', default: '/home/kurums22/web/.next' }, version: { type: 'string', default: require('../package.json').version } } });
    await verifyRelease({ api: values.api, web: values.web, buildDir: path.resolve(values['build-dir']), version: values.version });
  })().catch(e => { console.error(`YAYIN DOĞRULANAMADI: ${e.message}`); process.exitCode = 1; });
}
