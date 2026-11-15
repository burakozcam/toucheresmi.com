const {norm,answer,lessonName,basic,validateMapping,sourceRow}=require('./common');
// Original O8126 workbook: answers in two side-by-side groups, outcomes and
// explicit A -> B mapping on separate sheets. Never match by filename alone.
function locate(sheets){
 const keys=sheets.find(s=>s.rows[0]?.some(v=>/ÖZDEBİR/.test(norm(v)))&&s.rows[1]?.filter(v=>norm(v)==='TÜRKÇE').length===2);
 const outcomes=sheets.find(s=>['KOD','BRANŞ','SORU NO','A KİTAPÇIĞI'].every((v,i)=>norm(s.rows[0]?.[i])===v));
 const cross=sheets.find(s=>norm(s.rows[1]?.[1])==='A'&&norm(s.rows[1]?.[2])==='B'&&norm(s.rows[1]?.[3])==='A CA');
 return keys&&outcomes&&cross?{keys,outcomes,cross}:null;
}
function parse(sheets){
 const {keys,outcomes,cross}=locate(sheets),issues=[],questions=[];
 const outcomeMap=new Map(),mapping=new Map();
 for(const row of outcomes.rows.slice(1)){const id=`${lessonName(row[1])}:${Number(row[2])}`;if(outcomeMap.has(id))issues.push(`Yinelenen kazanım: ${id}`);outcomeMap.set(id,{outcomeCode:String(row[0]??''),outcomeName:String(row[3]??'')});}
 let lesson='';for(const row of cross.rows.slice(3)){
  if(String(row[0]??'').trim())lesson=lessonName(row[0]);if(!row[1])continue;
  const id=`${lesson}:${Number(row[1])}`;if(mapping.has(id))issues.push(`Yinelenen çapraz: ${id}`);mapping.set(id,{b:Number(row[2]),answer:answer(row[3])});
 }
 const cols=keys.rows[1].flatMap((v,i)=>String(v??'').trim()?[{lesson:lessonName(v),index:i}]:[]);
 const aCols=cols.filter(c=>c.index<13),bCols=cols.filter(c=>c.index>=13);
 for(const c of aCols){const b=bCols.find(v=>v.lesson===c.lesson);if(!b){issues.push(`${c.lesson}: B cevap sütunu yok.`);continue;}
  const bAnswers=new Map(keys.rows.slice(2).filter(r=>r[b.index]).map(r=>[Number(r[b.index]),answer(r[b.index+1])]));
  for(const [i,row]of keys.rows.entries()){
   if(i<2||!row[c.index])continue;const number=Number(row[c.index]),id=`${c.lesson}:${number}`,m=mapping.get(id);
   const q={lesson:c.lesson,number,answer:answer(row[c.index+1]),positions:{A:number,...(m?{B:m.b}:{})},weight:null,...(outcomeMap.get(id)??{outcomeCode:'',outcomeName:''}),source:sourceRow('general',keys,i)};
   if(!m)issues.push(`${id}: A/B çaprazı eksik.`);
   else if(q.answer!==m.answer||(!/[HX]/.test(q.answer)&&bAnswers.get(m.b)!==q.answer))issues.push(`${id}: cevap ile A/B çaprazı çelişiyor.`);
   try{basic(q,id);}catch(e){issues.push(e.message);}questions.push(q);
  }
 }
 try{validateMapping(questions);}catch(e){issues.push(e.message);}
 if(questions.length!==90||aCols.length!==6||mapping.size!==90||outcomeMap.size!==90)issues.push('Özdebir LGS kaynağında 90 soru, altı ders, kazanım ve A/B çaprazları eksiksiz olmalı.');
 return {format:'standard',questions,issues,warnings:['Özdebir özgün üç sekmeli Excel tanındı; A/B çaprazları ayrı cevap sütunlarıyla doğrulandı. İptal/herkese doğru kararlarını sınavın güncel duyurusuyla kontrol edin.'],publisher:'ÖZDEBİR',examName:String(keys.rows[0][0]).replace(/\s*\(A GRUBU\)\s*/,'').trim(),grade:8};
}
module.exports={locate,parse};
