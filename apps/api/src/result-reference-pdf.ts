import {drawBrandLogo} from "./brand-logo";
import path from "node:path";
import {selectedStudents,type ReportOptions} from "./result-pdf";
import {reportBenchmarks} from "./report-benchmarks";
import {resultGrade} from "../lib/result-grade";
import {decryptIdentity} from "./result-identity";
const PDFDocument=require("pdfkit");
const C={ink:"#092e58",muted:"#53677c",line:"#d5e1ee",pale:"#eef4f9",green:"#d3f5df",red:"#ffdddd",yellow:"#fff0c3"};
const palette=["#168fcb","#57b99b","#d9b957","#9c86c9","#e799a2","#68c5e8"];
const n=(v:any,d=2)=>typeof v==="number"&&Number.isFinite(v)?v.toLocaleString("tr-TR",{maximumFractionDigits:d}):"—";
const score=(v:any)=>v==null?"Hesaplanmadı":v.toLocaleString("tr-TR",{minimumFractionDigits:3,maximumFractionDigits:3});
/** Vector A4 cards. Flow uses measured text; exceptional content continues without truncation. */
export function referenceReportPdf(view:any,options:ReportOptions):Promise<Buffer>{return new Promise((resolve,reject)=>{
 const doc=new PDFDocument({size:"A4",margin:20,autoFirstPage:false,bufferPages:true,info:{Title:view.keyName,Author:"Kurumsal Sınav"}}),chunks:Buffer[]=[];
 doc.on("data",(b:Buffer)=>chunks.push(b));doc.on("error",reject);doc.on("end",()=>resolve(Buffer.concat(chunks)));
 doc.registerFont("R",path.join(__dirname,"../assets/fonts/LiberationSans-Regular.ttf"));doc.registerFont("B",path.join(__dirname,"../assets/fonts/LiberationSans-Bold.ttf"));
 const W=555.28,L=20,bottom=796,showGeneral=options.showGeneralParticipation!==false;
 const schoolBenchmarks=reportBenchmarks([{data:view.data,summary:view.summary}]);
 let y=0,pageCount=0,current:any;
 const tx=(v:any,x:number,t:number,w:number,size=8,bold=false,color=C.ink)=>{doc.font(bold?"B":"R").fontSize(size).fillColor(color).text(String(v??"—"),x,t,{width:w,lineGap:0});};
 const ht=(v:any,w:number,size=8,bold=false)=>{doc.font(bold?"B":"R").fontSize(size);return doc.heightOfString(String(v??"—"),{width:w,lineGap:0});};
 const box=(x:number,t:number,w:number,h:number,fill=C.pale)=>doc.roundedRect(x,t,w,h,6).fillAndStroke(fill,C.line);
 function icon(x:number,t:number) {drawBrandLogo(doc,x,t-11,28);}

 function page(continuation=false){doc.addPage();pageCount++;doc.roundedRect(L,12,W,53,8).fill(C.ink);icon(32,31);tx("KURUMSAL SINAV",69,22,280,19,true,"#ffffff");tx("ÖĞRENCİ SONUÇ BELGESİ",69,45,280,8,false,"#ffffff");tx(view.keyName,365,23,198,10,true,"#ffffff");y=76;if(continuation){tx(`${current.name} · Devam sayfası: içerik kaybı olmadan sürdürüldü.`,L,y,W,8,true);y+=22;}}
 function ensure(h:number){if(y+h>bottom)page(true);}
 function heading(label:string,x=L,w=W,t=y,color=C.pale){box(x,t,w,25,color);tx(label,x+10,t+6,w-20,11,true);return t+31;}
 function badge(v:number,x:number,t:number,w:number){doc.roundedRect(x,t,w,12,5).fill(v>=70?C.green:v>=40?C.yellow:C.red);tx(`${w<24?'':'%'}${n(v,0)}`,x+2,t+2,w-4,7,true);}
 function row(cells:any[],widths:number[],x:number,t:number,w:number,header=false,size=8,min=17,pad=6){const h=Math.max(min,...cells.map((c,i)=>ht(c,w*widths[i]-8,size,header)+pad));let left=x;cells.forEach((c,i)=>{const cw=w*widths[i];doc.rect(left,t,cw,h).fillAndStroke(header?C.ink:((Math.round(t)%2)?"#ffffff":"#f5f8fc"),C.line);tx(c,left+4,t+pad/2,cw-8,size,header,header?"#ffffff":C.ink);left+=cw;});return h;}
 function outcomes(s:any){const map=new Map<string,any>();view.data.questions.forEach((q:any,i:number)=>{if(q.answer==="X"||s.missingLessons?.includes(q.lesson)||(!q.outcomeName&&!q.outcomeCode))return;const key=JSON.stringify([q.lesson,q.outcomeName||q.outcomeCode]),o=map.get(key)??{lesson:q.lesson,description:q.outcomeName||q.outcomeCode,codes:new Set<string>(),count:0,correct:0,wrong:0,blank:0};if(q.outcomeCode)o.codes.add(q.outcomeCode);o.count++;const state=answerState(q,s.answers[i]);o[state]++;map.set(key,o);});return [...map.values()].map(o=>({...o,name:[o.description,o.codes.size?`Kodlar: ${[...o.codes].join(", ")}`:""].filter(Boolean).join(" · ")}));}
 function answerState(q:any,a:any):"correct"|"wrong"|"blank" {return q.answer==="H"||a===q.answer?"correct":!a||a==="-"||a==="*"&&q.multipleMark==="blank"?"blank":"wrong";}
 function identity(s:any){const raw=s.studentNo??s.id;const no=raw.startsWith("tc-")?"—":options.hideIdentity&&/^\d{11}$/.test(raw)?"***********":raw;const id=!options.hideIdentity?decryptIdentity(s.identityEncrypted):"";return `${no}${/^\d{11}$/.test(id)?` · TC: ${id}`:""}`;}
 function summary(s:any){const r=view.summary.find((v:any)=>v.id===s.id),rank=view.rankings[s.id],school=schoolBenchmarks.grades[resultGrade(s.branch)]??schoolBenchmarks.all;page();
  const info=[['Öğrenci',s.name],['Öğrenci No',identity(s)],['Sınıf',s.branch],['Kurum',[view.schoolName,view.reportMetadata?.city,view.reportMetadata?.district].filter(Boolean).join(' / ')]];
  const widths=[.32,.19,.14,.35],infoH=Math.max(49,...info.map((v,i)=>ht(v[1],W*widths[i]-16,9,true)+25));let x=L;info.forEach((v,i)=>{box(x,y,W*widths[i]-3,infoH);tx(v[0],x+8,y+7,W*widths[i]-18,8);tx(v[1],x+8,y+24,W*widths[i]-18,9,true);x+=W*widths[i];});y+=infoH+12;
  const metrics=[['Sınav Puanı',score(r.score)],['Toplam Net',`${n(r.net)} / ${view.data.questions.length}`],['Kurum Sırası',`${rank.schoolRank??'—'} / ${rank.schoolCount}`],...(showGeneral?[['Genel Sıra',`${n(rank.generalRank,0)} / ${n(rank.generalCount,0)}`]]:[])];
  const mw=W/metrics.length;const metricSize=(value:string)=>{doc.font('B');let size=18;while(size>10&&doc.fontSize(size).widthOfString(value)>mw-26)size--;return size;};const mh=64;metrics.forEach((m,i)=>{box(L+i*mw,y,mw-7,mh,"#f2f8ff");tx(m[0],L+i*mw+10,y+10,mw-26,9,true);tx(m[1],L+i*mw+10,y+33,mw-26,metricSize(m[1]),true);});y+=mh+14;
  const leftW=310,rightX=L+leftW+10,rightW=W-leftW-10,top=y,performancePage=pageCount-1;heading("Ders Performansı",L,leftW);heading("Genel Başarı Grafiği",rightX,rightW);y+=31;
  const fs=[.27,.1,.1,.1,.1,.12,.21];y+=row(['Ders','Soru','D','Y','B','Net','Başarı %'],fs,L,y,leftW,true,7,22);
  for(const l of r.lessons){ensure(16);const count=l.correct+l.wrong+l.blank;const t=y;y+=row([l.lesson,l.missing?'—':count,l.missing?'—':l.correct,l.missing?'—':l.wrong,l.missing?'—':l.blank,l.missing?'—':n(l.net),''],fs,L,y,leftW,false,7,16);if(!l.missing)badge(count?Math.max(0,100*l.net/count):0,L+leftW*.80,t+2,leftW*.18);}
  const totals=r.lessons.reduce((a:any,l:any)=>({correct:a.correct+l.correct,wrong:a.wrong+l.wrong,blank:a.blank+l.blank}),{correct:0,wrong:0,blank:0});
  ensure(21);y+=row(['Toplam',view.data.questions.length,totals.correct,totals.wrong,totals.blank,n(r.net),`%${n(Math.max(0,100*r.net/Math.max(1,totals.correct+totals.wrong+totals.blank)),0)}`],fs,L,y,leftW,true,7,22);
  // Success uses net / active questions, matching the reference; negative values are labelled explicitly.
  const tablePage=pageCount-1;doc.switchToPage(performancePage);const chartTop=top+49,base=chartTop+85,cw=(rightW-25)/Math.max(1,r.lessons.length);for(let step=0;step<=4;step++){const gy=base-step*21.25;doc.moveTo(rightX+22,gy).lineTo(rightX+rightW-4,gy).strokeColor(C.line).stroke();tx(step*25,rightX+1,gy-4,20,6);}
  r.lessons.forEach((l:any,i:number)=>{const count=l.correct+l.wrong+l.blank,bx=rightX+27+i*cw,bw=Math.min(9,cw/3);const values=[{value:l.missing?null:100*l.net/Math.max(1,count),color:'#164c7b'},{value:school.lessons[l.lesson]==null?null:100*school.lessons[l.lesson]!/Math.max(1,count),color:'#abc8e0'}];values.forEach((v,j)=>{if(v.value==null)return;const h=Math.max(0,Math.min(100,v.value))*.85;doc.rect(bx+j*(bw+1),base-h,bw,h).fill(v.color);if(j===0)tx(`%${n(v.value,0)}`,bx-3,base-h-10,cw+2,6,true);});tx(l.lesson.slice(0,3),bx-3,base+6,cw-1,7);});
  tx('Öğrenci: koyu · Kurum ort.: açık',rightX+10,base+30,rightW-20,7);doc.switchToPage(tablePage);y=(tablePage===performancePage?Math.max(y,base+47):y)+12;
  ensure(69);y=heading(r.score===null?(s.missingLessons?.length?'Eksik oturum nedeniyle puan hesaplanmadı.':'Katsayı tanımlanmadığı için puan hesaplanmadı.'):'Sıralama ve Ortalamalar · Katılımcı Sayıları');const ranks=[['Türü','Puan','Kurum ort.','Sınıf sıra / katılım','Kurum sıra / katılım',...(showGeneral?['Genel sıra / katılım']:[])],["Deneme",score(r.score),score(school.score),`${rank.classRank??'—'} / ${rank.classCount}`,`${rank.schoolRank??'—'} / ${rank.schoolCount}`,...(showGeneral?[`${rank.generalRank??'—'} / ${rank.generalCount}`]:[])]];const rw=showGeneral?[.1,.16,.16,.18,.2,.2]:[.12,.2,.2,.24,.24];y+=row(ranks[0],rw,L,y,W,true,7,19);y+=row(ranks[1],rw,L,y,W,false,8,22);if(showGeneral&&rank.cityCount!=null)tx(`İl sıra / katılım: ${rank.cityRank??"—"} / ${rank.cityCount}    İlçe sıra / katılım: ${rank.districtRank??"—"} / ${rank.districtCount??"—"}`,L+4,y+3,W-8,6.5);y+=12;
  const focus=outcomes(s).filter(o=>o.correct<o.count).sort((a,b)=>a.correct/a.count-b.correct/b.count).slice(0,4);const aw=355,fx=L+aw+10,fw=W-aw-10;ensure(80);let answerTop=y,focusTop=y;heading('Cevap Analizi · Tüm Dersler',L,aw);heading('Öncelikli Kazanımlar',fx,fw,y,'#ffe9e9');y+=31;focusTop+=36;
  const remainingFocus:string[]=[];for(const o of focus){const label=`${o.name} (${o.lesson}) · %${n(100*o.correct/o.count,0)}`,h=ht(label,fw-16,8)+14;if(focusTop+h>bottom){remainingFocus.push(label);continue;}box(fx,focusTop,fw,h,'#fff3f3');tx(label,fx+8,focusTop+6,fw-16,8);focusTop+=h+5;}
  if(!focus.length)tx(outcomes(s).length?'Öncelikli eksik kazanım yok.':'Değerlendirilebilir kazanım yok.',fx+8,focusTop,fw-16,8);
  for(const l of r.lessons){const qs=view.data.questions.map((q:any,i:number)=>({...q,index:i})).filter((q:any)=>q.lesson===l.lesson);for(let offset=0;offset<qs.length;offset+=25){const part=qs.slice(offset,offset+25);if(y+40>bottom){page(true);y=heading('Cevap Analizi · Devam');}tx(`${l.lesson}${l.missing?' · Oturum yok / değerlendirilmedi.':''}`,L+4,y,aw-8,7.5,true);y+=10;const labelW=43,cw=(aw-labelW)/part.length;['Soru','Öğrenci','Anahtar'].forEach((label,j)=>{tx(label,L+3,y+2,labelW-3,6.5,true);part.forEach((q:any,i:number)=>{const a=s.answers[q.index],state=q.answer==='X'?'cancelled':answerState(q,a),fill=j===1?(l.missing||state==='blank'||state==='cancelled'?C.pale:state==='correct'?C.green:C.red):'#ffffff';doc.rect(L+labelW+i*cw,y,cw,9).fillAndStroke(fill,C.line);const val=j===0?q.number:j===1?(l.missing?'—':a||'-'):q.answer;tx(val,L+labelW+i*cw+1,y+1,cw-2,6.5,j===1);if(j===1&&!l.missing){const mx=L+labelW+(i+1)*cw-3;doc.save().lineWidth(.5).strokeColor(C.ink);if(state==='correct')doc.moveTo(mx-2,y+7).lineTo(mx-1,y+8).lineTo(mx+1,y+5).stroke();if(state==='wrong')doc.moveTo(mx-1,y+6).lineTo(mx+1,y+8).moveTo(mx+1,y+6).lineTo(mx-1,y+8).stroke();doc.restore();}});y+=9;});y+=3;}}
  y=Math.max(y,focusTop);ensure(12);tx('D: doğru (+) · Y: yanlış (×) · B: boş (-) · H: tümü doğru · X: iptal. Cevaplar ortak A sırasındadır.',L,y,W,7);y+=12;for(const label of remainingFocus){page(true);y=heading('Öncelikli Kazanımlar · Devam');let rest=label;while(rest){const available=bottom-y-6;let lo=0,hi=rest.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(ht(rest.slice(0,mid),W-16,8)<=available)lo=mid;else hi=mid-1;}const part=rest.slice(0,lo);tx(part,L+8,y,W-16,8);y+=ht(part,W-16,8)+6;rest=rest.slice(lo);if(rest)page(true);}}
 }
 function details(s:any){
  page();y=heading('Derslere Göre Kazanım Analizi');tx('Aynı ders ve açıklamadaki kazanımlar birlikte hesaplanır; bütün kaynak kodları gösterilir.',L,y,W,7);y+=14;const os=outcomes(s),r=view.summary.find((v:any)=>v.id===s.id);
  // Use two measured columns for dense, ordinary exams, preserving readable 7.5 pt text.
  const dense=os.length>=30,dw=dense?(W-12)/2:W,startY=y,font=dense?7.5:8;
  let plannedSplit=-1;
  if(dense){const blocks=r.lessons.map((l:any)=>45+6+os.filter(o=>o.lesson===l.lesson).reduce((sum:number,o:any)=>sum+Math.max(13,ht(o.name,dw*.62-8,font)+3),0));let best=Infinity;for(let i=1;i<blocks.length;i++){const left=blocks.slice(0,i).reduce((a:number,b:number)=>a+b,0),right=blocks.slice(i).reduce((a:number,b:number)=>a+b,0);if(Math.max(left,right)<=bottom-startY&&Math.abs(left-right)<best){best=Math.abs(left-right);plannedSplit=i;}}}
  let colIndex=0,dx=L,ci=0;
  function advance(){if(dense&&colIndex===0){colIndex=1;dx=L+dw+12;y=startY;}else{page(true);y=heading('Derslere Göre Kazanım Analizi · Devam');colIndex=0;dx=L;}}
  for(const l of r.lessons){if(ci===plannedSplit&&colIndex===0)advance();const color=palette[ci++%palette.length],items=os.filter(o=>o.lesson===l.lesson),count=l.correct+l.wrong+l.blank,widths=dense?[.62,.1,.07,.07,.07,.07]:[.68,.08,.06,.06,.06,.06];
   const title=()=>{box(dx,y,dw,dense?32:23,color);tx(l.lesson,dx+8,y+5,dense?dw-16:235,dense?9:11,true);const stats=l.missing?'Oturum yok / değerlendirilmedi.':`D: ${l.correct}   Y: ${l.wrong}   B: ${l.blank}   Başarı: %${n(Math.max(0,100*l.net/Math.max(1,count)),0)}`;tx(stats,dense?dx+8:dx+250,dense?y+20:y+7,dense?dw-16:dw-260,dense?7:8,true);y+=dense?32:23;y+=row(['Kazanım','Soru','D','Y','B','%'],widths,dx,y,dw,false,7,13,3);};
   if(y+64>bottom)advance();title();
   if(!items.length)y+=row([l.missing?'Oturum yok / ders okunamadı; değerlendirilmedi.':'Bu dersin anahtarında kazanım verisi bulunmuyor.','—','—','—','—','—'],widths,dx,y,dw,false,font,13,3);
   for(const o of items){let remaining=o.name;while(remaining){const tw=dw*widths[0]-8;let h=Math.max(13,ht(remaining,tw,font)+3);if(y+h>bottom&&y>startY+50){advance();title();}const available=bottom-y-3;let part=remaining;
     if(ht(part,tw,font)>available){let lo=0,hi=part.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(ht(part.slice(0,mid),tw,font)<=available)lo=mid;else hi=mid-1;}const split=part.lastIndexOf(' ',lo);part=part.slice(0,split>lo/2?split:lo);if(!part){advance();title();continue;}}
     h=row([part,o.count,o.correct,o.wrong,o.blank,''],widths,dx,y,dw,false,font,13,3);const offset=widths.slice(0,-1).reduce((a,b)=>a+b,0);badge(100*o.correct/o.count,dx+dw*offset+1,y+1,dw*widths.at(-1)!-3);y+=h;remaining=remaining.slice(part.length).trimStart();if(remaining){advance();title();}
   }}y+=dense?6:10;
  }
 }

 try{for(const s of selectedStudents(view,options)){current=s;const start=pageCount;summary(s);if(options.templateId!=='summary-card')details(s);const total=pageCount-start;for(let i=0;i<total;i++){doc.switchToPage(start+i);doc.moveTo(L,808).lineTo(L+W,808).strokeColor(C.line).stroke();tx('kurumsalsinav.com',L+5,811,160,8);tx(`${i+1}/${total}`,L+W-40,811,35,8,true);}doc.switchToPage(pageCount-1);}}
 catch(error){doc.end();reject(error);return;}doc.end();
});}
