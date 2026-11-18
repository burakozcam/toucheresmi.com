// Own and close the two synthetic local servers for one browser acceptance run.
// This avoids depending on long-lived development sessions. No production endpoints.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'test-results/v138');fs.mkdirSync(out,{recursive:true});
const children=[];function child(cmd,args,name,options={}){const log=fs.openSync(path.join(out,name+'.log'),'w'),c=spawn(cmd,args,{cwd:root,env:{...process.env,NEXT_PUBLIC_API_URL:'http://localhost:4015'},stdio:['ignore',log,log],...options});children.push(c);return c;}
async function ready(url){for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('Local server not ready: '+url);}
async function run(file){const begin=Date.now(),c=child('python3',['tests/e2e/'+file],file);const timeout=setTimeout(()=>c.kill('SIGTERM'),180000);const code=await new Promise(r=>c.once('exit',r));clearTimeout(timeout);if(code!==0)throw Error(file+' failed; inspect test-results/v138/'+file+'.log');return {name:file,status:'passed',durationMs:Date.now()-begin,finishedAt:new Date().toISOString()};}
(async()=>{child(process.execPath,['--import','tsx','tests/e2e/v137-serve.cjs'],'browser-api');child(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-p','3115','-H','127.0.0.1'],'browser-web',{cwd:path.join(root,'apps/web')});await Promise.all([ready('http://localhost:4015/api/health'),ready('http://localhost:3115/login')]);
 const scripts=[];for(const group of [['v138-ui.py','v138-tools.py'],['v137-ui.py','v137-report-logo-ui.py'],['v138-report-ui.py','v138-theme-audit.py']])scripts.push(...await Promise.all(group.map(run)));
 fs.writeFileSync(path.join(out,'browser-acceptance.json'),JSON.stringify({scripts},null,2));console.log('PASS browser scripts:',scripts.map(s=>s.name).join(', '));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>{for(const c of children)if(c.exitCode===null)c.kill('SIGTERM');});
