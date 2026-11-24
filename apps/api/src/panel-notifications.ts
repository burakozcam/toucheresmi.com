import express from 'express';
import { prisma } from './db';
import { requireAuth, type AuthenticatedRequest } from './auth';
import { visibility } from './announcements';
export const panelNotificationsRouter=express.Router();
panelNotificationsRouter.get('/api/panel-notifications',requireAuth,async(q:AuthenticatedRequest,r,n)=>{
  try {
    const user=q.user!,now=new Date();
    const notifications:Array<{id:string;section:string}>=[];
    if(['SUPER_ADMIN','DEALER'].includes(user.role)){
      const announcements=await prisma.announcement.findMany({where:{AND:[await visibility(q,now),{state:'ACTIVE',startsAt:{lte:now},OR:[{endsAt:null},{endsAt:{gt:now}}],reads:{none:{userId:user.id}}}]},select:{id:true,section:true}});
      for(const a of announcements)notifications.push({id:`announcement:${a.id}`,section:['calendar','rebuilder','pdf-tools'].includes(a.section||'')?a.section!:'announcements'});
    }
    const own=await prisma.$queryRaw<Array<{id:string}>>`SELECT u.id FROM "SupportUpdate" u JOIN "SupportTicket" t ON u."ticketId"=t.id WHERE t."userId"=${user.id} AND u."authorId"<>${user.id} AND u.version>t."ownerReadVersion"`;
    for(const row of own)notifications.push({id:`support:${row.id}`,section:'support-mine'});
    if(user.role==='SUPER_ADMIN'){
      const inbox=await prisma.$queryRaw<Array<{id:string}>>`SELECT u.id FROM "SupportUpdate" u JOIN "SupportTicket" t ON u."ticketId"=t.id JOIN "User" a ON a.id=u."authorId" WHERE a.role<>'SUPER_ADMIN' AND u.version>t."adminReadVersion"`;
      for(const row of inbox)notifications.push({id:`support:${row.id}`,section:'support-inbox'});
    }
    r.json({notifications});
  }catch(e){n(e);}
});
