import express from 'express';
import {z} from 'zod';
import {requireAuth,type AuthenticatedRequest} from './auth';
import {RequestLimiter} from './rate-limit';
export const memberActivityRouter=express.Router();
export const activitySections=['export-center','backup-center','reevaluate','welcome','exam','results','result-editor','exam-records','fmt-share','fmt-download','fmt-upload','txt-converter','school-add','students','publishers','answer-keys','account','calendar','rebuilder','pdf-tools','system-users','dealers','store','audit-logs','search-history','student-codes','system-center','test-center','blog','files','publisher-logos','contact-inbox','dealer-activities','exam-schedule','bulk-exams','share-links'] as const;
memberActivityRouter.post('/api/activity/navigation',requireAuth,new RequestLimiter(60,60_000,10000,'member-navigation').middleware(q=>(q as AuthenticatedRequest).user!.id),async(q:AuthenticatedRequest,r,n)=>{
 const input=z.object({section:z.enum(activitySections)}).strict().safeParse(q.body);if(!input.success){r.status(400).json({error:'Bölüm bildirimi geçersiz.'});return;}
 // Ordinary navigation is neither an authoritative action nor a durable audit event.
 r.status(204).end();
});
