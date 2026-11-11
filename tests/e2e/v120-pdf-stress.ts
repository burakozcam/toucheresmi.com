import fs from 'node:fs';
import {oracleBytes,oracleQuestions} from '../fixtures/v120-oracle';
import {decodeOptical,parseOptical,layout7108,opticalSummary} from '../../apps/api/src/optical-core';
process.env.DATABASE_URL='postgresql://test:test@127.0.0.1:1/test';process.env.JWT_SECRET='pdf-qa-only-secret-at-least-32-characters';
(async()=>{const {reportPdf}=await import('../../apps/api/src/result-pdf');const data=parseOptical(decodeOptical(oracleBytes),layout7108,oracleQuestions,'Anonim Okul');data.students=Array.from({length:150},(_,i)=>({...structuredClone(data.students[i%4]),id:`qa${i+1}`,studentNo:`Q${i+1}`,name:`Anonim Öğrenci ${i+1} ${i%7===0?'Uzun Ad Soyad Alanı İçin Sayfalama Denemesi':''}`}));
const scores=opticalSummary(data,3);const view:any={data,summary:scores,keyName:'150 Öğrencili Anonim Sayfalama Sınavı',schoolName:'Anonim Okul',penalty:3,generalCount:150,rankings:Object.fromEntries(data.students.map(s=>{const rank=1+scores.filter(v=>v.score>scores.find(v=>v.id===s.id)!.score+1e-8).length;return [s.id,{generalRank:rank,generalCount:150,schoolRank:rank,schoolCount:150,classRank:rank,classCount:150}];}))};
fs.writeFileSync('/tmp/ks-v120-stress-list.pdf',await reportPdf(view,{kind:'school',order:'name',hideIdentity:true,templateId:'school-table'}));
const long=structuredClone(data);long.students=long.students.slice(0,1);long.questions=long.questions.map((q,i)=>({...q,outcomeName:`Kazanım ${i+1}: `+'Uzun Türkçe kazanım açıklaması, düşünce ve yorumlama becerisi. '.repeat(12)}));
const detailed={...view,data:long,summary:opticalSummary(long,3)};fs.writeFileSync('/tmp/ks-v120-stress-card.pdf',await reportPdf(detailed,{kind:'cards',order:'name',hideIdentity:true,templateId:'detailed-card'}));})();
