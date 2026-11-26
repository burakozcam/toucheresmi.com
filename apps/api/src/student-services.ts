import {prisma} from './db';
import {studentExam,studentInsights} from './student-insights';
import {resultStudent} from './reader-core';
import {isDeleted,mergeStudentData,snapshotFingerprint} from './result-data';
import {opticalSummary} from './optical-core';
import {SecurityError} from './security-errors';
import {assistantReply} from './student-assistant';
import {z} from 'zod';
import type {Snapshot} from './optical-review';

export const assistantInput=z.object({message:z.string().trim().min(1).max(500),context:z.object({intent:z.enum(['latest','score','highest','lowest','net','wrong','blank','correct','compare','bestLesson','decline','outcomes','analysis','results','report','announcements','help','greeting','assignment','status','files','study','thanks','farewell','wellbeing','totals']).optional(),examId:z.string().max(100).optional(),lesson:z.string().max(80).optional()}).strict().optional()}).strict();
export async function accountInsights(userId:string){
 // Select lightweight grants first. Snapshot JSON is loaded only for candidate exam groups.
 const access=await prisma.studentResultAccess.findMany({where:{userId,result:{studentPublished:true,nextRevision:null,school:{active:true}}},select:{id:true,studentNo:true,result:{select:{id:true,keyId:true,createdAt:true}}},orderBy:[{result:{createdAt:'desc'}},{id:'asc'}],take:100});
 const seen=new Set<string>(),exams=[];
 for(const candidate of access){if(seen.has(candidate.result.keyId))continue;seen.add(candidate.result.keyId);
 const grants=access.filter(a=>a.result.keyId===candidate.result.keyId),rows=await prisma.opticalResult.findMany({where:{id:{in:grants.map(a=>a.result.id)},studentPublished:true,nextRevision:null,school:{active:true}},select:{id:true,snapshot:true,createdAt:true},orderBy:{createdAt:'asc'}});
 let combined:Snapshot|undefined;
 for(const row of rows){if(isDeleted(row.snapshot))continue;const grant=grants.find(g=>g.result.id===row.id)!,snapshot=row.snapshot as unknown as Snapshot,own=resultStudent(snapshot,grant.studentNo) as Snapshot['data']['students'][number],data={...snapshot.data,students:[own]};
 if(combined){if(snapshotFingerprint(combined)!==snapshotFingerprint(snapshot))throw new SecurityError(409,'Sınav yüklemeleri farklı anahtar sürümlerinde; kurumunuzdan kontrol isteyin.');const merged=mergeStudentData(combined.data,data);combined={...snapshot,data:merged,summary:opticalSummary(merged,snapshot.penalty)};}else combined={...snapshot,data,summary:opticalSummary(data,snapshot.penalty)};}
 if(!combined)continue;if(combined.data.students.length!==1)throw new SecurityError(409,'Öğrenci bağlantıları tutarlı değil; kurumunuzdan kontrol isteyin.');
 exams.push(studentExam(combined,combined.data.students[0].id,candidate.id,candidate.result.createdAt));if(exams.length===5)break;
 }
 return studentInsights(exams);
}
/** Mirrors Announcement Center's date/source rules; role targets never become public to students. */
export async function studentAnnouncements(schoolId:string|null|undefined,userId?:string){
 const now=new Date();return prisma.announcement.findMany({where:{AND:[{state:'ACTIVE',startsAt:{lte:now},OR:[{endsAt:null},{endsAt:{gt:now}}]},{OR:[{audience:'ALL'},...(schoolId?[{audience:'SCHOOL_IDS',targets:{some:{targetId:schoolId}}}]:[]),...(userId?[{audience:'USER_IDS',targets:{some:{targetId:userId}}}]:[])]},{OR:[{source:{not:'ANSWER_KEY'}},{publication:{published:true,publishedAt:{lte:now},publisher:{active:true},OR:[{opticalKey:{active:true}},{files:{some:{category:'ANSWER_KEY'}}}]}}]}]},select:{id:true,title:true,summary:true},orderBy:[{pinned:'desc'},{priority:'desc'},{startsAt:'desc'}],take:5});
}
export function respondToStudent(input:unknown,insights:ReturnType<typeof studentInsights>,announcements:Awaited<ReturnType<typeof studentAnnouncements>>,activity:Parameters<typeof assistantReply>[4]={}){
 const {message,context}=assistantInput.parse(input);
 if(context?.examId&&!insights.exams.some(e=>e.id===context.examId))throw new SecurityError(404,'Bu sınav bağlamına erişim yok.');
 return assistantReply(message,insights,context,announcements,activity);
}
