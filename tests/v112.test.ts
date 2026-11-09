import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAnswerKeyPdf } from '../apps/api/src/answer-key-pdf';
import { inspectOutcomeFile } from '../apps/api/src/outcome-file';
import { analyzeFmt } from '../apps/api/src/fmt-analyze';

import { readEvaluationExcel } from '../apps/api/src/optical-catalog';
import { layout7108,layout8050 } from '../apps/api/src/optical-core';
import a from '../apps/web/data/optical-7108.json';
import b from '../apps/web/data/optical-8050.json';
const fixture=(name:string)=>path.join(__dirname,'fixtures',name);
test('v112: gerçek XLS/XLSX bağımsız API paketinde aynı 90 soruyu üretir',async()=>{
 for(const [file,f]of [['fernus-082701.xls','f'],['okulizyon-ankara.xlsx','o']]as const){const r=await inspectOutcomeFile(fixture(file),file,f);assert.deepEqual(r.questions,readEvaluationExcel(fixture(file),f));assert.equal(r.questions.length,90);}
 assert.ok(!fs.readFileSync(path.join(__dirname,'../apps/api/src/optical-catalog.ts'),'utf8').includes('@optik/web'));
});
test('v112: genel CSV/TSV, eksik cevabın önizlemeye aktarılması ve Türkçe PDF',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'v112-doc-'));try{
 for(const sep of [',','\t']){const name=sep===','?'key.csv':'key.tsv',file=path.join(dir,name);fs.writeFileSync(file,[['DERS','SORU NO','DOĞRU CEVAP','KAZANIM KODU','KAZANIM'],['TÜRKÇE','1','A','T.8.1','Öğrenci sözcüğün anlamını açıklar.'],['TÜRKÇE','2','','T.8.2','Çıkarım yapar.']].map(r=>r.join(sep)).join('\n'));const parsed=await inspectOutcomeFile(file,name);assert.equal(parsed.questions.length,2);assert.equal(parsed.questions[1].answer,'');assert.ok(parsed.issues.length);}
 const questions=readEvaluationExcel(fixture('fernus-082701.xls'),'f'),pdf=await createAnswerKeyPdf(questions,{examName:'Türkçe Ölçme – Şubat',publisherName:'Örnek Yayın',grade:8});
 const pages=await require('../apps/api/lib/pdf-text.cjs').readPdfText(pdf);assert.equal(pages.length,2);const texts=pages.flat().map((x:any)=>x.text).join(' ');assert.match(texts,/Türkçe Ölçme/);assert.match(texts,/Örnek Yayın/);assert.match(texts,/A KİTAPÇIĞI/);assert.match(texts,/B KİTAPÇIĞI/);assert.ok(!texts.includes('undefined'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('v112: metin tablo PDF okunur; tarama ve okunamayan PDF için açık yönlendirme',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'v112-table-'));const PDFDocument=require('pdfkit');
 const make=(table:boolean)=>new Promise<Buffer>(resolve=>{const doc=new PDFDocument({size:'A4'}),chunks:Buffer[]=[];doc.on('data',(x:Buffer)=>chunks.push(x));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.font(path.join(__dirname,'../apps/api/assets/fonts/LiberationSans-Regular.ttf')).fontSize(9);if(table){['DERS','SORU NO','CEVAP','KAZANIM KODU','KAZANIM'].forEach((s,i)=>doc.text(s,[30,110,180,245,355][i],60));['TÜRKÇE','1','C','T.8.1','Anlam çıkarır.'].forEach((s,i)=>doc.text(s,[30,110,180,245,355][i],85));}doc.end();});
 try{const file=path.join(dir,'table.pdf');fs.writeFileSync(file,await make(true));const r=await inspectOutcomeFile(file,'table.pdf');assert.equal(r.questions[0].answer,'C');assert.equal(r.questions[0].outcomeName,'Anlam çıkarır.');fs.writeFileSync(file,await make(false));await assert.rejects(()=>inspectOutcomeFile(file,'scan.pdf'),/OCR/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('v112: FMT gerçek alan sırası ve kapasitesi; dosya adına veya örnek eşitliğine bağlı değil',async()=>{
 const {hasFmt}=await import('../apps/api/src/fmt-share');
 for(const [raw,layout]of [[a,layout7108],[b,layout8050]]as const){const r=analyzeFmt(raw.originalFmt);assert.equal(r.layout.lineLength,layout.lineLength);assert.deepEqual(r.layout.fields.id,layout.fields.id);assert.deepEqual(r.layout.lessons.map(l=>[l.name,l.start,l.length]),layout.lessons.map(l=>[l.name,l.start,l.length]));assert.equal(r.coordinates.valid,true);}
 const unknown=analyzeFmt(a.originalFmt.replace('TÜRKÇE','YENİ DERS'));assert.ok(unknown.mappings.some(m=>m.sourceName==='YENİ DERS'&&m.status!=='Eşleşti'));assert.throws(()=>analyzeFmt('{"name":"7108"}'),/sözdiziminde/);assert.equal(hasFmt({originalFmt:'{"layout":{}}'}),false);
});
test('v112: paylaşım süreleri, ay sonu ve yalnızca hash saklanması',async()=>{
 const {shareExpiry,shareHash}=await import('../apps/api/src/fmt-share');
 assert.equal(shareExpiry('5m',new Date('2026-11-09T10:00:00Z')).toISOString(),'2026-11-09T10:05:00.000Z');assert.equal(shareExpiry('1mo',new Date('2026-01-31T10:00:00Z')).toISOString(),'2026-02-28T10:00:00.000Z');assert.equal(shareHash('secret').length,64);assert.notEqual(shareHash('secret'),shareHash('other'));
});
test('v112: süreli paylaşım API tek dosya, iptal, süre aşımı ve yanlış anahtarı reddeder',async()=>{
 const {shareHash,fmtShareRouter}=await import('../apps/api/src/fmt-share');
 const {prisma}=await import('../apps/api/src/db');const originals:Array<[any,string,any]>=[];const patch=(o:any,k:string,v:any)=>{originals.push([o,k,o[k]]);o[k]=v;};let saved:any;
 patch(prisma.opticalTemplate,'findFirst',async()=>({id:'fmt',name:'7108',originalFmt:a.originalFmt,active:true}));
 patch(prisma.fmtShare,'create',async({data}:any)=>(saved={id:'share',revokedAt:null,...data,template:{name:'7108',originalFmt:a.originalFmt,active:true}}));
 patch(prisma.fmtShare,'findFirst',async({where,select}:any)=>{if(!saved||saved.revokedAt||saved.expiresAt<=where.expiresAt.gt||where.tokenHash&&where.tokenHash!==saved.tokenHash)return null;return select?{expiresAt:saved.expiresAt}:saved;});
 patch(prisma.fmtShare,'updateMany',async({where,data}:any)=>{if(where.createdById&&where.createdById!==saved.createdById)return{count:0};Object.assign(saved,data);return{count:1};});
 async function invoke(route:string,method:string,body:any={},user:any={id:'dealer',role:'DEALER'}){let status=200,result:any;const layer=(fmtShareRouter as any).stack.find((l:any)=>l.route?.path===route&&l.route.methods[method]);await layer.route.stack.at(-1).handle({params:{id:'share'},body,user},{setHeader(){},status(n:number){status=n;return this;},json(v:any){result=v;},attachment(){return this;},type(){return this;},send(v:any){result=v;},end(){}},(e:any)=>{if(e)throw e;});return{status,result};}
 try{const created=await invoke('/api/optical/templates/:id/shares','post',{duration:'5m'});assert.equal(created.status,201);const token=new URL(created.result.url).hash.slice(1);assert.equal(saved.tokenHash,shareHash(token));assert.equal(saved.token,undefined);assert.equal((await invoke('/api/public/fmt-shares/:id/view','post',{token:'x'.repeat(43)})).status,410);const info=await invoke('/api/public/fmt-shares/:id/info','get');assert.deepEqual(Object.keys(info.result),['expiresAt']);const dl=await invoke('/api/public/fmt-shares/:id/download','post',{token});assert.equal(dl.status,200);assert.ok(Buffer.isBuffer(dl.result));assert.equal((await invoke('/api/optical/fmt-shares/:id','delete',{}, {id:'other',role:'DEALER'})).status,404);saved.expiresAt=new Date(0);assert.equal((await invoke('/api/public/fmt-shares/:id/info','get')).status,410);assert.equal((await invoke('/api/public/fmt-shares/:id/download','post',{token})).status,410);saved.expiresAt=new Date(Date.now()+60000);assert.equal((await invoke('/api/optical/fmt-shares/:id','delete')).status,204);assert.equal((await invoke('/api/public/fmt-shares/:id/download','post',{token})).status,410);}finally{for(const[o,k,v]of originals.reverse())o[k]=v;}
});
test('v112: mevcut anahtar düzenlemesi aynı sınava yeni PDF ekler, geçmiş dosyayı silmez',async()=>{
 const {prisma}=await import('../apps/api/src/db'),{opticalRouter}=await import('../apps/api/src/optical-routes'),{keyFingerprint}=await import('../apps/api/src/optical-review');
 const originals:Array<[any,string,any]>=[],patch=(o:any,k:string,v:any)=>{originals.push([o,k,o[k]]);o[k]=v;};const q=readEvaluationExcel(fixture('fernus-082701.xls'),'f');let generated:any;const key={id:'key',publicationId:'v112-test-publication',questions:q,penalty:3};
 patch(prisma,'$transaction',async(fn:any)=>fn(prisma));patch(prisma.opticalKey,'findUnique',async()=>structuredClone(key));patch(prisma.opticalKey,'update',async({data}:any)=>({...key,...data}));patch(prisma.publishedAnswerKey,'findUnique',async()=>({id:key.publicationId,examName:'Güncel Türkçe',grade:8,publisher:{name:'Örnek'}}));patch(prisma.answerKeyFile,'create',async({data}:any)=>{generated=data;return data;});patch(prisma.answerKeyFile,'deleteMany',async()=>{throw new Error('Geçmiş dosya silinmemeli');});
 try{const questions=structuredClone(q);questions[0].answer='X';const handler=(opticalRouter as any).stack.find((l:any)=>l.route?.path==='/keys/:id'&&l.route.methods.patch).route.stack.at(-1).handle;let status=200;await handler({params:{id:'key'},body:{questions,confirmImport:true,expectedFingerprint:keyFingerprint(q,3)},user:{role:'SUPER_ADMIN'}},{status(n:number){status=n;return this;},json(){}},(e:any)=>{if(e)throw e;});assert.equal(status,200);assert.equal(generated.answerKeyId,key.publicationId);assert.equal(generated.generated,true);assert.equal(fs.readFileSync(generated.storagePath).subarray(0,5).toString(),'%PDF-');assert.equal(q[0].answer,'C');}finally{if(generated)fs.rmSync(path.dirname(generated.storagePath),{recursive:true,force:true});for(const[o,k,v]of originals.reverse())o[k]=v;}
});
test('v112: bayi 7108/8050 özgün FMT uç noktalarını indirir; JSON FMT olarak sunulmaz',async()=>{
 const {opticalRouter}=await import('../apps/api/src/optical-routes'),{prisma}=await import('../apps/api/src/db');
 const handler=(p:string)=>(opticalRouter as any).stack.find((l:any)=>l.route?.path===p).route.stack.at(-1).handle;
 async function invoke(route:string,params:any){let status=200,body:any;await handler(route)({params,user:{role:'DEALER'}},{status(n:number){status=n;return this;},setHeader(){},attachment(){return this;},type(){return this;},send(v:any){body=v;},json(v:any){body=v;}},(e:any)=>{if(e)throw e;});return{status,body};}
 for(const code of ['7108','8050']){const r=await invoke('/templates/examples/:code/download',{code});assert.equal(r.status,200);assert.deepEqual(r.body,fs.readFileSync(path.join(__dirname,'../apps/api/assets/templates',code+'.fmt')));}
 const old=prisma.opticalTemplate.findFirst;prisma.opticalTemplate.findFirst=(async()=>({name:'Eksik',originalFmt:'{"layout":{}}'}))as any;try{const r=await invoke('/templates/:id/download',{id:'fmt'});assert.equal(r.status,404);assert.match(r.body.error,/JSON/);}finally{prisma.opticalTemplate.findFirst=old;}
 const {bulkTemplatesInput}=await import('../apps/api/src/fmt-bulk');assert.equal(bulkTemplatesInput.safeParse({templates:[{name:'Bir',originalFmt:a.originalFmt,layout:layout7108},{name:'İki',originalFmt:a.originalFmt,layout:layout7108}]}).success,false);
});
