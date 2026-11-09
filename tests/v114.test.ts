import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {createAnswerKeyPdf} from "../apps/api/src/answer-key-pdf";
import {detectFmtSource} from "../apps/api/src/fmt-source";
import {layout7108, type OpticalQuestion} from "../apps/api/src/optical-core";
import fmt from "../apps/web/data/optical-7108.json";
const questions:OpticalQuestion[]=Array.from({length:3},(_,i)=>({lesson:"TÜRKÇE",number:i+1,answer:"ABC"[i],weight:1,positions:{A:i+1,B:3-i,C:(i+1)%3+1,D:(i+2)%3+1},outcomeCode:"",outcomeName:""}));
const textPages=(pdf:Buffer)=>require("../apps/api/lib/pdf-text.cjs").readPdfText(pdf) as Promise<Array<Array<{text:string;x:number;y:number}>>>;
test("v114 PDF: A/B tek PDF ve ayrı PDF'lerde soru sırası; C/D ve kazanımsız tek kitapçık",async()=>{
 for(const books of [["A","B"],["A"],["B"],["C"],["D"]]){
 const pages=await textPages(await createAnswerKeyPdf(questions,{examName:"Türkçe Ölçme",grade:8,publisherName:"Örnek Yayın",books}));assert.equal(pages.length,books.length);
 for(let i=0;i<books.length;i++){const text=pages[i].map(p=>p.text).join(" ");assert.ok(text.includes(books[i]+" KİTAPÇIĞI"));assert.ok(text.includes("Türkçe Ölçme"));const actual=pages[i].filter(p=>p.x>=130&&p.x<190&&/^[ABCDE]$/.test(p.text)).map(p=>p.text);const expected=[...questions].sort((a,b)=>a.positions[books[i]]-b.positions[books[i]]).map(q=>q.answer);assert.deepEqual(actual,expected);}
 }
 const one=questions.map(q=>({...q,positions:{A:q.number}}));assert.equal((await textPages(await createAnswerKeyPdf(one))).length,1);
 await assert.rejects(()=>createAnswerKeyPdf(questions,{books:["Z"]}),/Kitapçık|kitapçık/);
});
test("v114 PDF: kurumsal SVG aynen yeniden kullanılır; logo eksikken PDF çalışır",async()=>{
 const asset=path.join(__dirname,"../apps/api/assets/branding/kurumsal-sinav.svg");assert.deepEqual(fs.readFileSync(asset),fs.readFileSync(path.join(__dirname,"../apps/web/public/favicon.svg")));
 const original=fs.readFileSync;fs.readFileSync=((filename:any,...rest:any[])=>{if(String(filename)===asset)throw new Error("missing brand");return (original as any)(filename,...rest);}) as any;
 try{const pages=await textPages(await createAnswerKeyPdf(questions,{books:["A"],...( {publisherLogo:"SHOULD_NEVER_BE_EMBEDDED"} as any)}));const text=pages.flat().map(v=>v.text).join(" ");assert.match(text,/KURUMSAL SINAV/);assert.ok(!text.includes("SHOULD_NEVER_BE_EMBEDDED"));}finally{fs.readFileSync=original;}
});
test("v114 FMT kaynak: yalnızca açık kaynak işareti; dosya adı ve koordinattan F/O uydurulmaz",()=>{
 assert.equal(detectFmtSource(fmt.originalFmt),null);
 const {fmtContentIdentity}=require("../apps/api/lib/fmt-identity");const reordered={literals:layout7108.literals,lessons:layout7108.lessons,fields:Object.fromEntries(Object.entries(layout7108.fields).reverse()),lineLength:layout7108.lineLength};assert.equal(fmtContentIdentity({originalFmt:fmt.originalFmt,layout:layout7108}),fmtContentIdentity({originalFmt:fmt.originalFmt,layout:reordered}));
 const marked=(marker:string)=>fmt.originalFmt.replace(/\r\n/,`=${marker}=\r\n`);
 assert.equal(detectFmtSource(marked("FERNUS")),"f");assert.equal(detectFmtSource(marked("OKULİZYON")),"o");assert.equal(detectFmtSource(marked("FERNUS=OKULİZYON")),null);
});
test("v114 FMT satır API: bozuk satır diğerlerini engellemez, metadata korunur; tekrar ve onaysız giriş reddedilir",async()=>{
 const {opticalRouter}=await import("../apps/api/src/optical-routes"),{prisma}=await import("../apps/api/src/db"),{fmtProof}=await import("../apps/api/src/fmt-verification");const originals=[prisma.$transaction,prisma.publisher.findUnique,prisma.opticalTemplate.findMany,prisma.opticalTemplate.create];const rows:any[]=[];
 prisma.$transaction=(async(fn:any)=>fn(prisma)) as any;prisma.publisher.findUnique=(async()=>({id:"pub"})) as any;prisma.opticalTemplate.findMany=(async()=>rows) as any;prisma.opticalTemplate.create=(async({data}:any)=>{const row={id:"fmt-"+rows.length,...data};rows.push(row);return row;}) as any;
 const handler=(opticalRouter as any).stack.find((l:any)=>l.route?.path==="/templates/bulk-rows").route.stack.at(-1).handle;
 const make=(i:number)=>{const originalFmt=fmt.originalFmt.replace("KOD-1",`KOD-${100+i}`),layout=structuredClone(layout7108),readerName="Örnek TXT alan kontrolü";return{name:"FMT "+i,grade:i+1,publisherId:"pub",sourceFormat:i%2?"f":"manual",originalFmt,layout,verification:{readerName,readerConfirmed:true,encoding:"utf-8",token:fmtProof("admin",originalFmt,layout,readerName,"utf-8")}};};
 async function invoke(templates:any[]){let result:any;await handler({body:{templates},user:{id:"admin",role:"SUPER_ADMIN"}},{json(v:any){result=v;}},(e:any)=>{if(e)throw e;});return result;}
 try{const input=Array.from({length:5},(_,i)=>make(i));input.splice(2,0,{name:"Bozuk"} as any);const r=await invoke(input);assert.equal(r.successCount,5);assert.equal(r.results.filter((v:any)=>v.status==="error").length,1);assert.deepEqual(rows.map(r=>r.grade),[1,2,3,4,5]);assert.ok(rows.every(r=>r.publisherId==="pub"));assert.equal((await invoke([make(0)])).successCount,0);const noProof={...make(9),verification:undefined};assert.equal((await invoke([noProof])).successCount,0);const unknown={...make(8),sourceFormat:"auto"};assert.equal((await invoke([unknown])).successCount,0);}finally{[prisma.$transaction,prisma.publisher.findUnique,prisma.opticalTemplate.findMany,prisma.opticalTemplate.create]=originals;}
});
test("v114 logolar: PNG/JPEG/WebP gerçek çözümleme, oran, şeffaflık ve SVG/bozuk dosya reddi",async()=>{
 const {optimizePublisherLogo}=await import("../apps/api/src/publisher-logos");
 for(const format of ["png","jpeg","webp"]as const){const bytes=await sharp({create:{width:1200,height:300,channels:4,background:{r:20,g:40,b:60,alpha:.3}}})[format]().toBuffer(),out=await optimizePublisherLogo(bytes);assert.equal(out.width,512);assert.equal(out.height,128);const metadata=await sharp(out.bytes).metadata();assert.equal(metadata.format,"png");if(format!=="jpeg")assert.equal(metadata.hasAlpha,true);}
 await assert.rejects(()=>optimizePublisherLogo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')));
 await assert.rejects(()=>optimizePublisherLogo(Buffer.from([137,80,78,71,13,10,26,10,0])));
 await assert.rejects(()=>optimizePublisherLogo(Buffer.alloc(5*1024*1024+1)));
});

test("v114 PDF API: yayımlanmamış sınav gizli kalır; eski kayıtta mevcut indirmeye yönlendirme; geçersiz kitapçık reddi",async()=>{
 const {answerPdfRouter}=await import("../apps/api/src/answer-pdf-routes"),{prisma}=await import("../apps/api/src/db");const original=prisma.publishedAnswerKey.findFirst;let publication:any={id:"pub-key",published:false,grade:8,examName:"Gizli",opticalKey:{questions}};
 prisma.publishedAnswerKey.findFirst=(async({where}:any)=>where.published&&!publication.published?null:publication) as any;
 const handler=(path:string)=>(answerPdfRouter as any).stack.find((v:any)=>v.route?.path===path).route.stack.at(-1).handle;
 async function invoke(path:string,book?:string){let status=200,data:any;await handler(path)({params:{id:"pub-key"},query:{book}},{setHeader(){},status(n:number){status=n;return this;},json(v:any){data=v;return this;},attachment(){return this;},type(){return this;},send(v:any){data=v;return this;}},(e:any)=>{if(e)throw e;});return{status,data};}
 try{assert.equal((await invoke("/api/answer-keys/:id/pdf-info")).status,404);assert.equal((await invoke("/api/admin/answer-keys/:id/pdf","A")).status,200);publication.published=true;assert.equal((await invoke("/api/answer-keys/:id/pdf","Z")).status,400);publication.opticalKey=null;assert.deepEqual((await invoke("/api/answer-keys/:id/pdf-info")).data,{books:[]});assert.equal((await invoke("/api/answer-keys/:id/pdf")).status,409);}finally{prisma.publishedAnswerKey.findFirst=original;}
});
test("v114 logo deposu arızası ana API'yi etkilemez; yönetim router'ında sunucu yetkisi zorunlu",async()=>{
 const {publisherLogoRouter}=await import("../apps/api/src/publisher-logos"),{prisma}=await import("../apps/api/src/db"),{app}=await import("../apps/api/src/server");const original=prisma.publisherLogo.findUnique;
 prisma.publisherLogo.findUnique=(async()=>{throw new Error("new table unavailable");}) as any;
 try{const get=(publisherLogoRouter as any).stack.find((l:any)=>l.route?.path==="/api/publishers/:id/logo").route.stack.at(-1).handle;let status=200;await get({params:{id:"publisher"}},{status(n:number){status=n;return this;},end(){}},()=>{});assert.equal(status,404);const admin=(publisherLogoRouter as any).stack.find((l:any)=>l.handle?.stack).handle;assert.equal(admin.stack[0].handle.name,"requireAuth");let denied=200;admin.stack[1].handle({user:{role:"DEALER"}},{status(n:number){denied=n;return this;},json(){}},()=>{});assert.equal(denied,403);let healthy:any;const health=(app as any).router.stack.find((l:any)=>l.route?.path==="/api/health").route.stack.at(-1).handle;health({},{json(v:any){healthy=v;}});assert.equal(healthy.status,"ok");}finally{prisma.publisherLogo.findUnique=original;}
});
