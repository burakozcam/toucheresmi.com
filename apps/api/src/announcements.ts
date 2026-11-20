import {importReleaseHistory} from './announcement-import';
import express from 'express';
import {Prisma,Role} from '@prisma/client';
import {z} from 'zod';
import {prisma} from './db';
import {requireAuth,type AuthenticatedRequest} from './auth';
import {SecurityError} from './security-errors';
import {announcementInput,announcementStatus,audienceInput,categories,publicationWindow,week} from './announcement-core';
export const announcementRouter=express.Router();
announcementRouter.use('/api/announcements',requireAuth,(q:AuthenticatedRequest,r,n)=>{r.setHeader('Cache-Control','private, no-store');if(![Role.SUPER_ADMIN,Role.DEALER].includes(q.user!.role as any)){r.status(403).json({error:'Panel yetkisi gerekir.'});return;}n();});
type Handler=(q:AuthenticatedRequest,r:express.Response)=>Promise<void>;
const wrap=(fn:Handler):express.RequestHandler=>async(q,r,n)=>{try{await fn(q as AuthenticatedRequest,r);}catch(e){if(e instanceof z.ZodError){r.status(400).json({error:e.issues[0]?.message??'Bilgileri kontrol edin.'});return;}n(e);}};
function admin(q:AuthenticatedRequest){if(q.user!.role!==Role.SUPER_ADMIN)throw new SecurityError(403,'Duyuru yönetimi için yönetici yetkisi gerekir.');}
async function targets(tx:Prisma.TransactionClient,audience:string,ids:string[]){
 const unique=[...new Set(ids)];if(!audience.endsWith('_IDS'))return [];
 const count=audience==='DEALER_IDS'?await tx.dealer.count({where:{id:{in:unique}}}):audience==='SCHOOL_IDS'?await tx.school.count({where:{id:{in:unique}}}):await tx.user.count({where:{id:{in:unique},role:{in:[Role.SUPER_ADMIN,Role.DEALER]}}});
 if(count!==unique.length)throw new SecurityError(400,'Hedeflerden biri bulunamadı veya panel kullanıcısı değil.');return unique;
}
async function visibility(q:AuthenticatedRequest,now:Date):Promise<Prisma.AnnouncementWhereInput>{
 const user=q.user!,schools=user.dealerId?await prisma.school.findMany({where:{dealerId:user.dealerId},select:{id:true}}):[];
 return {AND:[{OR:[{audience:'ALL'},{audience:user.role===Role.SUPER_ADMIN?'ADMINS':'DEALERS'},{audience:'USER_IDS',targets:{some:{targetId:user.id}}},...(user.dealerId?[{audience:'DEALER_IDS',targets:{some:{targetId:user.dealerId}}},{audience:'SCHOOL_IDS',targets:{some:{targetId:{in:schools.map(s=>s.id)}}}}]:[])]},{OR:[{source:{not:'ANSWER_KEY'}},{publication:{published:true,publishedAt:{lte:now},publisher:{active:true},OR:[{opticalKey:{active:true}},{files:{some:{category:'ANSWER_KEY'}}}]}}]}]};
}
const listSelect={id:true,title:true,summary:true,category:true,startsAt:true,endsAt:true,state:true,priority:true,pinned:true,section:true,source:true,releaseDate:true} as const;
announcementRouter.get('/api/announcements/settings',wrap(async(q,r)=>{admin(q);const rows=await prisma.announcementAutomation.findMany();r.json(['ANSWER_KEY','FMT','EXAM','RELEASE'].map(kind=>rows.find(x=>x.kind===kind)??{kind,enabled:kind==='ANSWER_KEY',audience:'ALL',targetIds:[]}));}));
announcementRouter.put('/api/announcements/settings/:kind',wrap(async(q,r)=>{admin(q);const kind=z.enum(['ANSWER_KEY','FMT','EXAM','RELEASE']).parse(q.params.kind),input=audienceInput.and(z.object({enabled:z.boolean()})).parse(q.body);await prisma.$transaction(async tx=>{await targets(tx,input.audience,input.targetIds);await tx.announcementAutomation.upsert({where:{kind},create:{kind,...input},update:input});await audit(tx,q,'AUTOMATION',kind);});r.json({ok:true});}));
announcementRouter.get('/api/announcements',wrap(async(q,r)=>{
 const input=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),search:z.string().max(100).default(''),category:z.enum(['',...categories]).default(''),view:z.enum(['current','history','manage']).default('current'),status:z.enum(['','DRAFT','SCHEDULED','INACTIVE','ARCHIVED','DELETED','EXPIRED','LIVE']).default('')}).parse(q.query),now=new Date();
 const manage=input.view==='manage';if(manage)admin(q);
 const where:Prisma.AnnouncementWhereInput={AND:[...(manage?[]:[await visibility(q,now)]),...(input.category?[{category:input.category}]:[]),...(input.search?[{OR:[{title:{contains:input.search,mode:'insensitive' as const}},{summary:{contains:input.search,mode:'insensitive' as const}}]}]:[])]};
 const states:Record<string,Prisma.AnnouncementWhereInput>={LIVE:{state:'ACTIVE',startsAt:{lte:now},OR:[{endsAt:null},{endsAt:{gt:now}}]},EXPIRED:{state:'ACTIVE',endsAt:{lte:now}},SCHEDULED:{state:'ACTIVE',startsAt:{gt:now}},DRAFT:{state:'DRAFT'},INACTIVE:{state:'INACTIVE'},ARCHIVED:{state:'ARCHIVED'},DELETED:{state:'DELETED'}};
 (where.AND as Prisma.AnnouncementWhereInput[]).push(manage?(input.status?states[input.status]:{}):input.view==='current'?states.LIVE:{OR:[{state:'ARCHIVED',startsAt:{lte:now}},states.EXPIRED]});
 const [rows,total]=await Promise.all([prisma.announcement.findMany({where,select:{...listSelect,...(manage?{audience:true,targets:true}:{}),reads:{where:{userId:q.user!.id},select:{readAt:true}}},orderBy:[{pinned:'desc'},{priority:'desc'},{startsAt:'desc'},{id:'desc'}],take:25,skip:(input.page-1)*25}),prisma.announcement.count({where})]);r.json({rows:rows.map(a=>({...a,status:announcementStatus(a,now),unread:input.view==='current'&&!a.reads.length,reads:undefined})),total,page:input.page});
}));
async function accessible(q:AuthenticatedRequest,id:string,manage=false){if(manage)admin(q);const now=new Date(),row=await prisma.announcement.findFirst({where:{id,...(manage?{}:{AND:[await visibility(q,now),{startsAt:{lte:now},state:{in:['ACTIVE','ARCHIVED']}}]})},include:{targets:true}});if(!row)throw new SecurityError(404,'Duyuru bulunamadı.');return row;}
announcementRouter.post('/api/announcements/releases/approve',wrap(async(q,r)=>{admin(q);const v=z.object({version:z.enum(['1.3.9','1.4.0']),confirm:z.literal(true)}).parse(q.body);const record=await prisma.$transaction(async tx=>{const setting=await tx.announcementAutomation.findUnique({where:{kind:'RELEASE'}});if(!setting?.enabled)throw new SecurityError(400,'Önce sürüm duyurularını etkinleştirin.');const record=await announceOptional(tx,'RELEASE',v.version,q.user!.id,{category:'SYSTEM',title:`KurumsalSınav v${v.version}`,summary:v.version==='1.4.0'?'Performans, Kullanıcı Deneyimi, Sınav Yönetimi ve Sistem Yönetimi Güncellemesi':'Duyuru merkezi, zamanlanmış paylaşımlar ve kullanım rehberleri.',content:v.version==='1.4.0'?'Benzersiz işlevleri anlatan rehber, ortak PDF araç kartları, kompakt FMT yönetimi ve yeni renk temaları. Optik cevap seçimi, Excel aktarımı, anahtar değişiklik özeti ve toplu sonuç revizyonu. Dışa Aktarım Merkezi ve doğrulanmış arşivle log bakımı. Yedekleme ve Sürüm Kurtarma Merkezi yalnız hazırlık sayfasıdır; otomatik yedekleme veya geri yükleme sunmaz.':'Panel duyurularını tek merkezden takip edebilir, paylaşımlarınız için yayın zamanı belirleyebilir ve işlem ekranlarındaki yardım merkezini açabilirsiniz.',startsAt:new Date(),section:'welcome'});await audit(tx,q,'RELEASE_APPROVAL',v.version);return record;});r.json({ok:true,status:record?announcementStatus(record):'INACTIVE'});}));
announcementRouter.post('/api/announcements/history/import',wrap(async(q,r)=>{
 admin(q);z.object({confirm:z.literal(true)}).parse(q.body);
 const result=await importReleaseHistory(async h=>{
  try{await prisma.$transaction(async tx=>{
   await tx.announcement.create({data:{title:`KurumsalSınav v${h.version}`,summary:h.summary,content:h.content,category:'SYSTEM',state:'ARCHIVED',source:'RELEASE',sourceEvent:`release:${h.version}`,createdById:q.user!.id,startsAt:new Date(0),endsAt:new Date(1),releaseDate:null}});
   await audit(tx,q,'HISTORY_IMPORT',`release:${h.version}`);
  });return true;}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')return false;throw e;}
 });r.json(result);
}));
announcementRouter.get('/api/announcements/:id',wrap(async(q,r)=>{const a=await accessible(q,String(q.params.id),q.query.manage==='true');r.json({...Object.fromEntries(Object.keys(listSelect).map(k=>[k,(a as any)[k]])),content:a.content,status:announcementStatus(a),...(q.query.manage==='true'?{audience:a.audience,targetIds:a.targets.map(t=>t.targetId)}:{})});}));
announcementRouter.post('/api/announcements/:id/read',wrap(async(q,r)=>{const a=await accessible(q,String(q.params.id));await prisma.announcementRead.upsert({where:{announcementId_userId:{announcementId:a.id,userId:q.user!.id}},create:{announcementId:a.id,userId:q.user!.id},update:{}});r.json({ok:true});}));
async function audit(tx:Prisma.TransactionClient,q:AuthenticatedRequest,action:string,id:string){await tx.auditLog.create({data:{actorUserId:q.user!.id,actorName:q.user!.id,action:`ANNOUNCEMENT_${action}`,targetType:'Announcement',targetId:id,summary:'Duyuru yönetimi'}});}
for(const edit of [false,true])announcementRouter[edit?'put':'post'](`/api/announcements${edit?'/:id':''}`,wrap(async(q,r)=>{admin(q);const v=announcementInput.parse(q.body),{targetIds,durationDays,unlimited,...data}=v;const row=await prisma.$transaction(async tx=>{const ids=await targets(tx,v.audience,targetIds),record=edit?await tx.announcement.update({where:{id:String(q.params.id)},data:{...data,...publicationWindow(v),targets:{deleteMany:{},create:ids.map(targetId=>({targetId}))}}}):await tx.announcement.create({data:{...data,...publicationWindow(v),createdById:q.user!.id,targets:{create:ids.map(targetId=>({targetId}))}}});await audit(tx,q,edit?'EDIT':'CREATE',record.id);return record;});r.status(edit?200:201).json({id:row.id});}));
announcementRouter.post('/api/announcements/:id/action',wrap(async(q,r)=>{admin(q);const v=z.object({action:z.enum(['deactivate','activate','end','republish','archive','delete','restore','pin','unpin']),confirm:z.boolean().optional()}).parse(q.body);if(v.action==='delete'&&!v.confirm)throw new SecurityError(400,'Silme işlemini onaylayın.');await prisma.$transaction(async tx=>{const id=String(q.params.id),now=new Date();await tx.announcement.update({where:{id},data:v.action==='republish'?{state:'ACTIVE',startsAt:now,endsAt:new Date(+now+week)}:v.action==='end'?{state:'ARCHIVED',endsAt:now}:v.action==='pin'||v.action==='unpin'?{pinned:v.action==='pin'}:{state:({deactivate:'INACTIVE',activate:'ACTIVE',archive:'ARCHIVED',delete:'DELETED',restore:'INACTIVE'} as any)[v.action]}});await audit(tx,q,v.action.toUpperCase(),id);});r.json({ok:true});}));

/** Called inside the publication transaction. A tombstone's unique event is retained. */
export async function announceAnswerKey(tx:Prisma.TransactionClient,id:string){
 const p=await tx.publishedAnswerKey.findUnique({where:{id},include:{publisher:true,opticalKey:true,_count:{select:{files:{where:{category:'ANSWER_KEY'}}}}}});if(!p?.published||!p.publisher.active||!p.opticalKey?.active&&!p._count.files)return;
 const startsAt=new Date(Math.max(+p.publishedAt,Date.now())),sourceEvent=`answer-key:${id}`,summary=`${p.publisher.name} · ${p.grade}. Sınıf · ${p.examName}`;
 await announceOptional(tx,'EXAM',id,p.createdByUserId,{title:'Yeni sınav yayımlandı',summary,content:`${summary}\nYeni sınavı cevap anahtarları ekranında inceleyebilirsiniz.`,category:'GENERAL',startsAt,publicationId:id,section:'answer-keys'});
 const setting=await tx.announcementAutomation.findUnique({where:{kind:'ANSWER_KEY'}});if(setting&&!setting.enabled)return;
 await tx.announcement.upsert({where:{sourceEvent},update:{},create:{category:'ANSWER_KEY',title:'Yeni cevap anahtarı eklendi',summary,content:`${summary}\n${p.showInEvaluation&&p.opticalKey?.active?'Cevap anahtarı değerlendirmeye hazır.':'Cevap anahtarı yayımlandı.'}`,startsAt,endsAt:new Date(+startsAt+week),source:'ANSWER_KEY',sourceEvent,publicationId:id,createdById:p.createdByUserId,audience:setting?.audience??'ALL',section:p.showInEvaluation&&p.opticalKey?.active?'exam':'answer-keys',targets:{create:(setting?.targetIds??[]).map(targetId=>({targetId}))}}});

}

async function announceOptional(tx:Prisma.TransactionClient,kind:string,id:string,actor:string,data:{title:string;summary:string;content:string;category:string;startsAt:Date;publicationId?:string;section:string}){
 const setting=await tx.announcementAutomation.findUnique({where:{kind}});if(!setting?.enabled)return;
 return await tx.announcement.upsert({where:{sourceEvent:`${kind.toLowerCase()}:${id}`},update:{},create:{...data,endsAt:new Date(+data.startsAt+week),createdById:actor,source:kind==='EXAM'?'ANSWER_KEY':kind,sourceEvent:`${kind.toLowerCase()}:${id}`,audience:setting.audience,targets:{create:setting.targetIds.map(targetId=>({targetId}))}}});
}
export async function announceFmt(tx:Prisma.TransactionClient,id:string,actor:string){const setting=await tx.announcementAutomation.findUnique({where:{kind:'FMT'}});if(!setting?.enabled)return;const fmt=await tx.opticalTemplate.findUnique({where:{id},select:{name:true,active:true}});if(!fmt?.active)return;await announceOptional(tx,'FMT',id,actor,{title:'Yeni FMT yayımlandı',summary:fmt.name,content:`${fmt.name}\nFMT Paylaş ve İndir ekranından inceleyebilirsiniz.`,category:'FMT',startsAt:new Date(),section:'fmt-share'});}
