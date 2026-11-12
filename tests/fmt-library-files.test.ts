import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { fmtLibrary, findLibraryFmt, libraryFmtBytes } from "../apps/api/src/fmt-library";
import { safeFilename, renamedFilename, uploadFilename } from "../apps/api/src/file-names";
const expected:Record<string,{name:string;hash:string}>={
 "kurmay-fenomen-1858":{name:"Kurmay Fenomen Ortaokul",hash:"86faec74b3f1272b931a4a8a5f5d051dd06580cd1ab6a53e9c6728d8f2b6dbc4"},
 "hiz-1923":{name:"Hız Yayınları 1923 Ortaokul Optiği",hash:"9f0ff72e81dec86f8c16db6e30efeee5a548612e2ec1785dede0c6dd0c368d29"},
 "dakika-karekok":{name:"Dakika / Karekök Yayınları Ortaokul Optik",hash:"bddcc16c587bb819cad9aba3fddabdeada416e62740c681b739d51b811a1aaca"},
};
test("FMT kütüphanesi: yayınevi adları doğru, üç yeni dosyanın özgün baytları ve kodlaması korunur",()=>{
 assert.equal(new Set(fmtLibrary.map(v=>v.code)).size,fmtLibrary.length);
 for(const [code,{name,hash}]of Object.entries(expected)){const entry=findLibraryFmt(code)!;assert.equal(entry.name,name);assert.equal(entry.requiresVerification,true);assert.ok(entry.downloadName.endsWith(".fmt"));assert.ok(!entry.downloadName.includes("/"));const bytes=libraryFmtBytes(code);assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),hash);assert.throws(()=>new TextDecoder("utf-8",{fatal:true}).decode(bytes));assert.ok(new TextDecoder("windows-1254").decode(bytes).includes("=K="));}
 assert.equal(findLibraryFmt("../../config"),undefined);assert.throws(()=>libraryFmtBytes("../../config"));
});
test("FMT indirme API: yeni dosyaları bayi de aynı baytlarla ve .fmt adıyla alır; bilinmeyen kod reddedilir",async()=>{
 const {opticalRouter}=await import("../apps/api/src/optical-routes");const handle=(opticalRouter as any).stack.find((v:any)=>v.route?.path==="/templates/examples/:code/download").route.stack.at(-1).handle;
 for(const code of [...Object.keys(expected),"../config"]){let status=200,filename="",bytes:Buffer|undefined;await handle({params:{code},user:{role:"DEALER"}},{status(n:number){status=n;return this;},attachment(v:string){filename=v;return this;},type(){return this;},send(v:Buffer){bytes=v;},json(){}},(e:any)=>{if(e)throw e;});if(expected[code]){assert.equal(status,200);assert.equal(filename,findLibraryFmt(code)!.downloadName);assert.deepEqual(bytes,libraryFmtBytes(code));}else assert.equal(status,404);}
});
test("FMT paylaşımı: üç yayınevi birlikte paylaşılır, özgün baytlar indirilir ve iptal/süre/yanlış anahtar reddedilir",async()=>{
 const {fmtShareRouter,shareHash}=await import("../apps/api/src/fmt-share"),{prisma}=await import("../apps/api/src/db");const originals=[prisma.fmtShare.create,prisma.fmtShare.findFirst];let share:any;
 prisma.fmtShare.create=(async({data}:any)=>share={id:"library-share",revokedAt:null,...data}) as any;
 prisma.fmtShare.findFirst=(async({where}:any)=>share&&share.id===where.id&&!share.revokedAt&&share.expiresAt>where.expiresAt.gt&&(!where.tokenHash||where.tokenHash===share.tokenHash)?share:null) as any;
 const route=(p:string)=>(fmtShareRouter as any).stack.find((v:any)=>v.route?.path===p&&v.route.methods.post).route.stack.at(-1).handle;
 async function invoke(p:string,body:any){let status=200,data:any;await route(p)({params:{id:"library-share"},user:{id:"admin",role:"SUPER_ADMIN"},body},{setHeader(){},status(n:number){status=n;return this;},json(v:any){data=v;return this;},attachment(){return this;},type(){return this;},send(v:any){data=v;return this;}},(e:any)=>{if(e)throw e;});return{status,data};}
 try{const created=await invoke("/api/optical/fmt-shares",{duration:"15m",exampleCodes:Object.keys(expected)});assert.equal(created.status,400);const ok=await invoke("/api/optical/fmt-shares",{duration:"1h",exampleCodes:Object.keys(expected)});assert.equal(ok.status,201);const token=ok.data.url.split("#")[1];assert.equal(share.tokenHash,shareHash(token));const view=await invoke("/api/public/fmt-shares/:id/view",{token});assert.deepEqual(view.data.files.map((f:any)=>f.name),Object.values(expected).map(v=>v.name));for(const code of Object.keys(expected)){const r=await invoke("/api/public/fmt-shares/:id/download",{token,fileId:`example:${code}`});assert.equal(r.status,200);assert.deepEqual(r.data,libraryFmtBytes(code));}assert.equal((await invoke("/api/public/fmt-shares/:id/view",{token:"x".repeat(43)})).status,410);share.revokedAt=new Date();assert.equal((await invoke("/api/public/fmt-shares/:id/view",{token})).status,410);share.revokedAt=null;share.expiresAt=new Date(0);assert.equal((await invoke("/api/public/fmt-shares/:id/view",{token})).status,410);
 }finally{[prisma.fmtShare.create,prisma.fmtShare.findFirst]=originals;}
});
test("Dosya adı: uzun Türkçe/ASCII adlarda uzantı kesilmez; yeniden adlandırma dosya türünü korur",()=>{
 for(const extension of [".pdf",".fmt",".xlsx",".docx",".tar.gz"]){for(const prefix of ["a".repeat(240),"öğrenci".repeat(40)]){const result=safeFilename(prefix+extension);assert.ok(result.endsWith(extension));assert.ok(Buffer.byteLength(result,"utf8")<=180);}assert.equal(renamedFilename("Kaynak"+extension,"Yeni ad"),"Yeni ad"+extension);assert.equal(renamedFilename("Kaynak"+extension,"Yeni ad"+extension),"Yeni ad"+extension);}
 assert.equal(renamedFilename("FOTO.IMG","Yeni.img"),"Yeni.img");assert.equal(renamedFilename("Rapor.pdf","Rapor.v2"),"Rapor.v2.pdf");assert.equal(uploadFilename(Buffer.from("Türkçe Öğrenci.fmt","utf8").toString("latin1")),"Türkçe Öğrenci.fmt");assert.equal(uploadFilename("Türkçe Öğrenci.fmt"),"Türkçe Öğrenci.fmt");assert.equal(safeFilename("../rapor\n.pdf"),".._rapor_.pdf");
});

test("Dosya yönetimi API: uzantısız yeniden adlandırmada .fmt korunur, hareket dosyanın türünü değiştirmez",async()=>{
 const {contentRouter}=await import("../apps/api/src/admin-content"),{prisma}=await import("../apps/api/src/db");const admin=(contentRouter as any).stack.find((v:any)=>v.handle?.stack).handle;
 const handler=admin.stack.find((v:any)=>v.route?.path==="/files/:id"&&v.route.methods.patch).route.stack.at(-1).handle;
 const originals=[prisma.managedFile.findUnique,prisma.managedFile.update];const file={id:"file",name:"Öğrenci.fmt",folderId:null};
 prisma.managedFile.findUnique=(async()=>({...file})) as any;prisma.managedFile.update=(async({data}:any)=>Object.assign(file,data)) as any;
 try{for(const body of [{name:"Yeni dosya"},{folderId:"folder"}]){let result:any;await handler({params:{id:"file"},body,user:{id:"admin",role:"SUPER_ADMIN"}},{setHeader(){},json(v:any){result=v;}},(e:any)=>{if(e)throw e;});assert.equal(result.name,"Yeni dosya.fmt");}assert.equal(file.folderId,"folder");}finally{[prisma.managedFile.findUnique,prisma.managedFile.update]=originals;}
});

test("Dosya paylaşımı bilgisi: yalnızca geçerli anahtar ve zaman penceresinde uzantılı ad döner",async()=>{
 const {contentRouter}=await import("../apps/api/src/admin-content"),{prisma}=await import("../apps/api/src/db");const {shareHash}=await import("../apps/api/src/fmt-share");
 const original=prisma.managedFileShare.findFirst,token="a".repeat(43),share={startsAt:new Date(0),expiresAt:new Date(Date.now()+60000),revokedAt:null as Date|null,file:{name:"Öğrenci cevapları.fmt"}};
 prisma.managedFileShare.findFirst=(async({where}:any)=>where.tokenHash===shareHash(token)&&!share.revokedAt?share:null) as any;
 const handler=(contentRouter as any).stack.find((v:any)=>v.route?.path==="/api/public/file-shares/:id/info").route.stack.at(-1).handle;
 async function invoke(t=token){let status=200,data:any;await handler({params:{id:"share"},body:{token:t}},{setHeader(){},status(n:number){status=n;return this;},json(v:any){data=v;return this;}},(e:any)=>{if(e)throw e;});return{status,data};}
 try{assert.deepEqual((await invoke()).data,{name:"Öğrenci cevapları.fmt"});assert.equal((await invoke("b".repeat(43))).status,410);share.startsAt=new Date(Date.now()+30000);assert.equal((await invoke()).status,425);share.startsAt=new Date(0);share.expiresAt=new Date(0);assert.equal((await invoke()).status,410);share.expiresAt=new Date(Date.now()+60000);share.revokedAt=new Date();assert.equal((await invoke()).status,410);}finally{prisma.managedFileShare.findFirst=original;}
});

test("Özdebir BLDM: özgün baytlar korunur; doğrulanan tek oturum yerleşimi listelenir",async()=>{
 const code="ozdebir-ortaokul-tek-oturum",entry=findLibraryFmt(code)!;
 assert.equal(entry.name,"Özdebir 5/6/7/8 Ortaokul Tek Oturum");assert.equal(entry.requiresVerification,false);
 assert.ok(entry.file.endsWith(".bldm"));assert.ok(entry.downloadName.endsWith(".bldm"));
 const bytes=libraryFmtBytes(code);assert.equal(bytes.length,574);assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),"dd3cbc08d0808abfe1dadd6e6e595364d68df1f396c26d160c5e68261623a226");
 const text=new TextDecoder("windows-1254").decode(bytes);
 assert.equal(text.split(/\r?\n/).filter(line=>line.includes("=SINIF=")).length,2);
 assert.equal(text.split(/\r?\n/).filter(line=>line.includes("=KITAPCIK=")).length,2);
 assert.match(text,/ABCÇDEFGĞ/);
 const {systemEvaluationTemplates}=await import("../apps/api/src/evaluation-templates");assert.ok(systemEvaluationTemplates().some(t=>t.id==="system-fmt-ozdebir-ortaokul-tek-oturum"&&t.layout.lineLength===171));
});
test("Özdebir BLDM indirme API özgün dosyayı .bldm olarak döndürür",async()=>{
 const {opticalRouter}=await import("../apps/api/src/optical-routes"),handle=(opticalRouter as any).stack.find((v:any)=>v.route?.path==="/templates/examples/:code/download").route.stack.at(-1).handle;
 let filename="",bytes:Buffer|undefined;await handle({params:{code:"ozdebir-ortaokul-tek-oturum"},user:{role:"DEALER"}},{attachment(v:string){filename=v;return this;},type(){return this;},send(v:Buffer){bytes=v;}},(e:any)=>{if(e)throw e;});
 assert.equal(filename,"Özdebir 5-6-7-8 Ortaokul Tek Oturum.bldm");assert.deepEqual(bytes,libraryFmtBytes("ozdebir-ortaokul-tek-oturum"));
});
test("Özdebir BLDM süreli paylaşımında API ve istemci dosya adını .fmt yapmaz",async()=>{
 const {fmtShareRouter,shareHash}=await import("../apps/api/src/fmt-share"),{prisma}=await import("../apps/api/src/db"),original=prisma.fmtShare.findFirst,token="b".repeat(43),code="ozdebir-ortaokul-tek-oturum";
 prisma.fmtShare.findFirst=(async({where}:any)=>where.tokenHash===shareHash(token)?{id:"share",expiresAt:new Date(Date.now()+60000),fileRefs:[{id:`example:${code}`,example:true}]}:null)as any;
 try{for(const action of ["view","download"]){const handler=(fmtShareRouter as any).stack.find((v:any)=>v.route?.path===`/api/public/fmt-shares/:id/${action}`).route.stack.at(-1).handle;let result:any,name="";await handler({params:{id:"share"},body:{token,fileId:`example:${code}`}},{setHeader(){},json(v:any){result=v;},attachment(v:string){name=v;return this;},type(){return this;},send(v:Buffer){result=v;}},(e:any)=>{if(e)throw e;});if(action==="view")assert.equal(result.files[0].downloadName,findLibraryFmt(code)!.downloadName);else{assert.equal(name,findLibraryFmt(code)!.downloadName);assert.deepEqual(result,libraryFmtBytes(code));}}}finally{prisma.fmtShare.findFirst=original;}
});
