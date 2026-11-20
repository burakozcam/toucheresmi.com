import crypto from 'node:crypto';
import {canonicalJson} from './canonical-json';
import {opticalQuestionsSchema} from './optical-core';
import type {Prisma} from '@prisma/client';
import {keyFingerprint} from './optical-review';
import {describeKeyChanges} from '../lib/key-changes';
import {SecurityError} from './security-errors';
export function revisionFingerprint(questions:unknown,penalty:number){try{return keyFingerprint(questions,penalty);}catch{return crypto.createHash('sha256').update('legacy:'+canonicalJson({questions,penalty})).digest('hex');}}
export async function recordKeyRevision(tx:Prisma.TransactionClient,current:{id:string;questions:unknown;penalty:number},next:{questions:unknown;penalty:number},actor:string,reason:string){
 const oldFingerprint=revisionFingerprint(current.questions,current.penalty),newFingerprint=keyFingerprint(next.questions,next.penalty);
 if(oldFingerprint===newFingerprint)return;
 const parsed=opticalQuestionsSchema.safeParse(current.questions),summary=parsed.success?describeKeyChanges(parsed.data,next.questions as any[],current.penalty,next.penalty):{changes:['Önceki eksik / eski anahtar yapısı doğrulanmış sorularla güncellendi.'],affectsScoring:true};
 await tx.auditLog.create({data:{actorUserId:actor,actorName:actor,action:'ANSWER_KEY_REVISION',targetType:'OpticalKey',targetId:current.id,summary:JSON.stringify({schemaVersion:1,oldFingerprint,newFingerprint,reason,...summary,before:{questions:current.questions,penalty:current.penalty},after:next})}});
}
export function requireKeyConfirmation(hasResults:boolean,confirmation?:string,reason?:string){if(hasResults&&(confirmation!=='ONAYLA'||!reason?.trim()||reason.trim().length<5))throw new SecurityError(400,'Değerlendirilmiş sınav için değişiklik gerekçesini yazın ve ONAYLA girin.');}
