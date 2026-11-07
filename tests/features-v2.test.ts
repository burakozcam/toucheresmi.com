import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import { parseEvaluation, scaledScore, questionCohort, buildCohortContext } from "../apps/web/lib/evaluation";
import { parseScheduleRows, scheduleHeaders } from "../apps/web/lib/schedule";
import { EXAM_PRESETS } from "../apps/web/config/exam-presets";
import { scanPixels } from "../apps/web/lib/scanner";
const key = [["Ders", "Soru", "Doğru Cevap", "Katsayı", "Kazanım Kodu", "Kazanım Adı"], ["Türkçe", 1, "A", 4, "T.1", "Ana fikir"], ["Türkçe", 2, "B", 4, "T.1", "Ana fikir"], ["Fen", 1, "X", 1, "", ""]];
const rows = [["Öğrenci No", "Ad Soyad", "Okul", "Şube", "Türkçe Cevapları", "Fen Cevapları"], ["001", "Öğrenci Bir", "Okul A", "8/A", "A-", "-"], ["002", "Öğrenci İki", "Okul A", "8/B", "AB", "A"], ["003", "Diğer Okul", "Okul B", "8/A", "--", "-"]];
test("v2 tek hücreli cevapları soru sırasını ve kazanımı koruyarak okur", () => {
  const d = parseEvaluation(key, rows); assert.deepEqual(d.students[0].answers, ["A", "", ""]); assert.equal(d.questions[0].outcomeCode, "T.1"); assert.equal(d.questions[0].outcomeName, "Ana fikir");
});
test("kısa cevap zinciri soru kaymasına yol açmadan reddedilir", () => {
  const invalid = structuredClone(rows); invalid[1][4] = "A"; assert.throws(() => parseEvaluation(key, invalid), /tam 2 cevap/);
});
test("100 ve 500 ölçekleri iptal soruları dışarıda tutar", () => {
  const d = parseEvaluation(key, rows); assert.equal(scaledScore(d.questions, d.students[0], 0, {}, 100), 50); assert.equal(scaledScore(d.questions, d.students[0], 0, {}, 500), 250); assert.equal(scaledScore(d.questions, d.students[1], 0, {}, 500), 500);
});
test("kurum karşılaştırması farklı okulları karıştırmaz ve önhesapla aynı sonucu verir", () => {
  const d = parseEvaluation(key, rows); const direct = questionCohort(d, d.students[0]); const cached = questionCohort(d, d.students[0], buildCohortContext(d, 3, {}, 500));
  assert.deepEqual(direct, cached); assert.equal(direct[0].rate, 100); assert.equal(direct[1].rate, 100); assert.equal(direct[1].difference, -100); assert.equal(direct[2].rate, null); assert.equal(direct[0].count, 1);
  assert.equal(questionCohort(d, d.students[2])[0].rate, null);
});
test("kazanım kodu ve adı birlikte olmalıdır", () => { const invalid = structuredClone(key); invalid[1][5] = ""; assert.throws(() => parseEvaluation(invalid, rows), /kazanım kodu ve adı/); });
test("resmî test soru sayıları ve yüzde ağırlıkları şablonlara yansır", () => {
  const total = (id: string) => EXAM_PRESETS[id].lessons.reduce((n, l) => n + l.count, 0);
  assert.equal(total("lgs"), 90); assert.equal(total("tyt"), 120); assert.equal(total("ayt-say"), 80); assert.equal(total("ayt-ea"), 80); assert.equal(total("ayt-soz"), 80); assert.equal(total("ayt-all"), 160); assert.equal(total("yks-say"), 200);
  assert.equal(EXAM_PRESETS.tyt.lessons.reduce((n, l) => n + l.count * l.weight, 0), 100);
  assert.equal(EXAM_PRESETS["ayt-say"].lessons.reduce((n, l) => n + l.count * l.weight, 0), 60);
});
test("takvim aynı gün birden çok yayın kabul eder, yinelenen sınavı reddeder", () => {
  const publishers = [{ id: "p1", name: "GPT Yayınları" }, { id: "p2", name: "K Yayınları" }];
  const data = [scheduleHeaders, ["GPT Yayınları", "8", "1", "2027-03-15", "Ünite 1–3", ""], ["K Yayınları", "TYT", "2", "2027-03-15", "Tüm konular", ""]];
  assert.equal(parseScheduleRows(data, publishers).length, 2); assert.throws(() => parseScheduleRows([...data, data[1]], publishers), /yineleniyor/);
  const invalid = structuredClone(data); invalid[1][3] = "2027-02-30"; assert.throws(() => parseScheduleRows(invalid, publishers), /tarihi/);
});
test("belge taramada şeffaflık beyaz zemine, tonlar gerçek siyah beyaza çevrilir", () => {
  const pixels = new Uint8ClampedArray([0, 0, 0, 255, 230, 230, 230, 255, 0, 0, 0, 0]);
  const processed = scanPixels(pixels, "bw", 165, 35); assert.deepEqual([...processed], [0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
});
test("50 ayrı sözün kişi, kaynak ve çeviri bilgileri bulunur", () => {
  const q = JSON.parse(fs.readFileSync(new URL("../apps/web/data/motivational-quotes.json", import.meta.url), "utf8")); assert.equal(q.length, 50); assert.equal(new Set(q.map((x: any) => x.text)).size, 50); assert.ok(q.every((x: any) => x.author && x.note && /^https:\/\//.test(x.source)));
});
test("Excel takvim şablonunda gerçek hücre seçim kuralları bulunur", async () => {
  const require = createRequire(import.meta.url); const XLSX = require("../apps/web/public/vendor/xlsx.full.min.js"); const JSZip = require("../apps/web/public/vendor/jszip.min.js");
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([scheduleHeaders]), "Takvim"); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["Yayınevi"], ["GPT Yayınları"]]), "Yayınevleri");
  let output: Blob | undefined; const oldWindow = (globalThis as any).window, oldDocument = (globalThis as any).document, create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  (globalThis as any).window = { XLSX, JSZip }; (globalThis as any).document = { createElement: () => ({ click() {} }) }; URL.createObjectURL = ((blob: Blob) => { output = blob; return "blob:test"; }) as any; URL.revokeObjectURL = () => {};
  try {
    const { downloadScheduleTemplate } = await import("../apps/web/lib/excel-download"); await downloadScheduleTemplate(book, 1); assert.ok(output); const zip = await JSZip.loadAsync(await output!.arrayBuffer()); const xml = await zip.file("xl/worksheets/sheet1.xml").async("string"); const workbook = await zip.file("xl/workbook.xml").async("string"); assert.match(xml, /dataValidations count="3"/); assert.match(xml, /TYT,AYT/); assert.match(workbook, /definedName name="YAYINEVLERI"/);
  } finally { (globalThis as any).window = oldWindow; (globalThis as any).document = oldDocument; URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
});
