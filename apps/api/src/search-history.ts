import express from 'express';
import {z} from 'zod';
import {Role,Prisma} from '@prisma/client';
import {prisma} from './db';
import {requireAuth,requireRole} from './auth';
import {RequestLimiter} from './rate-limit';
import {safeSearchTerm,searchCutoff} from './search-history-core';
export const searchHistoryRouter=express.Router();
let cleanupAt=0;
async function cleanup(){if(Date.now()<cleanupAt)return;cleanupAt=Date.now()+3600_000;try{await prisma.searchHistory.deleteMany({where:{lastSearchedAt:{lt:searchCutoff()}}});}catch{cleanupAt=0;}}
const publicLimit=new RequestLimiter(20,60_000,10_000,'submitted-search'),globalLimit=new RequestLimiter(600,3600_000,1,'submitted-search-global');
searchHistoryRouter.post('/api/search-history',publicLimit.middleware(),globalLimit.middleware(()=> 'global'),async(q,r)=>{
 const term=safeSearchTerm(q.body?.term);if(!term){r.status(202).json({accepted:true});return;}
 try{await cleanup();const now=new Date(),day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(now);
 await prisma.searchHistory.upsert({where:{day_term:{day,term}},create:{day,term,lastSearchedAt:now},update:{count:{increment:1},lastSearchedAt:now}});
 }catch{console.error('Submitted search could not be recorded');}
 r.status(202).json({accepted:true});
});
const admin=express.Router();admin.use(requireAuth,requireRole(Role.SUPER_ADMIN));searchHistoryRouter.use('/api/admin/search-history',admin);
const filters=z.object({from:z.iso.date().optional(),to:z.iso.date().optional(),page:z.coerce.number().int().min(1).max(100000).default(1)});
admin.get('/',async(q,r,n)=>{try{
 const parsed=filters.safeParse(q.query);if(!parsed.success){r.status(400).json({error:'Tarih ve sayfa seçimini kontrol edin.'});return;}const {from,to,page}=parsed.data;if(from&&to&&from>to){r.status(400).json({error:'Başlangıç tarihi bitiş tarihinden sonra olamaz.'});return;}
 await cleanup();const cutoff=searchCutoff(),start=from?new Date(`${from}T00:00:00+03:00`):cutoff,end=to?new Date(+new Date(`${to}T00:00:00+03:00`)+86400_000):new Date();
 const where:Prisma.SearchHistoryWhereInput={lastSearchedAt:{gte:new Date(Math.max(+cutoff,+start)),lt:end}},pageSize=25;
 const [items,total,top,totalSearches]=await Promise.all([prisma.searchHistory.findMany({where,orderBy:[{lastSearchedAt:'desc'},{id:'desc'}],skip:(page-1)*pageSize,take:pageSize}),prisma.searchHistory.count({where}),prisma.searchHistory.groupBy({by:['term'],where,_sum:{count:true},orderBy:{_sum:{count:'desc'}},take:10}),prisma.searchHistory.aggregate({where,_sum:{count:true}})]);
 r.json({items,total,page,pageSize,totalSearches:totalSearches._sum.count??0,top:top.map(v=>({term:v.term,count:v._sum.count??0})),retentionDays:30});
 }catch(e){n(e);}});
admin.delete('/',async(q,r,n)=>{try{await prisma.$transaction(async tx=>{await tx.searchHistory.deleteMany({});await tx.auditLog.create({data:{actorUserId:(q as any).user.id,actorName:(q as any).user.id,action:'SEARCH_HISTORY_CLEARED',targetType:'SearchHistory',summary:'Arama geçmişi temizlendi; arama metinleri işlem kaydına kopyalanmadı.'}});});r.status(204).end();}catch(e){n(e);}});
