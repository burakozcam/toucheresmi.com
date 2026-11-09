"use client";
import { useEffect, useRef, useState } from "react";
import DocumentScanner from "./scanner";
export default function PdfEditor() {
  const [mode, setMode] = useState("pdf"); const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => { const resize = (event: MessageEvent) => { if (event.source === frame.current?.contentWindow && event.data?.type === "kurumsal-tool-height" && Number.isFinite(event.data.height) && frame.current) frame.current.style.height = `${Math.max(700, Math.min(20000, event.data.height))}px`; }; window.addEventListener("message", resize); return () => window.removeEventListener("message", resize); }, []);
  return <div className="pdf-editor"><div className="editor-tabs"><button className={`button ${mode === "edit" ? "button-navy" : "button-quiet"}`} onClick={() => setMode("edit")}>PDF Editörü · sayfa / metin / resim</button><button className={`button ${mode === "pdf" ? "button-navy" : "button-quiet"}`} onClick={() => setMode("pdf")}>PDF ve görsel araçları</button><button className={`button ${mode === "scan" ? "button-navy" : "button-quiet"}`} onClick={() => setMode("scan")}>Belge tara · kamera / dosya</button></div>{mode === "scan" ? <DocumentScanner /> : <iframe key={mode} ref={frame} className="tool-frame" src={mode === "edit" ? "/araclar/pdf-page-editor.html" : "/araclar/pdf-tools.html"} title="PDF Düzenleyici" sandbox={mode === "edit" ? "allow-scripts allow-downloads allow-same-origin allow-modals" : "allow-scripts allow-downloads"} referrerPolicy="no-referrer" />}</div>;
}
