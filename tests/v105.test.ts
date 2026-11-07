import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { parseScheduleDate, parseScheduleRows, scheduleHeaders, publisherSuggestions } from "../apps/web/lib/schedule";
import { whatsappPhone, whatsappLink } from "../apps/web/lib/whatsapp";
import { canPlace, emptyBoard, newPiece, rotateBlock, settleBlock } from "../apps/web/lib/blocks";
import { scanPixels } from "../apps/web/lib/scanner";
test("Türkçe tarih biçimleri ve Excel 1900/1904 tarihleri kaymasız dönüştürülür", () => {
  for (const value of ["17.02.2027", "17/02/2027", "2027-02-17", "2027/02/17", "17-02-2027", new Date("2027-02-17T00:00:00Z")]) assert.equal(parseScheduleDate(value), "2027-02-17");
  const serial = (Date.UTC(2027,1,17) - Date.UTC(1899,11,30)) / 86400000;
  assert.equal(parseScheduleDate(serial), "2027-02-17"); assert.equal(parseScheduleDate(serial - 1462, true), "2027-02-17");
  assert.equal(parseScheduleDate("03.04.2027"), "2027-04-03");
  for (const value of ["2027-02-30", "29.02.2027", "2/3/27", "02/17/2027", "2027-13-01", 60, NaN]) assert.throws(() => parseScheduleDate(value));
});
test("2.500 satırlık gerçek XLSX dosyası tüm tarih hücreleriyle okunur", () => {
  const require = createRequire(import.meta.url), x = require("../apps/web/public/vendor/xlsx.full.min.js");
  const serial = (Date.UTC(2027,1,17) - Date.UTC(1899,11,30)) / 86400000;
  const formats = ["17.02.2027", "17/02/2027", "2027-02-17", "2027/02/17", serial, "17-02-2027"];
  const rows = [scheduleHeaders, ...Array.from({ length: 2500 }, (_, i) => ["Mevcut Yayın", String(Math.floor(i / 999) + 1), i % 999 + 1, formats[i % formats.length], "Kapsam", ""])];
  const book = x.utils.book_new(), sheet = x.utils.aoa_to_sheet(rows); for (let i=0;i<2500;i++) if (typeof rows[i+1][3] === "number") sheet[`D${i+2}`].z = "dd.mm.yyyy";
  x.utils.book_append_sheet(book, sheet, "Takvim");
  const start = performance.now(), bytes = x.write(book, { type: "buffer", bookType: "xlsx" }); const read = x.read(bytes, { type: "buffer", sheetRows: 2502, cellDates: false });
  const result = parseScheduleRows(x.utils.sheet_to_json(read.Sheets.Takvim, { header: 1, raw: true }), [{ id: "existing", name: "Mevcut Yayın" }]);
  assert.equal(result.length, 2500); assert.ok(result.every((r) => r.examDate === "2027-02-17"));
  console.log(`XLSX benchmark: ${bytes.length} bytes, ${Math.round(performance.now()-start)} ms (serialize + read + validate)`);
  assert.throws(() => parseScheduleRows([...rows, ["Mevcut Yayın", "4", 1, "17.02.2027", "Kapsam", ""]], [{ id:"existing", name:"Mevcut Yayın" }]), /2500/);
});
test("yayınevi önerileri yalnızca verilen mevcut yayınevlerini içerir, seri otomatik atanmaz", () => {
  const existing = [{ id: "p", name: "PARAF" }, { id: "o", name: "OKYANUS" }, { id: "n", name: "345 YAYIN" }];
  assert.deepEqual(publisherSuggestions("Paraf Mor", existing), [existing[0]]); assert.deepEqual(publisherSuggestions("Okyanus Classmate", existing), [existing[1]]);
  assert.deepEqual(publisherSuggestions("345 Yayınları", existing), [existing[2]]); assert.deepEqual(publisherSuggestions("Bilinmeyen", existing), []);
  assert.deepEqual(publisherSuggestions("Paraf Mor", []), []);
});
test("WhatsApp telefon normalizasyonu ve mesaj kodlaması", () => {
  for (const value of ["0532 123 45 67", "5321234567", "+90 (532) 123-45-67", "00905321234567"]) assert.equal(whatsappPhone(value), "905321234567");
  assert.equal(whatsappPhone(""), ""); assert.throws(() => whatsappPhone("abc123")); assert.throws(() => whatsappPhone("123"));
  assert.equal(whatsappLink("", "Merhaba\n&?"), "https://wa.me/?text=Merhaba%0A%26%3F");
});
test("blok oyunu döndürme, çarpışma ve satır temizleme", () => {
  const board = emptyBoard(); assert.equal(canPlace(board, newPiece(0)), true);
  assert.deepEqual(rotateBlock([[1,0],[1,1]]), [[1,1],[1,0]]);
  assert.equal(canPlace(board, { ...newPiece(0), x: -1 }), false);
  board[19].fill(1); board[19][4] = 0; board[19][5] = 0;
  const result = settleBlock(board, { shape: [[1,1]], x:4, y:19, color:2 }); assert.equal(result.cleared, 1); assert.equal(result.board.length, 20); assert.ok(result.board[0].every((v) => v === 0));
  board[0][4] = 1; assert.equal(canPlace(board, newPiece(1)), false);
});
test("tarama renkli ve gri modları gerçek piksel çıktısını değiştirir", () => {
  assert.deepEqual([...scanPixels(new Uint8ClampedArray([255,0,0,255]), "color",165,0)], [255,0,0,255]);
  const gray = scanPixels(new Uint8ClampedArray([255,0,0,255]), "gray",165,0); assert.equal(gray[0],gray[1]); assert.equal(gray[1],gray[2]); assert.ok(gray[0]>0 && gray[0]<255);
});
