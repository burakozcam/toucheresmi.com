import {Prisma} from '@prisma/client';
import {prisma} from './db';
import {welcomeHighlights} from './student-insights';
/** At most five private metadata rows cross the DB boundary; no class snapshot or recalculation at login. */
export async function studentWelcome(kind:'account'|'portal',subjectId:string,validate?:(student:any,identityKey:string)=>boolean){
 const grants=kind==='account'?Prisma.sql`SELECT id,"resultId","studentNo" AS "studentId",NULL::text AS "identityKey" FROM "StudentResultAccess" WHERE "userId"=${subjectId}`:Prisma.sql`SELECT id,"resultId","studentId","identityKey" FROM "StudentPortalGrant" WHERE "portalId"=${subjectId}`;
 const rows=await prisma.$queryRaw<Array<{id:string;keyId:string;name:string;createdAt:Date;scale:string|null;questionCount:number;student:any;summary:any;identityKey:string|null}>>(Prisma.sql`
 SELECT g.id,r."keyId",k.name,r."createdAt",r.snapshot->>'keyFingerprint' AS scale,
 jsonb_array_length(CASE WHEN jsonb_typeof(r.snapshot->'data'->'questions')='array' THEN r.snapshot->'data'->'questions' ELSE '[]'::jsonb END) AS "questionCount",person.value AS student,score.value AS summary,g."identityKey"
 FROM (${grants}) g JOIN "OpticalResult" r ON r.id=g."resultId" JOIN "School" s ON s.id=r."schoolId" JOIN "OpticalKey" k ON k.id=r."keyId"
 LEFT JOIN LATERAL(SELECT CASE WHEN count(*)=1 THEN jsonb_agg(value)->0 END AS value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(r.snapshot->'data'->'students')='array' THEN r.snapshot->'data'->'students' ELSE '[]'::jsonb END) WHERE value->>'id'=g."studentId") person ON true
 LEFT JOIN LATERAL(SELECT CASE WHEN count(*)=1 THEN jsonb_agg(value)->0 END AS value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(r.snapshot->'summary')='array' THEN r.snapshot->'summary' ELSE '[]'::jsonb END) WHERE value->>'id'=g."studentId") score ON true
 WHERE r."studentPublished"=true AND s.active=true AND (r.snapshot->>'deletedAt') IS NULL AND NOT EXISTS(SELECT 1 FROM "OpticalResult" n WHERE n."supersedesId"=r.id)
 ORDER BY r."createdAt" DESC LIMIT 5`);
 const allowed=rows.filter(row=>row.student&&row.summary&&typeof row.summary.net==='number'&&Number.isFinite(row.summary.net)&&(!validate||validate(row.student,row.identityKey??''))),unique=allowed.filter((row,i)=>allowed.findIndex(other=>other.keyId===row.keyId)===i),latest=unique[0];
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
 const highlights=welcomeHighlights(unique.map(row=>({id:row.keyId,scale:row.scale??'',score:finite(row.summary.score),net:finite(row.summary.net)??0,questionCount:row.questionCount})));
 return{message:latest?`Son yayımlanmış sonuç kaydın: ${latest.name}.`:'Henüz erişime açılmış sınav sonucu yok.',latest:latest?{id:latest.id,date:latest.createdAt}:null,highlights};
}
