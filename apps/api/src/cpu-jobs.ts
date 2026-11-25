import {acquireCpuLease} from './resource-admission';
import {Worker} from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import {SecurityError} from './security-errors';
import type {OpticalData,OpticalLayout,OpticalQuestion} from './optical-core';
import type {inferFmt} from './fmt-inference';
import type {evaluationReader} from './evaluation-reader';
import type {matchExamAnswers} from './optical-exam-matching';
import type {Snapshot} from './optical-review';
export type CpuJob=
 |{kind:'reevaluate';snapshot:Snapshot;questions:OpticalQuestion[];penalty:number}
 |{kind:'readParse';deferOnUnmatched?:boolean;text:string;selected:OpticalLayout;templates:Parameters<typeof evaluationReader>[2];questions:OpticalQuestion[];school:string;options:{missingBooklet?:'A'|'B'|'C'|'D';allowMismatch?:boolean;mergeSessions?:boolean}}
 |{kind:'infer';text:string;templates:Parameters<typeof inferFmt>[1]}
 |{kind:'reader';text:string;selected:OpticalLayout;templates:Parameters<typeof evaluationReader>[2];missingBooklet?:string}
 |{kind:'parse';text:string;layout:OpticalLayout;questions:OpticalQuestion[];school:string;options:{missingBooklet?:'A'|'B'|'C'|'D';allowMismatch?:boolean;mergeSessions?:boolean};encrypt:boolean}
 |{kind:'match';text:string;layout:OpticalLayout;questions:OpticalQuestion[]}
 |{kind:'summary';data:OpticalData;previous?:OpticalData;replaceKeys:string[];preferIncoming?:boolean;penalty:number};
// Bounded process-local pool. No Redis, background daemon, permanent queue or DB client.
// Workers are created lazily and terminated after idle time; Passenger may restart safely.
type Slot={worker:Worker;busy:boolean;idle?:ReturnType<typeof setTimeout>};
const slots:Slot[]=[];const maxWorkers=2;
export async function cpuJob<T=any>(job:CpuJob):Promise<T>{
 const releaseLease=acquireCpuLease();
 try {
 let slot=slots.find(s=>!s.busy);
 if(!slot){
  if(slots.length>=maxWorkers)throw new SecurityError(429,'Sunucuda iki ağır işlem sürüyor. Kısa süre sonra yeniden deneyin.','CPU_CAPACITY');
  const compiled=path.join(__dirname,'cpu-worker.js'),source=path.join(__dirname,'cpu-worker.ts'),worker=fs.existsSync(compiled)?new Worker(compiled,{resourceLimits:{maxOldGenerationSizeMb:256}}):new Worker(`require('tsx/cjs');require(${JSON.stringify(source)})`,{eval:true,resourceLimits:{maxOldGenerationSizeMb:256}});
  slot={worker,busy:false};slots.push(slot);worker.on('error',()=>remove(slot!));worker.on('exit',()=>remove(slot!));
 }
 const chosen=slot;chosen.busy=true;if(chosen.idle)clearTimeout(chosen.idle);
 return await new Promise<T>((resolve,reject)=>{
  let settled=false;
  const done=(error?:Error,value?:T)=>{if(settled)return;settled=true;clearTimeout(timer);chosen.worker.off('message',message);chosen.worker.off('error',failed);chosen.worker.off('exit',exited);chosen.busy=false;if(slots.includes(chosen)){chosen.idle=setTimeout(()=>{remove(chosen);void chosen.worker.terminate();},30_000);chosen.idle.unref();}if(error)reject(error);else resolve(value!);};
  const message=(m:any)=>m.ok?done(undefined,m.value):done(new SecurityError(m.status??422,m.message??'TXT işlemi tamamlanamadı. Dosya ve FMT seçimini kontrol edin.',m.code??'TXT_PROCESSING_FAILED'));
  const failed=()=>done(new SecurityError(503,'Değerlendirme işlemi kaynak sınırı nedeniyle durdu. Kayıt durumunu kontrol ederek yeniden deneyin.','CPU_WORKER_FAILED'));
  const exited=()=>failed();
  const timer=setTimeout(()=>{remove(chosen);void chosen.worker.terminate();done(new SecurityError(504,'Değerlendirme belirtilen süre içinde tamamlanamadı. Kayıt durumunu kontrol edin.','CPU_TIMEOUT'));},60_000);
  chosen.worker.once('message',message);chosen.worker.once('error',failed);chosen.worker.once('exit',exited);
  try{chosen.worker.postMessage(job);}catch{remove(chosen);void chosen.worker.terminate();failed();}
 });
 } finally { releaseLease(); }
}
function remove(slot:Slot){const i=slots.indexOf(slot);if(i>=0)slots.splice(i,1);if(slot.idle)clearTimeout(slot.idle);}
export const cpuInfer=(text:string,templates:Parameters<typeof inferFmt>[1])=>cpuJob<ReturnType<typeof inferFmt>>({kind:'infer',text,templates});
export const cpuReader=(text:string,selected:OpticalLayout,templates:Parameters<typeof evaluationReader>[2],missingBooklet?:string)=>cpuJob<ReturnType<typeof evaluationReader>>({kind:'reader',text,selected,templates,missingBooklet});
export const cpuMatch=(text:string,layout:OpticalLayout,questions:OpticalQuestion[])=>cpuJob<ReturnType<typeof matchExamAnswers>>({kind:'match',text,layout,questions});
export const cpuParse=(text:string,layout:OpticalLayout,questions:OpticalQuestion[],school:string,options:Extract<CpuJob,{kind:'parse'}>['options'],encrypt=true)=>cpuJob<OpticalData>({kind:'parse',text,layout,questions,school,options,encrypt});
