"use client";
import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../../lib/api";
import { normalizePublisher, parseScheduleDate, parseScheduleRows, publisherSuggestions, scheduleHeaders } from "../../lib/schedule";
import type { ScheduleInput } from "../../lib/schedule";
import { saveBlob } from "../../lib/excel-download";
type Publisher = { id: string; name: string; active: boolean };
type Row = { id: number; source: string; publisherId: string; level: string; sequence: string; date: string; scope: string; answer: string; series: string; excluded: boolean; serverError?: string };
type Alias = { id: string; source: string; publisherId: string; series: string | null };
export default function ScheduleImport({ token, publishers, ready, onSaved }: { token: string; publishers: Publisher[]; ready: boolean; onSaved: () => void }) {
  const [rows, setRows] = useState<Row[]>([]), [aliases, setAliases] = useState<Alias[]>([]), [history, setHistory] = useState<any[]>([]);
  const [page, setPage] = useState(0), [filter, setFilter] = useState("all"), [selected, setSelected] = useState<number[]>([]), [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [progress, setProgress] = useState(0), [search, setSearch] = useState("");
  const [activeImportId, setActiveImportId] = useState("");
  const [confirmRollback, setConfirmRollback] = useState("");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  async function api(path: string, method = "GET", body?: unknown) { const response = await fetch(`${API_URL}/api/admin/${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "İşlem başarısız."); return data; }
  async function refresh() { try { const [a, h] = await Promise.all([api("publisher-aliases"), api("schedule-imports")]); setAliases(a); setHistory(h); } catch (e) { setMessage((e as Error).message); } }
  useEffect(() => { void refresh(); }, [token]);
  useEffect(() => {
    if (!busy || !activeImportId) return;
    let active = true;
    const timer = setInterval(() => { void api("schedule-imports").then((data) => {
      if (!active) return;
      const batch = data.find((h: any) => h.id === activeImportId);
      if (batch) { setHistory(data); setProgress(Math.min(99, Math.floor(100 * (batch.saved + batch.invalid + batch.duplicates) / Math.max(1, batch.total)))); setMessage(`${batch.saved} kaydedildi · ${batch.duplicates} mükerrer · ${batch.invalid} hatalı / ${batch.total} satır`); }
    }).catch(() => {}); }, 1000);
    return () => { active = false; clearInterval(timer); };
  }, [busy, activeImportId]);
  const active = publishers.filter((p) => p.active);
  function update(id: number, change: Partial<Row>) { setRows((current) => current.map((r) => r.id === id ? { ...r, ...change, serverError: "" } : r)); }
  const checked = useMemo(() => {
    const seen = new Set<string>();
    return rows.map((r) => {
      let input: ScheduleInput | undefined, error = r.serverError ?? "", duplicate = false;
      try {
        if (r.source.length > 191 || r.series.length > 191) throw new Error("Yayınevi / seri adı en fazla 191 karakter olabilir.");
        const publisher = active.find((p) => p.id === r.publisherId); if (!publisher) throw new Error("Yayınevi eşleştirilmedi.");
        input = parseScheduleRows([scheduleHeaders, [publisher.name, r.level, r.sequence, r.date, r.scope, r.answer]], active)[0];
        const identity = JSON.stringify([input.publisherId, input.level, input.sequence, input.examDate]);
        duplicate = !r.excluded && seen.has(identity); if (!r.excluded) seen.add(identity);
      } catch (e) { error = (e as Error).message; }
      return { row: r, input, error, duplicate };
    });
  }, [rows, publishers]);
  const valid = checked.filter((r) => r.input && !r.error && !r.duplicate && !r.row.excluded);
  const visible = checked.filter((r) => filter === "all" || filter === "errors" && Boolean(r.error) || filter === "unmatched" && !r.row.publisherId || filter === "duplicates" && r.duplicate);
  async function read(file?: File) {
    if (!file) return; setBusy(true); setMessage(""); setProgress(0);
    try {
      if (!/\.xlsx$/i.test(file.name) || file.size > 5 * 1024 * 1024) throw new Error("En fazla 5 MB XLSX seçin.");
      const x = window.XLSX!; const book = x.read(await file.arrayBuffer(), { type: "array", sheetRows: 2502, cellDates: false }); const sheet = book.Sheets.Takvim;
      if (!sheet) throw new Error("Takvim sayfası bulunamadı.");
      const range = x.utils.decode_range(String(sheet["!fullref"] ?? sheet["!ref"] ?? "A1"));
      if (range.e.r > 2500 || range.e.c > 5) throw new Error("En fazla 2.500 satır ve 6 sütun desteklenir.");
      const data = x.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true }) as unknown[][];
      if (scheduleHeaders.some((h, i) => data[0]?.[i] !== h)) throw new Error("Şablon başlıklarını koruyun.");
      const mappingRows = book.Sheets["Eşleştirmeler"] ? x.utils.sheet_to_json(book.Sheets["Eşleştirmeler"], { header: 1, defval: "", raw: true }) as unknown[][] : [];
      const next = data.slice(1).filter((r) => r.some((v) => String(v ?? "").trim())).map((r, id) => {
        const source = String(r[0] ?? "").trim(), alias = aliases.find((a) => a.source === normalizePublisher(source));
        const exact = active.find((p) => normalizePublisher(p.name) === normalizePublisher(source));
        let date = String(r[3] ?? ""); try { date = parseScheduleDate(r[3], Boolean((book as any).Workbook?.WBProps?.date1904)); } catch { /* Keep invalid text for correction. */ }
        return { id, source, publisherId: exact?.id ?? (active.some((p) => p.id === alias?.publisherId) ? alias!.publisherId : ""), level: String(r[1] ?? ""), sequence: String(r[2] ?? ""), date, scope: String(r[4] ?? ""), answer: String(r[5] ?? ""), series: String(mappingRows.find((m) => String(m[0]) === source)?.[2] ?? alias?.series ?? ""), excluded: false };
      });
      setRows(next); setSelected([]); setPage(0); setProgress(100); setMessage(`${next.length} satır okundu. Eşleşmeyen isimleri onaylayın; seri bilgisi yalnızca sizin seçiminizle kaydedilir.`);
    } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    if (!valid.length || busy) return; setBusy(true); setProgress(0); setMessage("Kayıtlar doğrulanıyor ve 100 satırlık veritabanı gruplarıyla işleniyor...");
    // Server reports actual committed counts; never claim a simulated percentage.
    try {
      const importId = crypto.randomUUID(); setActiveImportId(importId);
      const result = await api("exam-schedule", "POST", { importId, items: valid.map(({ input, row }) => ({ ...input, sourcePublisher: row.source, series: row.series || null })) });
      setMessage(`Toplam ${rows.length}; gönderilen geçerli ${result.valid}; hatalı ${result.invalid + checked.filter((r) => r.error && !r.row.excluded).length}; mükerrer ${result.duplicates + checked.filter((r) => r.duplicate).length}; kaydedilen ${result.count}.`);
      setRows((current) => current.map((r) => { const failure = result.errors.find((e: any) => valid[e.row - 1]?.row.id === r.id); return failure ? { ...r, serverError: failure.error } : valid.some((v) => v.row.id === r.id) ? { ...r, excluded: true } : r; }));
      setProgress(100); await refresh(); onSaved();
    } catch (e) { setMessage(`${(e as Error).message} Yükleme geçmişinden kısmi sonucu kontrol edin; tekrar denemede mükerrerler atlanır.`); await refresh(); } finally { setBusy(false); setActiveImportId(""); }
  }
  async function remember(row: Row) {
    try { await api("publisher-aliases", "PUT", { source: row.source, publisherId: row.publisherId, series: row.series || null }); await refresh(); setMessage("Eşleştirme hatırlandı. Geçmiş kayıtlar değiştirilmedi."); } catch (e) { setMessage((e as Error).message); }
  }
  function exportRows() {
    const x = window.XLSX!, book = x.utils.book_new(); x.utils.book_append_sheet(book, x.utils.aoa_to_sheet([scheduleHeaders, ...rows.filter((r) => !r.excluded).map((r) => [active.find((p) => p.id === r.publisherId)?.name ?? r.source, r.level, r.sequence, r.date, r.scope, r.answer])]), "Takvim");
    x.utils.book_append_sheet(book, x.utils.aoa_to_sheet([["Yayınevi", "Excel adı", "Seri"], ...rows.filter((r) => !r.excluded).map((r) => [active.find((p) => p.id === r.publisherId)?.name ?? r.source, r.source, r.series])]), "Eşleştirmeler");
    saveBlob(new Blob([x.write(book, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "duzenlenmis-takvim.xlsx");
  }
  return <div className="studio-card"><h3>Excel önizleme ve eşleştirme · 2.500 satır</h3><label className="button button-navy upload-label">Excel seç<input type="file" accept=".xlsx" disabled={!ready || busy} onChange={(e) => { void read(e.target.files?.[0]); e.target.value = ""; }} /></label>
    <p role="status">{message}</p>{busy && <progress value={progress || undefined} max={100} aria-label="Yükleme ilerlemesi" />}{!busy && progress > 0 && <progress value={progress} max={100} aria-label="İşlem tamamlandı" />}
    {rows.length > 0 && <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}><p>Toplam {rows.length} · Geçerli {valid.length} · Hatalı {checked.filter((r) => r.error && !r.row.excluded).length} · Mükerrer {checked.filter((r) => r.duplicate).length} · Hariç {rows.filter((r) => r.excluded).length}</p>
    <div className="studio-actions"><label>Filtre<select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }}><option value="all">Tüm satırlar</option><option value="errors">Hatalı</option><option value="unmatched">Eşleşmeyen</option><option value="duplicates">Mükerrer</option></select></label><label>Yayınevi ara<input value={search} onChange={(e) => setSearch(e.target.value)} /></label><label>Toplu yayınevi<select value={bulk} onChange={(e) => setBulk(e.target.value)}><option value="">Seçin</option>{active.filter((p) => normalizePublisher(p.name).includes(normalizePublisher(search))).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button className="button button-quiet" disabled={!bulk || !selected.length} onClick={() => setRows(rows.map((r) => selected.includes(r.id) ? { ...r, publisherId: bulk } : r))}>Seçilenlere ata</button><button className="button button-quiet" onClick={() => setRows(rows.map((r) => selected.includes(r.id) ? { ...r, excluded: true } : r))}>Seçilenleri hariç tut</button></div>
    <div className="table-scroll schedule-preview"><table className="member-table"><thead><tr><th><input type="checkbox" aria-label="Filtredeki tüm satırları seç" checked={visible.length > 0 && visible.every((v) => selected.includes(v.row.id))} onChange={(e) => setSelected(e.target.checked ? visible.map((v) => v.row.id) : [])} /></th><th>Excel adı / Yayınevi / Seri</th><th>Sınıf</th><th>Deneme No</th><th>Uygulama Tarihi</th><th>Kapsam</th><th>Durum</th></tr></thead><tbody>{visible.slice(page * 50, page * 50 + 50).map(({ row: r, error, duplicate }) => <tr key={r.id}><td><input type="checkbox" aria-label={`Satır ${r.id + 2} seç`} checked={selected.includes(r.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, r.id] : selected.filter((id) => id !== r.id))} /></td><td><small>{r.source}</small><select aria-label="Yayınevi eşleştir" value={r.publisherId} onChange={(e) => update(r.id, { publisherId: e.target.value })}><option value="">Sonra eşleştir</option>{active.filter((p) => p.id === r.publisherId || normalizePublisher(p.name).includes(normalizePublisher(search))).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{!r.publisherId && publisherSuggestions(r.source, active).map((p) => <button key={p.id} onClick={() => update(r.id, { publisherId: p.id })}>{p.name} önerisini kabul et</button>)}<input aria-label="Onaylı seri adı" placeholder="Seri (isteğe bağlı)" value={r.series} onChange={(e) => update(r.id, { series: e.target.value })} maxLength={191} /><button disabled={!r.publisherId || !r.source} onClick={() => void remember(r)}>Eşleştirmeyi hatırla</button><button disabled={!r.publisherId} onClick={() => setRows(rows.map((row) => row.source === r.source ? { ...row, publisherId: r.publisherId, series: r.series } : row))}>Aynı Excel adına uygula</button><small>Hatırlamazsanız yalnızca bu yüklemede kullanılır.</small></td>{([['level','Sınıf'],['sequence','Deneme No'],['date','Tarih'],['scope','Kapsam']] as const).map(([key, label]) => <td key={key}><input aria-label={label} value={r[key]} onChange={(e) => update(r.id, { [key]: e.target.value })} /></td>)}<td><label>Cevap Anahtarı ID (isteğe bağlı)<input aria-label="Cevap Anahtarı ID" value={r.answer} onChange={(e) => update(r.id, { answer: e.target.value })} /></label>{r.excluded ? "Hariç" : error || (duplicate ? "Mükerrer" : "Geçerli")}<label><input type="checkbox" checked={r.excluded} onChange={(e) => update(r.id, { excluded: e.target.checked })} />Hariç tut</label><button onClick={() => setRows(rows.filter((row) => row.id !== r.id))}>Satırı sil</button></td></tr>)}</tbody></table></div>
    <div className="studio-actions"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Önceki</button><span>{page + 1} / {Math.max(1, Math.ceil(visible.length / 50))}</span><button disabled={(page + 1) * 50 >= visible.length} onClick={() => setPage(page + 1)}>Sonraki</button><button disabled={rows.length >= 2500} onClick={() => { setRows([...rows, { id: Math.max(-1, ...rows.map((r) => r.id)) + 1, source: "", publisherId: "", level: "8", sequence: "1", date: "", scope: "", answer: "", series: "", excluded: false }]); setFilter("all"); setPage(Math.floor(rows.length / 50)); }}>Satır ekle</button><button onClick={() => { setRows([...rows]); setMessage("Doğrulama yenilendi."); }}>Tekrar doğrula</button><button onClick={exportRows}>Düzenlenmiş Excel indir</button><button className="button button-navy" disabled={busy || !valid.length} onClick={() => void save()}>Geçerli {valid.length} satırı kaydet</button></div><p>Eşleşmeyen satırlar bu ekran açık kaldığı sürece düzenlenebilir; Excel indirerek daha sonra devam edebilirsiniz.</p></fieldset>}
    <details><summary>Eşleştirme geçmişi ({aliases.length})</summary>{aliases.map((a) => <div className="studio-actions" key={a.id}><span>{a.source}</span><select aria-label={`${a.source} eşleştirmesini düzenle`} value={a.publisherId} onChange={async (e) => { try { await api("publisher-aliases", "PUT", { ...a, publisherId: e.target.value }); await refresh(); } catch (err) { setMessage((err as Error).message); } }}>{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input aria-label={`${a.source} seri bilgisini düzenle`} defaultValue={a.series ?? ""} maxLength={191} onBlur={async (e) => { const series = e.target.value.trim() || null; if (series === a.series) return; try { await api("publisher-aliases", "PUT", { ...a, series }); await refresh(); } catch (err) { setMessage((err as Error).message); } }} /><button onClick={async () => { try { await api(`publisher-aliases/${a.id}`, "DELETE"); await refresh(); } catch (e) { setMessage((e as Error).message); } }}>Eşleştirmeyi sil</button></div>)}</details>
    <details><summary>Yükleme geçmişi</summary><div className="table-scroll"><table className="member-table"><thead><tr><th>Tarih / kullanıcı</th><th>Kaydedilen</th><th>Hatalı / mükerrer</th><th>Sonuç</th><th>Geri alma</th></tr></thead><tbody>{history.map((h) => <tr key={h.id}><td>{new Date(h.createdAt).toLocaleString("tr-TR")} · {h.actor ? `${h.actor.firstName} ${h.actor.lastName}` : h.actorId}</td><td>{h.saved}</td><td>{h.invalid} / {h.duplicates}</td><td>{h.status}</td><td><button disabled={busy || h.status === "processing" || h.status === "rolled_back"} onClick={() => setConfirmRollback(h.id)}>Geri al</button></td></tr>)}</tbody></table></div></details>
    {confirmRollback && <div role="dialog" aria-modal="true" aria-label="Yüklemeyi geri al" className="studio-card"><p>Yalnızca bu yüklemenin değiştirilmemiş, cevap anahtarına bağlı olmayan kayıtları silinecek.</p><button onClick={() => setConfirmRollback("")}>Vazgeç</button><button onClick={async () => { setBusy(true); try { const r = await api(`schedule-imports/${confirmRollback}/rollback`, "POST", {}); setMessage(`${r.count} kayıt geri alındı; ${r.retained} düzenlenmiş / ilişkili kayıt korundu.`); setConfirmRollback(""); await refresh(); onSaved(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } }}>Geri almayı onayla</button></div>}
  </div>;
}
