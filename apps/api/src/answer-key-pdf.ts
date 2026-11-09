import path from "node:path";
import fs from "node:fs";
import type { OpticalQuestion } from "./optical-core";
const PDFDocument=require("pdfkit");
export type KeyPdfContext={examName?:string;publisherName?:string;grade?:number;books?:string[]};
/** Embedded fonts and a predictable A4 layout; no browser or web directory required. */
export function createAnswerKeyPdf(questions:OpticalQuestion[],context:KeyPdfContext={}):Promise<Buffer>{
 return new Promise((resolve,reject)=>{
  const doc=new PDFDocument({size:"A4",margin:34,autoFirstPage:false,info:{Title:`${context.examName??"Sınav"} - Cevap Anahtarı`,Author:"Kurumsal Sınav"}}),chunks:Buffer[]=[];
  doc.on("data",(b:Buffer)=>chunks.push(b));doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);
  doc.registerFont("Regular",path.join(__dirname,"../assets/fonts/LiberationSans-Regular.ttf"));doc.registerFont("Bold",path.join(__dirname,"../assets/fonts/LiberationSans-Bold.ttf"));
  const available=[...new Set(questions.flatMap(q=>Object.keys(q.positions)))].sort();
  const books=context.books?.length?available.filter(b=>context.books!.includes(b)):available;
  if(!books.length){reject(new Error("Seçilen kitapçık anahtarda bulunamadı."));return;}
  let logo:{path:string;color:string;radius:number}|null=null;try{const svg=fs.readFileSync(path.join(__dirname,"../assets/branding/kurumsal-sinav.svg"),"utf8"),shape=svg.match(/<path[^>]*d="([^"]+)"/),color=svg.match(/<rect[^>]*fill="([^"]+)"/),radius=svg.match(/<rect[^>]*rx="([^"]+)"/);if(shape&&color)logo={path:shape[1],color:color[1],radius:Number(radius?.[1]??18)};}catch{}
  const lessons=[...new Set(questions.map(q=>q.lesson))];let page=0;
  for(const book of books){let y=122;
   const addPage=()=>{doc.addPage();page++;doc.rect(0,0,596,88).fill("#142b4a");doc.fillColor("#fff").font("Bold").fontSize(15).text(context.examName??"Cevap Anahtarı",34,16,{width:430,height:37,ellipsis:true});doc.font("Regular").fontSize(10).text([context.grade?`${context.grade}. Sınıf`:"",`${book} KİTAPÇIĞI`].filter(Boolean).join(" • "),34,58,{width:430});if(logo){doc.save().translate(508,17).scale(48/64);doc.roundedRect(0,0,64,64,logo.radius).fill(logo.color);doc.path(logo.path).fill("#fff");doc.restore();}else{doc.fontSize(9).text("KURUMSAL SINAV",470,28,{width:90,align:"right"});}doc.fillColor("#142b4a").font("Bold").fontSize(13).text(context.examName??"Cevap Anahtarı",34,99,{width:375,height:28,ellipsis:true});doc.font("Regular").fontSize(9).text(context.publisherName??"",430,102,{width:130,align:"right",height:25});doc.font("Regular").fontSize(8).fillColor("#52647b").text(`Onaylanan cevap anahtarı  •  H: tümü doğru  •  X: iptal`,34,795,{width:460});doc.text(`${page}`,530,795,{width:30,align:"right"});y=142;};addPage();
   const cards=lessons.flatMap(lesson=>{const rows=questions.filter(q=>q.lesson===lesson&&q.positions[book]).sort((a,b)=>a.positions[book]-b.positions[book]);const chunks=[];for(let from=0;from<rows.length;from+=42)chunks.push({lesson:rows.length>42?`${lesson} (${from+1}-${Math.min(rows.length,from+42)})`:lesson,rows:rows.slice(from,from+42)});return chunks;});
   for(let i=0;i<cards.length;i+=3){const group=cards.slice(i,i+3),height=44+Math.max(...group.map(c=>c.rows.length))*12;
    if(y+height>774)addPage();
    group.forEach((card,col)=>{const x=34+col*179,w=168;doc.roundedRect(x,y,w,height,7).lineWidth(.6).fillAndStroke("#f7f9fc","#d7e1ed");doc.roundedRect(x,y,w,34,7).fill("#e7eef8");doc.font("Bold").fontSize(card.lesson.length>34?7.5:9).fillColor("#142b4a").text(card.lesson,x+9,y+7,{width:w-18,height:25});card.rows.forEach((q,j)=>{const rowY=y+40+j*12;doc.font("Regular").fontSize(8).fillColor("#51657f").text(`${q.positions[book]}. soru`,x+10,rowY,{width:76});doc.font("Bold").fontSize(9).fillColor(q.answer==="X"?"#ab3748":"#142b4a").text(q.answer,x+104,rowY,{width:45,align:"center"});});});y+=height+14;
   }
  }
  doc.end();
 });
}
