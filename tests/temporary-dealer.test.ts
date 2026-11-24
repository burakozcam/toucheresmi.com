import test from 'node:test';
import assert from 'node:assert/strict';
import { temporaryPathAllowed } from '../apps/api/src/temporary-core';
import { canOpenSection } from '../apps/web/lib/panel-navigation';
import { temporaryAccessMessage, whatsappLink } from '../apps/web/lib/whatsapp';

test('temporary dealer scope is explicit; legacy grants and administrator APIs stay closed', () => {
  for (const path of ['/api/optical/evaluate','/api/optical/result-catalog','/api/optical/result-exams/key/export','/api/schools']) {
    assert.equal(temporaryPathAllowed('GET',path,['FMT_DEMO','PDF_TOOLS']),false);
    assert.equal(temporaryPathAllowed('GET',path,['DEALER_EXAMS']),true);
  }
  for (const path of ['/api/admin/users','/api/admin/temporary-access','/api/account/password','/api/security/impersonation/end']) {
    for (const method of ['GET','POST','PATCH','DELETE']) assert.equal(temporaryPathAllowed(method,path,['DEALER_EXAMS']),false);
  }
  for (const section of ['exam','results','fmt-upload','txt-converter','reevaluate']) assert.equal(canOpenSection(section,'TEMPORARY',false,['DEALER_EXAMS']),true);
  for (const section of ['temporary-members','system-users','dealers','exam-records','account']) assert.equal(canOpenSection(section,'TEMPORARY',false,['DEALER_EXAMS']),false);
  assert.equal(canOpenSection('results','TEMPORARY',false,['FMT_DEMO','PDF_TOOLS']),false);
});

test('WhatsApp message is encoded exactly once and retains Turkish letters, newline and one-use fragment', () => {
  const access={code:'TESTKODU2345',link:'https://example.test/gecici-giris#key=test_key',expiresAt:'2026-11-24T10:00:00Z'};
  const message=temporaryAccessMessage(access),glyphs='ş Ş ı İ ğ Ğ ç Ç ö Ö ü Ü';
  const url=new URL(whatsappLink('',message+'\n'+glyphs));
  assert.equal(url.searchParams.get('text'),message+'\n'+glyphs);
  assert.match(message,/Geçici Erişim\nErişim kodu:/);
  assert.ok(message.includes(access.link));
  assert.doesNotMatch(url.search,/%25(?:C[34]|[89AB][0-9A-F])/i);
});
