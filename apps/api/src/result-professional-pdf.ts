import {decryptIdentity} from "./result-identity";
import path from "node:path";
import {selectedStudents,type ReportOptions} from "./result-pdf";
import {resultGrade} from "../lib/result-grade";
import {reportBenchmarks} from "./report-benchmarks";
const PDFDocument=require("pdfkit");
const fmt=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)?v.toLocaleString("tr-TR",{maximumFractionDigits:2}):"-";
const colors={ink:"#17304c",muted:"#536578",line:"#c8d3df",pale:"#edf3f9",blue:"#3265a8",green:"#187857",red:"#ac3f4c",gold:"#c38b24"};
export function professionalReportPdf(view:any,options:ReportOptions):Promise<Buffer>{return new Promise((resolve,reject)=>{
 const list=options.kind!=="cards",doc=new PDFDocument({size:"A4",layout:list?"landscape":"portrait",margin:24,autoFirstPage:false,info:{Title:view.keyName,Author:"Kurumsal Sınav"}}),chunks:Buffer[]=[];
 doc.on("data",(b:Buffer)=>chunks.push(b));doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);
 doc.registerFont("R",path.join(__dirname,"../assets/fonts/LiberationSans-Regular.ttf"));doc.registerFont("B",path.join(__dirname,"../assets/fonts/LiberationSans-Bold.ttf"));
 const W=list?793.89:547.28,bottom=list?548:794,metadata=view.reportMetadata??{},students=selectedStudents(view,options);
 let y=24,pages=0,title="",subject="",stripe=0;
 const text=(value:unknown,x:number,top:number,width:number,size=8,bold=false,color=colors.ink)=>{doc.font(bold?"B":"R").fontSize(size).fillColor(color).text(String(value??"-"),x,top,{width,lineGap:1});};
 const height=(value:unknown,width:number,size=8,bold=false)=>{doc.font(bold?"B":"R").fontSize(size);return doc.heightOfString(String(value??"-"),{width,lineGap:1});};
 const number=(s:any)=>{const no=s.studentNo??s.id,identity=!options.hideIdentity?decryptIdentity(s.identityEncrypted):"";const displayed=no.startsWith("tc-")||no==="—"?"-":options.hideIdentity&&/^\d{11}$/.test(no)?"***********":no;return displayed+(/^\d{11}$/.test(identity)?`\nTC/Tel: ${identity}`:"");};
 const result=(s:any)=>view.summary.find((r:any)=>r.id===s.id);
 function page(newTitle=title,newSubject=subject){title=newTitle;subject=newSubject;doc.addPage();pages++;y=24;
  text("KURUMSAL SINAV",24,y,260,14,true);text("Ölçme ve değerlendirme raporu",24,y+19,260,7,false,colors.muted);
  if(view.publisherLogo){try{doc.image(view.publisherLogo,24+W-54,y,{fit:[54,30],align:"right"});}catch{/* Optional publisher artwork may be absent. */}}
  if(metadata.publisherName)text(metadata.publisherName,24+W-230,y,view.publisherLogo?170:230,9,true);
  y+=Math.max(39,metadata.publisherName?height(metadata.publisherName,view.publisherLogo?170:230,9,true)+6:0);const examHeight=height(view.keyName,W,11,true);text(view.keyName,24,y,W,11,true);y+=examHeight+7;
  const location=[view.schoolName,metadata.city,metadata.district].filter(Boolean).join(" / ");const lh=height(location,W,8);text(location,24,y,W,8);y+=lh+7;
  text(title,24,y,W,9,true,colors.blue);y+=16;
  if(subject){const sh=height(subject,W,8,true);text(subject,24,y,W,8,true);y+=sh+8;}
  doc.moveTo(24,y).lineTo(24+W,y).strokeColor(colors.line).stroke();y+=9;
  const foot="Yerel deneme puanı / 500. Sıralamalar yalnızca sistemdeki aynı sınav ve anahtar katılımıdır.";
  text(foot,24,bottom+14,W-45,6.5,false,colors.muted);text(String(pages),24+W-30,bottom+14,30,7,true);
 }
 function section(label:string){if(y+26>bottom)page();text(label,24,y,W,9,true,colors.blue);y+=19;}
 function drawRow(cells:unknown[],fractions:number[],header=false,size=8){const heights=cells.map((v,i)=>height(v,W*fractions[i]-9,size,header)),h=Math.max(header?23:20,...heights.map(v=>v+9));let x=24;
  cells.forEach((v,i)=>{const w=W*fractions[i];doc.rect(x,y,w,h).fillAndStroke(header?colors.ink:stripe%2===0?"#ffffff":colors.pale,colors.line);text(v,x+4,y+4,w-8,size,header,header?"#ffffff":colors.ink);x+=w;});y+=h;stripe++;return h;
 }
 function table(headers:string[],fractions:number[],rows:unknown[][],size=8){
  const headerHeight=Math.max(23,...headers.map((v,i)=>height(v,W*fractions[i]-9,size,true)+9));
  if(y+headerHeight+25>bottom)page();drawRow(headers,fractions,true,size);
  for(const cells of rows){const h=Math.max(20,...cells.map((v,i)=>height(v,W*fractions[i]-9,size)+9));if(y+h>bottom){page();drawRow(headers,fractions,true,size);}drawRow(cells,fractions,false,size);}
  y+=10;
 }
 const mean=(members:any[])=>reportBenchmarks([{data:{students:members},summary:view.summary}]).all;
 const scoreMean=(members:any[])=>mean(members).score;
 const general=(grade:string)=>view.benchmarks?.grades?.[grade];
 function legend(items:{name:string;color:string}[],top:number){let x=24;for(const item of items){doc.rect(x,top+2,6,6).fill(item.color);text(item.name,x+10,top,W/items.length-12,7);x+=W/items.length;}}
 function lessonChart(lessons:any[],series:{name:string;color:string;values:(number|null)[]}[]){
  if(lessons.length>8){for(let i=0;i<lessons.length;i+=8)lessonChart(lessons.slice(i,i+8),series.map(s=>({...s,values:s.values.slice(i,i+8)})));return;}
  const cw=W/Math.max(1,lessons.length),labelH=Math.max(9,...lessons.map(l=>height(l.lesson,cw-3,6.5))),h=110+labelH;
  if(y+h>bottom)page();section("DERS BAZINDA NET KARŞILAŞTIRMASI");const top=y,chartH=44,base=top+chartH;
  const commonMax=Math.max(1,...lessons.map(l=>view.data.questions.filter((q:any)=>q.lesson===l.lesson&&q.answer!=="X").length));
  doc.moveTo(24,base).lineTo(24+W,base).strokeColor(colors.line).stroke();
  lessons.forEach((l,i)=>{const max=commonMax;const bar=Math.min(13,(cw-12)/series.length);
   series.forEach((s,j)=>{const net=s.values[i];if(net===null||net===undefined)return;const value=Math.max(-max,Math.min(max,net)),bh=Math.abs(value)/max*chartH,x=27+i*cw+j*(bar+2);doc.rect(x,value>=0?base-bh:base,bar,bh).fill(s.color);});text(l.lesson,24+i*cw,base+19,cw-3,6.5);
  });y=base+19+labelH+6;legend(series,y);y+=17;
 }
 function scoreChart(s:any,school:any,all:any){if(y+58>bottom)page();section("PUAN KARŞILAŞTIRMASI · 500 ÜZERİNDEN");const series=[{name:"Öğrenci",value:result(s).score,color:colors.blue},{name:"Okul / kurum",value:school.score,color:colors.gold},...(all?.score!=null?[{name:"Genel katılım",value:all.score,color:colors.green}]:[])],cw=W/series.length;
  series.forEach((item,i)=>{text(`${item.name}: ${fmt(item.value)}`,24+i*cw,y,cw-10,7,true);doc.rect(24+i*cw,y+14,cw-12,5).fill(colors.pale);doc.rect(24+i*cw,y+14,(cw-12)*Math.max(0,Math.min(500,item.value??0))/500,5).fill(item.color);});y+=31;
 }
 function outcomes(s:any){const map=new Map<string,any>();view.data.questions.forEach((q:any,i:number)=>{if(q.answer==="X"||(!q.outcomeName&&!q.outcomeCode))return;const key=JSON.stringify([q.lesson,q.outcomeCode,q.outcomeName]);const o=map.get(key)??{lesson:q.lesson,name:q.outcomeName||q.outcomeCode,code:q.outcomeCode,count:0,correct:0,wrong:0,blank:0};o.count++;if(q.answer==="H"||s.answers[i]===q.answer)o.correct++;else if(!s.answers[i])o.blank++;else o.wrong++;map.set(key,o);});return [...map.values()];}
 function summary(s:any){
  const r=result(s),rank=view.rankings[s.id],grade=resultGrade(s.branch),classmates=view.data.students.filter((v:any)=>resultGrade(v.branch)===grade),school=mean(view.data.students),classMean=mean(classmates),all=general(grade);
  page("ÖĞRENCİ SONUÇ BELGESİ",`${s.name} · Öğrenci no: ${number(s)} · Sınıf / şube: ${s.branch}`);
  table(["Sınav tarihi","Kaynak kitapçıklar","Puan türü"],[.23,.47,.3],[[metadata.examDate??"Belirtilmedi",Object.entries(s.booklets??{}).map(([l,b])=>`${l}: ${b}`).join(" / ")||s.recordBooklets?.join(" / ")||"Belirtilmedi","Yerel deneme / 500"]],7);
  table(["PUAN","TOPLAM NET","GENEL SIRA","OKUL / KURUM","KADEME"],[.19,.18,.23,.21,.19],[[fmt(r.score),fmt(r.net),`${rank.generalRank} / ${rank.generalCount}`,`${rank.schoolRank} / ${rank.schoolCount}`,`${rank.classRank} / ${rank.classCount}`]],9);
  section("DERS BAŞARI TABLOSU");
  const totals={correct:r.lessons.reduce((n:number,l:any)=>n+l.correct,0),wrong:r.lessons.reduce((n:number,l:any)=>n+l.wrong,0),blank:r.lessons.reduce((n:number,l:any)=>n+l.blank,0)};
  const lessonRows=r.lessons.map((l:any)=>{const count=l.correct+l.wrong+l.blank;return [l.lesson,l.cancelled?`${count+l.cancelled} (${l.cancelled} iptal)`:count,l.correct,l.wrong,l.blank,fmt(l.net),fmt(count?100*l.correct/count:0),fmt(classMean.lessons[l.lesson]),fmt(school.lessons[l.lesson]),fmt(all?.lessons?.[l.lesson])];});
  const sumNets=(v:any)=>v?Object.values<number>(v.lessons).reduce((sum,n)=>sum+n,0):null;
  lessonRows.push(["TOPLAM",view.data.questions.length,totals.correct,totals.wrong,totals.blank,fmt(r.net),fmt(100*totals.correct/Math.max(1,totals.correct+totals.wrong+totals.blank)),fmt(sumNets(classMean)),fmt(sumNets(school)),fmt(sumNets(all))]);
  table(["Ders","Soru","D","Y","Boş","Net","Başarı %","Kademe ort.","Okul ort.","Genel ort."],[.22,.07,.055,.055,.06,.09,.09,.12,.12,.12],lessonRows,7.5);
  lessonChart(r.lessons,[{name:"Öğrenci",color:colors.blue,values:r.lessons.map((l:any)=>l.net)},{name:"Okul / kurum",color:colors.gold,values:r.lessons.map((l:any)=>school.lessons[l.lesson]??null)},...(all?[{name:"Genel katılım",color:colors.green,values:r.lessons.map((l:any)=>all.lessons?.[l.lesson]??null)}]:[])]);
  scoreChart(s,school,all);
  const focus=outcomes(s).sort((a,b)=>a.correct/a.count-b.correct/b.count).slice(0,4);
  if(focus.length){section("ÖNCELİKLİ KAZANIMLAR · EN DÜŞÜK BAŞARI ORANLARI");table(["Ders / kazanım","Soru","D / Y / B","Başarı %"],[.65,.08,.15,.12],focus.map(o=>[`${o.lesson} · ${String(o.name).length>110?String(o.name).slice(0,107)+"...":o.name}`,o.count,`${o.correct} / ${o.wrong} / ${o.blank}`,fmt(100*o.correct/o.count)]),7);}
  else{text("Cevap anahtarında kazanım verisi bulunmuyor.",24,y,W,8);y+=16;}
  if(y+18>bottom)page();text("Tam cevap eşleştirmesi ve tüm kazanımlar için ayrıntılı karne seçeneğini kullanın. Negatif netler grafikte sıfırın altında gösterilir.",24,y,W,7,false,colors.muted);
 }
 function details(s:any){
  page("CEVAP VE KAZANIM ANALİZİ",`${s.name} · No: ${number(s)} · ${s.branch}`);
  text("Cevaplar kitapçık eşleştirmesiyle ortak A soru sırasındadır. D: doğru, Y: yanlış, B: boş, H: tümü doğru, X: iptal.",24,y,W,7);y+=23;
  const lessonNames=[...new Set<string>(view.data.questions.map((q:any)=>q.lesson))];
  const blocks=lessonNames.flatMap(lesson=>{
   const qs=view.data.questions.map((q:any,i:number)=>({...q,index:i})).filter((q:any)=>q.lesson===lesson),parts=[];
   for(let offset=0;offset<qs.length;offset+=20)parts.push({lesson,qs:qs.slice(offset,offset+20)});return parts;
  });
  const blockWidth=(W-12)/2;
  for(let index=0;index<blocks.length;index+=2){if(y+72>bottom)page();const top=y;
   for(let col=0;col<2;col++){const block=blocks[index+col];if(!block)break;const {lesson,qs}=block,left=24+col*(blockWidth+12),book=s.booklets?.[lesson]??(s.recordBooklets?.length===1?s.recordBooklets[0]:"-");
    text(`${lesson} · Kitapçık: ${book}`,left,top,blockWidth,8,true,colors.blue);
    const labelW=45,cw=(blockWidth-labelW)/qs.length,labels=["Soru","Öğrenci","Anahtar","Durum"];
    for(let row=0;row<4;row++){const rowY=top+17+row*13;doc.rect(left,rowY,labelW,13).fill(colors.ink);text(labels[row],left+3,rowY+2,labelW-5,6.5,true,"#ffffff");qs.forEach((q:any,i:number)=>{const a=s.answers[q.index]||"-",state=q.answer==="X"?"X":q.answer==="H"?"H":a==="-"?"B":a===q.answer?"D":"Y",value=[q.number,a,q.answer,state][row],fill=row===3?(state==="D"||state==="H"?"#ddf0e7":state==="Y"?"#f9e4e8":colors.pale):"#ffffff";doc.rect(left+labelW+i*cw,rowY,cw,13).fillAndStroke(fill,colors.line);text(value,left+labelW+i*cw+2,rowY+2,cw-3,6.5);});}
   }y=top+72;
  }
  section("KAZANIM BAŞARI TABLOSU");const os=outcomes(s);
  if(!os.length)text("Bu sınavın cevap anahtarında kazanım verisi yoktur.",24,y,W,8);
  else table(["Ders","Kazanım / konu açıklaması","Soru","D","Y","Boş","Başarı %"],[.14,.5,.065,.065,.065,.065,.1],os.map(o=>[o.lesson,[o.code,o.name].filter((v,i,a)=>v&&a.indexOf(v)===i).join(" · "),o.count,o.correct,o.wrong,o.blank,fmt(100*o.correct/o.count)]),7.5);
 }
 if(!list){for(const s of students){summary(s);if(options.templateId!=="summary-card")details(s);}}
 else {
  const groups=options.kind==="classes"?[...new Set(students.map(s=>s.branch))]:[""];
  for(const group of groups){const members=students.filter(s=>!group||s.branch===group);if(!members.length)continue;const lessons=result(members[0]).lessons;
   // Six lesson columns per block keep 90-question LGS reports readable on A4 landscape.
   for(let offset=0;offset<lessons.length;offset+=6){const selected=lessons.slice(offset,offset+6),fractions=[.035,.065,.15,.055,...selected.map(()=>.405/selected.length),.055,.065,.085,.085],grades=[...new Set(members.map(s=>resultGrade(s.branch)))].join(", ");
    page("OKUL SONUÇ LİSTESİ",`Kademe: ${grades}${group?` · Şube: ${group}`:""} · Seçili katılım: ${members.length} · Genel katılım: ${view.generalCount}`);
    text(`Sınav tarihi: ${metadata.examDate??"Belirtilmedi"} · Puan türü: yerel deneme / 500 · Ders sütunları: D / Y / B / Net`,24,y,W,7);y+=18;
    table(["Sıra","No","Ad soyad","Sınıf",...selected.map((l:any)=>l.lesson),"Net","Puan","Genel sıra","Okul / kurum"],fractions,members.map((s,i)=>{const r=result(s),rank=view.rankings[s.id];return [i+1,number(s),s.name,s.branch,...selected.map((l:any)=>{const v=r.lessons.find((v:any)=>v.lesson===l.lesson);return `${v.correct}/${v.wrong}/${v.blank}/${fmt(v.net)}`;}),fmt(r.net),fmt(r.score),`${rank.generalRank}/${rank.generalCount}`,`${rank.schoolRank}/${rank.schoolCount}`];}),7);
    const school=mean(members);table(["Seçili grup ortalaması",...selected.map((l:any)=>l.lesson),"Net","Puan"],[.25,...selected.map(()=>.5/selected.length),.125,.125],[[`${members.length} öğrenci`,...selected.map((l:any)=>fmt(school.lessons[l.lesson])),fmt(members.reduce((sum,s)=>sum+result(s).net,0)/members.length),fmt(school.score)]],7);
    const overall=grades.includes(",")?undefined:general(grades);
    lessonChart(selected,[{name:"Seçili okul / grup",color:colors.blue,values:selected.map((l:any)=>school.lessons[l.lesson]??null)},...(overall?[{name:"Genel katılım",color:colors.green,values:selected.map((l:any)=>overall.lessons?.[l.lesson]??null)}]:[])]);
   }
  }
 }
 doc.end();
});}
