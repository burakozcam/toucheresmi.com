import path from "node:path";
import {selectedStudents,type ReportOptions,type ReportView} from "./result-pdf";
import {resultGrade} from "../lib/result-grade";
import {decryptIdentity} from "./result-identity";
const PDFDocument=require("pdfkit");
const n=(v:number)=>Number.isFinite(v)?v.toLocaleString("tr-TR",{maximumFractionDigits:2}):"-";
/** Renderers consume the same scoped view as classic PDF and Excel exports. */
export function designedReportPdf(view:ReportView,options:ReportOptions):Promise<Buffer>{return new Promise((resolve,reject)=>{
 const list=options.kind!=="cards",pastel=options.templateId==="table-card",doc=new PDFDocument({size:"A4",layout:list?"landscape":"portrait",margin:24,autoFirstPage:false,info:{Title:view.keyName,Author:"Kurumsal Sınav"}}),chunks:Buffer[]=[];
 doc.on("data",(b:Buffer)=>chunks.push(b));doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);
 doc.registerFont("R",path.join(__dirname,"../assets/fonts/LiberationSans-Regular.ttf"));doc.registerFont("B",path.join(__dirname,"../assets/fonts/LiberationSans-Bold.ttf"));
 let y=24,page=0;const width=list?793:547,bottom=list?540:795,accent=pastel?"#ffdce5":"#dceaf5";
 const text=(s:string,x:number,top:number,w:number,size=8,bold=false)=>{doc.font(bold?"B":"R").fontSize(size).fillColor("#102638").text(s,x,top,{width:w,lineGap:1});};
 function start(title:string){doc.addPage();page++;y=24;text(title,24,y,width,13,true);y+=25;text(view.keyName,24,y,width,10,true);y+=Math.max(18,doc.heightOfString(view.keyName,{width}));text(view.schoolName,24,y,width,9);y+=20;doc.moveTo(24,y).lineTo(24+width,y).strokeColor("#526574").stroke();y+=10;
 text(`Kurumsal Sınav · ${page} · Yerel deneme puanı; resmî LGS/YKS puanı değildir.`,24,bottom+12,width,7);}
 function row(cells:string[],sizes:number[],header=false,x=24,w=width){doc.font(header?"B":"R").fontSize(8);const h=Math.max(20,...cells.map((v,i)=>doc.heightOfString(v,{width:w*sizes[i]-8})+8));let left=x;
 cells.forEach((value,i)=>{const cw=w*sizes[i];doc.rect(left,y,cw,h).fillAndStroke(header?accent:"#ffffff","#82919a");text(value,left+4,y+4,cw-8,8,header);left+=cw;});y+=h;}
 const students=selectedStudents(view,options),summary=(s:any)=>view.summary.find((r:any)=>r.id===s.id);
 const no=(s:any)=>{const value=s.studentNo??s.id;return value.startsWith("tc-")?"-":options.hideIdentity&&/^\d{11}$/.test(value)?"***********":value;};
 const mean=(members:any[],lesson:string)=>{const values=members.map(s=>summary(s)?.lessons.find((l:any)=>l.lesson===lesson)?.net).filter((v:any)=>typeof v==="number");return values.length?values.reduce((a:number,b:number)=>a+b,0)/values.length:0;};
 function chart(lessons:any[],members:any[],student?:any){const h=100,top=y+15,cw=width/Math.max(1,lessons.length),series=student?[{name:"Öğrenci",color:"#ed5959"},{name:"Sınıf",color:"#568fd0"},{name:"Kurum",color:"#df9b26"}]:[{name:"Kurum",color:"#df9b26"}];if(y+h+55>bottom)start(student?`${student.name} · Net karşılaştırması`:`${view.schoolName} · Net karşılaştırması`);
 text("NET BAŞARISI KARŞILAŞTIRMASI (%)",24,y,width,8,true);
 for(const [i,l]of lessons.entries()){const count=view.data.questions.filter((q:any)=>q.lesson===l.lesson&&q.answer!=="X").length||1,values=student?[l.net,mean(members,l.lesson),mean(view.data.students,l.lesson)]:[mean(members,l.lesson)];
 values.forEach((v,j)=>{const value=Math.max(-100,Math.min(100,v/count*100)),bar= Math.max(2,Math.min(14,(cw-8)/series.length)),x=24+i*cw+4+j*(bar+2);doc.rect(x,top+75-Math.max(0,value)*.65,bar,Math.max(0,value)*.65).fill(series[j].color);if(value<0)text(n(value),x,top+64,bar+12,6);});text(l.lesson,24+i*cw+2,top+80,cw-4,7);}
 y=top+h+9;text(series.map(s=>s.name).join(" / ")+" · Negatif netler sıfır çizgisinde gösterilir.",24,y,width,7);y+=20;}
 if(list){
 const groups=options.kind==="classes"?[...new Set(students.map(s=>s.branch))]:[""];
 for(const group of groups){const members=students.filter(s=>!group||s.branch===group),lessons=summary(members[0])?.lessons??[];
 for(let block=0;block<lessons.length;block+=6){const selected=lessons.slice(block,block+6),sizes=[.035,.095,.19,.06,...selected.map(()=>.48/selected.length),.07,.07];
 const heading=()=>{start(`OKUL NET LİSTESİ${group?` · ${group}`:""} · ${options.order==="score"?"puan sıralı":"isim sıralı"}`);text(`Seçili katılım: ${members.length} · Kurum: ${view.data.students.length} · Genel: ${view.generalCount}`,24,y,width,8);y+=20;row(["Sıra","No","İsim","Sınıf",...selected.map((l:any)=>`${l.lesson}\nD / Y / Net`),"Net","Puan"],sizes,true);};
 heading();row(["","","Seçili grup ortalaması","",...selected.map((l:any)=>n(mean(members,l.lesson))),n(members.reduce((a,s)=>a+summary(s).net,0)/members.length),n(members.reduce((a,s)=>a+summary(s).score,0)/members.length)],sizes,true);
 for(const [i,s]of members.entries()){if(y+40>bottom){heading();}const r=summary(s);row([String(i+1),no(s),s.name,s.branch,...selected.map((l:any)=>{const v=r.lessons.find((v:any)=>v.lesson===l.lesson);return `${v.correct} / ${v.wrong} / ${n(v.net)}`;}),n(r.net),n(r.score)],sizes);}
 chart(selected,members);}
 }
 }else for(const s of students){const r=summary(s),rank=view.rankings[s.id],title=pastel?"SINAV SONUÇ BELGESİ":"SONUÇ BELGESİ · DERS ANALİZİ";
 start(title);const cardPage=page;row([s.name,`No: ${no(s)}`,s.branch],[.6,.25,.15],true);
 if(!options.hideIdentity){const identity=decryptIdentity(s.identityEncrypted);if(identity)row([`TC: ${identity}`],[1]);}
 row([`Puan: ${n(r.score)}`,`Toplam net: ${n(r.net)}`,`Genel: ${rank.generalRank} / ${rank.generalCount}`],[.34,.33,.33],true);
 row([`Kurum: ${rank.schoolRank} / ${rank.schoolCount}`,`Sınıf: ${rank.classRank} / ${rank.classCount}`],[.5,.5]);y+=10;
 row(["Ders","Soru","D","Y","Boş","Net","Başarı %","Sınıf ort.","Kurum ort."],[.25,.08,.07,.07,.08,.1,.09,.13,.13],true);
 const classmates=view.data.students.filter((other:any)=>resultGrade(other.branch)===resultGrade(s.branch));
 for(const l of r.lessons){const count=l.correct+l.wrong+l.blank;row([l.lesson,String(count),String(l.correct),String(l.wrong),String(l.blank),n(l.net),n(count?l.correct/count*100:0),n(mean(classmates,l.lesson)),n(mean(view.data.students,l.lesson))],[.25,.08,.07,.07,.08,.1,.09,.13,.13]);}
 chart(r.lessons,classmates,s);
 // Each column paginates independently; continuation pages preserve student context.
 const columnWidth=(width-12)/2,initialY=y;let leftY=initialY;
 text("SORU CEVAPLARI · A KİTAPÇIĞI SIRASI",24,y,pastel?width:columnWidth,9,true);y+=20;const answersTop=y;let answerX=28,maxAnswerY=y;
 for(const [lessonIndex,l] of r.lessons.entries()){if(pastel&&lessonIndex===Math.ceil(r.lessons.length/2)){maxAnswerY=Math.max(maxAnswerY,y);y=answersTop;answerX=28+columnWidth+12;}const allQs=view.data.questions.flatMap((q:any,i:number)=>q.lesson===l.lesson?[`${q.number}:${s.answers[i]||"-"}/${q.answer}`]:[]);for(let offset=0;offset<allQs.length;offset+=30){const value=`${l.lesson}${offset?" (devam)":""}\n${allQs.slice(offset,offset+30).join("   ")}`;doc.font("R").fontSize(8);const h=doc.heightOfString(value,{width:columnWidth-8})+12;if(y+h>bottom){start(`${s.name} · Cevaplar (devam)`);}text(value,answerX,y,columnWidth-8);y+=h;maxAnswerY=Math.max(maxAnswerY,y);}}leftY=Math.max(y,maxAnswerY);
 // Begin outcomes on the same page only when the answer column did not overflow.
 if(page===cardPage)y=pastel?leftY+15:initialY;else start(`${s.name} · Kazanım analizi`);let x=pastel?24:24+columnWidth+12;
 if(y>bottom-35){start(`${s.name} · Kazanımlar`);y=100;}
 let continuationTop=y;text("DERSLERE GÖRE KAZANIM ANALİZİ",x,y,columnWidth,9,true);y+=20;
 const outcomes=new Map<string,{name:string;count:number;correct:number;wrong:number;blank:number}>();
 view.data.questions.forEach((q:any,i:number)=>{if(q.answer==="X"||(!q.outcomeName&&!q.outcomeCode))return;const key=JSON.stringify([q.lesson,q.outcomeCode,q.outcomeName]),o=outcomes.get(key)??{name:`${q.lesson} · ${q.outcomeName??q.outcomeCode}`,count:0,correct:0,wrong:0,blank:0};o.count++;if(q.answer==="H"||s.answers[i]===q.answer)o.correct++;else if(!s.answers[i])o.blank++;else o.wrong++;outcomes.set(key,o);});
 if(!outcomes.size)text("Cevap anahtarında kazanım bilgisi bulunmuyor.",x,y,columnWidth,8);
 for(const o of outcomes.values()){const value=`${o.name}\nS: ${o.count}   D: ${o.correct}   Y: ${o.wrong}   B: ${o.blank}   %${n(o.correct/o.count*100)}`;doc.font("R").fontSize(8);const h=doc.heightOfString(value,{width:columnWidth-8})+10;if(y+h>bottom){if(x===24){x=24+columnWidth+12;y=continuationTop;}else{start(`${s.name} · Kazanım analizi (devam)`);x=24;continuationTop=y;}}doc.rect(x,y,columnWidth,h).fill(pastel?"#fff2d8":"#f0f3f5");text(value,x+4,y+4,columnWidth-8);y+=h+2;}
 }
 doc.end();
});}
