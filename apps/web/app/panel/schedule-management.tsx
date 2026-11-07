"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { parseScheduleRows, SCHEDULE_LEVELS, scheduleHeaders, scheduleTitle } from "../../lib/schedule";
import type { ScheduleEntry, ScheduleInput } from "../../lib/schedule";
import { downloadScheduleTemplate } from "../../lib/excel-download";
import { answerKeyPath } from "../../lib/answer-key";

type Publisher = { id: string; name: string; active: boolean };
type Key = { id: string; publisherId: string; grade: number; examName: string; published: boolean };
const empty = (): ScheduleInput => ({ publisherId: "", level: "8", sequence: 1, examDate: "", scope: "", answerKeyId: null, published: true });
export default function ScheduleManagement({ token }: { token: string }) {
  const [items, setItems] = useState<ScheduleEntry[]>([]), [publishers, setPublishers] = useState<Publisher[]>([]), [keys, setKeys] = useState<Key[]>([]);
  const [pending, setPending] = useState<ScheduleInput[]>([]), [selected, setSelected] = useState<string[]>([]);
  const [edit, setEdit] = useState<ScheduleInput>(empty()), [editId, setEditId] = useState("");
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [ready, setReady] = useState(0);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  async function load() {
    try {
      const results = await Promise.all(["/api/admin/exam-schedule", "/api/admin/publishers", "/api/admin/answer-keys"].map(async (path) => { const r = await fetch(`${API_URL}${path}`, { headers }); const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Veriler alınamadı."); return d; }));
      setItems(results[0]); setPublishers(results[1]); setKeys(results[2]);
    } catch (e) { setError(e instanceof Error ? e.message : "Takvim yüklenemedi."); }
  }
  useEffect(() => { void load(); }, [token]);
  async function template() {
    setError("");
    try {
      const x = window.XLSX!; if (!x || !window.JSZip) throw new Error("Excel araçları yüklenmedi.");
      if (!publishers.some((p) => p.active)) throw new Error("Önce etkin bir yayınevi ekleyin.");
      const book = x.utils.book_new();
      const append = (name: string, rows: unknown[][], widths: number[]) => { const sheet = x.utils.aoa_to_sheet(rows); sheet["!cols"] = widths.map((wch) => ({ wch })); x.utils.book_append_sheet(book, sheet, name); };
      append("Takvim", [scheduleHeaders], [32, 14, 16, 24, 90, 38]);
      for (let row = 2; row <= 501; row++) book.Sheets.Takvim[`D${row}`] = { t: "s", v: "", z: "@" };
      book.Sheets.Takvim["!ref"] = "A1:F501";
      append("Yayınevleri", [["Yayınevi"], ...publishers.filter((p) => p.active).map((p) => [p.name])], [45]);
      append("Kılavuz", [["SINAV TAKVİMİ", "Her satır bir denemedir. Takvim sayfasındaki başlıkları değiştirmeyin."], ["Yayınevi", "Listeden seçin. Yayınevi listede yoksa önce panelden ekleyip yeni şablon indirin."], ["Sınıf", "Açılır listeden 1–12, TYT veya AYT seçin."], ["Deneme No", "Kaçıncı deneme olduğunu 1–999 arasında tam sayı ile yazın."], ["Uygulama Tarihi", "Metin olarak YYYY-AA-GG girin. Örnek: 2027-03-15. Aynı güne farklı sınavlar eklenebilir."], ["Kapsam", "Ders / ünite / konu aralığını açıklayın. Bu bilgi sınav detayında görünür."], ["Cevap Anahtarı ID", "İsteğe bağlı. Cevap Anahtarları sayfasından kopyalayın veya ekledikten sonra düzenleme ekranından eşleştirin."], ["Yükleme", "En fazla 500 kayıt. Önce önizlemeyi kontrol edin, ardından Kaydet düğmesine basın. Hatalı satır varsa kayıt yapılmaz."], ["Güncelleme", "Excel yeni kayıt ekler. Mevcut sınavı düzenlemek için panelde Düzenle düğmesini kullanın. Yinelenen kayıtlar reddedilir."]], [26, 110]);
      await downloadScheduleTemplate(book, publishers.filter((p) => p.active).length);
    } catch (e) { setError(e instanceof Error ? e.message : "Şablon oluşturulamadı."); }
  }
  async function read(file?: File) {
    if (!file) return; setError(""); setPending([]);
    try {
      if (!/\.xlsx$/i.test(file.name) || file.size > 5 * 1024 * 1024) throw new Error("En fazla 5 MB XLSX dosyası seçin.");
      const x = window.XLSX!; const book = x.read(await file.arrayBuffer(), { type: "array", sheetRows: 502 }); const sheet = book.Sheets.Takvim;
      if (!sheet) throw new Error("Takvim sayfası bulunamadı.");
      const range = x.utils.decode_range(String(sheet["!fullref"] ?? sheet["!ref"] ?? "A1")); if (range.e.r > 500 || range.e.c > 5) throw new Error("Dosyada en fazla 500 sınav ve 6 sütun olabilir.");
      setPending(parseScheduleRows(x.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }), publishers.filter((p) => p.active)));
    } catch (e) { setError(e instanceof Error ? e.message : "Dosya okunamadı."); }
  }
  async function save(input: ScheduleInput[], id?: string) {
    if (busy) return; setBusy(true); setError(""); setNotice("");
    try {
      const r = await fetch(`${API_URL}/api/admin/exam-schedule${id ? `/${id}` : ""}`, { method: id ? "PATCH" : "POST", headers, body: JSON.stringify(id ? input[0] : { items: input }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Kaydedilemedi."); setNotice(id ? "Sınav güncellendi." : `${input.length} sınav takvime eklendi.`); setPending([]); setEdit(empty()); setEditId(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Kaydedilemedi."); } finally { setBusy(false); }
  }
  async function remove(ids: string[]) {
    if (!ids.length || !confirm(`${ids.length} sınav takvimden silinecek. Devam edilsin mi?`)) return;
    setBusy(true); setError("");
    try { const r = await fetch(`${API_URL}/api/admin/exam-schedule`, { method: "DELETE", headers, body: JSON.stringify({ ids }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Silinemedi."); setSelected([]); setNotice(`${d.count} sınav silindi.`); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Silinemedi."); } finally { setBusy(false); }
  }
  return <section className="schedule-management"><Script src="/vendor/xlsx.full.min.js" onReady={() => setReady((r) => r | 1)} /><Script src="/vendor/jszip.min.js" onReady={() => setReady((r) => r | 2)} /><div className="studio-card"><h2>Excel ile sınav takvimi ekle</h2><p className="field-help">Sınıf ve yayınevi açılır listeli şablonu doldur; yüklemeden önce kontrol et. Her satır bir sınavdır.</p><div className="studio-actions"><button className="button button-quiet" onClick={template} disabled={ready !== 3}>Excel şablonunu indir ↓</button><label className="button button-navy upload-label">Doldurulmuş Excel seç<input type="file" accept=".xlsx" disabled={ready !== 3 || busy} onChange={(e) => { void read(e.target.files?.[0]); e.target.value = ""; }} /></label></div>{pending.length > 0 && <><h3>{pending.length} sınav · yükleme önizlemesi</h3><div className="table-scroll schedule-preview"><table className="member-table"><thead><tr><th>Yayınevi</th><th>Sınıf</th><th>Deneme</th><th>Tarih</th><th>Kapsam</th></tr></thead><tbody>{pending.map((i, n) => <tr key={n}><td>{publishers.find((p) => p.id === i.publisherId)?.name}</td><td>{i.level}</td><td>{i.sequence}</td><td>{i.examDate}</td><td>{i.scope}</td></tr>)}</tbody></table></div><button className="button button-navy" disabled={busy} onClick={() => void save(pending)}>{busy ? "Kaydediliyor..." : `${pending.length} sınavı kaydet`}</button></>}</div>
    {error && <p className="notice error" role="alert">{error}</p>}{notice && <p className="notice success" role="status">{notice}</p>}
    <details className="studio-card" open={Boolean(editId)}><summary>{editId ? "Sınavı düzenle" : "Tek sınav ekle"}</summary><form className="schedule-edit-form" onSubmit={(e) => { e.preventDefault(); void save([edit], editId || undefined); }}><label>Yayınevi<select required value={edit.publisherId} onChange={(e) => setEdit({ ...edit, publisherId: e.target.value, answerKeyId: null })}><option value="">Seçin</option>{publishers.filter((p) => p.active || p.id === edit.publisherId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Sınıf<select value={edit.level} onChange={(e) => setEdit({ ...edit, level: e.target.value, answerKeyId: null })}>{SCHEDULE_LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label><label>Deneme No<input type="number" min={1} max={999} value={edit.sequence} required onChange={(e) => setEdit({ ...edit, sequence: Number(e.target.value) })} /></label><label>Uygulama tarihi<input type="date" value={edit.examDate} required onChange={(e) => setEdit({ ...edit, examDate: e.target.value })} /></label><label className="span-all">Kapsam<textarea rows={4} maxLength={6000} required value={edit.scope} onChange={(e) => setEdit({ ...edit, scope: e.target.value })} /></label><label className="span-all">Eşleşen cevap anahtarı<select value={edit.answerKeyId ?? ""} onChange={(e) => setEdit({ ...edit, answerKeyId: e.target.value || null })}><option value="">Henüz eşleştirilmedi</option>{keys.filter((k) => k.published && k.publisherId === edit.publisherId && (!/^\d+$/.test(edit.level) || k.grade === Number(edit.level))).map((k) => <option key={k.id} value={k.id}>{k.examName} · {k.grade}. sınıf</option>)}</select></label><label className="checkbox-row"><input type="checkbox" checked={edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />Yayında</label><div className="studio-actions"><button type="button" className="button button-quiet" onClick={() => { setEdit(empty()); setEditId(""); }}>Temizle / vazgeç</button><button className="button button-navy" disabled={busy}>Kaydet</button></div></form></details>
    <div className="studio-card"><div className="list-header-row"><h2>Takvim kayıtları ({items.length})</h2><button className="button button-quiet" disabled={!selected.length || busy} onClick={() => void remove(selected)}>Seçilenleri sil ({selected.length})</button></div><div className="table-scroll"><table className="member-table"><thead><tr><th><input type="checkbox" aria-label="Tüm kayıtları seç" checked={items.length > 0 && selected.length === items.length} onChange={(e) => setSelected(e.target.checked ? items.map((i) => i.id) : [])} /></th><th>Sınav</th><th>Tarih</th><th>Cevap anahtarı</th><th>İşlemler</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><input type="checkbox" aria-label={`${scheduleTitle(item)} seç`} checked={selected.includes(item.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} /></td><td>{scheduleTitle(item)}<small>{item.published ? "Yayında" : "Taslak"}</small></td><td>{item.examDate.slice(0, 10)}</td><td>{item.answerKey ? <a href={answerKeyPath(item.answerKey)} target="_blank" rel="noreferrer">{item.answerKey.examName} ↗</a> : "Eşleştirilmedi"}</td><td><button className="button button-quiet" onClick={() => { setEditId(item.id); setEdit({ publisherId: item.publisherId, level: item.level, sequence: item.sequence, examDate: item.examDate.slice(0, 10), scope: item.scope, answerKeyId: item.answerKeyId, published: item.published }); }}>Düzenle</button><button className="button button-quiet" disabled={busy} onClick={() => void remove([item.id])}>Sil</button></td></tr>)}</tbody></table></div></div>
  </section>;
}
