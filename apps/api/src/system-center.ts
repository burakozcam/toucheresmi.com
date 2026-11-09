import express from "express";
import { bufferVisit, analyticsSummary } from "./analytics";
import crypto from "node:crypto";
import { isIP } from "node:net";
import os from "node:os";
import fs from "node:fs/promises";
import https from "node:https";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { env } from "./config";
import { requireAuth, requireRole, type AuthenticatedRequest } from "./auth";
import { RequestLimiter } from "./rate-limit";

export const suspiciousLogin = (failures:number,total:number) => failures >= 15 && failures / Math.max(1,total) >= .6;
export const safeRoute = (route:string) => route.split("?")[0].replace(/[A-Za-z0-9_-]{20,}/g,":id").slice(0,160);
// Never consume forwarded headers: Passenger/proxy trust requires separate deployment verification.
export const clientIp = (q:express.Request) => (q.socket.remoteAddress ?? "unknown").replace(/^::ffff:/,"");
type Event={kind:string;severity:string;route:string;status:number;ip?:string;actorId?:string;createdAt:Date};
const events:Event[]=[];
let pending:Event[]=[], flushing=false, disabledUntil=0;
export function observeEvent(event:Event){
 try { events.unshift(event);if(events.length>500)events.pop();if(pending.length<100)pending.push(event); } catch { /* Monitoring must never interrupt exams. */ }
}
export async function flushSystemEvents(){
 if(flushing||!pending.length||Date.now()<disabledUntil)return;
 const batch=pending;pending=[];flushing=true;
 try{await prisma.systemEvent.createMany({data:batch});}catch{disabledUntil=Date.now()+60_000;}finally{flushing=false;}
}
const flushTimer=setInterval(()=>{void flushSystemEvents();},10_000);flushTimer.unref();
// Retention only touches the new observability tables, never exam or account data.
const retentionTimer=setInterval(()=>{void (async()=>{try{
 const day=new Date(Date.now()-32*86400_000).toLocaleDateString("sv-SE",{timeZone:"Europe/Istanbul"});
 await Promise.allSettled([prisma.systemEvent.deleteMany({where:{createdAt:{lt:new Date(Date.now()-30*86400_000)}}}),prisma.analyticsVisitor.deleteMany({where:{day:{lt:day}}}),prisma.analyticsMetric.deleteMany({where:{day:{lt:day}}})]);}catch{}})();
},86400_000);retentionTimer.unref();
const ips=new Map<string,{since:number;total:number;failed:number;denied:number;limited:number}>();
export const systemObserver:express.RequestHandler=(q:AuthenticatedRequest,r,n)=>{
 const started=performance.now();
 r.on("finish",()=>{try{
  const ip=clientIp(q),now=Date.now();
  let v=ips.get(ip);if(!v||now-v.since>300_000){if(ips.size>=5000)ips.delete(ips.keys().next().value!);v={since:now,total:0,failed:0,denied:0,limited:0};ips.set(ip,v);}v.total++;
  const failed=q.path==="/api/auth/login"&&[400,401].includes(r.statusCode);if(failed)v.failed++;
  if([401,403,429].includes(r.statusCode))v.denied++;if(r.statusCode===429)v.limited++;
  const kind=r.statusCode>=500?(r.locals?.failureKind??"SERVER_ERROR"):r.statusCode>=400&&/outcome-preview|answer-keys|templates.*bulk|convert|uploads/.test(q.path)?"FILE_OR_EXAM_ERROR":failed?(q.body?.role==="SUPER_ADMIN"?"ADMIN_LOGIN_FAILED":"LOGIN_FAILED"):r.statusCode===429?"REQUEST_LIMITED":[401,403].includes(r.statusCode)?"ACCESS_DENIED":"";
  if(kind)observeEvent({kind,severity:r.statusCode>=500?"critical":r.statusCode===429||kind==="FILE_OR_EXAM_ERROR"?"warning":"info",route:safeRoute(q.route?.path??q.path),status:r.statusCode,ip,actorId:q.user?.id,createdAt:new Date()});
  if(samples.length>=300)samples.shift();samples.push(performance.now()-started);
 }catch{} });n();
};
const samples:number[]=[];
type Bucket={views:number;visitors:Set<string>;pages:Map<string,number>;hours:number[]};
const days=new Map<string,Bucket>();
const bot=/bot|crawler|spider|headless|preview|curl|wget/i;
export function trackPage(day:string,page:string,visitor:string,hour:number){
 if(!days.has(day)){if(days.size>=31)days.delete(days.keys().next().value!);days.set(day,{views:0,visitors:new Set(),pages:new Map(),hours:Array(24).fill(0)});}
 bufferVisit(day,page,hour,visitor);
 const b=days.get(day)!;b.views++;if(b.visitors.size<50000)b.visitors.add(visitor);
 if(b.pages.has(page)||b.pages.size<200)b.pages.set(page,(b.pages.get(page)??0)+1);b.hours[hour]++;
}
export const systemRouter=express.Router();
systemRouter.post("/api/analytics/page",new RequestLimiter(120,60_000).middleware(),(q,r)=>{
 const data=z.object({page:z.string().max(160).regex(/^\/(?:[a-z0-9-]+\/?)*$/),visitor:z.string().uuid()}).safeParse(q.body);
 if(data.success&&!bot.test(q.get("user-agent")??"")&&q.get("origin")===env.WEB_ORIGIN&&!/^\/(panel|login|sonuclarim|hesap-kur|dosya-paylasim|fmt-paylasim)/.test(data.data.page)){
 const now=new Date(),day=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul"}).format(now),hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Istanbul",hour:"2-digit",hourCycle:"h23"}).format(now));
 trackPage(day,data.data.page,crypto.createHmac("sha256",env.JWT_SECRET).update(day.slice(0,7)+data.data.visitor).digest("hex"),hour);
 }r.status(204).end();
});
const admin=express.Router();admin.use(requireAuth,requireRole(Role.SUPER_ADMIN));
admin.use((_q,r,n)=>{r.setHeader("Cache-Control","private, no-store");n();});
let healthCache:unknown=null,healthAt=0,healthTask:Promise<unknown>|null=null,lastSuccess:string|null=null,lastFailure:string|null=null;
async function health(){
 if(healthCache&&Date.now()-healthAt<60_000)return healthCache;
 if(healthTask)return healthTask;
 healthTask=(async()=>{
 const checkedAt=new Date().toISOString(),start=performance.now();
 const db=await Promise.race([prisma.$queryRaw`SELECT 1`.then(()=>({status:"ok",ms:Math.round(performance.now()-start)})).catch(()=>({status:"failed"})),new Promise(resolve=>setTimeout(()=>resolve({status:"unavailable",detail:"Kontrol süresi aşıldı"}),2500))]);
 const site=await new Promise<Record<string,unknown>>(resolve=>{
  const url=new URL(env.WEB_ORIGIN);if(url.protocol!=="https:"){resolve({status:"unavailable",detail:"HTTPS site adresi yapılandırılmamış"});return;}
  const req=https.get(url,{timeout:2500},res=>{const cert=(res.socket as import("node:tls").TLSSocket).getPeerCertificate();res.resume();resolve({status:res.statusCode&&res.statusCode<400?"ok":"failed",httpStatus:res.statusCode,sslValid:true,sslExpiresAt:cert?.valid_to??null});});req.on("timeout",()=>req.destroy());req.on("error",(error:NodeJS.ErrnoException)=>resolve(["CERT_HAS_EXPIRED","DEPTH_ZERO_SELF_SIGNED_CERT","ERR_TLS_CERT_ALTNAME_INVALID","UNABLE_TO_VERIFY_LEAF_SIGNATURE"].includes(error.code??"")?{status:"failed",sslValid:false,detail:"SSL sertifikası doğrulanamadı"}:{status:"unavailable",detail:"Site / SSL kontrol edilemiyor"}));
 });
 if((db as {status:string}).status==="ok"&&site.status==="ok")lastSuccess=checkedAt;
 if((db as {status:string}).status==="failed"||site.status==="failed")lastFailure=checkedAt;
 const migrations=await prisma.$queryRaw<Array<{migration_name:string;finished_at:Date|null;rolled_back_at:Date|null}>>`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 5`.then(rows=>({status:rows.some(v=>!v.finished_at&&!v.rolled_back_at)?"failed":rows.some(v=>v.migration_name==="20261109090000_system_center_content_files"&&v.finished_at)?"ok":"pending",latest:rows[0]?.migration_name??null})).catch(()=>null);
 const disk=await fs.statfs(env.STORAGE_DIR).then(s=>({total:s.blocks*s.bsize,free:s.bavail*s.bsize})).catch(()=>null);
 healthCache={checkedAt,lastSuccess,lastFailure,database:db,site,api:{status:"ok",averageMs:samples.length?Math.round(samples.reduce((a,b)=>a+b,0)/samples.length):null},resources:{scope:"Node süreci / paylaşımlı sunucu; hosting kotası ölçülmez",processRam:process.memoryUsage().rss,hostRam:os.totalmem(),hostFreeRam:os.freemem(),cpuLoad:os.loadavg(),disk},version:"1.1.4",apiVersion:"1.1.4",deployment:process.env.RELEASE_ID?.replace(/[^a-zA-Z0-9._-]/g,"").slice(0,80)||null,migrations:migrations?`${migrations.status==="ok"?"Yeni migration uygulanmış":migrations.status==="failed"?"Tamamlanmamış migration var":"Yeni migration bekliyor"} · Son kayıt: ${migrations.latest??"yok"}`:"Kontrol edilemiyor; dağıtım öncesi migration geçmişini ayrı inceleyin."};healthAt=Date.now();return healthCache;
 })().finally(()=>{healthTask=null;});return healthTask;
}
let usageCache:unknown=null,usageAt=0,usageTask:Promise<unknown>|null=null;
async function usage(){if(usageCache&&Date.now()-usageAt<300_000)return usageCache;if(usageTask)return usageTask;
 usageTask=(async()=>{try{
 const [publishers,schools,exams,keys,legacyTxt,pdfs,students,results,publisherGroups,schoolGroups]=await Promise.all([prisma.publisher.count(),prisma.school.count(),prisma.exam.count(),prisma.publishedAnswerKey.count(),prisma.uploadBatch.count(),prisma.answerKeyFile.count({where:{generated:true}}),prisma.user.count({where:{role:Role.STUDENT}}),prisma.opticalResult.count({where:{revision:1}}),prisma.publishedAnswerKey.groupBy({by:["publisherId"],_count:{_all:true},orderBy:{_count:{publisherId:"desc"}},take:10}),prisma.opticalResult.groupBy({by:["schoolId"],_count:{_all:true},orderBy:{_count:{schoolId:"desc"}},take:10})]);
 const [pubNames,schoolNames,periods]=await Promise.all([prisma.publisher.findMany({where:{id:{in:publisherGroups.map(v=>v.publisherId)}},select:{id:true,name:true}}),prisma.school.findMany({where:{id:{in:schoolGroups.map(v=>v.schoolId)}},select:{id:true,name:true}}),prisma.$queryRaw<Array<{month:string;count:bigint}>>`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM') AS month, COUNT(*) AS count FROM "OpticalResult" WHERE "createdAt" > NOW() - INTERVAL '12 months' AND revision = 1 GROUP BY month ORDER BY month DESC`]);
 usageAt=Date.now();return usageCache={publishers,schools,exams,keys,txt:legacyTxt+results,pdfs,students,publisherUsage:publisherGroups.map(v=>({name:pubNames.find(n=>n.id===v.publisherId)?.name??v.publisherId,count:v._count._all})),schoolUsage:schoolGroups.map(v=>({name:schoolNames.find(n=>n.id===v.schoolId)?.name??v.schoolId,count:v._count._all})),periods:periods.map(v=>({month:v.month,count:Number(v.count)})),note:"Öğrenci: kayıtlı öğrenci hesapları (TXT içindeki tekil kişi toplamı değildir). TXT: eski yükleme işleri + ilk optik sonuç kayıtları. PDF: arşivdeki otomatik cevap PDF’leri; tarayıcı çıktıları sayılmaz. Kurum yoğunluğunda sonuç sürümleri dahildir."};
 }catch{return{unavailable:true};}})().finally(()=>{usageTask=null;});return usageTask;}
admin.get("/",async(_q,r)=>{
 const persistentAnalytics=await analyticsSummary().catch(()=>null);
 const recent=await prisma.systemEvent.findMany({orderBy:{createdAt:"desc"},take:200}).catch(()=>events);
 r.json({mode:"monitor",ipTrust:"Socket adresi; proxy başlıkları kullanılmaz. Proxy arkasında kullanıcı IP’si doğrulanamaz.",analytics:persistentAnalytics??{scope:"Bu Node sürecinin son 31 günü; yeniden başlatmada sıfırlanır. Tekil: aylık anonim tarayıcı kimliği, yaklaşık. Bot filtresi kesin değildir.",days:[...days].map(([day,b])=>({day,views:b.views,unique:b.visitors.size})),pages:[...days.values()].flatMap(b=>[...b.pages]).reduce<Record<string,number>>((a,[k,v])=>{a[k]=(a[k]??0)+v;return a;},{}),hours:Array.from({length:24},(_,i)=>[...days.values()].reduce((n,b)=>n+b.hours[i],0)),uniqueMonth:new Set([...days.values()].flatMap(b=>[...b.visitors])).size},events:recent,suspicious:[...ips].filter(([,v])=>Date.now()-v.since<300_000&&suspiciousLogin(v.failed,v.total)).map(([ip,v])=>({ip,...v,reason:`Son 5 dakikada ${v.failed} başarısız giriş / ${v.total} istek. Ortak kurum IP’si olabilir.`})),restrictions:await prisma.ipRestriction.findMany({orderBy:{createdAt:"desc"},take:100}).catch(()=>[])});
});
admin.get("/health",async(_q,r)=>{try{r.json(await health());}catch{r.json({status:"unavailable"});}});
admin.get("/usage",async(_q,r)=>r.json(await usage()));
admin.post("/restrictions",async(q:AuthenticatedRequest,r,n)=>{try{
 const input=z.object({ip:z.string().refine(v=>!!isIP(v)),minutes:z.union([z.literal(15),z.literal(60),z.literal(1440)]),reason:z.string().trim().min(10).max(300)}).parse(q.body);
 // Deliberately passive: a shared proxy IP must never lock out a school or administrator.
 r.status(201).json(await prisma.ipRestriction.create({data:{ip:input.ip,reason:input.reason,actorId:q.user!.id,expiresAt:new Date(Date.now()+input.minutes*60_000)}}));
 }catch(e){if(e instanceof z.ZodError){r.status(400).json({error:"Geçerli IP, süre ve gerekçe girin."});return;}n(e);}});
admin.delete("/restrictions/:id",async(q:AuthenticatedRequest,r,n)=>{try{await prisma.ipRestriction.updateMany({where:{id:String(q.params.id),revokedAt:null},data:{revokedAt:new Date(),revokedBy:q.user!.id}});r.status(204).end();}catch(e){n(e);}});
systemRouter.use("/api/admin/system",admin);
