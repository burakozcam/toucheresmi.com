import express from 'express';
import {z} from 'zod';
import {prisma} from './db';
import {requireAuth,type AuthenticatedRequest} from './auth';
import {RequestLimiter} from './rate-limit';
export const memberActivityRouter=express.Router();
export const activitySections=['welcome','exam','results','result-editor','exam-records','fmt-share','fmt-download','fmt-upload','txt-converter','school-add','students','publishers','answer-keys','account','calendar','rebuilder','pdf-tools','system-users','dealers','store','audit-logs','search-history','student-codes','system-center','test-center','blog','files','publisher-logos','contact-inbox','dealer-activities','exam-schedule','bulk-exams','share-links'] as const;
memberActivityRouter.post('/api/activity/navigation',requireAuth,new RequestLimiter(60,60_000,10000,'member-navigation').middleware(q=>(q as AuthenticatedRequest).user!.id),async(q:AuthenticatedRequest,r,n)=>{
 const input=z.object({section:z.enum(activitySections)}).strict().safeParse(q.body);if(!input.success){r.status(400).json({error:'Bölüm bildirimi geçersiz.'});return;}
 try{await prisma.auditLog.create({data:{actorUserId:q.user!.actorAdminId??q.user!.id,actorName:q.user!.actorAdminId??q.user!.id,action:'CLIENT_NAVIGATION',targetType:'PanelSection',targetId:input.data.section,summary:'İstemci tarafından bildirilen gezinme; sunucuda işlem gerçekleştiğinin kanıtı değildir.'}});r.status(204).end();}catch(e){n(e);}
});
