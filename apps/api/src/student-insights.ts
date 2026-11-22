import {opticalSummary, type OpticalData} from './optical-core';
import {createHash} from 'node:crypto';
import type {Snapshot} from './optical-review';

export type StudentExam={id:string;name:string;date:string;scale:string;net:number;score:number|null;correct:number;wrong:number;blank:number;questionCount:number;lessons:ReturnType<typeof opticalSummary>[number]['lessons'];outcomes:{lesson:string;code:string;name:string;correct:number;wrong:number;blank:number;questions:number}[]};
/** The caller must resolve an explicit, published grant before calling. No peer data leaves this boundary. */
export function studentExam(snapshot:Snapshot,studentId:string,id:string,date:Date|string):StudentExam{
 const matches=snapshot.data.students.filter(s=>s.id===studentId);if(matches.length!==1)throw Error('Öğrenci sonucu tekil değil.');
 const student=matches[0],data:OpticalData={...snapshot.data,students:[student]},row=opticalSummary(data,snapshot.penalty)[0];
 const outcomes=new Map<string,StudentExam['outcomes'][number]>();
 snapshot.data.questions.forEach((q,i)=>{if(!/^[ABCDE]$/.test(q.answer)||student.missingLessons?.includes(q.lesson)||!(q.outcomeCode||q.outcomeName))return;
 const key=JSON.stringify([q.lesson,q.outcomeCode||'',q.outcomeName||'']),o=outcomes.get(key)??{lesson:q.lesson,code:q.outcomeCode||'',name:q.outcomeName||q.outcomeCode!,correct:0,wrong:0,blank:0,questions:0};
 const a=student.answers[i];o.questions++;if(a===q.answer)o.correct++;else if(!a||a==='*'&&q.multipleMark==='blank')o.blank++;else o.wrong++;outcomes.set(key,o);});
 const totals=row.lessons.reduce((a,l)=>({correct:a.correct+l.correct,wrong:a.wrong+l.wrong,blank:a.blank+l.blank}),{correct:0,wrong:0,blank:0});
 // Equal length alone cannot establish equal difficulty. Only identical measured content/rules permits a numerical comparison.
 const scale=createHash('sha256').update(JSON.stringify({penalty:snapshot.penalty,grade:snapshot.expectedGrade??null,questions:snapshot.data.questions.map(q=>[q.lesson,q.number,q.answer,q.weight,q.scoreBase,q.multipleMark,q.outcomeCode,q.outcomeName,q.optionCount])})).digest('hex');
 return{id,name:snapshot.keyName,date:new Date(date).toISOString(),scale,net:row.net,score:row.score,...totals,questionCount:totals.correct+totals.wrong+totals.blank,lessons:row.lessons,outcomes:[...outcomes.values()]};
}
export function welcomeHighlights(exams:{id:string;scale:string;score:number|null;net:number;questionCount:number}[]){
 const [latest]=exams;if(!latest?.scale||latest.score===null)return[];
 const previous=exams.slice(1).filter(e=>e.id!==latest.id&&e.scale===latest.scale&&e.score!==null),messages:string[]=[];
 if(previous.length&&previous.every(e=>latest.score!>e.score!+1e-8))messages.push(`Son beş uygun sonuç içinde aynı içerik ve kurallarda yeni puan rekorun: ${latest.score.toLocaleString('tr-TR',{maximumFractionDigits:2})}.`);
 const prior=exams[1];if(prior&&prior.id!==latest.id&&prior.scale===latest.scale&&prior.score!==null&&latest.questionCount>=5&&latest.net-prior.net>=Math.max(2,latest.questionCount*.15))messages.push(`Aynı içerikli önceki gözleme göre netin ${(latest.net-prior.net).toLocaleString('tr-TR',{maximumFractionDigits:2})} arttı. Çalışma koşulları da sonucu etkileyebilir.`);
 return messages;
}
export function studentInsights(input:StudentExam[]){
 const exams=[...input].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5),groups=new Map<string,{lesson:string;code:string;name:string;questions:number;correct:number;wrong:number;blank:number;examIds:string[];rates:number[];scales:string[]}>();
 for(const e of [...exams].reverse())for(const o of e.outcomes){const k=JSON.stringify([o.lesson,o.code,o.name]),g=groups.get(k)??{lesson:o.lesson,code:o.code,name:o.name,questions:0,correct:0,wrong:0,blank:0,examIds:[],rates:[],scales:[]};g.questions+=o.questions;g.correct+=o.correct;g.wrong+=o.wrong;g.blank+=o.blank;g.examIds.push(e.id);g.rates.push(o.correct/o.questions);g.scales.push(e.scale);groups.set(k,g);}
 const outcomes=[...groups.values()].map(g=>{const enough=g.questions>=5&&g.examIds.length>=2,rate=g.correct/g.questions;return{...g,success:100*rate,status:!enough?'insufficient':g.rates.length>=3&&new Set(g.scales).size===1&&g.rates.at(-1)!-g.rates[0]>=.2?'improving':rate>=.8?'strong':g.rates.filter(r=>r<.5).length>=2?'repeat':'practice',evidence:`${g.examIds.length} sınavdaki ${g.questions} ilgili soru`,note:'Kazanım oranları betimseldir; sınavların zorluk eşdeğerliği doğrulanmamıştır.'};});
 const warnings:string[]=[];
 if(exams.length<2)warnings.push('Gelişim yorumu için en az iki yayımlanmış sınav gerekir.');
 const [latest,previous]=exams;const comparable=!!latest&&!!previous&&latest.scale===previous.scale;
 if(latest&&previous&&!comparable)warnings.push('Son iki sınavın ölçme eşdeğerliği doğrulanmadı. Net/puan farkından gelişim veya gerileme sonucu çıkarılmadı.');
 if(comparable){for(const l of latest.lessons){const p=previous.lessons.find(v=>v.lesson===l.lesson);if(!p||p.missing||l.missing||p.net===null||l.net===null)continue;const count=l.correct+l.wrong+l.blank;if(count>=5&&p.net-l.net>=Math.max(2,count*.15))warnings.push(`${l.lesson}: aynı içerik ve kurallarla net düşüşü gözlendi; tekrar ve çalışma koşullarını inceleyebilirsin.`);}if(latest.blank-previous.blank>=Math.max(3,latest.questionCount*.1))warnings.push('Boş sayısında artış gözlendi; süre kullanımını gözden geçirebilirsin.');}
 if(exams.length>=3&&exams.slice(0,3).every(e=>e.scale===exams[0].scale))for(const l of exams[0].lessons){const history=exams.slice(0,3).map(e=>e.lessons.find(v=>v.lesson===l.lesson));if(history.every(v=>v&&!v.missing&&v.net!==null&&v.correct+v.wrong+v.blank>=5)&&history[0]!.net!<history[1]!.net!&&history[1]!.net!<history[2]!.net!&&history[2]!.net!-history[0]!.net!>=2)warnings.push(`${l.lesson}: aynı içerikli son üç gözlemde süregelen düşüş; çalışma koşullarını ve tekrar planını gözden geçirebilirsin.`);}
 for(const o of outcomes.filter(o=>o.status==='repeat'))warnings.push(`${o.lesson} / ${o.name}: ${o.evidence} üzerinden tekrar önerisi. Bu bir akademik teşhis değildir.`);
 return{exams,outcomes,warnings,comparable,highlights:welcomeHighlights(exams),evidence:{examCount:exams.length,questionCount:exams.reduce((n,e)=>n+e.questionCount,0),from:exams.at(-1)?.date??null,to:exams[0]?.date??null,dateMeaning:'Yayımlanmış sonuç kayıt tarihi'},comparisonNote:'Farklı sınavlar bağımsız gözlemlerdir. Yalnız aynı soru içeriği ve değerlendirme kuralı olan sonuçlar karşılaştırılır; kazanım değişimi tek başına gelişim kanıtı sayılmaz.'};
}
export type Insights=ReturnType<typeof studentInsights>;
