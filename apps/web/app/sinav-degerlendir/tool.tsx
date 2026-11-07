"use client";

import Script from "next/script";
import { useMemo, useState } from "react";
import { evaluate, parseEvaluation, questionColumn, questionState } from "../../lib/evaluation";
import type { EvaluationData, Lesson } from "../../lib/evaluation";
import type { Workbook } from "../../lib/sheetjs";

const presets: Record<string, Lesson[]> = {
  custom: [{ name: "Türkçe", count: 20, weight: 1 }, { name: "Matematik", count: 20, weight: 1 }],
  lgs: [{ name: "Türkçe", count: 20, weight: 4 }, { name: "Matematik", count: 20, weight: 4 }, { name: "Fen Bilimleri", count: 20, weight: 4 }, { name: "İnkılap Tarihi", count: 10, weight: 1 }, { name: "Din Kültürü", count: 10, weight: 1 }, { name: "İngilizce", count: 10, weight: 1 }],
  tyt: [{ name: "Türkçe", count: 40, weight: 1 }, { name: "Sosyal Bilimler", count: 20, weight: 1 }, { name: "Matematik", count: 40, weight: 1 }, { name: "Fen Bilimleri", count: 20, weight: 1 }],
};
const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n);
const sum = (rows: ReturnType<typeof evaluate>, key: "correct" | "wrong" | "blank" | "cancelled" | "net" | "weighted") => rows.reduce((total, r) => total + r[key], 0);

export default function EvaluationTool() {
  const [lessons, setLessons] = useState<Lesson[]>(presets.custom.map((l) => ({ ...l })));
  const [examName, setExamName] = useState("Deneme Sınavı");
  const [data, setData] = useState<EvaluationData | null>(null);
  const [penalty, setPenalty] = useState(0);
  const [weights, setWeights] = useState<Record<string, number>>({});
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
    if (!names.length || names.some((n) => !n || n.length > 80) || new Set(names).size !== names.length || lessons.some((l) => !Number.isInteger(l.count) || l.count < 1 || l.count > 300 || !Number.isFinite(l.weight) || l.weight <= 0 || l.weight > 100) || total > 300) {
      setError("Ders adları benzersiz olmalı; toplam 1–300 soru ve 0–100 aralığında pozitif katsayı girin."); return;
    }
    if (!window.XLSX) { setError("Excel aracı yüklenemedi. Sayfayı yenileyin."); return; }
    const book = window.XLSX.utils.book_new();
    append(book, "Kılavuz", [
      ["KURUMSAL SINAV", "Excel Değerlendirme Şablonu v1"],
      ["Sınav", examName.trim() || "Deneme Sınavı"],
      ["Yanlış götürme", penalty],
      ["1", "Cevap Anahtarı sayfasındaki boş doğru cevapları A, B, C, D veya E ile doldurun. İptal soru için X yazın."],
      ["2", "Öğrenci Cevapları: Her öğrenci tek satırdır. Öğrenci No ve Ad Soyad zorunludur. Numara alanını metin olarak tutun."],
      ["3", "Okul ve Şube alanlarını doldurarak şube bazlı karne/listeler alabilirsiniz. Aynı şubede öğrenci numarası yinelenemez."],
      ["4", "Öğrenci cevabı A–E olabilir. Boş soruyu boş bırakın. Örnek öğrenci içermez; ilk öğrenci satırından doldurun."],
      ["5", "Başlıkları ve sayfa adlarını değiştirmeyin. Katsayıları yükledikten sonra ekranda da düzenleyebilirsiniz."],
      ["6", "Yanlış götürme oranını sitede seçin. İptal sorular hesaba katılmaz. Katsayılı net resmî sınav puanı değildir."],
      ["7", "En fazla 500 öğrenci, 300 soru ve 10 MB. Dosyanız sunucuya yüklenmez."],
    ], [24, 110]);
    const key: unknown[][] = [["Ders", "Soru", "Doğru Cevap", "Katsayı"]];
    const headers = ["Öğrenci No", "Ad Soyad", "Okul", "Şube"];
    lessons.forEach((l) => { for (let i = 1; i <= l.count; i++) { key.push([l.name.trim(), i, "", l.weight]); headers.push(questionColumn(l.name.trim(), i)); } });
    append(book, "Cevap Anahtarı", key, [24, 10, 18, 12]);
    append(book, "Öğrenci Cevapları", [headers], headers.map((_, i) => i < 4 ? [18, 28, 28, 16][i] : 20));
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
      const savedPenalty = guide.find((row) => row[0] === "Yanlış götürme")?.[1];
      if (savedPenalty !== undefined && [0, 3, 4].includes(Number(savedPenalty))) setPenalty(Number(savedPenalty));
      setData(parsed); setWeights(Object.fromEntries(parsed.questions.map((q) => [q.lesson, q.weight]))); setBranch("");
      const first = parsed.students[0]; setSelected(JSON.stringify([first.id, first.school, first.branch]));
      setFileName(file.name);
    } catch (e) { setError(e instanceof Error ? e.message : "Dosya okunamadı."); }
    finally { setBusy(false); }
  }
  function downloadResults() {
    if (!window.XLSX || !confirmed) return;
    const book = window.XLSX.utils.book_new();
    append(book, "Sonuçlar", [["Öğrenci No", "Ad Soyad", "Okul", "Şube", "Doğru", "Yanlış", "Boş", "İptal", "Net", "Katsayılı Net"], ...reports.map(({ student: s, results: r }) => [s.id, s.name, s.school, s.branch, ...(["correct", "wrong", "blank", "cancelled", "net", "weighted"] as const).map((key) => Number(sum(r, key).toFixed(4)))])], [18, 28, 26, 16, 12, 12, 12, 12, 14, 18]);
    window.XLSX.writeFile(book, "sinav-sonuclari.xlsx");
  }
  const settingsValid = Object.values(weights).every((w) => Number.isFinite(w) && w > 0 && w <= 100);

  return <>
    <Script src="/vendor/xlsx.full.min.js" strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setError("Excel aracı yüklenemedi. Lütfen sayfayı yenileyin.")} />
    <ol className="evaluation-steps"><li><b>01</b> Şablonu hazırla</li><li><b>02</b> Doldur ve yükle</li><li><b>03</b> Kontrol et, karne al</li></ol>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="evaluation-setup">
      <section className="studio-card"><p className="hero-tag">01 · EXCEL ŞABLONU</p><h2>Sınavın sana özel.</h2><label>Sınav adı<input value={examName} maxLength={180} onChange={(e) => setExamName(e.target.value)} /></label><label>Başlangıç düzeni<select defaultValue="custom" onChange={(e) => { setLessons(presets[e.target.value].map((l) => ({ ...l }))); setPenalty(e.target.value === "lgs" ? 3 : e.target.value === "tyt" ? 4 : 0); setConfirmed(false); }}><option value="custom">Özel sınav · eşit katsayı</option><option value="lgs">LGS tarzı · düzenlenebilir öneri</option><option value="tyt">TYT tarzı · eşit katsayı</option></select></label>
        <p className="field-help">Başlangıç düzeni yalnızca öneridir. Dersleri, soru sayılarını ve katsayıları istediğiniz gibi değiştirin.</p>
        <div className="lesson-editor"><div className="lesson-editor-head"><span>Ders adı</span><span>Soru</span><span>Katsayı</span><span /></div>{lessons.map((l, i) => <div className="lesson-editor-row" key={i}><input aria-label={`${i + 1}. ders adı`} value={l.name} maxLength={80} onChange={(e) => updateLesson(i, { name: e.target.value })} /><input aria-label={`${l.name} soru sayısı`} type="number" min={1} max={300} value={l.count || ""} onChange={(e) => updateLesson(i, { count: Number(e.target.value) })} /><input aria-label={`${l.name} katsayı`} type="number" min={0.01} max={100} step="any" value={l.weight || ""} onChange={(e) => updateLesson(i, { weight: Number(e.target.value) })} /><button type="button" className="icon-button" aria-label={`${l.name} dersini kaldır`} onClick={() => setLessons(lessons.filter((_, n) => n !== i))}>×</button></div>)}</div>
        <div className="studio-actions"><button className="button button-quiet" onClick={() => setLessons([...lessons, { name: "", count: 10, weight: 1 }])} disabled={lessons.length >= 20}>＋ Ders ekle</button><button className="button button-navy" onClick={downloadTemplate} disabled={!ready}>Şablonu indir ↓</button></div>
      </section>
      <section className="studio-card upload-studio"><p className="hero-tag">02 · DOLDUR VE GERİ YÜKLE</p><h2>Cevaplar hazır mı?</h2><p>Cevap anahtarını ders ders doldur. Öğrenci sayfasında her öğrencinin numarasını, adını, okulunu, şubesini ve cevaplarını yaz.</p><div className="upload-zone"><span className="upload-symbol">↥</span><label>Doldurulmuş Excel dosyasını seç<input type="file" accept=".xlsx" disabled={!ready || busy} onChange={(e) => { void loadFile(e.target.files?.[0]); e.target.value = ""; }} /></label><small>{busy ? "Dosya kontrol ediliyor..." : fileName || "XLSX · en fazla 10 MB / 500 öğrenci"}</small></div><div className="studio-note"><strong>Boş, yanlış, iptal: hepsi ayrı.</strong><p>Boş cevabı boş bırakın. İptal sorunun doğru cevabına X yazın. Hatalı veya eksik kayıt varsa sonuç üretmeden önce sizi uyarırız.</p></div></section>
    </div>
    {data && <section className="studio-card evaluation-results"><p className="hero-tag">03 · KONTROL VE RAPOR</p><h2>{data.students.length} öğrenci, {data.questions.length} soru. Son kontrol sende.</h2>
      <div className="report-settings"><label>Yanlış götürme<select value={penalty} onChange={(e) => { setPenalty(Number(e.target.value)); setConfirmed(false); }}><option value={0}>Yanlış doğruyu götürmez</option><option value={3}>3 yanlış 1 doğruyu götürür</option><option value={4}>4 yanlış 1 doğruyu götürür</option></select></label>{Object.entries(weights).map(([name, weight]) => <label key={name}>{name} katsayısı<input type="number" min={0.01} max={100} step="any" value={weight || ""} onChange={(e) => { setWeights({ ...weights, [name]: Number(e.target.value) }); setConfirmed(false); }} /></label>)}</div>
      <p className="field-help">Yüklenen dosyadaki katsayıları kullanıyoruz. Başlangıç önerileri resmî puan hesabı değildir. Net = doğru − yanlış / oran; iptal sorular hariçtir.</p>
      <details className="key-review"><summary>Cevap anahtarını kontrol et</summary><div className="answer-review-grid">{data.questions.map((q) => <span key={q.column}>{q.lesson} {q.number}<b>{q.answer === "X" ? "İPTAL" : q.answer}</b></span>)}</div></details>
      <label className="confirm-evaluation"><input type="checkbox" checked={confirmed} disabled={!settingsValid} onChange={(e) => setConfirmed(e.target.checked)} />Cevap anahtarını, yanlış götürme oranını ve katsayıları kontrol ettim.</label>
      <div className="report-settings"><label>Okul / şube<select value={branch} onChange={(e) => { setBranch(e.target.value); const first = data.students.find((s) => !e.target.value || JSON.stringify([s.school, s.branch]) === e.target.value)!; setSelected(JSON.stringify([first.id, first.school, first.branch])); }}><option value="">Tüm okullar ve şubeler</option>{branches.map((b) => <option key={b} value={b}>{(JSON.parse(b) as string[]).join(" · ")}</option>)}</select></label><label>Karne / liste türü<select value={mode} onChange={(e) => { setMode(e.target.value); if (e.target.value === "branch-list" && !branch && branches[0]) setBranch(branches[0]); }}><option value="individual">Öğrenci karnesi</option><option value="bulk">Toplu öğrenci karneleri</option><option value="list">Toplu sonuç listesi</option><option value="branch-list">Şube sonuç listesi</option></select></label>{mode === "individual" && <label>Öğrenci<select value={selected} onChange={(e) => setSelected(e.target.value)}>{filtered.map((s) => <option key={JSON.stringify([s.id, s.school, s.branch])} value={JSON.stringify([s.id, s.school, s.branch])}>{s.name} · {s.id}</option>)}</select></label>}</div>
      <div className="studio-actions"><span className="field-help">{filtered.length} öğrenci · çıktıyı aşağıda inceleyin</span><button className="button button-quiet" disabled={!confirmed || !settingsValid} onClick={downloadResults}>Sonuçları Excel indir</button><button className="button button-navy" disabled={!confirmed || !settingsValid || !visible.length} onClick={() => window.print()}>Karne / listeyi PDF kaydet ↗</button></div><p className="field-help">PDF düğmesi yazdırma ekranını açar. Hedef olarak “PDF olarak kaydet” seçin. Renkler için arka plan grafiklerini açabilirsiniz; durumlar harfle de belirtilir.</p>
      <div className="report-print-area">
        {(mode === "list" || mode === "branch-list") ? <article className="student-report"><ReportHeader exam={examName} subtitle={branch ? (JSON.parse(branch) as string[]).join(" · ") : "Toplu sonuç listesi"} /><div className="table-scroll"><table className="result-table"><thead><tr><th>Öğrenci</th><th>Okul / Şube</th><th>D</th><th>Y</th><th>B</th><th>İ</th><th>Net</th><th>Katsayılı net</th></tr></thead><tbody>{reports.map(({ student: s, results: r }, i) => <tr key={i}><td>{s.name}<small>{s.id}</small></td><td>{s.school} / {s.branch}</td>{(["correct", "wrong", "blank", "cancelled", "net", "weighted"] as const).map((k) => <td key={k}>{fmt(sum(r, k))}</td>)}</tr>)}</tbody></table></div><ReportFoot penalty={penalty} confirmed={confirmed} /></article> : visible.map(({ student, results }, i) => <article className="student-report" key={i}><ReportHeader exam={examName} subtitle="Öğrenci gelişim karnesi" /><div className="report-student"><div><h2>{student.name}</h2><p>{student.school} · {student.branch} · No: {student.id}</p></div><div className="report-net"><small>TOPLAM NET</small><strong>{fmt(sum(results, "net"))}</strong></div></div><div className="report-stats">{(["correct", "wrong", "blank", "cancelled"] as const).map((key, n) => <div className={`state-${key}`} key={key}><b>{sum(results, key)}</b><span>{["Doğru", "Yanlış", "Boş", "İptal"][n]}</span></div>)}</div><div className="table-scroll"><table className="result-table"><thead><tr><th>Ders</th><th>Doğru</th><th>Yanlış</th><th>Boş</th><th>İptal</th><th>Net</th><th>Katsayılı net</th></tr></thead><tbody>{results.map((r) => <tr key={r.lesson}><td>{r.lesson}</td><td>{r.correct}</td><td>{r.wrong}</td><td>{r.blank}</td><td>{r.cancelled}</td><td>{fmt(r.net)}</td><td>{fmt(r.weighted)}</td></tr>)}</tbody></table></div><div className="report-legend"><span className="state-correct">D · Doğru</span><span className="state-wrong">Y · Yanlış</span><span className="state-blank">B · Boş</span><span className="state-cancelled">İ · İptal</span><small>Soru · öğrenci / doğru cevap</small></div>{results.map((r) => <div className="lesson-answers" key={r.lesson}><h3>{r.lesson}</h3><div className="question-chips">{data.questions.map((q, n) => q.lesson !== r.lesson ? null : <QuestionChip key={q.column} question={q} answer={student.answers[n]} />)}</div></div>)}<ReportFoot penalty={penalty} confirmed={confirmed} /></article>)}
      </div>
    </section>}
  </>;
}

function QuestionChip({ question: q, answer }: { question: EvaluationData["questions"][number]; answer: string }) {
  const state = questionState(q, answer);
  return <span className={`question-chip state-${state}`}><b>{q.number}</b><span>{answer || "—"} / {q.answer === "X" ? "İptal" : q.answer}</span><small>{({ correct: "D", wrong: "Y", blank: "B", cancelled: "İ" })[state]}</small></span>;
}
function ReportHeader({ exam, subtitle }: { exam: string; subtitle: string }) { return <header className="report-header"><div className="brand"><span className="brand-mark">K</span><span>Kurumsal Sınav</span></div><div><strong>{exam || "Deneme Sınavı"}</strong><p>{subtitle}</p></div></header>; }
function ReportFoot({ penalty, confirmed }: { penalty: number; confirmed: boolean }) { return <footer className="report-foot">{!confirmed && <strong>ÖNİZLEME · Kontrol onayı bekleniyor. </strong>}{penalty ? `Net = Doğru − Yanlış / ${penalty}.` : "Net = Doğru."} İptal sorular hesaba katılmaz. Katsayılı net resmî sınav puanı değildir.<br />kurumsalsinav.com · Öğrenmeyi görünür kıl.</footer>; }
