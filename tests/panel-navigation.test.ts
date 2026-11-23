import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalSection, canOpenSection} from '../apps/web/lib/panel-navigation';
import {flowFor} from '../apps/web/app/panel/help-flows';

test('eski Rapor Al adresi tek Sınav Sonuçları adresine çözümlenir', () => {
  assert.equal(canonicalSection('school-analysis'), 'results');
  assert.equal(canonicalSection(canonicalSection('school-analysis')), 'results');
});
test('birleşik giriş eski iki akışın rol kapsamını korur', () => {
  for (const role of ['SUPER_ADMIN', 'DEALER', 'SCHOOL_ADMIN']) {
    assert.equal(canOpenSection('results', role), true);
    assert.equal(canOpenSection('school-analysis', role), true);
  }
  for (const role of ['STUDENT', 'PARENT', '']) {
    assert.equal(canOpenSection('results', role), false);
    assert.equal(canOpenSection('school-analysis', role), false);
  }
  for (const section of ['exam', 'data-delete', 'fmt-upload', 'result-editor']) {
    assert.equal(canOpenSection(section, 'SCHOOL_ADMIN'), false);
  }
});
test('okul yöneticisinin rehberi analiz kapsamını, bayi rehberi rapor seçeneklerini korur', () => {
  assert.deepEqual(flowFor('results', 'Sınav Sonuçları', 'SCHOOL_ADMIN'), flowFor('school-analysis', 'Rapor Al', 'SCHOOL_ADMIN'));
  const dealer = flowFor('results', 'Sınav Sonuçları', 'DEALER');
  assert(dealer.some(step => step.title === 'PDF, Excel ve ZIP'));
});
