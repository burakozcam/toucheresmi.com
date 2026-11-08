import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {convertTxt,encodeTxt} from "../apps/api/src/txt-converter";
import {layout7108,decodeOptical,type OpticalLayout} from "../apps/api/src/optical-core";
const input=fs.readFileSync(path.join(__dirname,"fixtures/7108-anonymous.txt"),"utf8");
function rearranged(){const target=structuredClone(layout7108);target.literals=[{start:1,text:"TEST"}];target.fields.name.start=26;target.fields.surname!.start=16;[target.lessons[0].start,target.lessons[5].start]=[target.lessons[5].start,target.lessons[0].start];return target;}
test("TXT dönüşümü: oturum satırları ve A/B kitapçıkları korunur; farklı yerleşimden geri dönüş kayıpsızdır",()=>{
  const same=convertTxt(input,layout7108,layout7108);assert.equal(same.report.canDownload,true);assert.equal(decodeOptical(same.bytes),input);assert.equal(same.report.lossCount,0);
  const target=rearranged(),forward=convertTxt(input,layout7108,target);assert.equal(forward.report.canDownload,true);assert.equal(forward.report.sourceLines,4);assert.equal(forward.report.outputLines,4);assert.equal(forward.report.errorCount,0);assert.equal(forward.report.lossCount,0);
  const changed=decodeOptical(forward.bytes);assert.ok(changed.startsWith("TEST"));assert.equal(changed.split("\r\n")[0].slice(50,51),input.split("\r\n")[0].slice(50,51));
  const back=convertTxt(changed,target,layout7108);assert.equal(back.report.canDownload,true);assert.equal(decodeOptical(back.bytes),input);
});
test("TXT dönüşümü: sığmayan ad/numara/cevap kesilmez ve veri kaybı onayıyla da indirilemez",()=>{
  const tooShort=structuredClone(layout7108);tooShort.fields.name.length=2;
  const r=convertTxt(input,layout7108,tooShort,{allowLoss:true});assert.ok(r.report.errorCount>0);assert.equal(r.report.canDownload,false);assert.ok(r.report.issues.some(i=>i.field==="Ad"&&i.message.includes("kesme yapılmadı")));
  const questions=structuredClone(layout7108);questions.lessons[0].length=10;assert.ok(convertTxt(input,layout7108,questions).report.errorCount>0);
  const identity=structuredClone(layout7108);delete identity.fields.identity;assert.ok(convertTxt(input,layout7108,identity,{allowLoss:true}).report.errorCount>0);
});
test("TXT dönüşümü: eşlenmeyen işaretli ders ve tanımsız alanlar açık onay ister",()=>{
  const r=convertTxt(input,layout7108,rearranged(),{lessonMap:{FEN:""}});assert.equal(r.report.errorCount,0);assert.ok(r.report.lossCount>0);assert.equal(r.report.canDownload,false);
  assert.equal(convertTxt(input,layout7108,rearranged(),{lessonMap:{FEN:""},allowLoss:true}).report.canDownload,true);
  const legacy=structuredClone(layout7108);delete legacy.literals;delete legacy.fields.gender;delete legacy.fields.session;
  assert.equal(convertTxt(input,legacy,legacy).report.canDownload,true);assert.equal(decodeOptical(convertTxt(input,legacy,legacy).bytes),input);
  assert.ok(convertTxt(input,legacy,rearranged()).report.lossCount>0);assert.equal(convertTxt(input,legacy,rearranged()).report.canDownload,false);
  assert.throws(()=>convertTxt(input,layout7108,rearranged(),{lessonMap:{TÜRKÇE:"FEN",FEN:"FEN"}}),/birden fazla/);
});
test("TXT dönüşümü: baştaki sıfırlar, sağ hizalama, Türkçe kodlama ve LF/CRLF korunur",()=>{
  const target=structuredClone(layout7108);target.lineLength+=3;target.fields.id.length+=3;target.fields.id.align="right";
  for(const[key,f]of Object.entries(target.fields))if(f&&key!=="id"&&f.start>=16)f.start+=3;for(const l of target.lessons)l.start+=3;
  const r=convertTxt(input,layout7108,target,{lineEnding:"lf"});assert.equal(r.report.canDownload,true);const decoded=decodeOptical(r.bytes);assert.equal(decoded.slice(10,18),"   00001");assert.ok(!decoded.includes("\r"));
  assert.equal(new TextDecoder("windows-1254").decode(encodeTxt("İPEK ŞEN","windows-1254")),"İPEK ŞEN");assert.throws(()=>encodeTxt("ÖRNEK 😀","windows-1254"),/UTF-8/);assert.equal(encodeTxt("ÖRNEK 😀","utf-8").toString("utf8"),"ÖRNEK 😀");
});
test("TXT dönüşümü: bozuk satır, yanlış format sabiti ve geçersiz işaret raporlanır",()=>{
  assert.ok(convertTxt(input.slice(1),layout7108,rearranged()).report.errorCount>0);
  assert.ok(convertTxt("9999"+input.slice(4),layout7108,rearranged()).report.issues.some(i=>i.field==="Sabit alan"));
  const invalid=input.slice(0,131)+"Z"+input.slice(132);assert.ok(convertTxt(invalid,layout7108,rearranged()).report.issues.some(i=>i.field==="MATEMATİK"));
  const aliases=structuredClone(layout7108);aliases.lessons[1].name="İNKILAP";assert.equal(convertTxt(input,layout7108,aliases).report.canDownload,true);
});
test("TXT dönüşümü: boş cevap kapasitesi daraltılabilir; belirsiz ders adları otomatik eşleştirilmez",()=>{
  const shorter=structuredClone(layout7108);shorter.lessons[3].length=10;
  const result=convertTxt(input,layout7108,shorter);assert.equal(result.report.canDownload,true);assert.ok(result.report.warningCount>0);
  const ambiguous=structuredClone(layout7108);ambiguous.lessons[2].name="İNKILAP";
  const report=convertTxt(input,ambiguous,layout7108).report;assert.equal(report.mapping.SOSYAL,undefined);assert.ok(report.lossCount>0);
  const legacy=structuredClone(layout7108);delete legacy.literals;delete legacy.fields.gender;delete legacy.fields.session;
  const explicitLeft=structuredClone(legacy);explicitLeft.fields.id.align="left";
  const same=convertTxt(input,legacy,explicitLeft);assert.equal(same.report.lossCount,0);assert.equal(decodeOptical(same.bytes),input);
});
test("TXT dönüşüm API’si etkin şablonları kullanır; hata/kayıp indirmeyi sunucuda engeller",async()=>{
  const{opticalRouter}=await import("../apps/api/src/optical-routes"),{prisma}=await import("../apps/api/src/db");const original=prisma.opticalTemplate.findFirst;
  let target:OpticalLayout=rearranged();
  prisma.opticalTemplate.findFirst=(async({where}:any)=>{assert.equal(where.active,true);return{id:where.id,name:where.id,layout:where.id==="source"?layout7108:target};}) as any;
  const invoke=async(mode:string,extra:any={})=>{const handler=(opticalRouter as any).stack.find((l:any)=>l.route?.path===`/convert/${mode}`).route.stack.at(-1).handle;let status=200,data:any;const res:any={status(n:number){status=n;return this;},json(v:any){data=v;return this;},setHeader(){},attachment(){return this;},type(){return this;},send(v:any){data=v;return this;}};await handler({user:{role:"DEALER"},body:{sourceId:"source",targetId:"target",...extra},file:{originalname:"sample.txt",buffer:Buffer.from(input)}},res,(e:any)=>{if(e)throw e;});return{status,data};};
  try{const preview=await invoke("preview");assert.equal(preview.status,200);assert.equal(preview.data.canDownload,true);assert.ok(Buffer.isBuffer((await invoke("download")).data));target.fields.name.length=2;assert.equal((await invoke("download",{allowLoss:"true"})).status,400);target=rearranged();assert.equal((await invoke("download",{lessonMap:JSON.stringify({FEN:""})})).status,400);assert.equal((await invoke("download",{lessonMap:JSON.stringify({FEN:""}),allowLoss:"true"})).status,200);}finally{prisma.opticalTemplate.findFirst=original;}
});
