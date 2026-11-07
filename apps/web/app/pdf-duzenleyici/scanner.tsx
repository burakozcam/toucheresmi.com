"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { scanPixels } from "../../lib/scanner";
import { saveBlob } from "../../lib/excel-download";
declare global { interface Window { PDFLib?: any } }
type Settings = { mode: string; threshold: number; contrast: number; rotation: number; top: number; bottom: number; left: number; right: number };
async function processImage(file: File, settings: Settings) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error(`${file.name} açılamadı. PNG, JPEG veya WebP kullanın.`)); image.src = url; });
    const ratio = Math.min(1, 2500 / Math.max(image.naturalWidth, image.naturalHeight));
    const w = Math.max(1, Math.round(image.naturalWidth * ratio)), h = Math.max(1, Math.round(image.naturalHeight * ratio));
    const rotated = document.createElement("canvas"); const sideways = settings.rotation % 180 !== 0;
    rotated.width = sideways ? h : w; rotated.height = sideways ? w : h;
    const context = rotated.getContext("2d")!; context.fillStyle = "white"; context.fillRect(0, 0, rotated.width, rotated.height); context.translate(rotated.width / 2, rotated.height / 2); context.rotate(settings.rotation * Math.PI / 180); context.drawImage(image, -w / 2, -h / 2, w, h);
    const x = Math.floor(rotated.width * settings.left / 100), y = Math.floor(rotated.height * settings.top / 100);
    const width = Math.max(1, Math.floor(rotated.width * (100 - settings.left - settings.right) / 100)), height = Math.max(1, Math.floor(rotated.height * (100 - settings.top - settings.bottom) / 100));
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; const ctx = canvas.getContext("2d")!; ctx.drawImage(rotated, x, y, width, height, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height); scanPixels(data.data, settings.mode, settings.threshold, settings.contrast); ctx.putImageData(data, 0, 0); rotated.width = 0;
    return canvas;
  } finally { URL.revokeObjectURL(url); }
}
const toBlob = (canvas: HTMLCanvasElement, type = "image/png") => new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Görsel oluşturulamadı.")), type, .94));
export default function DocumentScanner() {
  const [files, setFiles] = useState<File[]>([]), [selected, setSelected] = useState(0), [settings, setSettings] = useState<Settings>({ mode: "bw", threshold: 165, contrast: 35, rotation: 0, top: 0, bottom: 0, left: 0, right: 0 });
  const [format, setFormat] = useState("pdf"), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [camera, setCamera] = useState(false);
  const [cameraConnecting, setCameraConnecting] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null), video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);
  function stopCamera() { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; setCamera(false); }
  useEffect(() => () => { stream.current?.getTracks().forEach((track) => track.stop()); }, []);
  useEffect(() => { if (camera && video.current && stream.current) { video.current.srcObject = stream.current; void video.current.play().catch(() => setError("Kamera görüntüsü oynatılamadı.")); } }, [camera]);
  useEffect(() => {
    let active = true; if (!files[selected]) return;
    const timer = setTimeout(() => { void processImage(files[selected], settings).then((canvas) => { if (!active || !preview.current) return; preview.current.width = canvas.width; preview.current.height = canvas.height; preview.current.getContext("2d")!.drawImage(canvas, 0, 0); }).catch((e) => { if (active) setError(e.message); }); }, 120);
    return () => { active = false; clearTimeout(timer); };
  }, [files, selected, settings]);
  function add(next: File[]) {
    if (files.length + next.length > 20 || next.some((f) => f.size > 20 * 1024 * 1024 || !/^image\/(png|jpeg|webp)$/.test(f.type))) { setError("En fazla 20 sayfa; dosya başına 20 MB PNG, JPEG veya WebP seçin."); return; }
    setFiles((current) => [...current, ...next]); setError(""); setNotice("");
  }
  async function startCamera() {
    if (cameraConnecting || camera) return; setCameraConnecting(true); setError("");
    try { if (!navigator.mediaDevices?.getUserMedia) throw new Error("Kamera için HTTPS bağlantı ve kamera destekleyen bir tarayıcı gerekir. Dosya yüklemeyi de kullanabilirsiniz."); stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false }); setCamera(true); }
    catch (e) { setError(e instanceof DOMException && e.name === "NotAllowedError" ? "Kamera izni verilmedi. Tarayıcı izinlerini kontrol edin veya dosya yükleyin." : e instanceof DOMException && e.name === "NotFoundError" ? "Kamera bulunamadı. Dosya yüklemeyi kullanabilirsiniz." : e instanceof Error ? e.message : "Kamera izni alınamadı."); } finally { setCameraConnecting(false); }
  }
  async function capture() {
    if (!video.current?.videoWidth) return;
    const canvas = document.createElement("canvas"); canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight; canvas.getContext("2d")!.drawImage(video.current, 0, 0);
    add([new File([await toBlob(canvas, "image/jpeg")], `kamera-${files.length + 1}.jpg`, { type: "image/jpeg" })]);
  }
  async function download() {
    if (!files.length || busy) return; setBusy(true); setError("");
    try {
      const pdf = format === "pdf" && window.PDFLib ? await window.PDFLib.PDFDocument.create() : null;
      if (format === "pdf" && !pdf) throw new Error("PDF kütüphanesi yüklenemedi.");
      const zip = files.length > 1 && format !== "pdf" && window.JSZip ? new window.JSZip() : null;
      if (files.length > 1 && format !== "pdf" && !zip) throw new Error("ZIP kütüphanesi yüklenemedi.");
      for (const [i, file] of files.entries()) {
        setNotice(`${i + 1} / ${files.length} sayfa hazırlanıyor...`);
        const canvas = await processImage(file, settings);
        try {
          if (pdf) {
            const png = await pdf.embedPng(await (await toBlob(canvas)).arrayBuffer());
            const page = pdf.addPage([595.28, 841.89]); const ratio = Math.min(555.28 / png.width, 801.89 / png.height);
            const width = png.width * ratio, height = png.height * ratio;
            page.drawImage(png, { x: (595.28 - width) / 2, y: (841.89 - height) / 2, width, height });
          } else {
            const mime = format === "jpg" || format === "jpeg" ? "image/jpeg" : `image/${format}`;
            const blob = await toBlob(canvas, mime);
            if (blob.type !== mime) throw new Error("Bu tarayıcı seçilen görsel biçimini desteklemiyor. PNG veya JPEG seçin.");
            if (zip) zip.file(`belge-${String(i + 1).padStart(3, "0")}.${format}`, blob); else saveBlob(blob, `taranmis-belge.${format}`);
          }
        } finally { canvas.width = 0; }
      }
      if (pdf) saveBlob(new Blob([await pdf.save()], { type: "application/pdf" }), "taranmis-belge.pdf");
      if (zip) saveBlob(await zip.generateAsync({ type: "blob" }), "taranmis-belgeler.zip");
      setNotice("Tarama çıktınız hazır. Dosyalar cihazınızda işlendi.");
    } catch (e) { setError(e instanceof Error ? e.message : "Çıktı oluşturulamadı."); } finally { setBusy(false); }
  }
  return <section className="document-scanner"><Script src="/vendor/pdf-lib.min.js" /><Script src="/vendor/jszip.min.js" /><div className="studio-card"><h2>Evrağını taranmış belgeye dönüştür.</h2><p className="field-help">Kamerayla çek veya görsel yükle. Siyah beyaz / gri tonlama, kontrast, döndürme ve kenar kırpma uygula; PDF, PNG, JPEG veya WebP indir. Bu araç OCR yapmaz; belge görseli üretir.</p><div className="studio-actions"><label className="button button-navy upload-label">Görsel yükle<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }} /></label><button className="button button-quiet" disabled={busy || camera || cameraConnecting} onClick={() => void startCamera()}>{cameraConnecting ? "Kamera açılıyor..." : "Kamerayla tara"}</button>{camera && <button className="button button-quiet" onClick={stopCamera}>Kamerayı kapat</button>}</div>{camera && <div className="camera-capture"><video ref={video} autoPlay muted playsInline /><button className="button button-navy" disabled={files.length >= 20} onClick={() => void capture()}>Sayfayı çek ＋</button></div>}{error && <p className="notice error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}</div>{files.length > 0 && <div className="scanner-workspace"><div className="studio-card scanner-settings"><h3>{files.length} sayfa</h3><label>Önizleme sayfası<select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>{files.map((f, i) => <option value={i} key={i}>{i + 1}. {f.name}</option>)}</select></label><button className="button button-quiet" onClick={() => { setFiles(files.filter((_, i) => i !== selected)); setSelected(0); }}>Bu sayfayı kaldır</button><label>Tarama görünümü<select value={settings.mode} onChange={(e) => setSettings({ ...settings, mode: e.target.value })}><option value="bw">Siyah beyaz belge</option><option value="gray">Gri tonlama</option><option value="color">Orijinal renk</option></select></label><label>Eşik: {settings.threshold}<input type="range" disabled={settings.mode !== "bw"} min={70} max={230} value={settings.threshold} onChange={(e) => setSettings({ ...settings, threshold: Number(e.target.value) })} /></label><label>Kontrast: {settings.contrast}<input type="range" disabled={settings.mode === "color"} min={0} max={100} value={settings.contrast} onChange={(e) => setSettings({ ...settings, contrast: Number(e.target.value) })} /></label><button className="button button-quiet" onClick={() => setSettings({ ...settings, rotation: (settings.rotation + 90) % 360 })}>90° döndür ↻</button><fieldset><legend>Kenar kırpma · tüm sayfalara uygulanır</legend>{(["top", "bottom", "left", "right"] as const).map((edge, i) => <label key={edge}>{["Üst", "Alt", "Sol", "Sağ"][i]}: %{settings[edge]}<input type="range" min={0} max={30} value={settings[edge]} onChange={(e) => setSettings({ ...settings, [edge]: Number(e.target.value) })} /></label>)}</fieldset><label>Çıktı biçimi<select value={format} onChange={(e) => setFormat(e.target.value)}>{["pdf", "png", "jpg", "jpeg", "webp"].map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}</select></label><button className="button button-navy" disabled={busy} onClick={() => void download()}>{busy ? "Hazırlanıyor..." : "Taranmış belgeyi indir ↓"}</button><p className="field-help">Görsel çıktılar çok sayfalıysa ZIP olarak indirilir. Kamera açıkken çekilen sayfalar dosya listesinin sonuna eklenir.</p></div><div className="scanner-preview"><canvas ref={preview} aria-label="İşlenmiş belge önizlemesi" /></div></div>}</section>;
}
