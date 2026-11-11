// Entirely synthetic independent acceptance exam. No real student data.
import type {OpticalQuestion} from "../../apps/api/src/optical-core";
import {encodeTxt} from "../../apps/api/src/txt-converter";
const definitions=[['TÜRKÇE','ABCD',2],['SOSYAL','ABC',1],['DİN','AB',1],['İNGİLİZCE','AB',1],['MATEMATİK','ABCD',3],['FEN','ABC',2]] as const;
export const oracleQuestions:OpticalQuestion[]=definitions.flatMap(([lesson,key,weight])=>[...key].map((answer,i)=>({lesson,number:i+1,answer,weight,positions:{A:i+1,B:key.length-i},outcomeCode:`${lesson}-${i+1}`,outcomeName:`${lesson} anonim örnek kazanımı ${i+1}`})));
const partial=['AB D','ACC',' B','BA','ABCD','A C'];
export function oracleLine(no:number,book:'A'|'B',answers:string[],session?:'verbal'|'numeric'){
 const chars=Array<string>(171).fill(' '),put=(start:number,length:number,value:string)=>{if(value.length>length)throw Error('Test field overflow');[...value.padEnd(length)].forEach((c,i)=>chars[start-1+i]=c);};
 put(1,4,'7108');put(11,5,String(no).padStart(5,'0'));put(16,10,no===101?'ÇAĞRI':'ÖRNEK');put(26,10,`TEST ${no}`);put(36,1,'8');put(37,1,no===102?'B':'A');put(38,11,'TEST'+String(no).padStart(7,'0'));put(51,1,book);
 // Fixed positions transcribed from the original FMT, independent of the parser layout.
 [52,72,92,112,132,152].forEach((start,i)=>{if(session==='verbal'&&i>=4||session==='numeric'&&i<4)return;const value=answers[i]??'';put(start,20,book==='B'?[...value].reverse().join(''):value);});return chars.join('');
}
export const oracleTxt=[oracleLine(101,'A',partial,'verbal'),oracleLine(101,'B',partial,'numeric'),oracleLine(102,'B',definitions.map(d=>d[1])),oracleLine(103,'A',definitions.map(d=>' '.repeat(d[1].length))),oracleLine(104,'A',partial)].join('\r\n')+'\r\n';
export const oracleBytes=encodeTxt(oracleTxt,'windows-1254');
// Calculated by hand: max weighted = 33; partial = 12 D, 3 Y, 3 B,
// net = 12 - 3/3 = 11; weighted net = 24; score = 24/33*500.
export const oracleExpected={
 '00101':{correct:12,wrong:3,blank:3,net:11,weighted:24,score:4000/11,rank:2},
 '00102':{correct:18,wrong:0,blank:0,net:18,weighted:33,score:500,rank:1},
 '00103':{correct:0,wrong:0,blank:18,net:0,weighted:0,score:0,rank:4},
 '00104':{correct:12,wrong:3,blank:3,net:11,weighted:24,score:4000/11,rank:2},
} as const;
