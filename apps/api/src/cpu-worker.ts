import {reEvaluate} from './optical-review';
import {parentPort} from 'node:worker_threads';
import type {CpuJob} from './cpu-jobs';
import {inferFmt} from './fmt-inference';
import {evaluationReader} from './evaluation-reader';
import {matchExamAnswers} from './optical-exam-matching';
import {parseOptical,opticalSummary} from './optical-core';
import {mergeStudentData} from './result-data';
import {identityHash,encryptIdentity,studentNumberKey} from './result-identity';
import {SecurityError} from './security-errors';
parentPort!.on('message',(job:CpuJob)=>{
 try{
  let value:unknown;
  switch(job.kind){
   case 'reevaluate':value=reEvaluate(job.snapshot,job.questions,job.penalty);break;
   case 'readParse':{const reader=evaluationReader(job.text,job.selected,job.templates,job.options.missingBooklet),data=job.deferOnUnmatched&&reader.matched<job.text.split(/\r\n|\r|\n/).filter(l=>l.trim()).length?null:parseOptical(job.text,reader.layout,job.questions,job.school,{...job.options,hashIdentity:identityHash,encryptIdentity});value={reader,data};break;}
   case 'infer':value=inferFmt(job.text,job.templates);break;
   case 'reader':value=evaluationReader(job.text,job.selected,job.templates,job.missingBooklet);break;
   case 'match':value=matchExamAnswers(job.text,job.layout,job.questions);break;
   case 'parse':value=parseOptical(job.text,job.layout,job.questions,job.school,{...job.options,hashIdentity:identityHash,...(job.encrypt?{encryptIdentity}:{})});break;
   case 'summary':{const keys=new Set(job.replaceKeys),data=job.previous?mergeStudentData(job.previous,job.data,student=>job.preferIncoming===true||keys.has(student.identityHash??'')||keys.has(`${student.branch.split('-')[0]}:${studentNumberKey(student.studentNo??student.id)}`)):job.data;value={data,summary:opticalSummary(data,job.penalty)};break;}
  }
  parentPort!.postMessage({ok:true,value});
 }catch(error){const known=error instanceof SecurityError;parentPort!.postMessage({ok:false,status:known?error.status:422,code:known?error.code:'TXT_PROCESSING_FAILED',message:error instanceof Error?error.message:'TXT işlenemedi. Dosya ve FMT seçimini kontrol edin.'});}
});
