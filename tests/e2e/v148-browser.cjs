// Own both disposable services and tear them down even when Chromium assertions fail.
require('./v148-env.cjs');
const {spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../..'),owned=[];
function service(args,file,env=process.env){const log=fs.openSync(file,'a'),p=spawn(process.execPath,args,{cwd:root,env,detached:true,stdio:['ignore',log,log]});owned.push(p);return p;}
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,300));}throw Error('Local service not ready: '+url);}
async function command(bin,args){await new Promise((resolve,reject)=>{const p=spawn(bin,args,{cwd:root,env:process.env,stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(`${bin} exited ${code}`)));});}
(async()=>{
 service(['--import','tsx','tests/e2e/v148-serve.cjs'],'/tmp/v148-api.log');
 service(['node_modules/next/dist/bin/next','start','apps/web','--hostname','127.0.0.1','--port','3178'],'/tmp/v148-web.log',{...process.env,NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://localhost:4078',API_INTERNAL_URL:'http://127.0.0.1:4078'});
 await ready('http://127.0.0.1:4078/api/health');await ready('http://127.0.0.1:3178/robots.txt');
 await command('python3',['tests/e2e/v148-ui.py']);await command('python3',['tests/e2e/v148-evaluation-ui.py']);
 // SSR must keep the static sitemap entries when every dynamic API call fails.
 process.kill(-owned[0].pid,'SIGTERM');await new Promise(r=>setTimeout(r,800));
 const response=await fetch('http://127.0.0.1:3178/sitemap.xml'),xml=await response.text();if(response.status!==200||!xml.includes('https://kurumsalsinav.com/calisma-plani'))throw Error('Sitemap fallback failed');
 fs.writeFileSync('test-results/v148/sitemap-fallback.json',JSON.stringify({status:response.status,staticPagesSurviveApiFailure:true}));console.log('PASS sitemap HTTP fallback while API is unavailable');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{for(const p of owned){try{process.kill(-p.pid,'SIGTERM');}catch{}}});
