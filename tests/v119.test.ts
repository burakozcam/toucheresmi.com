import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {inferFmt} from "../apps/api/src/fmt-inference";
import {layout7108,layout8050,parseOptical,decodeOptical,opticalSummary} from "../apps/api/src/optical-core";
import {encodeTxt} from "../apps/api/src/txt-converter";
import {verifyHuman} from "../apps/api/src/human-verification";
import {reportTemplate} from "../apps/api/lib/report-templates";
import {resultGrade} from "../apps/api/lib/result-grade";
import {parseOpticalKeyRows} from "../apps/web/lib/optical";
import rows from "../apps/web/data/nartest-8-optical.json";
const txt=fs.readFileSync(new URL("./fixtures/7108-anonymous.txt",import.meta.url),"utf8"),q=parseOpticalKeyRows(rows);
const templates=[{id:"7108",name:"Sistem FMT 7108",layout:layout7108},{id:"8050",name:"Sistem FMT 8050",layout:layout8050}];

test("v119 FMT inference: 7108/8050, confidence, aliases, ambiguity and misleading prefixes",()=>{
 const strong=inferFmt(txt,templates);assert.equal(strong.confidence,"strong");assert.equal(strong.message,"Tahmin edilen FMT: 7108");assert.equal(strong.candidates[0].sampled,4);
 const other=inferFmt(fs.readFileSync(new URL("./fixtures/8050-anonymous.txt",import.meta.url),"utf8"),templates);assert.equal(other.confidence,"possible");
 const single8050=fs.readFileSync(new URL("./fixtures/8050-anonymous.txt",import.meta.url),"utf8").split(/\r?\n/).filter((line,i)=>line&&i!==8).join("\n");assert.equal(inferFmt(single8050,templates).confidence,"strong");assert.equal(other.candidates[0].id,"8050");
 const lines=txt.replace(/[\r\n]+$/,"").split(/\r?\n/);
 assert.equal(inferFmt(lines[0],templates).confidence,"possible");
 assert.equal(inferFmt([...lines.slice(0,3),"broken"].join("\n"),templates).confidence,"possible");
 assert.equal(inferFmt("7108 fake data\n7108 fake data",templates).confidence,"failed");
 assert.equal(inferFmt("",templates).confidence,"failed");
 const alias=inferFmt(txt,[...templates,{...templates[0],id:"alias"}]);assert.equal(alias.confidence,"strong");assert.deepEqual(alias.candidates[0].aliases,["7108","alias"]);
 const similar=structuredClone(layout7108);delete similar.fields.branch;
 assert.equal(inferFmt(txt,[templates[0],{id:"ambiguous",name:"Benzer",layout:similar}]).confidence,"failed");
 const report=JSON.stringify(strong);assert.ok(!report.includes("ORNEK"));assert.ok(!report.includes("SAMPLE00001"));
});

test("v119 7108 regression: 1-based booklet at 51, UTF-8/1254, BOM, CRLF/LF, optional fields and errors",()=>{
 const lines=txt.replace(/[\r\n]+$/,"").split(/\r?\n/);
 const put=(line:string,start:number,length:number,value:string)=>line.slice(0,start-1)+value.padEnd(length)+line.slice(start-1+length);
 const turkish=lines.map(line=>put(line,16,10,"ÇAĞRI"));
 const baseline=parseOptical(turkish.join("\n"),layout7108,q,"Kurum");
 assert.equal(baseline.students[0].name,"ÇAĞRI BIR");
 for(const encoding of ["utf-8","windows-1254"] as const)for(const eol of ["\n","\r\n","\r"]){const decoded=decodeOptical(encodeTxt(turkish.join(eol)+eol,encoding));assert.deepEqual(parseOptical(decoded,layout7108,q,"Kurum").students,baseline.students);}
 assert.deepEqual(parseOptical("\ufeff"+turkish.join("\r\n"),layout7108,q,"Kurum").students,baseline.students);
 assert.equal(parseOptical(put(lines[0],5,6,""),layout7108,q,"Kurum").students.length,1);
 const missingBook=put(lines[0],51,1,"");assert.throws(()=>parseOptical(missingBook,layout7108,q,"Kurum"),/kitapçık.*51-51/);
 assert.throws(()=>parseOptical(put(lines[0],51,1,"E"),layout7108,q,"Kurum"),/kitapçık/);
 assert.throws(()=>parseOptical(lines[0].slice(1),layout7108,q,"Kurum"),/171 karakter/);
 assert.throws(()=>parseOptical(put(lines[0],16,10,"").slice(0,25)+" ".repeat(10)+lines[0].slice(35),layout7108,q,"Kurum"),/ad soyad/);
 assert.equal(inferFmt(decodeOptical(encodeTxt(turkish.join("\r\n"),"windows-1254")),templates).confidence,"strong");
});

test("v119 Turnstile: server rejects missing, forged, failed, wrong-action/host and unavailable checks",async()=>{
 const config={enabled:true,secret:"server-only-secret",siteKey:"public-key",hostname:"example.test"};let calls=0;
 const provider=(value:any,ok=true)=>(async(url:any,options:any)=>{calls++;assert.equal(url,"https://challenges.cloudflare.com/turnstile/v0/siteverify");assert.equal(options.body.get("secret"),config.secret);assert.equal(options.body.get("response"),"token");return {ok,json:async()=>value};}) as typeof fetch;
 assert.equal(await verifyHuman(undefined,"login",config,provider({success:true})),false);assert.equal(calls,0);
 assert.equal(await verifyHuman("token","login",config,provider({success:false})),false);
 assert.equal(await verifyHuman("token","login",config,provider({success:true,hostname:"evil.test",action:"login"})),false);
 assert.equal(await verifyHuman("token","login",config,provider({success:true,hostname:config.hostname,action:"register"})),false);
 assert.equal(await verifyHuman("token","login",config,provider({success:true,hostname:config.hostname,action:"login"})),true);
 assert.equal(await verifyHuman("token","login",config,provider({},false)),false);
 assert.equal(await verifyHuman("token","login",config,(async()=>{throw Error("timeout");}) as typeof fetch),false);
 const before=calls;assert.equal(await verifyHuman(null,"login",{...config,enabled:false},provider({})),true);assert.equal(calls,before);
});

test("v119 reports: independent template families and exact grade filtering across branches",async()=>{
 const {selectedStudents,reportExcelRows,reportPdf}=await import("../apps/api/src/result-pdf");
 assert.throws(()=>reportTemplate("cards","net-list"),/şablonu/);assert.throws(()=>reportTemplate("school","analysis-card"),/şablonu/);assert.throws(()=>reportTemplate("cards","unknown"),/şablonu/);
 assert.equal(resultGrade("8-A"),"8");assert.equal(resultGrade("10/B"),"10");
 const data=parseOptical(txt,layout7108,q,"Örnek Kurum");data.students[0].branch="8-A";data.students[1].branch="8-B";
 const extra={...structuredClone(data.students[1]),id:"extra",name:"Başka Kademe",branch:"10-A"};data.students.push(extra);
 const view:any={data,summary:opticalSummary(data,3),keyName:"Anonim Deneme",schoolName:"Örnek Kurum",penalty:3,generalCount:3,rankings:Object.fromEntries(data.students.map(s=>[s.id,{generalRank:1,generalCount:3,schoolRank:1,schoolCount:3,classRank:1,classCount:2}]))};
 const options={kind:"cards" as const,order:"name" as const,hideIdentity:true,grade:"8"};
 assert.equal(selectedStudents(view,options).length,2);assert.equal(selectedStudents(view,{...options,grade:"1"}).length,0);
 assert.equal(reportExcelRows(view,options).length,3);assert.ok(!JSON.stringify(reportExcelRows(view,options)).includes("Başka Kademe"));
 for(const [templateId,kind]of [["analysis-card","cards"],["table-card","cards"],["net-list","school"]] as const){const pdf=await reportPdf(view,{...options,kind,templateId});assert.equal(pdf.subarray(0,5).toString(),"%PDF-");fs.writeFileSync(`/tmp/ks-v119-${templateId}.pdf`,pdf);}
});

test("v119 public grade lookup: publication, school isolation, ambiguous number and forged studentId",async()=>{
 const {prisma}=await import("../apps/api/src/db"),{lookupStudentResults,publicResultsRouter}=await import("../apps/api/src/public-results"),{keyFingerprint}=await import("../apps/api/src/optical-review"),{identityHash}=await import("../apps/api/src/result-identity");
 const originals=[prisma.school.findFirst,prisma.opticalResult.findMany];
 const data=parseOptical(txt,layout7108,q,"Kurum");data.students[0].branch="8-A";data.students[0].identityHash=identityHash("11111111110");data.students[1].branch="8-B";data.students[1].identityHash=identityHash("22222222220");
 const snapshot={data,summary:opticalSummary(data,3),penalty:3,schoolName:"Kurum",keyName:"Deneme",keyFingerprint:keyFingerprint(q,3)};
 let published=true,numberCollision=false;
 prisma.school.findFirst=(async({where}:any)=>where.id==="school"?{id:"school"}:null) as any;
 prisma.opticalResult.findMany=(async({where}:any)=>{if(where.schoolId)assert.equal(where.studentPublished,true);if(where.schoolId&&where.schoolId!=="school")return[];
 const current=structuredClone(snapshot);if(numberCollision){current.data.students[1].studentNo=current.data.students[0].id;current.data.students[1].id="different";current.summary[1].id="different";current.data.students.forEach(s=>s.separateSession=true);}
 return [{id:"result",keyId:"key",schoolId:"school",studentPublished:published,createdAt:new Date(),snapshot:current}].filter(r=>where.studentPublished===undefined||r.studentPublished===where.studentPublished);}) as any;
 try{assert.equal((await lookupStudentResults({schoolId:"other",grade:"8",identifier:"00001"})).length,0);
 assert.equal((await lookupStudentResults({schoolId:"school",grade:"8",identifier:"00001"})).length,1);
 assert.equal((await lookupStudentResults({schoolId:"school",grade:"8",identifier:"00001",studentId:"r2"})).length,0);
 published=false;assert.equal((await lookupStudentResults({schoolId:"school",grade:"8",identifier:"00001"})).length,0);published=true;numberCollision=true;
 await assert.rejects(()=>lookupStudentResults({schoolId:"school",grade:"8",identifier:"00001"}),/birden fazla/);
 await assert.rejects(()=>lookupStudentResults({schoolId:"school",grade:"8",identifier:"00001",studentId:"r1"}),/birden fazla/);
 assert.equal((await lookupStudentResults({schoolId:"school",grade:"8",identifier:"11111111110"})).length,1);
 // Legacy branch-based links remain supported.
 assert.equal((await lookupStudentResults({schoolId:"school",branch:"8-A",identifier:"00001"})).length,1);
 const route=(publicResultsRouter as any).stack.find((l:any)=>l.route?.path==="/grades").route.stack.at(-1).handle;let grades:any;
 await route({query:{schoolId:"school"}},{json(v:any){grades=v;}},(e:any)=>{if(e)throw e;});assert.deepEqual(grades,["8"]);
 }finally{prisma.school.findFirst=originals[0] as any;prisma.opticalResult.findMany=originals[1] as any;}
});

test("v119 inference/converter API accepts system layouts and keeps archived files owner-scoped",async()=>{
 const {prisma}=await import("../apps/api/src/db"),{opticalRouter}=await import("../apps/api/src/optical-routes");const first=prisma.opticalTemplate.findFirst,many=prisma.opticalTemplate.findMany,archive=prisma.opticalTxtFile.findMany;
 prisma.opticalTemplate.findFirst=(async()=>null) as any;prisma.opticalTemplate.findMany=(async()=>[]) as any;
 prisma.opticalTxtFile.findMany=(async({where}:any)=>{assert.equal(where.createdById,"dealer-user");return[];}) as any;
 const invoke=async(path:string,body:any,file?:any)=>{let status=200,value:any;const handler=(opticalRouter as any).stack.find((l:any)=>l.route?.path===path).route.stack.at(-1).handle;
 await handler({body,file,user:{id:"dealer-user",role:"DEALER"}},{setHeader(){},status(n:number){status=n;return this;},json(v:any){value=v;}},(e:any)=>{if(e)throw e;});return {status,value};};
 try{const file={originalname:"misleading-8050.txt",buffer:Buffer.from(txt)};
 const inference=await invoke("/infer-fmt",{},file);assert.equal(inference.value[0].confidence,"strong");assert.equal(inference.value[0].candidates[0].id,"system-fmt-7108");
 const conversion=await invoke("/convert/preview",{sourceId:"system-fmt-7108",targetId:"system-fmt-8050"},file);assert.equal(conversion.status,200);assert.equal(conversion.value.errorCount,0);assert.equal(conversion.value.sourceLines,4);
 await assert.rejects(()=>invoke("/infer-fmt",{fileIds:["foreign"]}),/erişilemiyor/);
 }finally{prisma.opticalTemplate.findFirst=first;prisma.opticalTemplate.findMany=many;prisma.opticalTxtFile.findMany=archive;}
});


test("v119 supplied 7108 bytes: anonymous Windows-1254 preserves four records and session join",()=>{
 const bytes=fs.readFileSync(new URL("./fixtures/7108-windows1254-anonymous.txt",import.meta.url));
 assert.equal(bytes.length,692);assert.throws(()=>new TextDecoder("utf-8",{fatal:true}).decode(bytes));
 const decoded=decodeOptical(bytes),data=parseOptical(decoded,layout7108,q,"Anonim Kurum");
 assert.equal(data.lineCount,4);assert.equal(data.students.length,2);
 assert.deepEqual(data.students.map(s=>s.sourceLines),[[1,2],[3,4]]);
 assert.equal(data.students[1].id,"00002");assert.equal(data.students[0].name,"ÇAĞRI ÖRNEK");
 assert.deepEqual(opticalSummary(data,3).map(r=>Math.round(r.net*100)),[7800,5333]);
 assert.equal(inferFmt(decoded,templates).confidence,"strong");
});

test("v119 wrong saved 7108 booklet position gives explicit system suggestion, never auto-corrects/evaluates",async()=>{
 const {prisma}=await import("../apps/api/src/db"),{opticalRouter}=await import("../apps/api/src/optical-routes");
 const original=[prisma.school.findFirst,prisma.opticalTemplate.findFirst,prisma.opticalKey.findFirst];
 const wrong=structuredClone(layout7108);wrong.fields.booklet.start=50;wrong.fields.session!.start=51;
 prisma.school.findFirst=(async()=>({id:"school",name:"Anonim Kurum"})) as any;
 prisma.opticalTemplate.findFirst=(async()=>({id:"wrong-saved",name:"7108",layout:wrong,active:true})) as any;
 prisma.opticalKey.findFirst=(async()=>({id:"key",questions:q,penalty:3,publication:{grade:8}})) as any;
 try{const route=(opticalRouter as any).stack.find((l:any)=>l.route?.path==="/preview").route.stack.at(-1).handle;let status=200,value:any;
 await route({user:{id:"dealer-user",role:"DEALER",dealerId:"dealer"},body:{schoolId:"school",templateId:"wrong-saved",keyId:"key"},file:{originalname:"input.txt",buffer:fs.readFileSync(new URL("./fixtures/7108-windows1254-anonymous.txt",import.meta.url))}}, {status(n:number){status=n;return this;},json(v:any){value=v;}},(e:any)=>{if(e)throw e;});
 assert.equal(status,400);assert.equal(value.fmtSuggestion.id,"system-fmt-7108");assert.match(value.error,/50-50/);assert.match(value.error,/açıkça seçip/);
 }finally{prisma.school.findFirst=original[0] as any;prisma.opticalTemplate.findFirst=original[1] as any;prisma.opticalKey.findFirst=original[2] as any;}
});

test("v119 original 7108 FMT analysis and Windows-1254 TXT use identical executable positions",async()=>{
 const {analyzeFmt}=await import("../apps/api/src/fmt-analyze");
 const {previewFmt}=await import("../apps/api/src/fmt-preview");
 const original=decodeOptical(fs.readFileSync(new URL("../apps/api/assets/templates/7108.fmt",import.meta.url)));
 const txt=decodeOptical(fs.readFileSync(new URL("./fixtures/7108-windows1254-anonymous.txt",import.meta.url)));
 const analysis=analyzeFmt(original);
 assert.deepEqual(analysis.issues,[]);
 assert.equal(analysis.layout.lineLength,171);
 assert.deepEqual(analysis.layout.fields.booklet,{start:51,length:1});
 assert.equal(previewFmt(txt,analysis.layout).canSave,true);
 const actual=parseOptical(txt,analysis.layout,q,"Anonim Kurum");
 const expected=parseOptical(txt,layout7108,q,"Anonim Kurum");
 assert.equal(actual.students.length,2);
 assert.deepEqual(actual.students,expected.students);
});
