"use client";
import { useEffect, useMemo, useState } from "react";
import fmtLibrary from "../../../api/assets/templates/catalog.json";
import { API_URL } from "../../lib/api";
import type { TemplateRecord } from "../../lib/optical";
import { opticalRequest, jsonBody } from "../../lib/optical-api";
import FmtBulkUpload from "./fmt-bulk-upload";
import { downloadFmt, downloadFmtExample } from "./fmt-downloads";
import FmtShareControls from "./fmt-share-controls";

export default function FmtManager({ token }: { token: string }) {
  const [items, setItems] = useState<TemplateRecord[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [query, setQuery] = useState("");
  async function load() { setItems(await opticalRequest(token, "/templates")); }
  useEffect(() => { void load().catch((e) => setError(e.message)); }, [token]);
  async function act(id: string, fn: () => Promise<void>) {
    setBusy(id); setError("");
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  }
  async function layout(t: TemplateRecord) {
    const r = await fetch(`${API_URL}/api/optical/templates/${t.id}/layout`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error((await r.json()).error ?? "FMT yerleşimi indirilemedi.");
    const url = URL.createObjectURL(await r.blob()), a = document.createElement("a");
    a.href = url; a.download = `${t.name}.layout.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  const records = useMemo(() => items.filter((t) => !normalized || `${t.name} ${t.grade ?? ""} ${t.publisher?.name ?? ""}`.toLocaleLowerCase("tr-TR").includes(normalized)), [items, normalized]);
  const examples = fmtLibrary.filter((entry) => !normalized || entry.name.toLocaleLowerCase("tr-TR").includes(normalized));
  return <section className="management-panel fmt-manager">
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="fmt-manager-toolbar"><h2>FMT kütüphanesi</h2><label>FMT ara <input aria-label="FMT kütüphanesinde ara" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad veya sınıf" /></label></div>
    <div className="fmt-library-grid">
      {examples.map((entry) => <article className="fmt-library-card" key={`system-${entry.code}`}><h3>{entry.name}</h3><p className="field-help">{entry.requiresVerification ? entry.file.endsWith(".bldm")?"Özgün BLDM dosyası. TXT/okuyucu doğrulanmadı; değerlendirmede etkin değil.":"TXT ve okuyucu eşleştirmesi doğrulanmalı." : "Sistem şablonu"}</p><div className="studio-actions"><button className="button button-navy" disabled={!!busy} onClick={() => void act(entry.code, () => downloadFmtExample(token, entry.code))}>{busy === entry.code ? "İndiriliyor…" : entry.file.endsWith(".bldm")?"BLDM indir":"FMT indir"}</button><FmtShareControls token={token} selection={{ templateIds: [], exampleCodes: [entry.code] }} /></div></article>)}
      {records.map((t) => {
        const downloadable = !!t.originalFmt?.trim() && !/^\s*[\[{]/.test(t.originalFmt);
        return <article key={t.id} className="fmt-library-card"><h3>{t.name}</h3><p>{t.active ? "Etkin" : "Pasif"}{t.grade ? ` · ${t.grade}. Sınıf` : ""}{t.publisher ? ` · ${t.publisher.name}` : ""}{t.sourceFormat ? ` · ${t.sourceFormat.toUpperCase()}` : ""} · {t.layout.lineLength} karakter · {t.layout.lessons.map((l) => l.name).join(" / ")}</p>{!downloadable && <p className="notice">Bu kayıtta indirilebilir FMT dosyası yok. Kaydı düzenleyip dosyayı yeniden ekleyin.</p>}<div className="studio-actions"><button className="button button-navy" disabled={!!busy || !downloadable} onClick={() => void act(t.id, () => downloadFmt(token, t))}>{busy === t.id ? "İndiriliyor…" : "FMT indir"}</button><button className="button button-quiet" disabled={!!busy} onClick={() => void act(t.id, () => layout(t))}>Yerleşimi indir</button><button className="button button-quiet" disabled={!!busy} onClick={() => void act(t.id, async () => { await opticalRequest(token, `/templates/${t.id}`, { ...jsonBody({ active: !t.active }), method: "PATCH" }); await load(); })}>{t.active ? "Pasife al" : "Etkinleştir"}</button>{downloadable && t.active && <FmtShareControls token={token} templateId={t.id} />}</div></article>;
      })}
      {!examples.length && !records.length && <p>Aramanızla eşleşen FMT bulunamadı.</p>}
    </div>
    <details className="fmt-upload-details"><summary>FMT yükle veya toplu ekle</summary><FmtBulkUpload token={token} templates={items} onSaved={load} /></details>
  </section>;
}
