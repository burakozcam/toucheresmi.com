// Real production Web + synthetic public catalog. No database or credentials are loaded.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'test-results/v139/home-audit');fs.mkdirSync(out,{recursive:true});
const publishers=['Örnek Yayın A','Örnek Yayın B','Örnek Yayın C'].map((name,i)=>({id:'synthetic-'+i,name,active:true}));
const server=http.createServer((q,r)=>{r.setHeader('Access-Control-Allow-Origin','http://localhost:3119');r.setHeader('Content-Type','application/json');r.setHeader('Cache-Control','no-store');
 const url=new URL(q.url,'http://localhost:4019'),route=url.pathname;
 const data=route==='/api/answer-keys'?{items:publishers.map((publisher,i)=>({id:'sample-'+i,examName:'Örnek Deneme',grade:8,publisher,published:true,files:[],createdAt:'2026-11-01T00:00:00Z'})),total:3,page:1}:route==='/api/publishers'?publishers:route==='/api/store/status'?{open:false}:route==='/api/blog'?{items:[]}:route==='/api/public-config'?{recaptchaEnabled:false}:null;
 r.statusCode=data?200:404;r.end(JSON.stringify(data??{error:'Synthetic fixture has no such resource'}));
});let web;
const ready=async()=>{for(let i=0;i<100;i++){try{if((await fetch('http://localhost:3119')).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('Local Web did not start');};
(async()=>{await new Promise((resolve,reject)=>server.once('error',reject).listen(4019,'127.0.0.1',resolve));
 const log=fs.openSync(path.join(out,'web.log'),'w');web=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','-p','3119','-H','127.0.0.1'],{cwd:path.join(root,'apps/web'),stdio:['ignore',log,log]});
 await ready();const logFile=fs.openSync(path.join(out,'browser.log'),'w'),test=spawn('python3',['tests/e2e/v139-home.py'],{cwd:root,stdio:['ignore',logFile,logFile]});const code=await new Promise(r=>test.once('exit',r));if(code!==0)throw Error('Homepage audit failed; see test-results/v139/home-audit/browser.log');console.log('PASS all v139 homepage scenes');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{web?.kill('SIGTERM');server.close();});
