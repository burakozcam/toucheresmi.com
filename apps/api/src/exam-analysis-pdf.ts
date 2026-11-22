import {reportFonts} from './report-resources';
import type {ExamQuality} from './exam-quality';
const PDFDocument=require('pdfkit');
/** Anonymous DTO only: no snapshot, school, actor, or student metadata accepted. */
export function examAnalysisPdf(data:ExamQuality):Promise<Buffer>{return new Promise((resolve,reject)=>{
 const doc=new PDFDocument({size:'A4',margin:38,autoFirstPage:false,info:{Title:'Sınav Genel Analizi',Author:'KurumsalSınav'}}),chunks:Buffer[]=[];doc.on('data',(b:Buffer)=>chunks.push(b));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
 const fonts=reportFonts();doc.registerFont('R',fonts.regular);doc.registerFont('B',fonts.bold);let y=0,page=0;
 const text=(s:string,bold=false,size=9)=>{doc.font(bold?'B':'R').fontSize(size);const h=doc.heightOfString(s,{width:519});if(y+h>775)next();doc.fillColor('#163454').text(s,38,y,{width:519});y+=h+9;};
 function next(){doc.addPage();page++;doc.font('B').fontSize(17).fillColor('#163454').text('Sınav Genel Analizi',38,35);doc.font('R').fontSize(8).text(`KurumsalSınav · Anonim toplu rapor · ${page}`,38,790,{width:519,lineBreak:false});y=72;}
 next();text(data.notice);if(!data.suppressed){text(`${data.studentCount} katılımcı · ${data.questions.length} soru`,true);text(`Güçlük dağılımı: ${data.quality.distribution.hard} zor / ${data.quality.distribution.medium} orta / ${data.quality.distribution.easy} kolay`);text(`KR-20: ${data.quality.kr20===null?'Yeterli veri veya varyans yok':data.quality.kr20.toFixed(3)} · Tam katılım: ${data.quality.psychometricCount}`);
 text('Hesaplama ve veri yeterliliği',true,12);for(const v of Object.values(data.methods))text(v);
 text('Soru analizi · Ortak A kitapçığı sırası',true,12);for(const q of data.questions){const choices=['A','B','C','D','E'].map(k=>`${k}: ${q.distribution[k]}`).join(' · ');text(`${q.lesson} / ${q.number} · Anahtar ${q.answer}\nDoğru ${q.correct} · Yanlış ${q.wrong} · Boş ${q.blank} · Başarı ${q.success===null?'—':q.success.toFixed(1)+'%'}\n${choices}\nAyırt edicilik: ${q.discrimination===null?'Yetersiz veri':q.discrimination.toFixed(3)}${q.flags.length?' · İnceleme: '+q.flags.join(', '):''}`);}
 text('Ders ve kazanım başarıları',true,12);for(const l of data.lessons)text(`${l.lesson} · Ortalama net ${l.meanNet?.toFixed(2)??'—'} · D/Y/B ${l.correct}/${l.wrong}/${l.blank}`);for(const o of data.outcomes)text(`${o.lesson} / ${o.code} ${o.name} · ${o.questionCount} soru · ${o.success?.toFixed(1)??'—'}%`);
 }doc.end();
});}
