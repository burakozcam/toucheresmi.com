import profile from "../lib/ozdebir-profile.json";
import {lessonIdentity} from "../lib/evaluation-compatibility";
import type {OpticalQuestion} from "./optical-core";
/** Applied only while creating a key. Existing keys require an explicit editor action. */
export function newExamProfile(questions:OpticalQuestion[],publisher:string,grade:number,selected:{base:number;weights:Record<string,number>;multipleMark?:string}=profile){
 if(grade!==8||publisher.toLocaleUpperCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z]/g,"")!=="OZDEBIR")return questions;
 if(questions.some(q=>q.weight!==null||q.scoreBase!==undefined))return questions;
 const weights:Record<string,number>=selected.weights;
 if(questions.some(q=>weights[lessonIdentity(q.lesson)]===undefined))return questions;
 return questions.map(q=>({...q,weight:weights[lessonIdentity(q.lesson)],scoreBase:selected.base,multipleMark:selected.multipleMark==="blank"?"blank" as const:"wrong" as const}));
}

export async function configuredNewExamProfile(questions:OpticalQuestion[],publisher:string,grade:number){
 if(newExamProfile(questions,publisher,grade)===questions)return questions;
 const {prisma}=await import("./db");
 const selected=await prisma.scoreProfile.findFirst({where:{publisher:"OZDEBIR",grade:8,active:true},orderBy:{updatedAt:"desc"}});
 return newExamProfile(questions,publisher,grade,selected?{base:selected.base,multipleMark:selected.multipleMark,weights:selected.weights as Record<string,number>}:profile);
}

/** Batch defaults fill gaps only; supplied lesson coefficients and base are authoritative. */
export async function missingExamProfile(questions:OpticalQuestion[],publisher:string,grade:number){
 if(!questions.some(q=>q.weight===null))return questions;
 const {prisma}=await import('./db');const {locationKey}=await import('../lib/turkey-locations');
 const rows=await prisma.scoreProfile.findMany({where:{grade,active:true},orderBy:{updatedAt:'desc'}});
 const selected=rows.find(p=>locationKey(p.publisher)===locationKey(publisher))??(grade===8&&locationKey(publisher)==='OZDEBIR'?profile:null);
 if(!selected)throw new Error('Katsayı: bu yayınevi ve sınıfa uygun varsayılan profil yok; ayrıntılarda katsayı seçimi gerekli.');
 const weights=selected.weights as Record<string,number>,base=questions.find(q=>q.scoreBase!==undefined)?.scoreBase??selected.base;
 return questions.map(q=>{if(q.weight!==null)return {...q,scoreBase:q.scoreBase??base};const own=questions.find(v=>v.lesson===q.lesson&&v.weight!==null)?.weight,weight=own??weights[lessonIdentity(q.lesson)];if(!weight)throw new Error(`${q.lesson} / ${q.number}: varsayılan katsayı yok; seçim gerekli.`);return{...q,weight,scoreBase:q.scoreBase??base,multipleMark:q.multipleMark??(selected.multipleMark==='blank'?'blank' as const:'wrong' as const)};});
}
