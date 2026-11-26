"use client";
import StudentExams from './student-exams';
import dynamic from 'next/dynamic';
const StudentWorkspace=dynamic(()=>import('./student-workspace'));
import HumanVerification from './human-verification';
import {getHumanToken} from '../lib/human-token';
import {useEffect,useState} from 'react';
import {API_URL} from '../lib/api';
import StudentLogin from './student-login';
import ReportTypeButtons from './report-type-buttons';
export const PORTAL_SESSION='kurumsal-student-portal-token';
type Method='code'|'number'|'account';
export default function StudentPortal(){
 const [tab,setTab]=useState<'exams'|'results'|'analysis'|'files'>('results');
 const [publicResults,setPublicResults]=useState<any[]>([]),[humanToken,setHumanToken]=useState(''),[attempt,setAttempt]=useState(0),[method,setMethod]=useState<Method>('code'),[locations,setLocations]=useState<any[]>([]),[city,setCity]=useState(''),[district,setDistrict]=useState(''),[schools,setSchools]=useState<any[]>([]),[schoolId,setSchoolId]=useState(''),[studentNo,setNo]=useState(''),[code,setCode]=useState(''),[token,setToken]=useState(''),[reports,setReports]=useState<any[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[schoolState,setSchoolState]=useState('idle'),[schoolRetry,setSchoolRetry]=useState(0),[templateId,setTemplateId]=useState('detailed-card'),[showSiteAddress,setShowSiteAddress]=useState(true);
 async function request(path:string,body?:unknown,session=token){
  const r=await fetch(`${API_URL}/api/student-portal${path}`,{method:body?'POST':'GET',cache:'no-store',headers:{...(session?{Authorization:`Bearer ${session}`}:{ }),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  if(!r.ok){const e=await r.json();if(r.status===401&&session){sessionStorage.removeItem(PORTAL_SESSION);setToken('');setReports([]);}throw Error(e.error??'İstek tamamlanamadı. Yeniden deneyin.');}return r;
 }
 useEffect(()=>{
  if(location.hash==='#ogrenci-girisi')setMethod('account');
  const saved=sessionStorage.getItem(PORTAL_SESSION);if(!saved){setLoading(false);return;}
  void request('/reports',undefined,saved).then(r=>r.json()).then(rows=>{setToken(saved);setReports(rows);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));
 },[]);
 useEffect(()=>{if(method!=='number')return;const controller=new AbortController();void fetch(`${API_URL}/api/student-portal/locations`,{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('İller yüklenemedi. Yeniden deneyin.');return r.json();}).then(setLocations).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[method,schoolRetry]);
 useEffect(()=>{
  setSchools([]);setSchoolId('');setSchoolState('idle');if(!city||!district)return;
  const controller=new AbortController();setSchoolState('loading');
  void fetch(`${API_URL}/api/student-portal/schools?${new URLSearchParams({city,district})}`,{signal:controller.signal,cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error??'Kurumlar yüklenemedi.');if(!controller.signal.aborted){setSchools(data);setSchoolState(data.length?'ready':'empty');}}).catch(()=>{if(!controller.signal.aborted)setSchoolState('error');});return()=>controller.abort();
 },[city,district,schoolRetry]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function choose(next:Method){setMethod(next);setError('');setPublicResults([]);setCode('');}
 if(loading)return <p role="status">Öğrenci oturumu yükleniyor…</p>;
 return <section className="management-panel student-entry">{error&&<p className="notice error" role="alert">{error}</p>}{!token?<>
  <p>Yayımlanmış sonuçlarınıza, karnelerinize ve Öğrenci Asistanı’na ulaşmak için giriş yönteminizi seçin.</p>
  <div className="studio-actions" role="group" aria-label="Öğrenci giriş yöntemi">{([['code','Öğrenciye Özel Erişim Kodu'],['number','Öğrenci Numarasıyla Sorgula'],['account','Hesabımla giriş']] as const).map(([id,label])=><button key={id} type="button" className={`button ${method===id?'button-navy':'button-quiet'}`} aria-pressed={method===id} disabled={busy} onClick={()=>choose(id)}>{label}</button>)}</div>
  {method==='account'?<StudentLogin/>:<form className="optical-form" onSubmit={e=>{e.preventDefault();void run(async()=>{
   setPublicResults([]);
   if(method==='number'){const data=await(await request('/lookup-number',{city,district,schoolId,studentNo},'')).json();setPublicResults(data.results);return;}
   const trimmed=code.trim();
   if(!/^(?:[A-Za-z0-9_-]{16}|[A-Za-z0-9_-]{24})$/.test(trimmed))throw Error('16 veya 24 karakterli geçerli öğrenci erişim kodunuzu girin.');
   if(trimmed.length===16){try{const r=await fetch(`${API_URL}/api/public-results/resolve`,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessCode:trimmed,humanToken:await getHumanToken('results',humanToken)})});const data=await r.json();if(!r.ok)throw Error(data.error??'Sonuç sorgulanamadı.');setPublicResults(data.results);}finally{setHumanToken('');setAttempt(n=>n+1);}return;}
   const data=await(await request('/login',{code:trimmed},'')).json();await request('/reports',undefined,data.token);sessionStorage.setItem(PORTAL_SESSION,data.token);location.assign('/sonuclarim');
  });}}>
  {method==='code'?<label>Öğrenciye özel erişim kodu<input required type="password" autoComplete="off" maxLength={80} disabled={busy} autoCapitalize="none" spellCheck={false} value={code} onChange={e=>{setCode(e.target.value);setPublicResults([]);}}/></label>:<>
   <label>İl<select aria-label="İl" required disabled={busy} value={city} onChange={e=>{setCity(e.target.value);setDistrict('');setSchoolId('');setSchools([]);setPublicResults([]);}}><option value="">İl seçin</option>{locations.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select></label>
   <label>İlçe<select aria-label="İlçe" required disabled={busy||!city} value={district} onChange={e=>{setDistrict(e.target.value);setSchoolId('');setSchools([]);setPublicResults([]);}}><option value="">İlçe seçin</option>{locations.find(v=>v.name===city)?.districts.map((v:any)=><option key={v.id} value={v.name}>{v.name}</option>)}</select></label>
   <label>Kurum<select aria-label="Kurum" required disabled={busy||schoolState!=='ready'} value={schoolId} onChange={e=>{setSchoolId(e.target.value);setPublicResults([]);}}><option value="">Kurum seçin</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   {schoolState==='loading'&&<p role="status">Kurumlar yükleniyor…</p>}{schoolState==='empty'&&<p role="status">Bu ilçede kayıtlı etkin kurum bulunamadı.</p>}{schoolState==='error'&&<p role="alert">Kurum listesi alınamadı. <button type="button" className="button button-quiet" onClick={()=>setSchoolRetry(n=>n+1)}>Yeniden dene</button></p>}
   {!locations.length&&<button type="button" className="button button-quiet" onClick={()=>setSchoolRetry(n=>n+1)}>İlleri yeniden yükle</button>}
   {schoolId&&schools.find(s=>s.id===schoolId)?.publicNumberLookup===false&&<aside className="notice"><p>Bu kurum öğrenci numarasıyla sonuç paylaşımını açmamış.</p><div className="studio-actions"><button type="button" className="button button-navy" onClick={()=>choose('code')}>Kişisel kodumla giriş</button><button type="button" className="button button-quiet" onClick={()=>choose('account')}>Hesabımla giriş</button></div></aside>}
   <label>Öğrenci numarası<input required autoComplete="off" maxLength={100} disabled={busy} value={studentNo} onChange={e=>{setNo(e.target.value);setPublicResults([]);}}/></label>
  </>}
  {method==='code'&&code.trim().length===16&&<HumanVerification key={attempt} action="results" onToken={setHumanToken}/>}
  <button className="button button-navy" disabled={busy||(method==='number'&&!schoolId)}>{busy?'Kontrol ediliyor…':method==='code'?'Kodla sonuçları göster':'Sonuçları Göster'}</button>
  </form>}
  {publicResults.length>0&&<section aria-label="Yayımlanmış sonuçlar"><h2>Yayımlanmış sonuçların</h2><p>Bu görünüm sonuç özetidir. Kişisel karne, sınav geçmişi ve Öğrenci Asistanı için kişisel kodunuz veya hesabınızla giriş yapın.</p>{publicResults.map(v=><article className="public-result-item" key={v.keyId+v.student.id}><h3>{v.examName}</h3><p>{v.schoolName} · {v.student.name} · {v.student.branch}</p><p>Net: {v.summary?.net??'—'} · Puan: {v.summary?.score??'Katsayı tanımlanmamış'}</p><div className="table-scroll"><table className="result-table"><thead><tr><th>Ders</th><th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Net</th></tr></thead><tbody>{v.summary?.lessons.map((l:any,i:number)=><tr key={i}><td>{l.lesson??l.name}</td><td>{l.correct}</td><td>{l.wrong}</td><td>{l.blank}</td><td>{l.net}</td></tr>)}</tbody></table></div></article>)}</section>}

 </>:<>
  <div className="studio-actions"><h2>Öğrenci Karnelerim</h2><button className="button button-quiet" onClick={()=>{sessionStorage.removeItem(PORTAL_SESSION);setToken('');setReports([]);location.assign('/sonuclar');}}>Öğrenci oturumunu kapat</button></div>
  <nav className="studio-actions" aria-label="Öğrenci paneli">{([['exams','Sınavlarım'],['results','Sonuçlarım'],['analysis','Analizim'],['files','Dosyalarım']] as const).map(([id,label])=><button type="button" className={`button ${tab===id?'button-navy':'button-quiet'}`} aria-pressed={tab===id} key={id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
  {tab==='exams'&&<StudentExams token={token} mode="exams" onResults={()=>{setTab('results');void request('/reports').then(r=>r.json()).then(setReports);}}/>}{tab==='files'&&<StudentExams token={token} mode="files" onResults={()=>setTab('results')}/>}
  <div hidden={tab==='exams'||tab==='files'}><StudentWorkspace showAnalysisInitially={tab==='analysis'} key={token} token={token} portal onReport={id=>{setTab('results');requestAnimationFrame(()=>document.getElementById('student-report-'+id)?.scrollIntoView({block:'start'}));}} onResults={()=>{setTab('results');document.getElementById('student-portal-reports')?.scrollIntoView({block:'start'});}}/></div><div hidden={tab!=='results'}>{tab==='results'&&<StudentExams token={token} mode="pending" onResults={()=>setTab('results')}/>}
  <div id="student-portal-reports"/>{!reports.length&&<p>Henüz erişime açılmış karne yok. Kurumunuz sonuçları yayımladığında burada görünecek.</p>}
  {reports.map(v=><article id={'student-report-'+v.grantId} className="public-result-item" key={v.grantId}><h3>{v.examName}</h3><p>{v.report.data.students[0].name} · {v.academicYear}</p><p>Net: {v.report.summary[0].net} · Puan: {v.report.summary[0].score??'Katsayı tanımlanmamış'}</p><details><summary>Ders ve kazanım analizini göster</summary><div className="table-scroll"><table className="result-table"><thead><tr><th>Ders</th><th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Net</th></tr></thead><tbody>{v.report.summary[0].lessons.map((l:any,i:number)=><tr key={i}><td>{l.lesson??l.name}</td><td>{l.correct}</td><td>{l.wrong}</td><td>{l.blank}</td><td>{l.net}</td></tr>)}</tbody></table></div><p>Kazanım ayrıntıları PDF karnede yer alır.</p></details>
  <details><summary>Karne tasarımı ve yazdırma</summary><ReportTypeButtons value={templateId} onChange={setTemplateId}/><label className="checkbox-row"><input type="checkbox" checked={showSiteAddress} onChange={e=>setShowSiteAddress(e.target.checked)}/>Karne altında kurumsalsinav.com yazısını göster</label></details>
  {method==='code'&&code.trim().length===16&&<HumanVerification key={attempt} action="results" onToken={setHumanToken}/>}
  <button className="button button-navy" disabled={busy} onClick={()=>void run(async()=>{const r=await request('/pdf',{grantId:v.grantId,templateId,showSiteAddress}),url=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=url;a.download='ogrenci-karnesi.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})}>Karnemi PDF indir</button></article>)}</div>
 </>}</section>;
}
