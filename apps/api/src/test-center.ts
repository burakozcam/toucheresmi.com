import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import {Role} from "@prisma/client";
import {requireAuth,requireRole} from "./auth";
import {z} from "zod";
const counts={total:z.number().int().nonnegative(),passed:z.number().int().nonnegative(),failed:z.number().int().nonnegative(),skipped:z.number().int().nonnegative(),notRun:z.number().int().nonnegative()};
export const testReportSchema=z.object({schemaVersion:z.literal(1),version:z.string().max(40),startedAt:z.string().datetime(),finishedAt:z.string().datetime(),durationMs:z.number().nonnegative(),exitCode:z.number().int(),sourceDigest:z.string().regex(/^[a-f0-9]{64}$/),scope:z.string().max(1000),summary:z.object(counts),categories:z.array(z.object({name:z.string().max(100),...counts})).max(30),tests:z.array(z.object({name:z.string().max(500),file:z.string().max(200),category:z.string().max(100),status:z.enum(["passed","failed","skipped","not_run"]),durationMs:z.number().nonnegative()})).max(10000),scripts:z.array(z.object({name:z.string().max(200),type:z.string().max(100),status:z.enum(["passed","failed","skipped","not_run"]),finishedAt:z.string().datetime().optional(),durationMs:z.number().nonnegative().optional()})).max(1000)}).superRefine((r,c)=>{
 if(r.summary.total!==r.tests.length||r.summary.total!==r.summary.passed+r.summary.failed+r.summary.skipped+r.summary.notRun)c.addIssue({code:'custom',message:'Rapor sayıları tutarsız.'});
 for(const [key,status]of [['passed','passed'],['failed','failed'],['skipped','skipped'],['notRun','not_run']] as const)if(r.summary[key]!==r.tests.filter(t=>t.status===status).length)c.addIssue({code:'custom',message:'Rapor durumları tutarsız.'});
 for(const category of r.categories){const tests=r.tests.filter(t=>t.category===category.name);
  if(category.total!==tests.length)c.addIssue({code:'custom',message:'Kategori toplamı tutarsız.'});
  for(const [key,status]of [['passed','passed'],['failed','failed'],['skipped','skipped'],['notRun','not_run']] as const)if(category[key]!==tests.filter(t=>t.status===status).length)c.addIssue({code:'custom',message:'Kategori durumları tutarsız.'});
 }
 if(new Set(r.categories.map(v=>v.name)).size!==r.categories.length||r.categories.reduce((n,v)=>n+v.total,0)!==r.tests.length)c.addIssue({code:'custom',message:'Kategori kapsamı tutarsız.'});
});
export const testCenterRouter=express.Router();
testCenterRouter.get('/api/admin/test-center',requireAuth,requireRole(Role.SUPER_ADMIN),async(_req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 try{const file=path.join(__dirname,'../assets/test-center-report.json');if((await fs.stat(file)).size>2_000_000)throw Error('size');res.json(testReportSchema.parse(JSON.parse(await fs.readFile(file,'utf8'))));}
 catch{res.status(503).json({error:'Doğrulanmış test raporu bulunamadı. Testler başarılı sayılmadı.'});}
});
