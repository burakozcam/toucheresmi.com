// One owned lifecycle: synthetic fixtures, localhost servers, Chromium, cleanup.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'test-results/v142'),children=[];fs.mkdirSync(out,{recursive:true});
function start(command,args,name,options={}){const log=fs.openSync(path.join(out,name+'.log'),'w'),p=spawn(command,args,{cwd:root,stdio:['ignore',log,log],...options});fs.closeSync(log);children.push(p);return p;}
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('Not ready: '+url);}
async function finished(p,label){const code=await new Promise(r=>p.once('exit',r));if(code)throw Error(label+' failed; see test-results/v142/'+label+'.log');}
(async()=>{
 await finished(start(process.execPath,['--import','tsx','tests/e2e/v142-http.cjs'],'http'),'http');
 start(process.execPath,['--import','tsx','tests/e2e/v142-serve.cjs'],'browser-api');
 start(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-p','3122','-H','127.0.0.1'],'browser-web',{cwd:path.join(root,'apps/web'),env:{...process.env,NEXT_PUBLIC_API_URL:'http://localhost:4022'}});
 await Promise.all([ready('http://localhost:4022/api/health'),ready('http://localhost:3122/login')]);
 await finished(start('python3',['tests/e2e/v142-ui.py'],'browser'),'browser');console.log('PASS v142 PostgreSQL HTTP and Chromium acceptance');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>{for(const p of children)if(p.exitCode===null)p.kill('SIGTERM');});
