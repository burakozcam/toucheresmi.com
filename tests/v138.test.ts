import test from 'node:test';
import assert from 'node:assert/strict';
import {fmtDisplayLibrary} from '../apps/api/src/fmt-display-library';
import {systemEvaluationTemplates} from '../apps/api/src/evaluation-templates';
import {admissionAllowed,resourcePolicy,acquireCpuLease} from '../apps/api/src/resource-admission';
import {cpuJob,cpuReader,cpuParse} from '../apps/api/src/cpu-jobs';
import {layout7108} from '../apps/api/src/optical-core';
import fs from 'node:fs';
test('v138 FMT display collapses byte-identical system references without rewriting IDs or merging similar names',()=>{
 const system=systemEvaluationTemplates();
 const rows=fmtDisplayLibrary(system);assert.equal(rows.filter(r=>r.code==='7108').length,1);assert.ok(rows.find(r=>r.code==='7108')!.aliases.includes('system-fmt-7108'));
 const one={...system[0],id:'user-one',name:'Özdebir Tek Oturum',validation:{readerConfirmed:true,verifiedAt:'old'}},two={...one,id:'user-two',validation:{readerConfirmed:true,verifiedAt:'new'}};
 const near={...one,id:'different',layout:{...one.layout,fields:{...one.layout.fields,id:{start:2,length:4}}}};
 const isolated={...one,id:'publisher-owned',publisherId:'private-publisher'};
 const result=fmtDisplayLibrary([one,two,near,isolated]);assert.equal(result.filter(r=>r.source==='saved').length,2);assert.ok(result.find(r=>r.code==='7108'&&r.source==='system')!.aliases.includes('user-one'));assert.ok(result.find(r=>r.code==='7108'&&r.source==='system')!.aliases.includes('user-two'));assert.ok(result.some(r=>r.id==='different'));assert.ok(result.some(r=>r.id==='publisher-owned'));
 const inactive=fmtDisplayLibrary([{...system[0],active:false}]);assert.equal(inactive.find(r=>r.code==='7108')!.active,false);assert.ok(inactive.some(r=>r.id===system[0].id));
});
test('v138 CPU admission reserves account memory and shares two atomic slots without a fixed student penalty',()=>{
 assert.equal(admissionAllowed(128*1048576,512*1048576),true);assert.equal(admissionAllowed(resourcePolicy.processCeiling,null),false);assert.equal(admissionAllowed(128*1048576,resourcePolicy.accountRam-resourcePolicy.reserveRam),false);
 const first=acquireCpuLease(),second=acquireCpuLease();try{assert.throws(()=>acquireCpuLease(),(e:any)=>e.code==='CPU_CAPACITY');}finally{first();second();}const next=acquireCpuLease();next();
});
test('v138 combined reader and parse worker preserves the previous two-call results for merged and separate imports',async()=>{
 const text=fs.readFileSync('tests/fixtures/7108-v128/ankara-anonymous.txt','utf8'),questions=JSON.parse(fs.readFileSync('tests/fixtures/7108-v128/ankara-key.json','utf8')),templates=systemEvaluationTemplates();
 for(const mergeSessions of [true,false]){const reader=await cpuReader(text,layout7108,templates),options={mergeSessions,allowMismatch:true},previous=await cpuParse(text,reader.layout,questions,'QA',options),current=await cpuJob<any>({kind:'readParse',text,selected:layout7108,templates,questions,school:'QA',options});assert.deepEqual(current.reader,reader);
 // Randomized encrypted identity envelopes differ; equality of all evaluation fields remains mandatory.
 const stable=(data:any)=>({...data,students:data.students.map(({identityEncrypted,...s}:any)=>s)});assert.deepEqual(stable(current.data),stable(previous));}
 const deferred=await cpuJob<any>({kind:'readParse',deferOnUnmatched:true,text:text+'\nBAD',selected:layout7108,templates,questions,school:'QA',options:{mergeSessions:true,allowMismatch:true}});assert.equal(deferred.data,null);assert.ok(deferred.reader.matched<text.split(/\r?\n/).filter(Boolean).length+1);
});
