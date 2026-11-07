import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function roster() {
  const html = fs.readFileSync(new URL("../apps/web/public/rebuilder.html", import.meta.url), "utf8");
  const script = html.slice(html.indexOf('"use strict";'), html.indexOf('      $("#fileInput").addEventListener'));
  const nodes = new Map<string, any>();
  const node = (key: string) => {
    if (!nodes.has(key)) nodes.set(key, { value: "", checked: false, disabled: false, innerHTML: "", textContent: "", classList: { add() {}, remove() {}, toggle() {} } });
    return nodes.get(key);
  };
  node("#examName").value = "Test Denemesi"; node("#distributionMethod").value = "sequential"; node("#examDate").value = "2026-11-07";
  const context = vm.createContext({ document: { querySelector: node, querySelectorAll: () => [] }, window: {}, setTimeout: () => 0, clearTimeout() {}, console });
  vm.runInContext(script + `
    renderTable = () => {}; renderStudentSelects = () => {}; renderRooms = () => {}; renderDistributionSummary = () => {};
    globalThis.api = {
      seed: (people, classes) => { students = people; rooms = classes; numericCreated = false; nextId = 100; },
      state: () => ({ students, rooms, numericCreated }),
      distribute: distributeStudents, numeric: cloneNumericSession, output: buildExportData,
      duplicates: findDuplicateStudents, controls: updateControls,
      mapping: (headers) => { sourceHeaders = headers; renderMappingFields(); }
    };`, context);
  return { api: context.api, node, html };
}
const student = (id: number, campus = "", no = String(id)) => ({ id, firstName: `Öğrenci ${id}`, lastName: "Test", studentNo: no, tcNo: "", grade: id === 2 ? "7/A" : "8/A", campus, session: "Sabah", examSession: "SÖZEL OTURUM", date: "2026-11-07", room: "", roomId: null, fixedRoomId: null, seat: null, order: "", sameIds: [], avoidIds: [], selected: false });

test("kampüssüz tek okul: dağıtım, sayısal oturum ve çıktı öğrenci kaybetmez", () => {
  const { api } = roster();
  api.seed([student(1), student(2), student(3)], [{ id: 20, campus: "", name: "101", capacity: 3, floor: 1 }]);
  api.distribute();
  assert.equal(api.state().students.filter((s: any) => s.roomId === 20).length, 3);
  api.numeric(); api.numeric();
  const state = api.state(); assert.equal(state.students.length, 6); assert.equal(state.numericCreated, true);
  const originals = state.students.filter((s: any) => s.examSession === "SÖZEL OTURUM");
  state.students.filter((s: any) => s.sourceStudentId).forEach((s: any) => { const original = originals.find((o: any) => o.id === s.sourceStudentId); assert.equal(s.roomId, original.roomId); assert.equal(s.seat, original.seat); });
  assert.equal(api.output().rows.filter((row: any[]) => row[0] === "SIRA NUMARASI" && typeof row[1] === "number").length, 6);
});
test("kapasite yetmiyorsa sayısal çoğaltma engellenir", () => {
  const { api } = roster(); api.seed([student(1), student(2)], [{ id: 20, campus: "", name: "101", capacity: 1, floor: 1 }]);
  api.distribute(); api.numeric(); assert.equal(api.state().numericCreated, false);
  assert.equal(api.state().students.length, 2);
});
test("aynı okul numarası farklı okullarda kullanılabilir; TC ve okul numarası karıştırılmaz", () => {
  const { api } = roster();
  const first = { ...student(1, "Okul A", "11"), tcNo: "22" };
  assert.equal(api.duplicates([first, student(2, "Okul B", "11"), student(3, "Okul A", "22")]).length, 0);
  assert.equal(api.duplicates([first, student(2, "Okul A", "11")]).length, 1);
});
test("seansı olmayan öğrenci varsa Excel düğmesi açık kalmaz", () => {
  const { api, node } = roster(); api.seed([{ ...student(1), session: "" }], []); api.controls();
  assert.equal(node("#exportXlsxBtn").disabled, true);
  assert.match(node("#exportStatus").textContent, /seans/);
});
test("sayısal ekleme iframe içindeki engellenen native onaya bağlı değildir", () => {
  const { html } = roster();
  const numeric = html.slice(html.indexOf("function cloneNumericSession"), html.indexOf("function addRoom"));
  assert.doesNotMatch(numeric, /confirm\(/);
  assert.match(html, /id="cloneNumericExportBtn"/);
});
test("liste, PDF aracı ve statik önizleme betikleri sözdizimi açısından geçerlidir", () => {
  for (const path of ["../apps/web/public/rebuilder.html", "../rebuilder.html", "../apps/web/public/araclar/pdf-tools.html", "../index.html"]) {
    const html = fs.readFileSync(new URL(path, import.meta.url), "utf8");
    for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
      if (match[1].trim()) assert.doesNotThrow(() => new vm.Script(match[1]), path);
    }
  }
});
