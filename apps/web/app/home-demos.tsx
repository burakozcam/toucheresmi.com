"use client";
import {useState} from "react";
import UiIcon from "./ui-icon";

import SecurityLock from './security-lock';
import {useHomeScene,SceneProgress} from './use-home-scene';
const answers=['A','B','D','D','E','C','C','D','A','B','A','E'];
const key=['A','B','C','D','E','B','C','D','A','B','C','E'];
function WindowTop({label}:{label:string}){return <div className="scene-window-top"><span className="scene-brand">K</span><span>KurumsalSınav <small>/ {label}</small></span><i/><i/><i/></div>;}
export function LiveReport(){
 const {root,step,controls}=useHomeScene(9200),count=Math.min(12,Math.max(0,step-1)),done=step>=13,report=step>=17;
 return <section ref={root} className="demo-scene demo-report" data-duration="9200" aria-label="Temsili canlı öğrenci karnesi"><div><p className="hero-tag">OPTİK SINAV DEĞERLENDİRME</p><h2>TXT’den puan ve karneye.</h2><p>TXT cevap dosyasını yükle, cevap anahtarını seç ve puanları hesapla. Öğrenci karnelerini incele ve PDF olarak indir.</p><p className="field-help">Temsili öğrenci ve örnek sonuç.</p>{controls}</div><div className="scene-player"><div className="demo-paper"><WindowTop label="Öğrenci karnesi"/><div className="scene-person"><span>AÇ</span><div><small>8. SINIF · A KİTAPÇIĞI</small><h3>Ahmet Çalışkan</h3></div><em>{done?'Tamamlandı':'Değerlendiriliyor'}</em></div><div className="scene-result-stage" data-report={report}><div className="demo-answers" data-finished={done}>{answers.map((a,i)=><div key={i} className={i<count?(a===key[i]?'correct':'wrong'):'pending'}><small>{String(i+1).padStart(2,'0')}</small><span>{a}</span><b>{i<count?<UiIcon name={a===key[i]?'tick':'close'}/>:'·'}</b></div>)}</div><div className="scene-score" data-visible={done&&!report}><small>ÖRNEK SINAV PUANI</small><strong>486 <span>/ 500</span></strong><p>Temsili tam sınav puanı.</p><span className="scene-seal"><UiIcon name="tick"/> Değerlendirme tamamlandı</span></div><div className="scene-mini-report" data-visible={report}><header><span className="brand-mark">K</span><div><strong>ÖĞRENCİ KARNESİ</strong><small>Ahmet Çalışkan · 8/A · Temsili</small></div><b>486<small> / 500</small></b></header><table><thead><tr><th>Ders</th><th>Doğru</th><th>Yanlış</th><th>Boş</th></tr></thead><tbody>{[['Türkçe',19,1,0],['Sosyal',10,0,0],['Din',10,0,0],['İngilizce',10,0,0],['Matematik',18,1,1],['Fen',18,1,1]].map(([name,d,y,b])=><tr key={name}><td>{name}</td><td>{d}</td><td>{y}</td><td>{b}</td></tr>)}</tbody></table><p>85 doğru · 3 yanlış · 2 boş / 90 soru</p><small>12 cevaplık örnekten temsili tam sınav karnesine. Puan bir gösterim değeridir.</small></div></div><div className="scene-footer"><span>CEVAP KONTROLÜ</span><strong>{count} / 12</strong></div></div><SceneProgress/></div></section>;
}
export function SecurityScene(){
 const {root,step,controls}=useHomeScene(6800),protectedData=step>=16;
 return <section ref={root} className="demo-scene demo-security" data-duration="6800" aria-label="Temsili veri gizliliği sahnesi"><div className="scene-player"><div className="demo-paper"><WindowTop label="Yetkili erişim"/><div className="scene-optic-stage"><div className="scene-optic"><div className="optic-title"><b>KURUMSAL SINAV</b><small>TEMSİLİ CEVAP FORMU</small></div><div className="optic-person"><small>AD SOYAD</small><strong>{protectedData?'Ahmet Ç****':'Ahmet Çalışkan'}</strong></div><div className="optic-guide"><span>SORU</span><span>A</span><span>B</span><span>C</span><span>D</span><span>E</span></div>{answers.slice(0,8).map((a,i)=><div className="optic-row" key={i}><small>{String(i+1).padStart(2,'0')}</small>{['A','B','C','D','E'].map(letter=><i key={letter} data-marked={letter===a} data-result={letter===a&&step>=i+3?(a===key[i]?'correct':'wrong'):undefined}>{letter}</i>)}</div>)}<div className="optic-registration"><i/><span>TXT CEVAP KAYDI · A KİTAPÇIĞI</span><i/></div></div><div className="scene-protection" data-visible={step>=12} data-secured={protectedData}><SecurityLock/><strong>{protectedData?"Bilgiler koruma altında":"Kişisel erişim hazırlanıyor"}</strong><span>Kişisel sonuç, kişisel erişim kodu.</span></div></div><div className="scene-footer"><span>ÖĞRENCİ BİLGİSİ</span><strong>{protectedData?'Ahmet Ç****':'Ahmet Çalışkan'}</strong></div></div><SceneProgress/></div><div><p className="hero-tag">KİŞİSEL SONUÇLARA KİŞİSEL ERİŞİM</p><h2>Her karne kendi öğrencisine.</h2><p>TXT cevap kayıtlarını yetkili hesabınla değerlendir. Kurum ve rol denetimleriyle yönetilen karnelere öğrenciler kişisel erişim kodlarıyla ulaşsın.</p><p className="field-help">Temsili dijital cevap formu ve isim maskeleme gösterimi.</p>{controls}</div></section>;
}
const stages=[['01','TXT yükleme','Cevap kayıtları çalışma alanına alınır.'],['02','FMT tanıma','Ad, kitapçık ve cevap alanları karşılaştırılır.'],['03','Sınav önerisi','Cevap dizileriyle uygun sınavlar önerilir.'],['04','Değerlendirme','Seçimini kontrol et, sonuçları oluştur.']];
export function InferenceScene(){const {root,step,controls}=useHomeScene(7400),stage=Math.min(3,Math.floor(step/5));return <section ref={root} className="demo-scene demo-inference" data-duration="7400" aria-label="Temsili TXT FMT ve sınav önerisi"><div><p className="hero-tag">KURUMLAR İÇİN AKILLI HAZIRLIK</p><h2>Dosyadan değerlendirmeye.</h2><p>TXT dosyanı yükle; FMT alanlarını ve sınav önerilerini kontrol et. Cevap anahtarını seçip puanları hesapla ve karneyi indir.</p><p className="field-help">Örnek iş akışı · desteklenen formatlarla uyumlu.</p>{controls}</div><div className="scene-player"><div className="demo-paper"><WindowTop label="TXT çalışma alanı"/><div className="scene-file"><span>TXT</span><div><strong>sinav-cevaplari.txt</strong><small>{stage===0?'Cevap kayıtları alınıyor':'Cevap kayıtları hazır'}</small></div><b>{stage===0?<UiIcon name="upload"/>:<UiIcon name="tick"/>}</b></div><svg className="inference-flow-map" viewBox="0 0 440 70" role="img" aria-label="TXT, FMT, sınav ve sonuç veri akışı"><path className="inference-flow-line" d="M48 34H392"/>{["TXT","FMT","SINAV","SONUÇ"].map((label,i)=><g key={label} data-active={stage>=i}><circle cx={48+i*114} cy="34" r="23"/><text x={48+i*114} y="38" textAnchor="middle">{label}</text></g>)}<circle className="inference-flow-packet" cx={48+stage*114} cy="34" r="27"/></svg><ol className="scene-pipeline">{stages.map(([n,title,description],i)=><li key={n} data-active={i===stage} data-done={i<stage||step===20}><span>{i<stage||step===20?<UiIcon name="tick"/>:n}</span><div><strong>{title}</strong><p>{description}</p><div className="scene-field-strips">{['Kimlik alanı','Kitapçık','Cevaplar'].map(t=><small key={t}>{t}</small>)}</div></div></li>)}</ol><div className="scene-footer"><span>FMT VE CEVAP ANAHTARI KONTROLÜ</span><strong>{step>=18?'Değerlendirmeye hazır':'Kayıtlar inceleniyor'}</strong></div></div><SceneProgress/></div></section>;}
export function AcademicProgress(){
 const {root,step,controls}=useHomeScene(12600),[chosen,setChosen]=useState<number|null>(null),tab=chosen??Math.min(2,Math.floor(step/7));
 const labels=['Öğrenci gelişimi','Sınav Genel Analizi','Okul Çalışma Önerileri'];
 const points=[44,51,48,62,68],reveal=Math.max(.05,Math.min(1,(step%7+1)/6));
 return <section ref={root} className="demo-scene demo-academic" aria-labelledby="progress-title"><div><p className="hero-tag">VERİDEN ÇALIŞMA PLANINA</p><h2 id="progress-title">Sınav ve kazanım analizlerini incele.</h2><p>Öğrenci, yayımlanmış son beş uygun sınavını Analizim ve KurumsalSınav Asistanı ile inceler. Yetkili kurumlar soru dağılımlarını ve tekrar eden kazanım güçlüklerini toplu olarak görür.</p><p className="field-help">Temsili veriler. Farklı zorluktaki sınavlar doğrudan karşılaştırılmaz; tek bir soru kesin başarı yargısı oluşturmaz.</p>{controls}</div>
 <div className="scene-player"><div className="demo-paper insight-demo"><WindowTop label={labels[tab]}/><div className="insight-demo-tabs" role="group" aria-label="Analiz tanıtımı">{labels.map((label,i)=><button key={label} aria-pressed={tab===i} onClick={()=>setChosen(i)}>{label}</button>)}<button onClick={()=>setChosen(null)} aria-label="Tanıtımın otomatik akışına dön">↻</button></div>
 {tab===0?<><div className="scene-chart-heading"><small>ÖĞRENCİNİN KENDİ SONUÇLARI</small><h3>Beş gözlem, açık bir görünüm.</h3><span>Örnek aynı ölçekli sonuçlar · yorum için ölçme eşdeğerliği gerekir</span></div><svg className="scene-growth-chart" viewBox="0 0 440 190" role="img" aria-label="Temsili beş sınav: 44, 51, 48, 62, 68 net"><defs><clipPath id="insight-chart-reveal"><rect width={440*reveal} height="190"/></clipPath></defs>{[0,1,2,3].map(i=><g key={i}><path d={`M30 ${25+i*40}H420`} stroke="var(--line)"/><text x="2" y={29+i*40}>{80-i*20}</text></g>)}<g clipPath="url(#insight-chart-reveal)"><path d={points.map((v,i)=>`${i?'L':'M'}${45+i*87},${165-v*1.7}`).join(' ')} fill="none" stroke="var(--blue)" strokeWidth="3"/>{points.map((v,i)=><g key={i}><circle cx={45+i*87} cy={165-v*1.7} r="5" fill="var(--blue)"/><text x={45+i*87} y={151-v*1.7} textAnchor="middle">{v}</text></g>)}</g>{points.map((_,i)=><text key={i} x={45+i*87} y="184" textAnchor="middle">{i+1}. sınav</text>)}</svg><div className="insight-demo-answer"><span>Kazanım: Üslü ifadeler</span><strong>3 sınav · 12 ilgili soru</strong><p>Tekrarlayan zorlanma varsa kısa tekrar önerilir. Veri yetersizse açıkça belirtilir.</p></div></>:tab===1?<><div className="scene-chart-heading"><small>KİŞİSEL BİLGİ İÇERMEYEN TOPLU GÖRÜNÜM</small><h3>Soruları birlikte incele.</h3><span>Seçenek dağılımı · güçlük · ayırt edicilik</span></div><div className="insight-option-bars">{[12,58,18,8,4].map((v,i)=><div key={i}><b>{'ABCDE'[i]}</b><i style={{width:`${v*reveal}%`}}/><span>%{v}</span></div>)}</div><div className="insight-demo-answer"><span>ÖRNEK SORU · BASKIN ÇELDİRİCİ</span><strong>İnceleme önerisi, hata kararı değildir.</strong><p>Yetkili kişi gerekçesiyle karar kaydeder. Yetersiz katılımda ayrıntılar gizlenir.</p></div></>:<><div className="scene-chart-heading"><small>OKULUN KENDİ TOPLU SONUÇLARI</small><h3>Tekrar alanının gerekçesini gör.</h3><span>Birden fazla sınavdan, uygun sorulardan kanıt</span></div><div className="insight-evidence-flow">{['Sınav 1 · 2 soru','Sınav 2 · 3 soru','Ortak kazanım','Kısa tekrar + yeniden gözlem'].map((label,i)=><div key={label} data-active={step%7>=i}><span>{String(i+1).padStart(2,'0')}</span><strong>{label}</strong></div>)}</div><p className="scene-analysis-note">İnceleme gerektiren veya olağan dışı zor tek sorudan okul ya da öğretmen başarısızlığı çıkarılmaz.</p></>}
 </div><SceneProgress/></div></section>;
}
export function BatchScene(){
 const {root,step,controls}=useHomeScene(8400,5),done=step>=3;
 return <section ref={root} className="demo-scene demo-batch" aria-label="Temsili toplu değerlendirme ve rapor seçimi"><div className="scene-player"><div className="demo-paper"><WindowTop label="Kurum ve sınıf sonuçları"/><div className="scene-batch-number"><small>SEÇİLİ KURUM · ÖRNEK DENEME</small><strong>{done?'Sonuçları incele':'Seçimleri kontrol et'}</strong><p>{['TXT kayıtları hazır','Önizleme ve eşleşmeler kontrol ediliyor','Değerlendir ve kaydet','Kurum ve sınıf sonuçları hazır','Öğrenci karnesi seçiliyor','PDF veya Excel çıktısı seçiliyor'][step]}</p></div><div className="scene-batch-students">{['Örnek Öğrenci A','Örnek Öğrenci B','Örnek Öğrenci C'].map((name,i)=><div key={name}><span>{name}</span><span>8-{i? 'B':'A'}</span><b>{done?'✓ Sonuç hazır':'Kontrol'}</b></div>)}</div><div className="scene-report-choices">{['Okul Sonuç Karnesi','Sınıf Sonuç Listesi','Öğrenci Karnesi'].map((label,i)=><span key={label} data-active={done&&Math.min(2,step-3)===i}><UiIcon name={i===2?'document':'results'}/>{label}</span>)}</div><div className="scene-footer"><span>SEÇİLİ KURUM VE SINAV</span><strong>{step===5?'PDF · Excel':'Kurum → sınıf → öğrenci'}</strong></div></div><SceneProgress/></div><div><p className="hero-tag">BÜTÜN KURUM, DÜZENLİ SONUÇLAR</p><h2>Kurumundan sınıfına.<br/>Sonuçlar bir arada.</h2><p>Öğrenci kayıtlarını topluca değerlendir. Kurum ve sınıf sonuçlarını incele, öğrenci karnesini seç; PDF veya Excel çıktısını al.</p><p className="field-help">Temsili iş akışı · işlem süresi veya kapasite gösterimi değildir.</p>{controls}</div></section>;
}

// This is a local, scripted demonstration; the photograph is never sent to an OCR service.
export function OpenEndedScene(){
 const {root,step,controls}=useHomeScene(13000,100,true);
 const scanned=Math.min(1,Math.max(0,(step-5)/48)),scanning=step>5&&scanned<1;
 const readFirst=scanned>=.4,readSecond=scanned>=.75;
 const rubric=[
  {label:'Denklemleri taraf tarafa topla',expression:'4x = 20',points:3},
  {label:'x değerini bul',expression:'x = 5',points:3},
  {label:'Yerine koyarak y değerini bul',expression:'y = 8 − 2 · 5 = −2',points:4},
 ];
 return <section ref={root} className="demo-scene demo-open-ended" aria-labelledby="open-ended-title">
  <div>
   <p className="hero-tag">AÇIK UÇLU SORU DEĞERLENDİRME</p>
   <h2 id="open-ended-title">Yazılı cevabı ölçütlerle değerlendir.</h2>
   <div className="demo-labels"><span>Geliştirme aşamasında</span><span>Örnek değerlendirme</span></div>
   <p>Öğrencinin kâğıda yazdığı cevap taranarak metne dönüştürülür. Sistem, cevabı öğretmenin belirlediği ölçütlere göre adım adım değerlendirir ve her adımdan kaç puan alındığını gösterir. Okunması zor veya puanı belirsiz yanıtlar öğretmenin incelemesine sunulur.</p>
   {controls}
  </div>
  <div className="scene-player"><div className="demo-paper">
   <WindowTop label="Örnek değerlendirme"/>
   <div className="open-demo-content">
    <div className="open-demo-sheet">
     <div className="open-demo-source-heading"><small>MATEMATİK · EL YAZISI SORU</small><span data-scanning={scanning}><i/>{scanned===1?'Metne dönüştürüldü':scanning?'Taranıyor…':'Taramaya hazır'}</span></div>
     <h3>Denklem sisteminde x ve y’yi bul.</h3>
     <div className="open-demo-photo" data-scanned={scanned===1}>
      <img src="/open-ended-equations.jpg" width="904" height="1122" alt="El yazısıyla 2x + y = 8 ve 2x − y = 12 denklemleri; x ve y değerleri soruluyor." loading="lazy" decoding="async"/>
      <svg className="open-demo-typeset" viewBox="0 0 904 520" aria-hidden="true" focusable="false" style={{clipPath:`inset(0 0 ${(1-scanned)*100}% 0)`}}>
       {/* Reuse only the photograph's empty upper margin as the paper behind the typed text. */}
       <svg width="904" height="520" viewBox="0 0 904 320" preserveAspectRatio="none"><image href="/open-ended-equations.jpg" width="904" height="1122"/></svg>
       <g className="open-demo-equations"><text x="88" y="173">2x + y = 8</text><text x="632" y="173">x = ?</text><text x="88" y="345">2x − y = 12</text><text x="632" y="345">y = ?</text></g>
      </svg>
      {scanning&&<i className="open-demo-scan" aria-hidden="true" style={{top:`${scanned*100}%`}}><span/></i>}
     </div>
     <div className="open-demo-source-caption"><span>El yazısı → basılı metin</span><span>{scanned===1?'2 / 2 denklem':readFirst?'1 / 2 denklem':'Görüntü okunuyor'}</span></div>
    </div>
    <div className="open-demo-transcript" aria-label="Fotoğraftan okunan soru">
     <small>FOTOĞRAFTAN OKUNAN SORU</small>
     <div className="open-demo-read-lines"><p data-visible={readFirst}><span>2x + y = 8</span><span>x = ?</span></p><p data-visible={readSecond}><span>2x − y = 12</span><span>y = ?</span></p></div>
    </div>
    <div className="open-demo-rubric">
     <small>ÖĞRETMENİN ONAYLADIĞI ÖLÇÜTLER · ÖRNEK ÇÖZÜM</small>
     <p className="open-demo-solution-note">Fotoğrafta yalnız soru var. Aşağıdaki adımlar örnek çözümü gösterir.</p>
     {rubric.map(({label,expression,points},i)=><div key={label} data-done={step>=59+i*9}><span>{step>=59+i*9?<UiIcon name="tick"/>:<i/>}<span className="open-demo-rubric-label">{label}<span className="open-demo-expression" data-visible={step>=59+i*9}>{expression}</span></span></span><strong>{step>=59+i*9?points:'—'} / {points}</strong></div>)}
    </div>
    <div className="open-demo-final" data-visible={step>=87}>
     <strong className="open-demo-math-result">x = 5 <span>y = −2</span></strong><p>Örnek çözüm her iki denklemi de sağlar.</p><span>Örnek değerlendirme: 10 / 10 · Öğretmen onayına sunulur</span>
    </div>
   </div>
  </div><SceneProgress/></div>
 </section>;
}

const assistantExamples=[
 {question:'Son sınavdan kaç aldım?',title:'Son sınavın',text:'Örnek Fen Denemesi · 420 / 500 puan · 72 net',kind:'score'},
 {question:'Hangi kazanımlarda zorlanıyorum?',title:'Tekrar edebileceğin konular',text:'Üslü ifadeler: 3 sınavda 12 soru, 5 yanlış. Kısa bir konu tekrarıyla başlayabilirsin.',kind:'outcomes'},
 {question:'Son iki sınavı karşılaştır',title:'Son iki örnek sonuç',text:'Önceki sınav: 68 net → Son sınav: 72 net. Net farkı: +4. Sınavların zorlukları farklı olabilir.',kind:'compare'},
];
export function StudentAssistantScene(){
 const {root,step,controls}=useHomeScene(18000,100,true);
 return <section ref={root} className="demo-scene demo-student-assistant" aria-labelledby="assistant-demo-title"><div><p className="hero-tag">ÖĞRENCİ ASİSTANI</p><h2 id="assistant-demo-title">Karnen ve sınav geçmişin hakkında soru sor</h2><p>Son karneni aç, zorlandığın konuları gör ve sınav sonuçlarını karşılaştır. Öğrenci Asistanı, yalnızca sana açılmış sonuçlardan yanıt verir.</p><span className="demo-data-label">Örnek öğrenci verileri</span>{controls}</div><div className="scene-player"><div className="demo-paper assistant-demo-paper"><WindowTop label="Öğrenci Asistanı"/><div className="assistant-demo-intro"><span className="brand-mark">K</span><div><strong>Sonuçlarına birlikte bakalım.</strong><small>Örnek öğrenci verileri</small></div></div><div className="assistant-demo-chat">{assistantExamples.map((item,i)=>{
 const progress=step-i*33,characters=Math.floor(Math.max(0,Math.min(1,progress/19))*item.question.length),answered=progress>=24;
 return <div className="assistant-demo-turn" key={item.question} hidden={progress<0}><div className="assistant-demo-question"><span>{item.question.slice(0,characters)}</span>{!answered&&<i className="assistant-demo-cursor"/>}</div>{answered&&<div className="assistant-demo-answer" data-kind={item.kind}><small>{item.title}</small><p>{item.text}</p>{item.kind==='score'&&<div className="assistant-demo-meter"><i/></div>}{item.kind==='compare'&&<div className="assistant-demo-comparison"><span>Önceki <b>68 net</b></span><UiIcon name="arrow-right"/><span>Son <b>72 net</b></span></div>}</div>}</div>;
 })}</div><div className="scene-footer"><span>YAYIMLANMIŞ KİŞİSEL SONUÇLAR</span><strong>Örnek gösterim</strong></div></div><SceneProgress/></div></section>;
}
