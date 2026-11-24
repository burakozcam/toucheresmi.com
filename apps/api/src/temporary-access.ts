import express from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from './db';
import { env } from './config';
import { requireAuth, requireRole, type AuthenticatedRequest } from './auth';
import { issueSession } from './auth-sessions';
import { SecurityError } from './security-errors';
import { RequestLimiter } from './rate-limit';
import { accessExpiry, accessHash, accessIsValid, DURATION_OPTIONS, newAccessSecrets, TEMP_SCOPES } from './temporary-core';
import { analyzeFmt } from './fmt-analyze';
export const temporaryRouter = express.Router();
const wrap = (fn: (q:AuthenticatedRequest,r:express.Response)=>Promise<void>):express.RequestHandler => async(q,r,n)=>{try{await fn(q as AuthenticatedRequest,r);}catch(e){n(e);}};
const admin = express.Router();
admin.use(requireAuth, requireRole('SUPER_ADMIN'));
const select = {id:true,note:true,scopes:true,expiresAt:true,revokedAt:true,createdAt:true} as const;
function output(grant: {id:string;expiresAt:Date}, secrets: {code:string;key:string}) {
  return {...grant,code:secrets.code,link:`${env.WEB_ORIGIN}/gecici-giris#key=${secrets.key}`};
}
admin.get('/',wrap(async(_q,r)=>{const rows=await prisma.temporaryAccess.findMany({select,orderBy:{createdAt:'desc'},take:500});r.json({rows,serverNow:new Date()});}));
admin.post('/',wrap(async(q,r)=>{
  const input=z.object({note:z.string().trim().min(1).max(100),unit:z.enum(['minute','hour','day','month','year']),value:z.number().int(),scopes:z.array(z.enum(TEMP_SCOPES)).min(1).max(2)}).strict().parse(q.body);
  if(!DURATION_OPTIONS[input.unit].some(v=>v===input.value))throw new SecurityError(400,'Geçersiz süre seçimi.');
  const secrets=newAccessSecrets(),now=new Date(),expiresAt=accessExpiry(input.unit,input.value,now);
  const grant=await prisma.$transaction(async tx=>{
    const user=await tx.user.create({data:{email:`temporary-${crypto.randomUUID()}@access.invalid`,passwordHash:crypto.randomBytes(48).toString('hex'),firstName:input.note,lastName:'',role:'TEMPORARY'}});
    const saved=await tx.temporaryAccess.create({data:{userId:user.id,note:input.note,scopes:[...new Set(input.scopes)],codeHash:accessHash('code',secrets.code),linkHash:accessHash('link',secrets.key),expiresAt,createdById:q.user!.id},select});
    await tx.auditLog.create({data:{actorUserId:q.user!.id,actorName:q.user!.id,action:'TEMPORARY_CREATE',targetType:'TemporaryAccess',targetId:saved.id,summary:'Süreli erişim oluşturuldu; kimlik bilgileri kayda alınmadı.'}});return saved;
  });
  r.status(201).json(output(grant,secrets));
}));
async function locked(tx: any,id:string) {await tx.$queryRaw`SELECT id FROM "TemporaryAccess" WHERE id=${id} FOR UPDATE`;const grant=await tx.temporaryAccess.findUnique({where:{id}});if(!grant)throw new SecurityError(404,'Erişim bulunamadı.');return grant;}
for(const action of ['revoke','rotate'] as const)admin.post(`/:id/${action}`,wrap(async(q,r)=>{
  const secrets=action==='rotate'?newAccessSecrets():null;
  const saved=await prisma.$transaction(async tx=>{
    const grant=await locked(tx,String(q.params.id));
    if(action==='rotate'&&!accessIsValid(grant))throw new SecurityError(409,'Süresi dolmuş veya iptal edilmiş erişim yenilenemez. Yeni bir erişim oluşturun.');
    const result=await tx.temporaryAccess.update({where:{id:grant.id},data:action==='revoke'?{revokedAt:new Date()}:{codeHash:accessHash('code',secrets!.code),linkHash:accessHash('link',secrets!.key),linkUsedAt:null},select});
    if(action==='revoke')await tx.authSession.updateMany({where:{userId:grant.userId,revokedAt:null},data:{revokedAt:new Date()}});
    await tx.auditLog.create({data:{actorUserId:q.user!.id,actorName:q.user!.id,action:`TEMPORARY_${action.toUpperCase()}`,targetId:grant.id,targetType:'TemporaryAccess',summary:'Geçici erişim yönetimi'}});return result;
  });r.json(secrets?output(saved,secrets):saved);
}));
temporaryRouter.use('/api/admin/temporary-access',admin);
// Separate namespaces and HMACed shared counters; neither raw key nor code enters a counter/log.
const ipLimit=new RequestLimiter(15,10*60_000,10000,'temporary-login-ip');
const credentialLimit=new RequestLimiter(20,10*60_000,10000,'temporary-login-credential');
temporaryRouter.post('/api/temporary/login',ipLimit.middleware(),credentialLimit.middleware(q=>accessHash(q.body?.key?'link':'code',String(q.body?.key||q.body?.code||'').slice(0,128))),wrap(async(q,r)=>{
  const input=z.union([z.object({code:z.string().trim().toUpperCase().regex(/^[A-HJ-NP-Z2-9]{8,16}$/)}).strict(),z.object({key:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict()]).parse(q.body);
  const isLink='key'in input,hash=accessHash(isLink?'link':'code',isLink?input.key:input.code);
  const session=await prisma.$transaction(async tx=>{
    // A parameter cannot name a SQL column. Use two fixed tagged templates instead.
    const found=isLink?await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "TemporaryAccess" WHERE "linkHash"=${hash} FOR UPDATE`:await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "TemporaryAccess" WHERE "codeHash"=${hash} FOR UPDATE`;
    const grant=found[0]?await tx.temporaryAccess.findUnique({where:{id:found[0].id},include:{user:true}}):null;
    if(!grant||!grant.user.active||grant.user.role!=='TEMPORARY'||!accessIsValid(grant))throw new SecurityError(401,'Erişim geçersiz, iptal edilmiş veya süresi dolmuş.');
    if(isLink){const used=await tx.temporaryAccess.updateMany({where:{id:grant.id,linkHash:hash,linkUsedAt:null,revokedAt:null,expiresAt:{gt:new Date()}},data:{linkUsedAt:new Date()}});if(used.count!==1)throw new SecurityError(409,'Bağlantı daha önce kullanıldı. Kodunuz hâlâ geçerliyse Geçici Giriş ile devam edin.');}
    const issued=await issueSession(grant.user,q,{expiresAt:grant.expiresAt},tx);
    await tx.user.update({where:{id:grant.userId},data:{lastLoginAt:new Date()}});
    return {...issued,user:{...issued.user,temporary:{id:grant.id,scopes:grant.scopes,expiresAt:grant.expiresAt}}};
  });r.json(session);
}));
temporaryRouter.get('/api/temporary/demo/fmt',requireAuth,wrap(async(q,r)=>{
  if(!q.user!.temporary?.scopes.includes('FMT_DEMO'))throw new SecurityError(403,'FMT deneme izni gerekir.');
  r.json({sample:'8=20=1=1=1=1\n1=1=1=5=K=D=0123456789=0=ÖĞRENCİ NO=0\n2=2=1=20=K=D=ABCDEFGHIJKLMNOPQRSTUVWXYZ=0=ADI=0\n3=3=1=1=K=D=AB=0=KİTAPÇIK TÜRÜ=0\n4=8=1=5=K=Y=ABCDE=0=TÜRKÇE=0',notice:'Yalnız deneme alanı. Kurum, öğrenci veya gerçek FMT deposuna erişim yoktur.'});
}));
temporaryRouter.post('/api/temporary/demo/fmt',requireAuth,wrap(async(q,r)=>{
  if(!q.user!.temporary?.scopes.includes('FMT_DEMO'))throw new SecurityError(403,'FMT deneme izni gerekir.');
  const input=z.object({text:z.string().min(1).max(64000)}).strict().parse(q.body);
  try{r.json(analyzeFmt(input.text));}catch{throw new SecurityError(400,'FMT yapısı okunamadı. Örnek içeriği veya geçerli koordinat tanımını kullanın.');}
}));
