"use client";

import Script from "next/script";
import { useMemo, useState } from "react";
import { buildCohortContext, evaluate, parseEvaluation, questionColumn, scaledScore } from "../../lib/evaluation";
import type { EvaluationData, Lesson } from "../../lib/evaluation";
import CoefficientHelp from "../panel/coefficient-help";
import CoefficientChoice from "../panel/coefficient-choice";
import ReportCard from "./report-card";
import { EXAM_PRESETS } from "../../config/exam-presets";
import type { Workbook } from "../../lib/sheetjs";

const presets = Object.fromEntries(Object.entries(EXAM_PRESETS).map(([id, preset]) => [id, preset.lessons]));
const fmt = (n: number|null) => n===null?"—":new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n);
const sum = (rows: ReturnType<typeof evaluate>, key: "correct" | "wrong" | "blank" | "cancelled" | "net" | "weighted") => rows.reduce((total, r) => total + (r[key]??0), 0);

export default function EvaluationTool() {
  const [presetId, setPresetId] = useState("custom");
  const [includeOutcomes, setIncludeOutcomes] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [scale, setScale] = useState<100 | 500>(100);
  const [printMode, setPrintMode] = useState("color");
  const [lessons, setLessons] = useState<Lesson[]>(presets.custom.map((l) => ({ ...l,weight:null })));
  const [examName, setExamName] = useState("Deneme Sınavı");
  const [data, setData] = useState<EvaluationData | null>(null);
  const [penalty, setPenalty] = useState(0);
  const [weights, setWeights] = useState<Record<string, number|null>>({});
  const [acceptedMissing,setAcceptedMissing]=useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [branch, setBranch] = useState("");
  const [mode, setMode] = useState("individual");
  const [selected, setSelected] = useState("");
  const [fileName, setFileName] = useState("");
  const branches = useMemo(() => [...new Set(data?.students.map((s) => JSON.stringify([s.school, s.branch])) ?? [])], [data]);
  const filtered = useMemo(() => data?.students.filter((s) => !branch || JSON.stringify([s.school, s.branch]) === branch) ?? [], [branch, data]);
  const cohortContext = useMemo(() => data ? buildCohortContext(data, penalty, weights, scale) : undefined, [data, penalty, weights, scale]);
  const reports = useMemo(() => filtered.map((student) => ({ student, results: evaluate(data!.questions, student, penalty, weights) })), [filtered, data, penalty, weights]);
  const visible = mode === "individual" ? reports.filter(({ student }) => JSON.stringify([student.id, student.school, student.branch]) === selected).slice(0, 1) : reports;

  function updateLesson(index: number, change: Partial<Lesson>) {
    setLessons((current) => current.map((lesson, i) => i === index ? { ...lesson, ...change } : lesson));
  }
  function append(book: Workbook, name: string, rows: unknown[][], widths?: number[]) {
    const xlsx = window.XLSX!;
    const sheet = xlsx.utils.aoa_to_sheet(rows);
    if (widths) sheet["!cols"] = widths.map((wch) => ({ wch }));
    sheet["!autofilter"] = { ref: `A1:${String.fromCharCode(64 + Math.min(rows[0].length, 4))}${rows.length}` };
    xlsx.utils.book_append_sheet(book, sheet, name);
  }
  function downloadTemplate() {
    setError("");
    const names = lessons.map((l) => l.name.trim());
    const total = lessons.reduce((n, l) => n + l.count, 0);
    if (!names.length || names.some((n) => !n || n.length > 80) || new Set(names).size !== names.length || lessons.some((l) => !Number.isInteger(l.count) || l.count < 1 || l.count > 300 || (l.weight!==null&&(!Number.isFinite(l.weight) || l.weight <= 0 || l.weight > 100))) || total > 300) {
      setError("Ders adları benzersiz olmalı; toplam 1–300 soru ve 0–100 aralığında pozitif katsayı girin veya katsayıyı boş bırakın."); return;
    }
    if (!window.XLSX) { setError("Excel aracı yüklenemedi. Sayfayı yenileyin."); return; }
    const book = window.XLSX.utils.book_new();
    append(book, "Kılavuz", [
      ["KURUMSAL SINAV", "Excel Değerlendirme Şablonu v2 · Ders başına tek cevap hücresi"],
      ["Sınav", examName.trim() || "Deneme Sınavı"],
      ["Yanlış götürme", penalty], ["Puan ölçeği", scale], ["Şablon", presetId],
      ["1 · Cevap Anahtarı", "Her satır bir sorudur. Ders, Soru ve Katsayı hazırdır. Doğru Cevap alanına A, B, C, D veya E yazın. İptal edilen soruya X yazın; bu sorular puana dahil edilmez."],
      ["2 · Öğrenci bilgileri", "Öğrenci Cevapları sayfasında her öğrenci TEK SATIRDIR. Öğrenci No ve Ad Soyad zorunludur. Numara hücresini metin biçiminde tutun; örneğin 001 numarası korunur."],
      ["3 · Okul ve şube", "Okul ve Şube alanlarını tutarlı yazın (örn. Atatürk Ortaokulu / 8-A). Karşılaştırmalar yalnızca dosyanızdaki AYNI OKUL öğrencileri arasında yapılır. Aynı okul ve şubede öğrenci numarası yinelenemez."],
      ["4 · Ders cevapları", "Türkçe Cevapları gibi her ders için TEK HÜCRE vardır. Cevapları 1. sorudan başlayarak yan yana yazın. Örnek 8 soruluk ders: ABCD--EA. Bu örnekte 5 ve 6. sorular boştur. Virgül, noktalı virgül veya ayırıcı eklemeyin."],
      ["5 · Boş cevap", "Boş soruya mutlaka - yazın. 20 soruluk ders için hücre 20 karakter olmalıdır; eksik yazarsanız soru kaymasını engellemek için yükleme reddedilir. Dersin tümü boşsa hücre tamamen boş kalabilir."],
      ["6 · İptal soru", "İptal sorunun Cevap Anahtarı değerini X yapın. Öğrenci cevap zincirinde o sorunun YERİNİ koruyun; - veya öğrencinin işaretini yazın. İptal soruyu zincirden çıkarmayın."],
      ["7 · Kazanımlar", includeOutcomes ? "Cevap Anahtarı sayfasına Kazanım Kodu ve Kazanım Adı eklendi. Örn. T.8.3.1 / Metindeki ana fikri belirler. Kodu ve adı birlikte doldurun; aynı kazanım birden fazla soruda kullanılabilir. İkisini de boş bırakmak mümkündür." : "Bu şablon kazanımsızdır. Kazanım raporu için sitede Kazanım ekle seçeneğini işaretleyip yeni şablon indirin."],
      ["8 · Katsayılar", "Ders içindeki katsayılar tutarlı olmalıdır. Hazır şablonlar 2026 MEB/ÖSYM kılavuzundaki soru sayılarını ve test ağırlıklarını esas alır. YKS'de yüzdeler yerel hesap için soru başına bölünür. Yükledikten sonra katsayıları değiştirebilirsiniz."],
      ["9 · Net ve puan", "Net = Doğru − Yanlış / seçilen oran. Yanlış götürmüyorsa net = doğru. Puan, katsayılı netin mümkün olan katsayılı toplama oranının 100 veya 500 ile çarpılmasıdır; negatif sonuçlar 0'a sabitlenir. Resmî sınav puanı değildir."],
      ["10 · Karne", "Dosyayı sitede geri yükleyin. Anahtarı, katsayıları ve yanlış götürmeyi kontrol edip onaylayın. Öğrenci / toplu karne / şube listesi seçin. İsteğe bağlı soru analizi ve renkli / siyah beyaz PDF seçeneklerini belirleyin."],
      ["11 · Sınırlar", "En fazla 500 öğrenci, 300 soru, 10 MB. Sayfa adlarını ve sütun başlıklarını değiştirmeyin. Dosyanız sunucuya gönderilmez; sayfa kapanınca sonuçlar silinir. Eski soru-sütunlu v1 şablonları da okunur."],
      ["Resmî kaynak", EXAM_PRESETS[presetId]?.source ?? "Özel sınav · katsayılar kullanıcı tarafından belirlenir."],
    ], [30, 120]);
    const key: unknown[][] = [["Ders", "Soru", "Doğru Cevap", "Katsayı", ...(includeOutcomes ? ["Kazanım Kodu", "Kazanım Adı"] : [])]];
    const headers = ["Öğrenci No", "Ad Soyad", "Okul", "Şube"];
    lessons.forEach((l) => { for (let i = 1; i <= l.count; i++) key.push([l.name.trim(), i, "", l.weight, ...(includeOutcomes ? ["", ""] : [])]); headers.push(`${l.name.trim()} Cevapları`); });
    append(book, "Cevap Anahtarı", key, [24, 10, 18, 16, ...(includeOutcomes ? [24, 65] : [])]);
    append(book, "Öğrenci Cevapları", [headers], headers.map((_, i) => i < 4 ? [18, 28, 28, 16][i] : 50));
    window.XLSX.writeFile(book, "kurumsal-sinav-sablon.xlsx");
  }
  async function loadFile(file?: File) {
    if (!file || busy) return;
    setBusy(true); setError(""); setData(null); setConfirmed(false); setFileName("");
    try {
      if (!/\.xlsx$/i.test(file.name) || file.size > 10 * 1024 * 1024) throw new Error("En fazla 10 MB boyutunda bir XLSX şablonu seçin.");
      if (!window.XLSX) throw new Error("Excel aracı hazır değil. Sayfayı yenileyin.");
      const book = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellFormula: false, sheetRows: 502 });
      const rows = (name: string) => {
        const sheet = book.Sheets[name];
        if (!sheet) throw new Error(`${name} sayfası eksik. Siteden indirdiğiniz şablonu kullanın.`);
        const range = window.XLSX!.utils.decode_range(String(sheet["!fullref"] ?? sheet["!ref"] ?? "A1"));
        if (range.e.r > 500 || range.e.c > 303) throw new Error(`${name}: en fazla 500 öğrenci ve 300 soru desteklenir.`);
        return window.XLSX!.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
      };
      const parsed = parseEvaluation(rows("Cevap Anahtarı"), rows("Öğrenci Cevapları"));
      const guide = book.Sheets["Kılavuz"] ? window.XLSX.utils.sheet_to_json(book.Sheets["Kılavuz"], { header: 1, defval: "" }) : [];
      if (guide[1]?.[0] === "Sınav" && String(guide[1]?.[1] ?? "").trim()) setExamName(String(guide[1][1]).slice(0, 180));
      const savedScale = guide.find((row) => row[0] === "Puan ölçeği")?.[1];
      if ([100, 500].includes(Number(savedScale))) setScale(Number(savedScale) as 100 | 500);
      const savedPenalty = guide.find((row) => row[0] === "Yanlış götürme")?.[1];
      if (savedPenalty !== undefined && [0, 3, 4].includes(Number(savedPenalty))) setPenalty(Number(savedPenalty));
      setAcceptedMissing(false);setData(parsed); setWeights(Object.fromEntries(parsed.questions.map((q) => [q.lesson, q.weight]))); setBranch("");
      const first = parsed.students[0]; setSelected(JSON.stringify([first.id, first.school, first.branch]));
      setFileName(file.name);
    } catch (e) { setError(e instanceof Error ? e.message : "Dosya okunamadı."); }
    finally { setBusy(false); }
  }
  function downloadResults() {
    if (!window.XLSX || !confirmed) return;
    const book = window.XLSX.utils.book_new();
    append(book, "Sonuçlar", [["Öğrenci No", "Ad Soyad", "Okul", "Şube", "Doğru", "Yanlış", "Boş", "İptal", "Net", "Katsayılı Net", `Puan / ${scale}`], ...reports.map(({ student: s, results: r }) => [s.id, s.name, s.school, s.branch, ...(["correct", "wrong", "blank", "cancelled", "net", "weighted"] as const).map((key) => key==="weighted"&&r.some(l=>l.weighted===null)?null:Number(sum(r, key).toFixed(4))), scaledScore(data!.questions, s, penalty, weights, scale)])], [18, 28, 26, 16, 12, 12, 12, 12, 14, 18, 16]);
    window.XLSX.writeFile(book, "sinav-sonuclari.xlsx");
  }
  const settingsValid = (!Object.values(weights).some(w=>w===null)||acceptedMissing) && Object.values(weights).every((w) => w===null || (Number.isFinite(w) && w > 0 && w <= 100));

  return <>
    <Script src="/vendor/xlsx.full.min.js" strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setError("Excel aracı yüklenemedi. Lütfen sayfayı yenileyin.")} />
    <ol className="evaluation-steps"><li><b>01</b> Şablonu hazırla</li><li><b>02</b> Doldur ve yükle</li><li><b>03</b> Kontrol et, karne al</li></ol>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="evaluation-setup">
      <section className="studio-card"><p className="hero-tag">01 · EXCEL ŞABLONU</p><h2>Sınavın sana özel.</h2><label>Sınav adı<input value={examName} maxLength={180} onChange={(e) => setExamName(e.target.value)} /></label><label>Başlangıç düzeni<select value={presetId} onChange={(e) => { setPresetId(e.target.value); setLessons(presets[e.target.value].map((l) => ({ ...l }))); setPenalty(EXAM_PRESETS[e.target.value].penalty); setScale(e.target.value === "custom" ? 100 : 500); setConfirmed(false); }}>{Object.entries(EXAM_PRESETS).map(([id, preset]) => <option key={id} value={id}>{preset.title}</option>)}</select></label>
        <p className="field-help">{EXAM_PRESETS[presetId].note} {EXAM_PRESETS[presetId].source && <a href={EXAM_PRESETS[presetId].source} target="_blank" rel="noreferrer">Resmî kılavuz ↗</a>}<br />Dersleri, soru sayılarını ve katsayıları değiştirebilirsiniz.</p><label className="checkbox-row"><input type="checkbox" checked={includeOutcomes} onChange={(e) => setIncludeOutcomes(e.target.checked)} />Şablona kazanım kodu ve kazanım adı ekle</label>
        <label>Şablondaki puan ölçeği<select value={scale} onChange={(e) => setScale(Number(e.target.value) as 100 | 500)}><option value={100}>100 üzerinden</option><option value={500}>500 üzerinden</option></select></label>
        <div className="lesson-editor"><div className="lesson-editor-head"><span>Ders adı</span><span>Soru</span><span>Katsayı</span><span /></div>{lessons.map((l, i) => <div className="lesson-editor-row" key={i}><input aria-label={`${i + 1}. ders adı`} value={l.name} maxLength={80} onChange={(e) => updateLesson(i, { name: e.target.value })} /><input aria-label={`${l.name} soru sayısı`} type="number" min={1} max={300} value={l.count || ""} onChange={(e) => updateLesson(i, { count: Number(e.target.value) })} /><input aria-label={`${l.name} katsayı`} type="number" min={0.01} max={100} step="any" value={l.weight || ""} onChange={(e) => updateLesson(i, { weight: e.target.value===""?null:Number(e.target.value) })} /><button type="button" className="icon-button" aria-label={`${l.name} dersini kaldır`} onClick={() => setLessons(lessons.filter((_, n) => n !== i))}>×</button></div>)}</div>
        <div className="studio-actions"><button className="button button-quiet" onClick={() => setLessons([...lessons, { name: "", count: 10, weight: 1 }])} disabled={lessons.length >= 20}>＋ Ders ekle</button><button className="button button-navy" onClick={downloadTemplate} disabled={!ready}>Şablonu indir ↓</button></div>
      </section>
      <section className="studio-card upload-studio"><p className="hero-tag">02 · DOLDUR VE GERİ YÜKLE</p><h2>Cevaplar hazır mı?</h2><p>Cevap anahtarını ders ders doldur. Öğrenci sayfasında her öğrencinin numarasını, adını, okulunu, şubesini ve cevaplarını yaz.</p><div className="upload-zone"><span className="upload-symbol">↥</span><label>Doldurulmuş Excel dosyasını seç<input type="file" accept=".xlsx" disabled={!ready || busy} onChange={(e) => { void loadFile(e.target.files?.[0]); e.target.value = ""; }} /></label><small>{busy ? "Dosya kontrol ediliyor..." : fileName || "XLSX · en fazla 10 MB / 500 öğrenci"}</small></div><div className="studio-note"><strong>Boş, yanlış, iptal: hepsi ayrı.</strong><p>Boş soru için - yazın; dersin tümü boşsa cevap hücresi boş kalabilir. İptal sorunun doğru cevabına X yazın ve cevap zincirindeki yerini koruyun. Hatalı veya eksik kayıt varsa sonuç üretmeden önce sizi uyarırız.</p></div></section>
    </div>
    {data && <section className="studio-card evaluation-results"><p className="hero-tag">03 · KONTROL VE RAPOR</p><h2>{data.students.length} öğrenci, {data.questions.length} soru. Son kontrol sende.</h2>
      <CoefficientHelp/><CoefficientChoice key={JSON.stringify(weights)} missing={Object.values(weights).some(w=>w===null)} onAccept={accepted=>{setAcceptedMissing(accepted);if(!accepted)setConfirmed(false);}} onDefine={()=>document.querySelector<HTMLInputElement>('.report-settings input[type="number"]')?.focus()}/><div className="report-settings"><label>Yanlış götürme<select value={penalty} onChange={(e) => { setPenalty(Number(e.target.value)); setConfirmed(false); }}><option value={0}>Yanlış doğruyu götürmez</option><option value={3}>3 yanlış 1 doğruyu götürür</option><option value={4}>4 yanlış 1 doğruyu götürür</option></select></label>{Object.entries(weights).map(([name, weight]) => <label key={name}>{name} katsayısı<input type="number" min={0.01} max={100} step="any" value={weight || ""} onChange={(e) => { setWeights({ ...weights, [name]: e.target.value===""?null:Number(e.target.value) }); setConfirmed(false); }} /></label>)}</div>
      <p className="field-help">Yüklenen dosyadaki katsayıları kullanıyoruz. Başlangıç önerileri resmî puan hesabı değildir. Net = doğru − yanlış / oran; iptal sorular hariçtir.</p>
      <details className="key-review"><summary>Cevap anahtarını kontrol et</summary><div className="answer-review-grid">{data.questions.map((q) => <span key={q.column}>{q.lesson} {q.number}<b>{q.answer === "X" ? "İPTAL" : q.answer}</b></span>)}</div></details>
      <label className="confirm-evaluation"><input type="checkbox" checked={confirmed} disabled={!settingsValid} onChange={(e) => setConfirmed(e.target.checked)} />Cevap anahtarını, yanlış götürme oranını ve katsayıları kontrol ettim.</label>
      <div className="report-settings"><label>Okul / şube<select value={branch} onChange={(e) => { setBranch(e.target.value); const first = data.students.find((s) => !e.target.value || JSON.stringify([s.school, s.branch]) === e.target.value)!; setSelected(JSON.stringify([first.id, first.school, first.branch])); }}><option value="">Tüm okullar ve şubeler</option>{branches.map((b) => <option key={b} value={b}>{(JSON.parse(b) as string[]).join(" · ")}</option>)}</select></label><label>Karne / liste türü<select value={mode} onChange={(e) => { setMode(e.target.value); if (e.target.value === "branch-list" && !branch && branches[0]) { setBranch(branches[0]); const first = data.students.find((s) => JSON.stringify([s.school, s.branch]) === branches[0])!; setSelected(JSON.stringify([first.id, first.school, first.branch])); } }}><option value="individual">Öğrenci karnesi</option><option value="bulk">Toplu öğrenci karneleri</option><option value="list">Toplu sonuç listesi</option><option value="branch-list">Şube sonuç listesi</option></select></label>{mode === "individual" && <label>Öğrenci<select value={selected} onChange={(e) => setSelected(e.target.value)}>{filtered.map((s) => <option key={JSON.stringify([s.id, s.school, s.branch])} value={JSON.stringify([s.id, s.school, s.branch])}>{s.name} · {s.id}</option>)}</select></label>}</div>
      <div className="report-settings"><label>Puan ölçeği<select value={scale} onChange={(e) => setScale(Number(e.target.value) as 100 | 500)}><option value={100}>100 üzerinden</option><option value={500}>500 üzerinden</option></select></label><label>PDF renk seçimi<select value={printMode} onChange={(e) => setPrintMode(e.target.value)}><option value="color">Renkli</option><option value="monochrome">Siyah beyaz</option></select></label><label className="checkbox-row"><input type="checkbox" checked={showQuestions} onChange={(e) => setShowQuestions(e.target.checked)} />Karneye soru bazında kurum karşılaştırması ekle</label></div>
      <div className="studio-actions"><span className="field-help">{filtered.length} öğrenci · çıktıyı aşağıda inceleyin</span><button className="button button-quiet" disabled={!confirmed || !settingsValid} onClick={downloadResults}>Sonuçları Excel indir</button><button className="button button-navy" disabled={!confirmed || !settingsValid || !visible.length} onClick={() => window.print()}>Karne / listeyi PDF kaydet ↗</button></div><p className="field-help">PDF düğmesi yazdırma ekranını açar. Hedef olarak “PDF olarak kaydet” seçin. Renkler için arka plan grafiklerini açabilirsiniz; durumlar harfle de belirtilir.</p>

      <div className={`report-print-area ${printMode === "monochrome" ? "report-monochrome" : ""}`}>
        {(mode === "list" || mode === "branch-list") ? <article className="student-report"><ReportHeader exam={examName} subtitle={branch ? (JSON.parse(branch) as string[]).join(" · ") : "Toplu sonuç listesi"} /><div className="table-scroll"><table className="result-table"><thead><tr><th>Öğrenci</th><th>Okul / Şube</th><th>D</th><th>Y</th><th>B</th><th>İ</th><th>Net</th><th>Puan / {scale}</th></tr></thead><tbody>{reports.map(({ student: s, results: r }, i) => <tr key={i}><td>{s.name}<small>{s.id}</small></td><td>{s.school} / {s.branch}</td>{(["correct", "wrong", "blank", "cancelled", "net"] as const).map((k) => <td key={k}>{fmt(sum(r, k))}</td>)}<td>{fmt(scaledScore(data.questions, s, penalty, weights, scale))}</td></tr>)}</tbody></table></div><ReportFoot penalty={penalty} confirmed={confirmed} /></article> : visible.map(({ student }, i) => <ReportCard key={i} data={data} student={student} exam={examName} penalty={penalty} weights={weights} scale={scale} showQuestions={showQuestions} confirmed={confirmed} context={cohortContext} />)}
      </div>
    </section>}
  </>;
}

function ReportHeader({ exam, subtitle }: { exam: string; subtitle: string }) { return <header className="report-header"><div className="brand"><span className="brand-mark">K</span><span>Kurumsal Sınav</span></div><div><strong>{exam || "Deneme Sınavı"}</strong><p>{subtitle}</p></div></header>; }
function ReportFoot({ penalty, confirmed }: { penalty: number; confirmed: boolean }) { return <footer className="report-foot">{!confirmed && <strong>ÖNİZLEME · Kontrol onayı bekleniyor. </strong>}{penalty ? `Net = Doğru − Yanlış / ${penalty}.` : "Net = Doğru."} İptal sorular hesaba katılmaz. Katsayılı net resmî sınav puanı değildir.<br />kurumsalsinav.com · Öğrenmeyi görünür kıl.</footer>; }
