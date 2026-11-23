import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import {canonicalSection,canOpenSection} from '../apps/web/lib/panel-navigation';

test('v142 eski FMT adresleri tek alana açılır; bayi ve okul yönetici bölümlerini açamaz',()=>{
 for(const id of ['fmt-share','fmt-download','fmt-edit','fmt-delete','optical-keys'])assert.equal(canonicalSection(id),'fmt-upload');
 for(const section of ['dealers','system-users','share-links','store','audit-logs','exam-records']){assert.equal(canOpenSection(section,'DEALER'),false);assert.equal(canOpenSection(section,'SCHOOL_ADMIN'),false);assert.equal(canOpenSection(section,'SUPER_ADMIN'),true);}
 for(const section of ['fmt-upload','exam','txt-converter']){assert.equal(canOpenSection(section,'DEALER'),true);assert.equal(canOpenSection(section,'SCHOOL_ADMIN'),false);}
 assert.equal(canOpenSection('school-analysis','SCHOOL_ADMIN'),true);assert.equal(canOpenSection('bird','DEALER'),false);assert.equal(canOpenSection('welcome','STUDENT'),false);
});
test('v142 statik izin denetimi 600 dosyayı, geçilemeyen dizini, dünya yazmasını ve symlinki reddeder; değiştirmez',()=>{
 const {checkStaticAssets}=require('../scripts/static-assets-preflight.cjs'),root=fs.mkdtempSync(path.join(os.tmpdir(),'v142-public-'));
 try{fs.chmodSync(root,0o755);const file=path.join(root,'public.html');fs.writeFileSync(file,'public',{mode:0o644});assert.equal(checkStaticAssets(root).failures.length,0);fs.chmodSync(file,0o600);assert.ok(checkStaticAssets(root).failures.some((f:any)=>f.name==='public.html'));assert.equal(fs.statSync(file).mode&0o777,0o600);fs.chmodSync(file,0o666);assert.ok(checkStaticAssets(root).failures.some((f:any)=>/yazılabilir/.test(f.reason)));fs.chmodSync(file,0o644);fs.mkdirSync(path.join(root,'hidden'),{mode:0o700});assert.ok(checkStaticAssets(root).failures.some((f:any)=>f.name==='hidden'));fs.symlinkSync('/not-read-by-preflight',path.join(root,'link'));assert.ok(checkStaticAssets(root).failures.some((f:any)=>/sembolik/.test(f.reason)));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('v142 temsil tokenı seçilen bayiyi imzalar; normal oturum temsil iddiası taşımaz',async()=>{
 const {issueSession}=await import('../apps/api/src/auth-sessions');
 const db={authSession:{create:async({data}:any)=>({id:'v142-session',...data})}},user={id:'dealer-user',role:'DEALER',dealerId:'chosen-dealer',passwordHash:'synthetic'};
 const child=await issueSession(user,undefined,{actorAdminId:'real-admin',parentSessionId:'parent'},db),normal=await issueSession(user,undefined,{},db);
 assert.equal((jwt.decode(child.token) as any).dealerId,'chosen-dealer');assert.equal((jwt.decode(normal.token) as any).dealerId,undefined);
});
test('v142 oturum oluşturma başarısızsa son giriş ve başarı denetimi yazılmaz',async()=>{
 const {prisma}=await import('../apps/api/src/db'),{completePasswordLogin}=await import('../apps/api/src/security-routes');const transaction=prisma.$transaction;
 const user={id:'v142-user',active:true,role:'STUDENT',passwordHash:'synthetic',twoFactorEnabled:false};let loginWrites=0;
 prisma.$transaction=(async(fn:any)=>fn({user:{findUniqueOrThrow:async()=>user,update:async()=>{loginWrites++;}},authSession:{create:async()=>{throw Error('synthetic session storage unavailable');}},auditLog:{create:async()=>{loginWrites++;}}})) as any;
 try{await assert.rejects(()=>completePasswordLogin(user,{} as any,{json:()=>{throw Error('must not return success');}} as any),/synthetic session storage unavailable/);assert.equal(loginWrites,0);}finally{prisma.$transaction=transaction;}
});
