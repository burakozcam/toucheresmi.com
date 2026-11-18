import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveLocation,requireLocation,turkeyProvinces,locationKey} from '../apps/api/lib/turkey-locations';
import {regionAllowed} from '../apps/api/src/dealer-policy';
import {reportPdf,reportExcelRows} from '../apps/api/src/result-pdf';
import {opticalSummary} from '../apps/api/src/optical-core';
import {prepareEvaluation} from '../apps/api/src/optical-catalog';
const {readPdfText}=require('../apps/api/lib/pdf-text.cjs');
function view(){const questions=Array.from({length:20},(_,i)=>({lesson:'TÜRKÇE',number:i+1,answer:'A',weight:1,positions:{A:i+1},outcomeCode:'T.8.1',outcomeName:'Metni anlar.'}));const students=[0,1].map(i=>({id:`demo-${i}`,name:`ÖRNEK ${i}`,studentNo:`100${i}`,branch:'8-A',school:'Örnek Kurum',answers:questions.map((_,i)=>i<16?'A':'B'),booklets:{},sourceLines:[]}));const data:any={questions,students,warnings:[],lineCount:2};return{data,summary:opticalSummary(data,3),keyName:'Örnek Deneme',schoolName:'Örnek Kurum',penalty:3,rankings:Object.fromEntries(students.map(s=>[s.id,{generalRank:987,generalCount:7654,cityRank:98,cityCount:654,districtRank:87,districtCount:543,schoolRank:76,schoolCount:432,classRank:65,classCount:321}]))};}
test('v134 konum kaynağı: 81 il, 973 benzersiz ilçe ve doğru ebeveyn ilişkisi',()=>{assert.equal(turkeyProvinces.length,81);const districts=turkeyProvinces.flatMap(p=>p.districts);assert.equal(districts.length,973);assert.equal(new Set(districts.map(d=>d.id)).size,973);assert.equal(new Set(turkeyProvinces.map(p=>p.id)).size,81);assert.deepEqual(requireLocation('Istanbul','KADIKOY'),requireLocation('İstanbul','Kadıköy'));assert.equal(resolveLocation('Ankara','Kadıköy'),null);assert.throws(()=>requireLocation('uydurma','ilçe'));assert.equal(requireLocation('Ankara','Cankaya').district,'Çankaya');assert.equal(locationKey('IĞDIR'),locationKey('Iğdır'));});
test('v134 bölgesel yetki eski yazımlar ve standart listeyle aynı kapsamı korur',()=>{const dealer={restrictedRegions:true,regions:[{publisherId:null,city:'Istanbul',district:'Kadikoy'}]};assert.ok(regionAllowed(dealer,null,'İstanbul','Kadıköy'));assert.ok(!regionAllowed(dealer,null,'İstanbul','Maltepe'));});
test('v134 altı karne tasarımında dört bağımsız katılım kombinasyonu: tekli ve toplu PDF, değişmeyen sonuç',async()=>{const v=view(),before=JSON.stringify(v);fs.mkdirSync('test-results/v134/pdf',{recursive:true});for(const templateId of ['summary-card','two-page-card','detailed-card','classic-card','analysis-card','table-card'])for(const general of [false,true])for(const school of [false,true])for(const bulk of [false,true]){const options:any={kind:'cards',order:'name',hideIdentity:true,templateId,showGeneralParticipation:general,showSchoolParticipation:school,...(!bulk?{studentId:'demo-0'}:{})};const bytes=await reportPdf(v,options);const pages=await readPdfText(bytes);const text=pages.flat().map((x:any)=>x.text).join(' ');assert.equal(/Genel Sıra/.test(text),general,`${templateId} general=${general}`);assert.equal(/Kurum Sırası/.test(text),school,`${templateId} school=${school}`);if(!general)assert.doesNotMatch(text,/Genel sıra|İl sıra|İlçe sıra|7654|7\.654/);if(!school)assert.doesNotMatch(text,/Kurum ort\.|Kurum sıra|Sınıf sıra|432|321/);assert.match(text,/Toplam Net/);assert.ok(!/NaN|undefined/.test(text));if(templateId==='summary-card'&&!bulk)fs.writeFileSync(`test-results/v134/pdf/g${Number(general)}-s${Number(school)}.pdf`,bytes);assert.equal(JSON.stringify(v),before);}});
test('v134 Excel katılım sütunları dört kombinasyonda başlık ve satırla eşleşir',()=>{for(const general of [false,true])for(const school of [false,true]){const rows=reportExcelRows(view(),{kind:'cards',order:'name',hideIdentity:true,showGeneralParticipation:general,showSchoolParticipation:school});assert.equal(rows[0].includes('Genel Katılım'),general);assert.equal(rows[0].includes('Kurum Katılım'),school);assert.ok(rows.every(r=>r.length===rows[0].length));}});
test('v134 yalnız PDF anahtarında yayın için yapılandırılmış veri gerekmez; optik açmak hâlâ doğrulanır',()=>{const files=[{category:'ANSWER_KEY',originalFileName:'ornek.pdf',storagePath:'/tmp/unused.pdf'}];assert.equal(prepareEvaluation(files,false,null,true),null);assert.throws(()=>prepareEvaluation(files,true,null,true));});
test('v134 il/ilçe sıralaması kanonik ve eski ASCII konumları aynı grupta toplar',async()=>{const {resultRankings}=await import('../apps/api/src/result-rankings');const one={schoolId:'a',data:{students:[{id:'1',branch:'8-A'}]},summary:[{id:'1',score:400}]};const two={schoolId:'b',data:{students:[{id:'2',branch:'8-B'}]},summary:[{id:'2',score:450}]};const ranks=resultRankings(one,[one,two],[{id:'a',city:'İstanbul',district:'Kadıköy'},{id:'b',city:'Istanbul',district:'Kadikoy'}]);assert.equal(ranks.rankings['1'].cityCount,2);assert.equal(ranks.rankings['1'].districtRank,2);assert.equal(ranks.rankings['1'].schoolCount,1);});
test('v134 deployment ön kontrolü: API site key eksikliği, yanlış public key ve frontend sırrı reddedilir',()=>{const {validateEnvironment}=require('../scripts/deployment-preflight.cjs');const e:any={NEXT_PUBLIC_API_URL:'https://api.example.test',WEB_ORIGIN:'https://web.example.test',DATABASE_URL:'postgresql://sentetik',JWT_SECRET:'synthetic-secret',TXT_STORAGE_KEY:'synthetic-storage',MFA_ENCRYPTION_KEY:'synthetic-mfa',STORAGE_DIR:'/private/storage',RATE_LIMIT_STORE:'database',RECAPTCHA_ENABLED:'true',RECAPTCHA_SITE_KEY:'public-site',RECAPTCHA_SECRET_KEY:'private-sentinel'};assert.deepEqual(validateEnvironment(e,22),[]);const missing={...e};delete missing.RECAPTCHA_SITE_KEY;assert.match(validateEnvironment({...missing,NEXT_PUBLIC_RECAPTCHA_SITE_KEY:'public-site'},22).join(' '),/RECAPTCHA_SITE_KEY eksik/);assert.match(validateEnvironment({...e,NEXT_PUBLIC_RECAPTCHA_SITE_KEY:'different'},22).join(' '),/uyuşmuyor/);const errors=validateEnvironment({...e,NEXT_PUBLIC_SECRET_KEY:'private-sentinel'},22);assert.match(errors.join(' '),/frontend/);assert.ok(!errors.join(' ').includes('private-sentinel'));assert.ok(validateEnvironment({...e,NEXT_PUBLIC_API_URL:'http://api.example.test'},22).length);assert.ok(validateEnvironment(e,24).length);});
test('v137 karne altındaki site adresi tekli/toplu bütün şablonlarda kapatılabilir; varsayılan ve sayfa numaraları korunur',async()=>{
 const v=view(),before=JSON.stringify(v),out='test-results/v137/pdf-footer';fs.mkdirSync(out,{recursive:true});
 for(const templateId of ['summary-card','two-page-card','detailed-card','classic-card','analysis-card','table-card'])for(const bulk of [false,true]){
  const options:any={kind:'cards',order:'name',hideIdentity:true,templateId,...(!bulk?{studentId:'demo-0'}:{})};
  const normal=await reportPdf(v,options),hidden=await reportPdf(v,{...options,showSiteAddress:false}),pages=await readPdfText(normal),hiddenPages=await readPdfText(hidden);
  assert.equal(hiddenPages.length,pages.length,templateId);
  for(let i=0;i<pages.length;i++){
   const text=pages[i].map((r:any)=>r.text).join(' '),without=hiddenPages[i].map((r:any)=>r.text).join(' ');
   assert.match(text,/kurumsalsinav\.com/);assert.doesNotMatch(without,/kurumsalsinav\.com/);
   assert.equal(without,text.replace(/kurumsalsinav\.com\s*/g,''),`${templateId} page ${i+1}: only footer address changes`);
  }
  if(templateId==='two-page-card'&&!bulk){fs.writeFileSync(`${out}/address-visible.pdf`,normal);fs.writeFileSync(`${out}/address-hidden.pdf`,hidden);}
 }
 assert.equal(JSON.stringify(v),before);
});
test('v137 sınava özel logo oranı korunur; platform markası her sayfanın sağ altında kalır',async()=>{
 const sharp=(await import('sharp')).default,{normalizeExamReportLogo,reportLogoBuffer}=await import('../apps/api/src/report-logo-image');
 const v=view(),before=JSON.stringify(v),out='test-results/v137/pdf-branding';fs.mkdirSync(out,{recursive:true});
 for(const [name,width,height]of [['wide',900,90],['tall',90,900],['square',180,180]] as const){
  const raw=await sharp({create:{width,height,channels:4,background:'#2c8b62'}}).png().toBuffer(),image=await normalizeExamReportLogo('data:image/png;base64,'+raw.toString('base64')),bytes=reportLogoBuffer(image)!;
  const meta=await sharp(bytes).metadata();if(name==='wide')assert.equal(meta.width,900);assert.ok(meta.width!<=1200&&meta.height!<=240);assert.ok(Math.abs(meta.width!/meta.height!-width/height)<.2);
  const pdf=await reportPdf({...v,examReportLogo:bytes},{kind:'cards',templateId:'two-page-card',order:'name',hideIdentity:true,studentId:'demo-0',showSiteAddress:false});
  const pages=await readPdfText(pdf);assert.equal(pages.length,2);
  for(const page of pages){const words=page.map((r:any)=>r.text).join(' ');assert.doesNotMatch(words,/kurumsalsinav\.com|KURUMSAL SINAV/);assert.match(words,/Kurumsal Sınav/);assert.match(words,/ÖĞRENCİ SONUÇ BELGESİ/);}
  fs.writeFileSync(`${out}/${name}.pdf`,pdf);
 }
 assert.equal(JSON.stringify(v),before);
});
test('v137 logo yüklemesi URL, SVG, bozuk içerik ve büyük görseli reddeder',async()=>{
 const sharp=(await import('sharp')).default,{normalizeExamReportLogo,reportLogoBuffer}=await import('../apps/api/src/report-logo-image');
 for(const value of ['https://example.test/logo.png','data:image/svg+xml;base64,'+Buffer.from('<svg/>').toString('base64'),'data:image/png;base64,'+Buffer.from('not a png').toString('base64')])await assert.rejects(()=>normalizeExamReportLogo(value),{code:'INVALID_REPORT_LOGO'});
 await assert.rejects(()=>normalizeExamReportLogo('data:image/png;base64,'+Buffer.alloc(2*1024*1024+1).toString('base64')),{code:'REPORT_LOGO_TOO_LARGE'});
 const oversized=await sharp({create:{width:2100,height:2100,channels:3,background:'white'}}).png().toBuffer();await assert.rejects(()=>normalizeExamReportLogo('data:image/png;base64,'+oversized.toString('base64')),{code:'INVALID_REPORT_LOGO'});
 assert.equal(reportLogoBuffer('https://example.test/logo.png'),undefined);
});
