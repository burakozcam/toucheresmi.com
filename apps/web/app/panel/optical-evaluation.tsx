"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { API_URL } from "../../lib/api";
import type { KeyRecord, OpticalSnapshot, TemplateRecord } from "../../lib/optical";
import { buildCohortContext } from "../../lib/evaluation";
import ReportCard from "../sinav-degerlendir/report-card";
import { opticalRequest } from "../../lib/optical-api";
import CheckSummary from "./optical-checks";
import OpticalRevisions from "./optical-revisions";
import OpticalAnalysis from "./optical-analysis";
import { downloadFmt } from "./fmt-downloads";

type School = {id:string;name:string};
type History = {revision:number;seriesId:string;studentPublished:boolean;id:string;filename:string;createdAt:string;schoolId:string;school:{name:string};key:{name:string};template:{name:string}};
const num=(n:number)=>new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2}).format(n);

export default function OpticalEvaluation({token,screen="results",initialResultId,onSaved}:{token:string;screen?:"upload"|"results";initialResultId?:string;onSaved?:(id:string)=>void}){
  const [schools,setSchools]=useState<School[]>([]),[templates,setTemplates]=useState<TemplateRecord[]>([]),[keys,setKeys]=useState<KeyRecord[]>([]),[history,setHistory]=useState<History[]>([]);
  const [publishers,setPublishers]=useState<{id:string;name:string}[]>([]);
  const [publisherId,setPublisherId]=useState(""),[grade,setGrade]=useState("");
  const [schoolId,setSchoolId]=useState(""),[templateId,setTemplateId]=useState(""),[keyId,setKeyId]=useState(""),[file,setFile]=useState<File|null>(null),[encoding,setEncoding]=useState("auto");
  const [snapshot,setSnapshot]=useState<OpticalSnapshot|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[confirmed,setConfirmed]=useState(false),[ready,setReady]=useState(false);
  const [mode,setMode]=useState("list"),[branch,setBranch]=useState(""),[studentId,setStudentId]=useState(""),[monochrome,setMonochrome]=useState(false),[showQuestions,setShowQuestions]=useState(false);
  const resultRef=useRef<HTMLElement>(null);
  async function loadHistory(){setHistory(await opticalRequest(token,`/results${schoolId?`?schoolId=${encodeURIComponent(schoolId)}`:""}`));}
  async function load(){
    const response=await fetch(`${API_URL}/api/schools?active=true`,{headers:{Authorization:`Bearer ${token}`}});
    const data=await response.json();if(!response.ok||!Array.isArray(data))throw new Error(data.error??"Kurumlar yüklenemedi.");
    const [t,k,p]=await Promise.all([opticalRequest(token,"/templates"),opticalRequest(token,"/keys?available=true"),opticalRequest(token,"/publishers")]);
    setPublishers(p);
    setSchools(data);setTemplates(t.filter((x:TemplateRecord)=>x.active));setKeys(k.filter((x:KeyRecord)=>x.active));
    setSchoolId(data[0]?.id??"");setTemplateId(t.find((x:TemplateRecord)=>x.active)?.id??"");setKeyId("");
  }
  useEffect(()=>{setSnapshot(null);void load().then(()=>{if(screen==="results"&&initialResultId)return openResult(initialResultId);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[token,screen]);
  useEffect(()=>{if(screen!=="results"||!schoolId)return;let cancelled=false;setHistory([]);void opticalRequest(token,`/results?schoolId=${encodeURIComponent(schoolId)}`).then(rows=>{if(!cancelled)setHistory(rows);}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[token,screen,schoolId]);
  function invalidate(){setSnapshot(null);setConfirmed(false);setNotice("");setError("");}
  async function run(save:boolean){
    if(!file||!schoolId||!templateId||!keyId)return;
    setBusy(true);setError("");setNotice("");
    try{
      const body=new FormData();body.append("file",file);body.append("schoolId",schoolId);body.append("templateId",templateId);body.append("keyId",keyId);body.append("encoding",encoding);body.append("confirmWarnings",String(confirmed));if(save&&snapshot?.previewToken)body.append("previewToken",snapshot.previewToken);
      const result=await opticalRequest(token,save?"/evaluate":"/preview",{method:"POST",body});setSnapshot(result);if(result.schoolId)setSchoolId(result.schoolId);setBranch("");setStudentId(result.data.students[0]?.id??"");setMode("list");
      if(save){setNotice("Sınav yüklendi. Sonuç Al ekranından çıktı türünü seçebilirsiniz.");await loadHistory();}else{setConfirmed(false);setNotice("Önizleme hazır. Kurum, kitapçıklar ve öğrenci sayısını kontrol edip kaydedin.");}
      resultRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
    }catch(e){setError(e instanceof Error?e.message:"Değerlendirme başarısız.");}finally{setBusy(false);}
  }
  async function openResult(id:string){setBusy(true);setError("");setNotice("");try{const result=await opticalRequest(token,`/results/${id}`);setSnapshot(result);if(result.schoolId)setSchoolId(result.schoolId);setBranch("");setStudentId(result.data.students[0]?.id??"");setMode("list");setConfirmed(false);}catch(e){setError(e instanceof Error?e.message:"Sonuç açılamadı.");}finally{setBusy(false);}}
  const weights=useMemo(()=>Object.fromEntries(snapshot?.data.questions.map(q=>[q.lesson,q.weight])??[]),[snapshot]);
  const context=useMemo(()=>snapshot?buildCohortContext(snapshot.data,snapshot.penalty,weights,500):undefined,[snapshot,weights]);
  const branches=[...new Set(snapshot?.data.students.map(s=>s.branch)??[])];
  const visible=snapshot?.data.students.filter(s=>!branch||s.branch===branch)??[];
  const sorted=useMemo(()=>snapshot?[...snapshot.summary].sort((a,b)=>b.score-a.score):[],[snapshot]);
  const lessons=[...new Set(snapshot?.data.questions.map(q=>q.lesson)??[])];
  function exportExcel(){
    if(!snapshot||!window.XLSX)return;const book=window.XLSX.utils.book_new();
    const rows:unknown[][]=[["Kurum",snapshot.schoolName],["Sınav",snapshot.keyName],["FMT",snapshot.templateName],["Puan açıklaması","Yerel deneme puanı / 500; resmî LGS/YKS puanı değildir."],[],["Kurum Sırası","Öğrenci No","Ad Soyad","Sınıf / Şube",...lessons.flatMap(l=>[`${l} D`,`${l} Y`,`${l} B`,`${l} İptal`,`${l} Net`]),"Toplam Net","Yerel Puan / 500","Kitapçıklar"]];
    for(const r of sorted){const s=snapshot.data.students.find(s=>s.id===r.id)!;if(branch&&s.branch!==branch)continue;rows.push([1+sorted.filter(x=>x.score>r.score+1e-8).length,s.id,s.name,s.branch,...lessons.flatMap(l=>{const v=r.lessons.find(x=>x.lesson===l)!;return[v.correct,v.wrong,v.blank,v.cancelled,Number(v.net.toFixed(4))];}),Number(r.net.toFixed(4)),Number(r.score.toFixed(4)),Object.entries(s.booklets).map(([l,b])=>`${l}: ${b}`).join(", ")]);}
    window.XLSX.utils.book_append_sheet(book,window.XLSX.utils.aoa_to_sheet(rows),"Sonuç Listesi");
    if(mode==="classes")branches.filter(b=>!branch||b===branch).forEach((b,i)=>{const classRows=[...rows.slice(0,6),...rows.slice(6).filter(r=>r[3]===b)];window.XLSX!.utils.book_append_sheet(book,window.XLSX!.utils.aoa_to_sheet(classRows),`${i+1}-${b}`.replace(/[\\/?:*\[\]]/g,"-").slice(0,31));});
    const answers:unknown[][]=[["Öğrenci No","Ders","A Soru No","Kitapçık","Öğrenci Cevabı","Doğru Cevap","Kazanım Kodu","Kazanım"]];
    for(const s of visible)snapshot.data.questions.forEach((q,i)=>answers.push([s.id,q.lesson,q.number,s.booklets[q.lesson]??"—",s.answers[i]||"—",q.answer,q.outcomeCode??"",q.outcomeName??""]));
    window.XLSX.utils.book_append_sheet(book,window.XLSX.utils.aoa_to_sheet(answers),"Soru Detayı");window.XLSX.writeFile(book,"sinav-sonuclari.xlsx");
  }
  function resultList(listStudents:typeof visible,listBranch:string){if(!snapshot)return null;return <article className="student-report optical-list-report"><header className="report-header"><div className="brand"><span className="brand-mark">K</span><span>Kurumsal Sınav</span></div><div><strong>{snapshot.keyName}</strong><p>{snapshot.schoolName} · {listBranch||"Tüm sınıflar"} · {listStudents.length} öğrenci</p></div></header><h3>Detaylı sonuç listesi {!snapshot.id&&"· ÖNİZLEME"}</h3><div className="table-scroll"><table className="result-table"><thead><tr><th>Kurum sırası</th><th>Öğrenci / No / Şube</th>{lessons.map(l=><th key={l}>{l}<small>D / Y / B · Net</small></th>)}<th>Toplam net</th><th>Yerel puan / 500</th></tr></thead><tbody>{sorted.map(r=>{const s=listStudents.find(s=>s.id===r.id);if(!s)return null;return <tr key={s.id}><td>{1+sorted.filter(x=>x.score>r.score+1e-8).length}</td><td><strong>{s.name}</strong><small>{s.id} · {s.branch}</small></td>{r.lessons.map(l=><td key={l.lesson}>{l.correct} / {l.wrong} / {l.blank}<small>{num(l.net)} net{l.cancelled?` · ${l.cancelled} iptal`:""}</small></td>)}<td>{num(r.net)}</td><td>{num(r.score)}</td></tr>;})}</tbody></table></div><footer className="report-foot">{snapshot.penalty?`Net = doğru − yanlış / ${snapshot.penalty}.`:"Yanlış doğruyu götürmez."} H soruları tüm öğrenciler için doğru kabul edilir; X soruları hesap dışıdır. Puan / 500 yerel ölçektir; resmî LGS/YKS veya yayınevi puanı değildir. Kurum sırası yalnızca bu değerlendirmedeki öğrenciler arasındadır; eşit puanlar aynı sırayı alır.</footer></article>;}
  return <section className="optical-module">
    <Script src="/vendor/xlsx.full.min.js" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>setError("Excel dışa aktarma aracı yüklenemedi. Sayfayı yenileyin.")}/>
    {screen==="upload"&&<section className="management-panel">
      <header className="panel-header"><div><p className="hero-tag">TXT’DEN SONUÇ VE KARNEYE</p><h2>Sınav yükle</h2></div></header>
      <p>Kurumunu seç, TXT dosyanı ve dosyanın oluşturulduğu FMT’yi belirt. Sözel ve sayısal kayıtlar aynı öğrenci altında birleştirilir. A/B kitapçıkları soru eşleştirmesine göre hesaplanır.</p>
      {error&&<p className="notice error" role="alert">{error}</p>}{notice&&<p className="notice success" role="status">{notice}</p>}
      {grade&&!keys.some(k=>k.publisher?.id===publisherId&&String(k.grade)===grade)&&<p className="notice">Bu yayınevi ve sınıf için değerlendirmeye açılmış, geçerli cevap anahtarı olan sınav bulunmuyor. Yönetici Cevap Anahtarları bölümünden hazırlayıp kullanıma açabilir.</p>}{loading?<p role="status">Kurumlar ve şablonlar yükleniyor…</p>:<>
        {!schools.length&&<p className="notice">Önce kurum kaydı ekleyin. Yalnızca hesabınıza bağlı etkin kurumlara yükleme yapabilirsiniz.</p>}
        {(!templates.length||!keys.length)&&<p className="notice">Değerlendirme için adminin etkin bir FMT ve soru bazında değerlendirme anahtarı eklemesi gerekiyor.</p>}
        <div className="optical-form"><label>Kurum<select disabled={busy} value={schoolId} onChange={e=>{setSchoolId(e.target.value);invalidate();}}><option value="">Kurum seçin</option>{schools.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><label>Yayınevi<select aria-label="Sınav yayınevi" disabled={busy} value={publisherId} onChange={e=>{setPublisherId(e.target.value);setGrade("");setKeyId("");invalidate();}}><option value="">Yayınevi seçin</option>{publishers.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>Sınıf<select aria-label="Sınav sınıfı" disabled={busy||!publisherId} value={grade} onChange={e=>{setGrade(e.target.value);setKeyId("");invalidate();}}><option value="">Sınıf seçin</option>{Array.from({length:12},(_,i)=>i+1).map(g=><option value={g} key={g}>{g}. Sınıf</option>)}</select></label><label>Sınav / cevap anahtarı<select aria-label="Değerlendirilecek sınav" disabled={busy||!grade} value={keyId} onChange={e=>{setKeyId(e.target.value);invalidate();}}><option value="">Sınav seçin</option>{keys.filter(k=>k.publisher?.id===publisherId&&String(k.grade)===grade).map(k=><option value={k.id} key={k.id}>{k.name} · {k.questionCount} soru</option>)}</select></label><label>Kaynak FMT<select disabled={busy} value={templateId} onChange={e=>{setTemplateId(e.target.value);invalidate();}}><option value="">FMT seçin</option>{templates.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label><label>TXT kodlaması<select disabled={busy} value={encoding} onChange={e=>{setEncoding(e.target.value);invalidate();}}><option value="auto">Otomatik (UTF-8 / Türkçe Windows)</option><option value="windows-1254">Türkçe Windows (1254)</option><option value="utf-8">UTF-8</option></select></label><label>Optik TXT dosyası · en fazla 2 MB<input type="file" accept=".txt" disabled={busy} onChange={e=>{const selected=e.target.files?.[0]??null;invalidate();if(selected&&selected.size>2*1024*1024){setFile(null);setError("TXT en fazla 2 MB olabilir.");return;}setFile(selected);}}/></label></div>
        <button className="button button-navy" disabled={busy||!file||!schoolId||!templateId||!keyId} onClick={()=>void run(false)}>{busy?"İşleniyor…":"TXT’yi kontrol et ve önizle"}</button>
        <button className="button button-quiet" disabled={busy||!templateId} onClick={async()=>{const selected=templates.find(t=>t.id===templateId);if(!selected)return;setBusy(true);setError("");try{await downloadFmt(token,selected);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Seçili FMT’yi indir</button>
        <p className="field-help">TXT içindeki TC/telefon yalnızca oturum eşleştirmesi sırasında kullanılır; sonuç arşivine ve çıktılara kaydedilmez. Ham TXT saklanmaz.</p>
      </>}
    </section>}
    {screen==="results"&&<section className="management-panel"><h2>Sınav Değerlendir / Sonuç Al</h2><p>Sınav Yükle ekranında kaydettiğiniz sınavı ve çıktı türünü seçin.</p>{error&&<p className="notice error" role="alert">{error}</p>}{notice&&<p className="notice success" role="status">{notice}</p>}<div className="optical-form"><label>Kurum<select disabled={busy} value={schoolId} onChange={e=>{setSchoolId(e.target.value);setSnapshot(null);}}><option value="">Kurum seçin</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Yüklenen sınav<select aria-label="Yüklenen sınav" disabled={busy||!schoolId} value={snapshot?.id??""} onChange={e=>{if(e.target.value)void openResult(e.target.value);else setSnapshot(null);}}><option value="">Sınav seçin</option>{history.filter(h=>h.schoolId===schoolId).map(h=><option key={h.id} value={h.id}>{h.key.name} · Sürüm {h.revision??1} · {new Date(h.createdAt).toLocaleString("tr-TR")}</option>)}</select></label></div>{!loading&&!history.length&&<p>Henüz yüklenmiş sınav yok. Sınav Yükle ekranından başlayın.</p>}</section>}
    {snapshot&&<section className="management-panel optical-results" ref={resultRef}>
      <header className="panel-header"><div><p className="hero-tag">{snapshot.id?"KAYITLI DEĞERLENDİRME":"KONTROL ÖNİZLEMESİ"}</p><h2>{snapshot.keyName}</h2><p>{snapshot.schoolName} · {snapshot.templateName} · {snapshot.data.lineCount} satır → {snapshot.data.students.length} öğrenci{snapshot.createdAt?` · ${new Date(snapshot.createdAt).toLocaleString("tr-TR")}`:""}</p></div></header>
      <p className="notice">Karne ve soru detayları karşılaştırma için A kitapçığı soru sırasına çevrilir. Öğrencinin kaynak kitapçıkları aşağıda gösterilir. H: tüm cevaplar doğru; X: iptal. Sıralamalar yalnızca bu dosyadaki kurum öğrencilerini kapsar.</p>
      {snapshot.checks&&<CheckSummary checks={snapshot.checks}/>}
      {!snapshot.checks&&snapshot.data.warnings.length>0&&<details open><summary>{snapshot.data.warnings.length} boş ders uyarısı</summary><ul>{snapshot.data.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
      {!snapshot.id&&<div className="optical-confirm"><label className="checkbox-row"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Kurum, öğrenci sayısı, kitapçıklar ve tüm kontrol uyarılarını inceledim.</label><button className="button button-navy" disabled={busy||!confirmed||!!snapshot.checks?.blockers.length} onClick={()=>void run(true)}>{busy?"Kaydediliyor…":"Sınavı yükle ve kaydet"}</button></div>}
      {screen==="upload"&&snapshot.id&&<button className="button button-navy" onClick={()=>onSaved?.(snapshot.id!)}>Sınav Değerlendir / Sonuç Al ekranına geç</button>}
      {screen==="results"&&<>
      {snapshot.id&&<OpticalRevisions token={token} snapshot={snapshot} onUpdate={next=>{setSnapshot(next);void loadHistory();}}/>}
      <div className="optical-form"><label>Sınıf / şube<select aria-label="Sonuç sınıfı / şubesi" disabled={busy} value={branch} onChange={e=>{setBranch(e.target.value);const first=snapshot.data.students.find(s=>!e.target.value||s.branch===e.target.value);setStudentId(first?.id??"");}}><option value="">Tüm sınıflar / şubeler</option>{branches.map(b=><option key={b}>{b}</option>)}</select></label><label>Çıktı türü<select aria-label="Çıktı türü" value={mode} onChange={e=>setMode(e.target.value)}><option value="list">Sadece toplu liste</option><option value="classes">Sınıf sınıf liste</option><option value="list-cards">Liste + öğrenci karneleri</option><option value="analysis">Soru / kazanım analizi</option><option value="individual">Öğrenci karnesi</option><option value="bulk">Toplu öğrenci karneleri</option></select></label>{mode==="individual"&&<label>Öğrenci<select value={studentId} onChange={e=>setStudentId(e.target.value)}>{visible.map(s=><option value={s.id} key={s.id}>{s.id} · {s.name}</option>)}</select></label>}</div>
      <div className="studio-actions"><label className="checkbox-row"><input type="checkbox" checked={monochrome} onChange={e=>setMonochrome(e.target.checked)}/>Siyah beyaz çıktı</label><label className="checkbox-row"><input type="checkbox" checked={showQuestions} onChange={e=>setShowQuestions(e.target.checked)}/>Karnede soru bazında kurum karşılaştırması</label><button className="button button-quiet" disabled={!snapshot.id||!ready||busy||mode==="analysis"} onClick={exportExcel}>Sonuçları Excel indir</button><button className="button button-navy" disabled={!snapshot.id||busy||!visible.length} onClick={()=>window.print()}>Liste / karne PDF kaydet</button></div>
      <p className="field-help">PDF düğmesi yazdırma ekranını açar; “PDF olarak kaydet” seçin. Puan / 500 yerel deneme puanıdır; yayınevinin standartlaştırılmış puanını ve Türkiye geneli sıralamasını üretmez.</p>
      <div className={`optical-print-page ${mode==="list"?"optical-list-print":""}`}>
        <div className={`report-print-area ${monochrome?"report-monochrome":""}`}>
          {mode==="analysis"&&snapshot.id?<OpticalAnalysis token={token} resultId={snapshot.id} branch={branch} title={snapshot.keyName} school={snapshot.schoolName} ready={ready}/>:mode==="list"?resultList(visible,branch):mode==="classes"?branches.filter(b=>!branch||b===branch).sort((a,b)=>a.localeCompare(b,"tr",{numeric:true})).map(b=><div className="optical-class-page" key={b}>{resultList(visible.filter(s=>s.branch===b),b)}</div>):<>{mode==="list-cards"&&resultList(visible,branch)}{visible.filter(s=>mode!=="individual"||s.id===studentId).map(s=><ReportCard key={s.id} data={snapshot.data} student={s} exam={snapshot.keyName} penalty={snapshot.penalty} weights={weights} scale={500} showQuestions={showQuestions} confirmed={!!snapshot.id} context={context} bookletInfo={`Kaynak kitapçıklar: ${Object.entries(s.booklets).map(([l,b])=>`${l}: ${b}`).join(" · ")}. Soru sırası: A kitapçığı. H: tüm cevaplar doğru kabul edilir.`}/>)}</>}
        </div>
      </div>
      </>}
      <details><summary>Öğrenci / oturum eşleştirmelerini incele</summary><div className="table-scroll"><table className="result-table"><thead><tr><th>Öğrenci</th><th>TXT satırları</th><th>Ders kitapçıkları</th></tr></thead><tbody>{snapshot.data.students.map(s=><tr key={s.id}><td>{s.id} · {s.name}</td><td>{s.sourceLines.join(", ")}</td><td>{Object.entries(s.booklets).map(([l,b])=>`${l}: ${b}`).join(" · ")}</td></tr>)}</tbody></table></div></details>
    </section>}
    {screen==="results"&&<section className="management-panel"><h2>Değerlendirme geçmişi</h2><p className="field-help">Seçili kurumdaki son 50 sınavın güncel sürümü. Sonuçlar, kullanılan anahtarın anlık kopyasıyla saklanır.</p>{!history.length?<p>Henüz kayıtlı değerlendirme yok.</p>:history.filter(h=>!schoolId||h.schoolId===schoolId).map(h=><div className="optical-record" key={h.id}><span><strong>{h.key.name}</strong><small>{h.school.name} · {h.template.name} · {new Date(h.createdAt).toLocaleString("tr-TR")} · Öğrenci/veli: {h.studentPublished?"Yayımlanmış":"Kapalı"}</small></span><button className="button button-quiet" disabled={busy} onClick={()=>void openResult(h.id)}>Liste ve karneleri aç</button></div>)}</section>}
  </section>;
}
