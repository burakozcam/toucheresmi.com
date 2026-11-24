import test from 'node:test';
import assert from 'node:assert/strict';
import {accessExpiry,accessHash,newAccessSecrets,temporaryPathAllowed,accessIsValid,DURATION_OPTIONS} from '../apps/api/src/temporary-core';
import {notificationCounts} from '../apps/web/lib/access-labels';
import {canOpenSection} from '../apps/web/lib/panel-navigation';
test('v146 all duration units are bounded, month/year endings clamp and expiry is fixed',()=>{
 const now=new Date('2024-02-29T12:30:00Z');
 for(const [unit,values]of Object.entries(DURATION_OPTIONS))for(const value of values)assert(+accessExpiry(unit as keyof typeof DURATION_OPTIONS,value,now)>+now);
 assert.equal(accessExpiry('year',2,now).toISOString(),'2026-02-28T12:30:00.000Z');
 assert.throws(()=>accessExpiry('minute',999));
 assert.equal(accessIsValid({revokedAt:null,expiresAt:now},now),false);
});
test('v146 independent high-entropy key/code hashes and default deny API scopes',()=>{
 const a=newAccessSecrets(),b=newAccessSecrets();assert.notEqual(a.code,b.code);assert.notEqual(a.key,b.key);assert.match(a.code,/^[A-HJ-NP-Z2-9]{12}$/);assert.equal(a.key.length,43);assert.notEqual(accessHash('code',a.code),accessHash('link',a.code));
 for(const p of ['/api/admin/users','/api/optical/templates','/api/optical/results','/api/support','/api/account/password'])for(const method of ['GET','POST','DELETE'])assert.equal(temporaryPathAllowed(method,p,['FMT_DEMO','PDF_TOOLS']),false);
 assert.equal(temporaryPathAllowed('GET','/api/temporary/demo/fmt',[]),false);assert.equal(temporaryPathAllowed('POST','/api/temporary/demo/fmt',['FMT_DEMO']),true);
});
test('v146 menu counts unique accessible notifications, including zero after all reads',()=>{
 const notifications=[{id:'a',section:'announcements'},{id:'b',section:'announcements'},{id:'b',section:'calendar'},{id:'c',section:'calendar'},{id:'hidden',section:'system-users'}];
 assert.deepEqual(notificationCounts(notifications,s=>['announcements','calendar'].includes(s)),{announcements:2,calendar:1});assert.deepEqual(notificationCounts([],()=>true),{});
 for(const section of ['results','support-inbox','system-users','students','school-add','announcements'])assert.equal(canOpenSection(section,'TEMPORARY',false,['FMT_DEMO']),false);
 assert.equal(canOpenSection('fmt-upload','TEMPORARY',false,['FMT_DEMO']),true);assert.equal(canOpenSection('fmt-upload','TEMPORARY'),false);assert.equal(canOpenSection('temporary-members','DEALER'),false);
});
