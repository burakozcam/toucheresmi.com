// Own local services. Restart the disposable API between entry widths to respect its real IP limiter.
require('./v149-env.cjs');
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),owned=new Set();const groups=(process.env.UI_ONLY||'home,entry,panel,optical,layout').split(',');
const reuseWeb=process.argv.includes('--reuse-web'),reuseFixture=process.argv.includes('--reuse-fixture');
function service(args,log,env=process.env){const fd=fs.openSync(log,'a'),child=spawn(process.execPath,args,{cwd:root,env,detached:true,stdio:['ignore',fd,fd]});fs.closeSync(fd);owned.add(child);return child;}
async function stop(child){if(!child||child.exitCode!==null||child.signalCode!==null)return;const done=new Promise(resolve=>child.once('exit',resolve));try{process.kill(-child.pid,'SIGTERM');}catch{}await done;owned.delete(child);}
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Local preview did not become ready.');}
async function command(args,env){await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{cwd:root,env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Chromium acceptance command failed.')));});}
let api;
(async()=>{
 // Do not attach to or terminate an unknown API process on the expected port.
 try{await fetch('http://127.0.0.1:4079/api/health');throw Error('Stop the existing local 4079 preview before running this owner script.');}catch(e){if(e.message.startsWith('Stop the existing'))throw e;}
 if(!reuseWeb){try{await fetch('http://127.0.0.1:3179/robots.txt');throw Error('Stop the existing local 3179 preview or pass --reuse-web.');}catch(e){if(e.message.startsWith('Stop the existing'))throw e;}}
 const startApi=async()=>{api=service(['--import','tsx','tests/e2e/v149-serve.cjs'],'/tmp/ks-v149-browser-api.log');await ready('http://127.0.0.1:4079/api/health');};
 await startApi();if(!reuseFixture)await command(['--import','tsx','tests/e2e/v149-ui-seed.cjs'],process.env);
 if(!reuseWeb)service(['node_modules/next/dist/bin/next','start','apps/web','--hostname','127.0.0.1','--port','3179'],'/tmp/ks-v149-browser-web.log',{...process.env,NODE_ENV:'production',NEXT_PUBLIC_API_URL:'http://localhost:4079'});
 await ready('http://127.0.0.1:3179/robots.txt');let merge=process.env.UI_MERGE||'0';
 for(const group of groups){const widths=group==='entry'?['320','390','1440']:[process.env.UI_WIDTHS||'320,390,1440'];for(const width of widths){await command(['tests/e2e/v149-ui.cjs'],{...process.env,UI_ONLY:group,UI_WIDTHS:width,UI_MERGE:merge});merge='1';if(group==='entry'){await stop(api);await startApi();}}}
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{for(const child of [...owned])await stop(child);});
