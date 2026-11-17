import path from "node:path";
const PDFDocument=require("pdfkit");
/** Authorized one-response export. Codes are never written to an intermediate file. */
export function studentCodesPdf(rows:string[][],schoolName:string):Promise<Buffer>{return new Promise((resolve,reject)=>{
 const doc=new PDFDocument({size:"A4",margin:36,autoFirstPage:false,info:{Title:"Kişisel Öğrenci Erişim Kodları",Author:"KurumsalSınav"}}),chunks:Buffer[]=[];
 doc.on("data",(b:Buffer)=>chunks.push(b));doc.on("error",reject);doc.on("end",()=>resolve(Buffer.concat(chunks)));
 doc.registerFont("R",path.join(__dirname,"../assets/fonts/LiberationSans-Regular.ttf"));doc.registerFont("B",path.join(__dirname,"../assets/fonts/LiberationSans-Bold.ttf"));
 let y=0,page=0;const text=(v:string,x:number,t:number,w:number,bold=false)=>doc.font(bold?"B":"R").fontSize(9).fillColor("#142b49").text(v,x,t,{width:w,height:30,ellipsis:true});
 function next(){doc.addPage();page++;text("KurumsalSınav · Kişisel Öğrenci Erişim Kodları",36,32,523,true);text(schoolName,36,53,523,true);text("Gizli · Yalnız ilgili öğrenci/veliyle paylaşın. Önceki kodlar iptal edilmiştir.",36,74,523);text("Öğrenci No",36,107,150,true);text("Akademik Yıl",200,107,110,true);text("Kişisel Kod",324,107,235,true);text(`Sayfa ${page}`,36,793,523);y=134;}
 for(const row of rows){doc.font("R").fontSize(9);const height=Math.max(18,doc.heightOfString(row[0],{width:150}),doc.heightOfString(row[1],{width:110}),doc.heightOfString(row[2],{width:235}));if(!page||y+height+15>780)next();doc.font("R").fontSize(9).fillColor("#142b49").text(row[0],36,y,{width:150}).text(row[1],200,y,{width:110}).text(row[2],324,y,{width:235});doc.moveTo(36,y+height+5).lineTo(559,y+height+5).strokeColor("#dce5f0").lineWidth(.5).stroke();y+=height+17;}
 if(!page)next();doc.end();
 });}
