"use client";
import { useEffect, useState } from "react";
import fmtLibrary from "../../../api/assets/templates/catalog.json";
import FmtShareControls from "./fmt-share-controls";
import { API_URL } from "../../lib/api";
import { opticalRequest } from "../../lib/optical-api";
import type { TemplateRecord } from "../../lib/optical";

export async function downloadFmt(token: string, template: Pick<TemplateRecord, "id" | "name">) {
  const r = await fetch(`${API_URL}/api/optical/templates/${encodeURIComponent(template.id)}/download`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) { const data = await r.json(); throw new Error(data.error ?? "FMT indirilemedi."); }
  const url = URL.createObjectURL(await r.blob()), link = document.createElement("a"); link.href = url; link.download = template.name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").replace(/\.fmt$/i, "") + ".fmt"; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function downloadFmtExample(token: string, code: string) {
  const r = await fetch(`${API_URL}/api/optical/templates/examples/${code}/download`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error("FMT indirilemedi.");
  const url = URL.createObjectURL(await r.blob()), a = document.createElement("a"); a.href = url; a.download = fmtLibrary.find((entry) => entry.code === code)?.downloadName ?? `${code}.fmt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export default function FmtDownloads({ token }: { token: string }) {
  const [items, setItems] = useState<TemplateRecord[]>([]), [error, setError] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState("");
  useEffect(() => { void opticalRequest(token, "/templates").then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [token]);
  return <section className="management-panel fmt-download-center">
    <p>İhtiyacınız olan şablonu indirin. Sonuç değerlendirmesinde FMT ile TXT çıktısının uyumu ayrıca kontrol edilir.</p>
    {error && <p role="alert" className="notice error">{error}</p>}
    {loading ? <p role="status">FMT kütüphanesi yükleniyor…</p> : <div className="fmt-library-grid">
      {fmtLibrary.map((entry) => <article className="fmt-library-card" key={`system-${entry.code}`}><h3>{entry.name}</h3><p className="field-help">{entry.requiresVerification ? entry.file.endsWith(".bldm")?"Özgün BLDM dosyası. TXT/okuyucu doğrulanmadı; değerlendirmede etkin değil.":"TXT ve okuyucu eşleştirmesi doğrulanmalı." : "Sistem şablonu"}</p><div className="studio-actions"><button aria-label={`${entry.name} ${entry.file.endsWith(".bldm")?"BLDM":"FMT"} indir`} className="button button-navy" disabled={!!busy} onClick={async () => { setBusy(entry.code); setError(""); try { await downloadFmtExample(token, entry.code); } catch (e) { setError((e as Error).message); } finally { setBusy(""); } }}>{busy === entry.code ? "İndiriliyor…" : entry.file.endsWith(".bldm")?"BLDM indir":"FMT indir"}</button><FmtShareControls token={token} selection={{ templateIds: [], exampleCodes: [entry.code] }} /></div></article>)}
      {items.map((t) => { const downloadable = !!t.originalFmt?.trim() && !/^\s*[\[{]/.test(t.originalFmt); return <article className="fmt-library-card" key={t.id}><h3>{t.name}</h3><p className="field-help">{t.grade ? `${t.grade}. sınıf · ` : ""}{t.layout.lineLength} karakter · {t.layout.lessons.map((l) => l.name).join(" · ")}{!t.active ? " · Pasif" : ""}</p>{!downloadable && <p className="field-help">Bu kayıtta indirilebilir FMT dosyası bulunmuyor.</p>}<div className="studio-actions"><button className="button button-navy" disabled={!!busy || !downloadable || !t.active} onClick={async () => { setBusy(t.id); setError(""); try { await downloadFmt(token, t); } catch (e) { setError((e as Error).message); } finally { setBusy(""); } }}>{busy === t.id ? "İndiriliyor…" : "FMT indir"}</button>{t.active && downloadable && <FmtShareControls token={token} templateId={t.id} />}</div></article>; })}
      {!items.length && !fmtLibrary.length && <p>Kullanılabilir FMT bulunamadı.</p>}
    </div>}
  </section>;
}
