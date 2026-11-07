"use client";
import Script from "next/script";
import ScheduleImport from "./schedule-import";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { SCHEDULE_LEVELS, scheduleHeaders, scheduleTitle } from "../../lib/schedule";
import type { ScheduleEntry, ScheduleInput } from "../../lib/schedule";
import { downloadScheduleTemplate } from "../../lib/excel-download";
import { answerKeyPath } from "../../lib/answer-key";

type Publisher = { id: string; name: string; active: boolean };
type Key = { id: string; publisherId: string; grade: number; examName: string; published: boolean };
const empty = (): ScheduleInput => ({ publisherId: "", level: "8", sequence: 1, examDate: "", scope: "", answerKeyId: null, published: true });
export default function ScheduleManagement({ token }: { token: string }) {
  const [items, setItems] = useState<ScheduleEntry[]>([]), [publishers, setPublishers] = useState<Publisher[]>([]), [keys, setKeys] = useState<Key[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkField, setBulkField] = useState("examDate"), [bulkValue, setBulkValue] = useState(""), [listPage, setListPage] = useState(0);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
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
      for (let row = 2; row <= 2501; row++) book.Sheets.Takvim[`D${row}`] = { t: "s", v: "", z: "@" };
      book.Sheets.Takvim["!ref"] = "A1:F2501";
      append("Yayınevleri", [["Yayınevi"], ...publishers.filter((p) => p.active).map((p) => [p.name])], [45]);
      append("Kılavuz", [["SINAV TAKVİMİ", "Her satır bir denemedir. Takvim sayfasındaki başlıkları değiştirmeyin."], ["Yayınevi", "Listeden seçin. Yayınevi listede yoksa önce panelden ekleyip yeni şablon indirin."], ["Sınıf", "Açılır listeden 1–12, TYT veya AYT seçin."], ["Deneme No", "Kaçıncı deneme olduğunu 1–999 arasında tam sayı ile yazın."], ["Uygulama Tarihi", "GG.AA.YYYY veya YYYY-AA-GG girin. Örnek: 2027-03-15. Aynı güne farklı sınavlar eklenebilir."], ["Kapsam", "Ders / ünite / konu aralığını açıklayın. Bu bilgi sınav detayında görünür."], ["Cevap Anahtarı ID", "İsteğe bağlı. Cevap Anahtarları sayfasından kopyalayın veya ekledikten sonra düzenleme ekranından eşleştirin."], ["Yükleme", "En fazla 2500 kayıt. Önce önizlemeyi kontrol edin, ardından Kaydet düğmesine basın. Geçerli satırlar kaydedilir; hatalılar düzeltilebilir."], ["Güncelleme", "Excel yeni kayıt ekler. Mevcut sınavı düzenlemek için panelde Düzenle düğmesini kullanın. Yinelenen kayıtlar reddedilir."]], [26, 110]);
      await downloadScheduleTemplate(book, publishers.filter((p) => p.active).length);
    } catch (e) { setError(e instanceof Error ? e.message : "Şablon oluşturulamadı."); }
  }
  async function save(input: ScheduleInput[], id?: string) {
    if (busy) return; setBusy(true); setError(""); setNotice("");
    try {
      const r = await fetch(`${API_URL}/api/admin/exam-schedule${id ? `/${id}` : ""}`, { method: id ? "PATCH" : "POST", headers, body: JSON.stringify(id ? input[0] : { items: input }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Kaydedilemedi."); setNotice(id ? "Sınav güncellendi." : `${d.count} sınav kaydedildi; ${d.duplicates} mükerrer, ${d.invalid} hatalı.`); setEdit(empty()); setEditId(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Kaydedilemedi."); } finally { setBusy(false); }
  }
  async function remove(ids: string[]) {
    if (!ids.length) return;
    setBusy(true); setError("");
    try { const r = await fetch(`${API_URL}/api/admin/exam-schedule`, { method: "DELETE", headers, body: JSON.stringify({ ids }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Silinemedi."); setSelected([]); setDeleteIds([]); setNotice(`${d.count} sınav silindi.`); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Silinemedi."); } finally { setBusy(false); }
  }
  return <section className="schedule-management"><Script src="/vendor/xlsx.full.min.js" onReady={() => setReady((r) => r | 1)} /><Script src="/vendor/jszip.min.js" onReady={() => setReady((r) => r | 2)} /><div className="studio-card"><h2>Excel ile sınav takvimi ekle</h2><p className="field-help">Sınıf ve yayınevi açılır listeli şablonu doldur; yüklemeden önce kontrol et. Her satır bir sınavdır.</p><div className="studio-actions"><button className="button button-quiet" onClick={template} disabled={ready !== 3}>Excel şablonunu indir ↓</button></div></div><ScheduleImport token={token} publishers={publishers} ready={ready === 3} onSaved={() => void load()} />
    {error && <p className="notice error" role="alert">{error}</p>}{notice && <p className="notice success" role="status">{notice}</p>}
    <details className="studio-card" open={Boolean(editId)}><summary>{editId ? "Sınavı düzenle" : "Tek sınav ekle"}</summary><form className="schedule-edit-form" onSubmit={(e) => { e.preventDefault(); void save([edit], editId || undefined); }}><label>Yayınevi<select required value={edit.publisherId} onChange={(e) => setEdit({ ...edit, publisherId: e.target.value, answerKeyId: null })}><option value="">Seçin</option>{publishers.filter((p) => p.active || p.id === edit.publisherId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Sınıf<select value={edit.level} onChange={(e) => setEdit({ ...edit, level: e.target.value, answerKeyId: null })}>{SCHEDULE_LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label><label>Deneme No<input type="number" min={1} max={999} value={edit.sequence} required onChange={(e) => setEdit({ ...edit, sequence: Number(e.target.value) })} /></label><label>Uygulama tarihi<input type="date" value={edit.examDate} required onChange={(e) => setEdit({ ...edit, examDate: e.target.value })} /></label><label>Seri (isteğe bağlı)<input maxLength={191} value={edit.series ?? ""} onChange={(e) => setEdit({ ...edit, series: e.target.value || null })} /></label><label className="span-all">Kapsam<textarea rows={4} maxLength={6000} required value={edit.scope} onChange={(e) => setEdit({ ...edit, scope: e.target.value })} /></label><label className="span-all">Eşleşen cevap anahtarı<select value={edit.answerKeyId ?? ""} onChange={(e) => setEdit({ ...edit, answerKeyId: e.target.value || null })}><option value="">Henüz eşleştirilmedi</option>{keys.filter((k) => k.published && k.publisherId === edit.publisherId && (!/^\d+$/.test(edit.level) || k.grade === Number(edit.level))).map((k) => <option key={k.id} value={k.id}>{k.examName} · {k.grade}. sınıf</option>)}</select></label><label className="checkbox-row"><input type="checkbox" checked={edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} />Yayında</label><div className="studio-actions"><button type="button" className="button button-quiet" onClick={() => { setEdit(empty()); setEditId(""); }}>Temizle / vazgeç</button><button className="button button-navy" disabled={busy}>Kaydet</button></div></form></details>
    <div className="studio-card"><h3>Seçilen sınavları toplu düzenle ({selected.length})</h3><form className="studio-actions" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); try { const r = await fetch(`${API_URL}/api/admin/exam-schedule-bulk`, { method: "PATCH", headers, body: JSON.stringify({ ids: selected, changes: { [bulkField]: bulkField === "sequence" ? Number(bulkValue) : bulkValue } }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Güncellenemedi."); setNotice(`${d.count} sınav güncellendi.`); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}><label>Güncellenecek alan<select value={bulkField} onChange={(e) => { setBulkField(e.target.value); setBulkValue(""); }}><option value="examDate">Uygulama tarihi</option><option value="publisherId">Yayınevi</option><option value="level">Sınıf</option><option value="sequence">Deneme No</option><option value="scope">Kapsam</option></select></label><label>Yeni değer{bulkField === "publisherId" ? <select required value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}><option value="">Seçin</option>{publishers.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select> : <input required type={bulkField === "examDate" ? "date" : bulkField === "sequence" ? "number" : "text"} value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} />}</label><button className="button button-navy" disabled={busy || !selected.length || selected.length > 2500}>Seçilenleri güncelle</button></form><p className="field-help">Bir işlemde en fazla 2.500 kayıt. Bağlı cevap anahtarıyla uyumsuz değişiklikler ve mükerrer oluşturacak işlemler kaydedilmez.</p></div>
    {deleteIds.length > 0 && <div className="studio-card" role="dialog" aria-modal="true" aria-label="Sınav silme onayı"><p>{deleteIds.length} sınav silinecek.</p><button onClick={() => setDeleteIds([])}>Vazgeç</button><button disabled={busy} onClick={() => void remove(deleteIds)}>Silmeyi onayla</button></div>}
    <div className="studio-card"><div className="list-header-row"><h2>Takvim kayıtları ({items.length})</h2><button className="button button-quiet" disabled={!selected.length || busy} onClick={() => setDeleteIds(selected)}>Seçilenleri sil ({selected.length})</button></div><div className="table-scroll"><table className="member-table"><thead><tr><th><input type="checkbox" aria-label="Tüm kayıtları seç" checked={items.length > 0 && selected.length === items.length} onChange={(e) => setSelected(e.target.checked ? items.map((i) => i.id) : [])} /></th><th>Sınav</th><th>Tarih</th><th>Cevap anahtarı</th><th>İşlemler</th></tr></thead><tbody>{items.slice(listPage * 50, listPage * 50 + 50).map((item) => <tr key={item.id}><td><input type="checkbox" aria-label={`${scheduleTitle(item)} seç`} checked={selected.includes(item.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} /></td><td>{scheduleTitle(item)}{item.series && <small>Seri: {item.series}</small>}<small>{item.published ? "Yayında" : "Taslak"}</small></td><td>{item.examDate.slice(0, 10)}</td><td>{item.answerKey ? <a href={answerKeyPath(item.answerKey)} target="_blank" rel="noreferrer">{item.answerKey.examName} ↗</a> : "Eşleştirilmedi"}</td><td><button className="button button-quiet" onClick={() => { setEditId(item.id); setEdit({ publisherId: item.publisherId, level: item.level, sequence: item.sequence, examDate: item.examDate.slice(0, 10), series: item.series ?? null, scope: item.scope, answerKeyId: item.answerKeyId, published: item.published }); }}>Düzenle</button><button className="button button-quiet" disabled={busy} onClick={() => setDeleteIds([item.id])}>Sil</button></td></tr>)}</tbody></table></div></div>
    <div className="studio-actions"><button disabled={listPage === 0} onClick={() => setListPage(listPage - 1)}>Önceki</button><span>{listPage + 1} / {Math.max(1, Math.ceil(items.length / 50))}</span><button disabled={(listPage + 1) * 50 >= items.length} onClick={() => setListPage(listPage + 1)}>Sonraki</button></div>
  </section>;
}
