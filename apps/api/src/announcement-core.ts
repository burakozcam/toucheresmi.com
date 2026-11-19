import {z} from 'zod';
export const categories=['SYSTEM','FMT','ANSWER_KEY','GENERAL','MAINTENANCE'] as const;
export const audiences=['ALL','ADMINS','DEALERS','DEALER_IDS','SCHOOL_IDS','USER_IDS'] as const;
export const sections=['welcome','exam','results','fmt-share','fmt-edit','answer-keys','calendar','pdf-tools','account','share-links'] as const;
export const week=7*86400_000;
export function announcementStatus(a:{state:string;startsAt:Date;endsAt:Date|null},now=new Date()){
 if(a.state!=='ACTIVE')return a.state;
 return a.startsAt>now?'SCHEDULED':a.endsAt&&a.endsAt<=now?'EXPIRED':'LIVE';
}
export const audienceInput=z.object({audience:z.enum(audiences).default('ALL'),targetIds:z.array(z.string().min(1).max(100)).max(200).default([])}).refine(v=>!v.audience.endsWith('_IDS')||v.targetIds.length>0,'En az bir hedef seçin.');
export const announcementInput=z.object({title:z.string().trim().min(3).max(180),summary:z.string().trim().min(3).max(360),content:z.string().trim().min(3).max(30000),category:z.enum(categories),startsAt:z.iso.datetime({offset:true}),endsAt:z.iso.datetime({offset:true}).nullable().optional(),durationDays:z.number().int().min(1).max(3650).default(7),unlimited:z.boolean().default(false),state:z.enum(['DRAFT','ACTIVE','INACTIVE','ARCHIVED']).default('ACTIVE'),priority:z.number().int().min(0).max(3).default(0),pinned:z.boolean().default(false),section:z.enum(sections).nullable().default(null),audience:z.enum(audiences).default('ALL'),targetIds:z.array(z.string().min(1).max(100)).max(200).default([])}).superRefine((v,c)=>{if(v.audience.endsWith('_IDS')&&!v.targetIds.length)c.addIssue({code:'custom',message:'En az bir hedef seçin.'});if(v.endsAt&&Date.parse(v.endsAt)<=Date.parse(v.startsAt))c.addIssue({code:'custom',message:'Bitiş başlangıçtan sonra olmalıdır.'});});
export function publicationWindow(v:{startsAt:string;endsAt?:string|null;durationDays:number;unlimited:boolean}){const startsAt=new Date(v.startsAt);return {startsAt,endsAt:v.unlimited?null:v.endsAt?new Date(v.endsAt):new Date(+startsAt+v.durationDays*86400_000)};}
