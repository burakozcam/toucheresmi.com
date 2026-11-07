import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { evaluate, parseEvaluation } from "../apps/web/lib/evaluation";

const key: unknown[][] = [["Ders", "Soru", "Doğru Cevap", "Katsayı"], ["Türkçe", 1, "A", 4], ["Türkçe", 2, "B", 4], ["Türkçe", 3, "C", 4], ["Türkçe", 4, "X", 4], ["Fen", 1, "D", 1]];
const headers = ["Öğrenci No", "Ad Soyad", "Okul", "Şube", "Türkçe | 1", "Türkçe | 2", "Türkçe | 3", "Türkçe | 4", "Fen | 1"];
const rows = [headers, ["001", "Örnek Öğrenci", "Test Okulu", "8/A", "A", "A", "", "B", "D"]];
test("doğru, yanlış, boş, iptal ve ders katsayıları ayrı hesaplanır", () => {
  const data = parseEvaluation(key, rows);
  const [turkish, science] = evaluate(data.questions, data.students[0], 3);
  assert.deepEqual([turkish.correct, turkish.wrong, turkish.blank, turkish.cancelled], [1, 1, 1, 1]);
  assert.ok(Math.abs(turkish.net - 2 / 3) < 1e-9);
  assert.ok(Math.abs(turkish.weighted - 8 / 3) < 1e-9);
  assert.equal(science.net, 1);
  assert.equal(data.students[0].id, "001");
});
test("yanlış götürmeyen sınav ve manuel katsayı", () => {
  const data = parseEvaluation(key, rows);
  const result = evaluate(data.questions, data.students[0], 0, { Türkçe: 2 })[0];
  assert.equal(result.net, 1); assert.equal(result.weighted, 2);
});
test("eksik anahtarda sonuç üretilmez", () => {
  const invalid = structuredClone(key); invalid[1][2] = "";
  assert.throws(() => parseEvaluation(invalid, rows), /satır 2/);
});
test("yinelenen soru ve atlanan numara reddedilir", () => {
  assert.throws(() => parseEvaluation([...key, key[1]], rows), /birden fazla/);
  const invalid = structuredClone(key); invalid[4][1] = 5;
  assert.throws(() => parseEvaluation(invalid, rows), /kesintisiz/);
});
test("öğrenciler okul ve şube bazında ayırt edilir", () => {
  assert.throws(() => parseEvaluation(key, [...rows, rows[1]]), /yinelenmiş/);
  const next = [...rows[1]]; next[3] = "8/B";
  assert.equal(parseEvaluation(key, [...rows, next]).students.length, 2);
});
test("cevap anahtarı ve öğrenci sütunları tam eşleşmelidir", () => {
  assert.throws(() => parseEvaluation(key, [headers.slice(0, -1), rows[1]]), /eksik/);
  assert.throws(() => parseEvaluation(key, [[...headers, "Kimya | 1"], rows[1]]), /bulunmayan/);
});
test("geçersiz öğrenci cevabı ve katsayı reddedilir", () => {
  const student = [...rows[1]]; student[4] = "AB";
  assert.throws(() => parseEvaluation(key, [headers, student]), /cevabı/);
  const invalid = structuredClone(key); invalid[1][3] = -1;
  assert.throws(() => parseEvaluation(invalid, rows), /katsayı/);
});
test("gerçek XLSX dışa aktarma ve geri okuma Türkçe / sıfırlı numaraları korur", () => {
  const require = createRequire(import.meta.url);
  const XLSX = require("../apps/web/public/vendor/xlsx.full.min.js");
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(key), "Cevap Anahtarı");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "Öğrenci Cevapları");
  const back = XLSX.read(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
  const parsed = parseEvaluation(XLSX.utils.sheet_to_json(back.Sheets["Cevap Anahtarı"], { header: 1, defval: "", raw: false }), XLSX.utils.sheet_to_json(back.Sheets["Öğrenci Cevapları"], { header: 1, defval: "", raw: false }));
  assert.equal(parsed.students[0].id, "001"); assert.equal(parsed.questions[0].lesson, "Türkçe");
});
