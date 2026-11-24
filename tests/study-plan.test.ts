import test from 'node:test';
import assert from 'node:assert/strict';
import { activities, emptyPlan, eventProblem, exportRange, LEVELS, readPlan, saveEvent, timeSlots, type PlanEvent } from '../apps/web/lib/study-plan';
import { workbookRows } from '../apps/web/lib/study-plan-export';
const card: PlanEvent = { id: 'a', name: 'Türk Dili ve Edebiyatı – Çığ, öğüt ve şüphe', color: '#2563eb', icon: 'book', day: 0, start: 480, duration: 60 };
test('age-specific subjects and all seven life activities exist at each level', () => {
  for (const level of LEVELS) for (const name of ['Uyku', 'Serbest Zaman', 'Mola', 'Spor', 'Film İzleme', 'Müzik Çalma', 'Hobi']) assert(activities(level).some(a => a.name === name));
  assert(activities('Lise').some(a => a.name === 'Fizik'));
  assert(!activities('İlkokul').some(a => a.name === 'Fizik'));
  for (const level of LEVELS) assert(activities(level).every(a => !eventProblem({ ...a, day: 0, start: 0, duration: 30 }, [])));
});
test('move/resize conflict rejects without deleting or mutating existing events', () => {
  const p = saveEvent(emptyPlan(), card);
  const second = { ...card, id: 'b', start: 540, duration: 30 };
  const next = saveEvent(p, second);
  assert.throws(() => saveEvent(next, { ...second, start: 510 }), /başka bir etkinlik/);
  assert.throws(() => saveEvent(next, { ...card, duration: 90 }), /başka bir etkinlik/);
  assert.deepEqual(next.events, [card, second]);
  const moved = saveEvent(next, { ...card, day: 1 });
  assert.equal(moved.events.length, 2);
  assert.equal(moved.events.find(e => e.id === 'a')?.day, 1);
  assert.equal(eventProblem({ ...card, start: 1410, duration: 60 }, []), 'Etkinlik aynı gün içinde, 30 dakikalık dilimlerde olmalı.');
});
test('reload preserves name, settings, custom cards and all events; invalid storage is rejected', () => {
  const p = { ...saveEvent(emptyPlan(), card), name: 'Öğrencinin Çalışma Planı', level: 'Lise' as const, custom: [{ id: 'custom', name: 'Gitar Çalışması', color: '#7c3aed', icon: 'music' }] };
  assert.deepEqual(readPlan(JSON.stringify(p)), p);
  for (const invalid of ['broken', JSON.stringify({ ...p, schema: 2 }), JSON.stringify({ ...p, start: 1440 }), JSON.stringify({ ...p, events: [card, card] }), JSON.stringify({ ...p, events: [card, { ...card, id: 'overlap' }] })]) assert.throws(() => readPlan(invalid));
});
test('a fully occupied week exports editable cell values and exact numeric times including midnight', () => {
  let p = emptyPlan();
  for (let day = 0; day < 7; day++) for (const start of timeSlots()) p = saveEvent(p, { ...card, id: `${day}-${start}`, day, start, duration: 30 });
  assert.equal(readPlan(JSON.stringify(p)).events.length, 336);
  assert.deepEqual(exportRange(p), { start: 0, end: 1440 });
  const rows = workbookRows(p);
  assert.equal(rows.week.length, 50);
  assert.equal(rows.week[2][1], card.name);
  assert.equal(rows.week[49][7], card.name);
  assert.equal(rows.detail.length, 337);
  assert.equal(rows.detail[336][3], 1);
  assert.equal(rows.detail[1][2], 0);
  assert.equal(rows.detail[1][4], 30);
});
