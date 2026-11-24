import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { prisma } from './db';
import { env } from './config';
import { requireAuth, type AuthenticatedRequest } from './auth';
import { SecurityError } from './security-errors';
import { RequestLimiter } from './rate-limit';
import { privateStoragePath, validateSupportedUpload } from './upload-security';
export const SUPPORT_CATEGORIES = ['Sınav Değerlendirme','FMT Yönetimi','Sonuçlar ve Raporlar','Hesap ve Giriş','Teknik Sorun','Genel'] as const;
const statuses=['SENT','RECEIVED','IN_PROGRESS','RESOLVED'] as const;
export const supportRouter=express.Router();
supportRouter.use('/api/support',requireAuth);
const wrap=(fn:(q:AuthenticatedRequest,r:express.Response)=>Promise<void>):express.RequestHandler=>async(q,r,n)=>{try{await fn(q as AuthenticatedRequest,r);}catch(e){n(e);}};
const directory=path.resolve(env.STORAGE_DIR,'support');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:3,fieldSize:24000,parts:4}});
export function technicalSnapshot(ua:string) {
  const device=/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)?'Tablet':/Mobile|iPhone/i.test(ua)?'Mobil':/Windows|Macintosh|Linux|X11/.test(ua)?'Masaüstü':'Belirlenemedi';
  const os=/iPhone|iPad/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Macintosh/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Belirlenemedi';
  const browser=/Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Belirlenemedi';
  return {device,os,browser,brand:/iPhone|iPad/.test(ua)?'Apple':'Belirlenemedi',country:'Belirlenemedi',source:'Tarayıcı kullanıcı ajanından tahmin; ülke bilgisi mevcut değil.'};
}
const ownerSelect={id:true,firstName:true,lastName:true,role:true,dealer:{select:{name:true}},school:{select:{name:true}}} as const;
async function accessible(q:AuthenticatedRequest,id:string) {
  const row=await prisma.supportTicket.findFirst({where:{id,...(q.user!.role==='SUPER_ADMIN'?{}:{userId:q.user!.id})}});
  if(!row)throw new SecurityError(404,'Destek talebi bulunamadı.'); return row;
}
supportRouter.get('/api/support',wrap(async(q,r)=>{
  const input=z.object({category:z.enum(['',...SUPPORT_CATEGORIES]).default(''),status:z.enum(['',...statuses]).default(''),page:z.coerce.number().int().min(1).max(100000).default(1),inbox:z.enum(['true','false']).default('false')}).parse(q.query);
  if(input.inbox==='true'&&q.user!.role!=='SUPER_ADMIN')throw new SecurityError(403,'Yönetici yetkisi gerekir.');
  const where={...(input.inbox==='true'?{}:{userId:q.user!.id}),...(input.category?{category:input.category}:{}),...(input.status?{status:input.status}:{})};
  const [rows,total]=await Promise.all([prisma.supportTicket.findMany({where,select:{id:true,number:true,subject:true,category:true,status:true,version:true,ownerReadVersion:true,adminReadVersion:true,createdAt:true,updatedAt:true,user:{select:ownerSelect}},orderBy:{updatedAt:'desc'},take:25,skip:(input.page-1)*25}),prisma.supportTicket.count({where})]);
  r.json({rows,total});
}));
supportRouter.post('/api/support',new RequestLimiter(12,3600_000,10000,'support-create').middleware(q=>(q as AuthenticatedRequest).user!.id),upload.single('image'),wrap(async(q,r)=>{
  const input=z.object({category:z.enum(SUPPORT_CATEGORIES),subject:z.string().trim().min(3).max(180),description:z.string().trim().min(5).max(20000)}).strict().parse(q.body);
  let imageName:string|null=null,committed=false;
  try {
    if(q.file){
      if(!/\.(png|jpe?g|webp)$/i.test(q.file.originalname)||!['image/png','image/jpeg','image/webp'].includes(q.file.mimetype))throw new SecurityError(400,'Yalnız JPG, PNG veya WebP görseli kabul edilir.');
      await validateSupportedUpload(q.file.buffer,q.file.originalname);
      const sharp=(await import('sharp')).default;
      const metadata=await sharp(q.file.buffer,{limitInputPixels:20_000_000,animated:false,failOn:'warning'}).metadata();
      const actual={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'}[metadata.format as 'png'|'jpeg'|'webp'];
      if(actual!==q.file.mimetype)throw new SecurityError(400,'Bildirilen görsel türü gerçek dosya ile eşleşmiyor.');
      const bytes=await sharp(q.file.buffer,{limitInputPixels:20_000_000,animated:false,failOn:'warning'}).rotate().resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
      await fs.mkdir(directory,{recursive:true,mode:0o700});
      if((await fs.lstat(directory)).isSymbolicLink())throw new SecurityError(503,'Özel dosya alanı kullanılamıyor.');
      imageName=crypto.randomUUID()+'.webp';await fs.writeFile(path.join(directory,imageName),bytes,{flag:'wx',mode:0o600});
    }
    const ticket=await prisma.supportTicket.create({data:{userId:q.user!.id,...input,imageName,technical:technicalSnapshot((q.get('user-agent')||'').slice(0,512)),updates:{create:{authorId:q.user!.id,version:1,body:'Talep gönderildi.',status:'SENT'}}},select:{id:true,number:true,status:true}});
    committed=true;r.status(201).json(ticket);
  } finally {if(imageName&&!committed)await fs.unlink(path.join(directory,imageName)).catch(()=>{});}
}));
supportRouter.get('/api/support/:id',wrap(async(q,r)=>{
  await accessible(q,String(q.params.id));
  const row=await prisma.supportTicket.findUniqueOrThrow({where:{id:String(q.params.id)},include:{user:{select:ownerSelect},updates:{include:{author:{select:ownerSelect}},orderBy:{version:'asc'}}}});
  const {imageName,...data}=row;r.json({...data,hasImage:!!imageName});
}));
supportRouter.get('/api/support/:id/image',wrap(async(q,r)=>{
  const ticket=await accessible(q,String(q.params.id));if(!ticket.imageName)throw new SecurityError(404,'Görsel bulunamadı.');
  if(path.basename(ticket.imageName)!==ticket.imageName)throw new SecurityError(404,'Görsel bulunamadı.');
  const file=privateStoragePath(directory,path.join(directory,ticket.imageName));
  const handle=await fs.open(file,require('node:fs').constants.O_RDONLY|require('node:fs').constants.O_NOFOLLOW);
  try{r.type('image/webp').send(await handle.readFile());}finally{await handle.close();}
}));
supportRouter.post('/api/support/:id/read',wrap(async(q,r)=>{
  const row=await accessible(q,String(q.params.id)),{version}=z.object({version:z.number().int().min(1)}).strict().parse(q.body);
  const capped=Math.min(version,row.version),admin=q.user!.role==='SUPER_ADMIN'&&row.userId!==q.user!.id;
  const field=admin?'adminReadVersion':'ownerReadVersion';
  await prisma.supportTicket.updateMany({where:{id:row.id,[field]:{lt:capped}},data:{[field]:capped}});r.json({ok:true});
}));
supportRouter.post('/api/support/:id/reply',new RequestLimiter(60,3600_000,10000,'support-reply').middleware(q=>(q as AuthenticatedRequest).user!.id),wrap(async(q,r)=>{
  await accessible(q,String(q.params.id));
  const input=z.object({body:z.string().trim().max(20000).default(''),status:z.enum(statuses).optional()}).strict().parse(q.body);
  const admin=q.user!.role==='SUPER_ADMIN';if(input.status&&!admin)throw new SecurityError(403,'Durumu yalnız Süper Admin değiştirebilir.');
  if(!input.body&&!input.status)throw new SecurityError(400,'Yanıt veya durum seçin.');
  await prisma.$transaction(async tx=>{
    const id=String(q.params.id);await tx.$queryRaw`SELECT id FROM "SupportTicket" WHERE id=${id} FOR UPDATE`;
    const old=await tx.supportTicket.findUniqueOrThrow({where:{id}}),version=old.version+1;
    await tx.supportUpdate.create({data:{ticketId:id,authorId:q.user!.id,version,body:input.body,status:input.status}});
    await tx.supportTicket.update({where:{id},data:{version,...(input.status?{status:input.status}:{}),...(admin?{adminReadVersion:version}:{ownerReadVersion:version})}});
  });r.json({ok:true});
}));
