import test from "node:test";
import assert from "node:assert/strict";
import { parseWorkbook } from "../apps/web/lib/optical-import";
import { bestAnswerPatternMatch } from "../apps/api/src/optical-exam-matching";
import fernus from "./fixtures/fernus-082701.json";
import okulizyon from "./fixtures/okulizyon-ankara.json";

test("İ, x ve İPTAL cevapları iptal sorusu olarak kaydedilir", () => {
  const result = parseWorkbook([{ name: "Anahtar", rows: [
    ["Ders", "A Soru No", "Doğru Cevap"],
    ["TÜRKÇE", 1, "İ"],
    ["TÜRKÇE", 2, "x"],
    ["TÜRKÇE", 3, "İPTAL"],
    ["TÜRKÇE", 4, "A"],
  ] }]);
  assert.deepEqual(result.questions.map(question => question.answer), ["X", "X", "X", "A"]);
  const fSheets = structuredClone(fernus);
  fSheets[0].rows[2][2] = "İ";
  assert.equal(parseWorkbook(fSheets, "f").questions[0].answer, "X");
  const oSheets = structuredClone(okulizyon);
  const oHeader = oSheets[0].rows.findIndex(row => row.some(cell => String(cell).toLocaleUpperCase("tr-TR") === "CEVAP"));
  const answerColumn = oSheets[0].rows[oHeader].findIndex(cell => String(cell).toLocaleUpperCase("tr-TR") === "CEVAP");
  oSheets[0].rows[oHeader + 1][answerColumn] = "x";
  assert.equal(parseWorkbook(oSheets, "o").questions[0].answer, "X");
});

test("sınav önerisi iptal / tümü doğru sorularını karşılaştırmadan en yakın öğrenci dizisini bulur", () => {
  const questions = [..."ABCDEABCDE", "X", "H"].map(answer => ({ answer }));
  const match = bestAnswerPatternMatch(questions, [
    { answers: [..."ABCDEABCEA", "A", "B"] },
    { answers: [..."ABCDEABCDD", "", ""] },
  ]);
  assert.deepEqual(match, { matchPercent: 90, matched: 9, compared: 10 });
  assert.equal(bestAnswerPatternMatch(questions.slice(0, 9), [{ answers: [..."ABCDEABCD"] }]), null);
});
