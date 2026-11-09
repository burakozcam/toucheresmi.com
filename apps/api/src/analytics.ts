import { prisma } from "./db";
import { Prisma } from "@prisma/client";
// Bounded write-behind buffer: page requests never wait for PostgreSQL.
let metrics=new Map<string,{day:string;page:string;hour:number;views:number}>();
let visitors=new Map<string,{day:string;visitor:string}>();
let flushing=false,cooldown=0,lastFlush:string|null=null,dropped=0;
export function bufferVisit(day:string,page:string,hour:number,visitor:string){
 const key=JSON.stringify([day,page,hour]),current=metrics.get(key);
 if(current)current.views++;else if(metrics.size<300)metrics.set(key,{day,page,hour,views:1});else dropped++;
 const vk=day+visitor;if(visitors.size<2000)visitors.set(vk,{day,visitor});
}
export async function flushAnalytics(){
 if(flushing||Date.now()<cooldown||!metrics.size)return;
 flushing=true;const batch=[...metrics.values()],unique=[...visitors.values()];metrics=new Map();visitors=new Map();
 try{await prisma.$transaction([prisma.$executeRaw(Prisma.sql`INSERT INTO "AnalyticsMetric" ("day", "page", "hour", "views") VALUES ${Prisma.join(batch.map(v=>Prisma.sql`(${v.day}, ${v.page}, ${v.hour}, ${v.views})`))} ON CONFLICT ("day", "page", "hour") DO UPDATE SET "views" = "AnalyticsMetric"."views" + EXCLUDED."views"`),prisma.analyticsVisitor.createMany({data:unique,skipDuplicates:true})]);lastFlush=new Date().toISOString();}
 catch{cooldown=Date.now()+60_000;dropped+=batch.reduce((n,v)=>n+v.views,0);}
 finally{flushing=false;}
}
const timer=setInterval(()=>void flushAnalytics(),30_000);timer.unref();
let cache:unknown=null,cacheAt=0,task:Promise<unknown>|null=null;
export function analyticsSummary(){
 if(cache&&Date.now()-cacheAt<60_000)return Promise.resolve(cache);if(task)return task;
 task=(async()=>{
 const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul"}).format(new Date());
 const cutoff=new Date(Date.now()-30*86400_000).toLocaleDateString("sv-SE",{timeZone:"Europe/Istanbul"}),week=new Date(Date.now()-6*86400_000).toLocaleDateString("sv-SE",{timeZone:"Europe/Istanbul"});
 const where={day:{gte:cutoff,lte:today}};
 const [daily,page,hour,unique]=await Promise.all([
 prisma.analyticsMetric.groupBy({by:["day"],where,_sum:{views:true},orderBy:{day:"asc"}}),
 prisma.analyticsMetric.groupBy({by:["page"],where,_sum:{views:true},orderBy:{_sum:{views:"desc"}},take:20}),
 prisma.analyticsMetric.groupBy({by:["hour"],where,_sum:{views:true}}),
 prisma.$queryRaw<Array<{daily:bigint;weekly:bigint;monthly:bigint}>>`SELECT COUNT(DISTINCT "visitor") FILTER (WHERE "day" = ${today}) AS daily, COUNT(DISTINCT "visitor") FILTER (WHERE "day" >= ${week}) AS weekly, COUNT(DISTINCT "visitor") AS monthly FROM "AnalyticsVisitor" WHERE "day" >= ${cutoff} AND "day" <= ${today}`]);
 const result={scope:"Son 31 gün; PostgreSQL’de anonim günlük/saatlik özetler. En fazla 30 saniye gecikme; tampon taşması veya izleme arızasında eksik ölçüm olabilir. Tekil ziyaretçi: aylık yenilenen anonim tarayıcı kimliği; IP kaydedilmez. Bot filtresi yaklaşık.",lastFlush,dropped,days:daily.map(v=>({day:v.day,views:v._sum.views??0})),pages:Object.fromEntries(page.map(v=>[v.page,v._sum.views??0])),hours:Array.from({length:24},(_,i)=>hour.find(v=>v.hour===i)?._sum.views??0),uniqueToday:Number(unique[0]?.daily??0),uniqueWeek:Number(unique[0]?.weekly??0),uniqueMonth:Number(unique[0]?.monthly??0)};
 cache=result;cacheAt=Date.now();return result;
 })().finally(()=>{task=null;});return task;
}
