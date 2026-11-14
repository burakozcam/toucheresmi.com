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
