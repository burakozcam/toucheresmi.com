import path from "node:path";
import type { OpticalStudent } from "./optical-core";
import { decryptIdentity } from "./result-identity";
const PDFDocument=require("pdfkit");
export type ReportView=any;
export type ReportOptions={kind:"cards"|"school"|"classes";order:"score"|"name";hideIdentity:boolean;branch?:string;studentId?:string};
export function selectedStudents(view:ReportView,options:ReportOptions):OpticalStudent[]{return view.data.students.filter((s:OpticalStudent)=>(!options.branch||s.branch===options.branch)&&(!options.studentId||s.id===options.studentId)).sort((a:OpticalStudent,b:OpticalStudent)=>options.order==="name"?a.name.localeCompare(b.name,"tr"):(view.summary.find((r:any)=>r.id===b.id).score-view.summary.find((r:any)=>r.id===a.id).score||a.name.localeCompare(b.name,"tr")));}
const displayNo=(s:OpticalStudent,hide:boolean)=>hide&&/^\d{11}$/.test(s.studentNo??s.id)?"***********":(s.studentNo??s.id).startsWith("tc-")?"—":s.studentNo??s.id;
const n=(value:number)=>new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2}).format(value);
export function reportPdf(view:ReportView,options:ReportOptions):Promise<Buffer>{return new Promise((resolve,reject)=>{
 const doc=new PDFDocument({size:"A4",margin:36,autoFirstPage:false,info:{Title:view.keyName,Author:"Kurumsal Sınav"}}),chunks:Buffer[]=[];doc.on("data",(chunk:Buffer)=>chunks.push(chunk));doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);
 doc.registerFont("R",path.join(__dirname,"../assets/fonts/LiberationSans-Regular.ttf"));doc.registerFont("B",path.join(__dirname,"../assets/fonts/LiberationSans-Bold.ttf"));let y=0,pageTitle="";
 function page(title:string){pageTitle=title;doc.addPage();doc.rect(0,0,596,92).fill("#172b4d");doc.fillColor("#fff").font("B").fontSize(16).text("KURUMSAL SINAV",36,22);doc.font("R").fontSize(11).text(view.keyName,36,50,{width:520,height:30});doc.fillColor("#172b4d").font("B").fontSize(13).text(title,36,110,{width:520});y=110+doc.heightOfString(title,{width:520})+18;}
 function line(text:string,bold=false){doc.font(bold?"B":"R").fontSize(9);const h=doc.heightOfString(text,{width:520})+9;if(y+h>770){page(`${pageTitle.replace(/ · devam$/,"")} · devam`);doc.font(bold?"B":"R").fontSize(9);}doc.text(text,36,y,{width:520});y+=h;}
 const students=selectedStudents(view,options);
 if(options.kind==="cards")for(const student of students){const result=view.summary.find((r:any)=>r.id===student.id),rank=view.rankings[student.id];page(student.name);line(`${view.schoolName} · ${student.branch} · Öğrenci No: ${displayNo(student,options.hideIdentity)}`);
   if(!options.hideIdentity){const identity=decryptIdentity(student.identityEncrypted);if(/^\d{11}$/.test(identity))line(`TC: ${identity}`);}
   line(`Puan: ${n(result.score)} / 500     Toplam net: ${n(result.net)}`,true);
   line(`Genel katılım: ${rank.generalCount} öğrenci · Genel sıra: ${rank.generalRank}`,true);line(`Kurum sırası: ${rank.schoolRank} / ${rank.schoolCount} · Sınıf sırası: ${rank.classRank} / ${rank.classCount}`);
   y+=6;line("DERS SONUÇLARI",true);for(const lesson of result.lessons)line(`${lesson.lesson}    Doğru: ${lesson.correct}    Yanlış: ${lesson.wrong}    Boş: ${lesson.blank}    Net: ${n(lesson.net)}`);
   y+=8;line("KAZANIM ANALİZİ",true);const outcomes=new Map<string,{name:string;correct:number;wrong:number;blank:number;count:number}>();
   view.data.questions.forEach((q:any,i:number)=>{if(q.answer==="X"||(!q.outcomeName&&!q.outcomeCode))return;const id=`${q.lesson}:${q.outcomeCode}:${q.outcomeName}`,o=outcomes.get(id)??{name:`${q.lesson} · ${q.outcomeCode??""} ${q.outcomeName??""}`,correct:0,wrong:0,blank:0,count:0};o.count++;if(q.answer==="H"||student.answers[i]===q.answer)o.correct++;else if(!student.answers[i])o.blank++;else o.wrong++;outcomes.set(id,o);});
   if(!outcomes.size)line("Bu sınavın cevap anahtarında kazanım bilgisi bulunmuyor.");for(const outcome of outcomes.values())line(`${outcome.name}\n${outcome.count} soru · ${outcome.correct} D / ${outcome.wrong} Y / ${outcome.blank} B · Başarı %${n(outcome.correct/outcome.count*100)}`);
   line("SORU CEVAPLARI (A kitapçığı sırası)",true);for(const lesson of result.lessons){const answers=view.data.questions.flatMap((q:any,i:number)=>q.lesson===lesson.lesson?[`${q.number}: ${student.answers[i]||"-"}/${q.answer}`]:[]);line(`${lesson.lesson}  ${answers.join("  ")}`);}line("Genel sıralama, sistemde aynı sınav ve cevap anahtarıyla kaydedilmiş güncel sonuçları kapsar. Puan yerel deneme puanıdır; resmî LGS/YKS puanı değildir.");
 }else{
  const groups=options.kind==="classes"?[...new Set(students.map(s=>s.branch))].sort():[""];
  for(const group of groups){page(group?`${view.schoolName} · ${group} sınıf listesi`:`${view.schoolName} · Okul puan listesi`);line(`Genel katılım: ${view.generalCount} öğrenci · Kurum katılımı: ${view.data.students.length} öğrenci`);
   for(const student of students.filter(s=>!group||s.branch===group)){const r=view.summary.find((r:any)=>r.id===student.id),rank=view.rankings[student.id];line(`${student.name} · No ${displayNo(student,options.hideIdentity)} · ${student.branch}`,true);line(`Genel/Kurum/Sınıf: ${rank.generalRank}/${rank.schoolRank}/${rank.classRank} · Puan ${n(r.score)} · Net ${n(r.net)}${!options.hideIdentity&&/^\d{11}$/.test(decryptIdentity(student.identityEncrypted))?` · TC ${decryptIdentity(student.identityEncrypted)}`:""}`);line(r.lessons.map((l:any)=>`${l.lesson}: ${l.correct}D ${l.wrong}Y ${l.blank}B / ${n(l.net)} net`).join(" · "));}
  }
 }
 doc.end();
 });}
export function reportExcelRows(view:ReportView,options:ReportOptions){return [["Kurum","Sınav","Öğrenci No","Ad Soyad","Sınıf",...(!options.hideIdentity?["TC"]:[]),"Genel Sıra","Genel Katılım","Kurum Sıra","Kurum Katılım","Sınıf Sıra","Sınıf Katılım","Net","Puan",...view.data.questions.filter((q:any,i:number,a:any[])=>a.findIndex(x=>x.lesson===q.lesson)===i).flatMap((q:any)=>[`${q.lesson} D`,`${q.lesson} Y`,`${q.lesson} B`,`${q.lesson} Net`])],...selectedStudents(view,options).map(s=>{const r=view.summary.find((r:any)=>r.id===s.id),rank=view.rankings[s.id];return[view.schoolName,view.keyName,displayNo(s,options.hideIdentity),s.name,s.branch,...(!options.hideIdentity?[decryptIdentity(s.identityEncrypted)]:[]),rank.generalRank,rank.generalCount,rank.schoolRank,rank.schoolCount,rank.classRank,rank.classCount,r.net,r.score,...r.lessons.flatMap((l:any)=>[l.correct,l.wrong,l.blank,l.net])];})];}
