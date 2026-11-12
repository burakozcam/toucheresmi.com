// Offline, fixed synthetic suite. Requires the local web build on 127.0.0.1:3100.
// Never imported by the API. Every status comes from an executed child process.
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const {sourceDigest}=require('./test-center-catalog.cjs'),root=path.resolve(__dirname,'..'),digest=sourceDigest(root);
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
const scripts=[];
for(const [name,command,args]of [['api-package-smoke.cjs',process.execPath,['tests/api-package-smoke.cjs']],['v120-pdf-stress.ts',process.execPath,['--import','tsx','tests/e2e/v120-pdf-stress.ts']],['v121-pdf.ts',process.execPath,['--import','tsx','tests/e2e/v121-pdf.ts']],['v121-pdf-qa.py','python3',['tests/e2e/v121-pdf-qa.py']],['v121-ui.cjs',process.execPath,['tests/e2e/v121-ui.cjs']]]){
 const started=performance.now(),result=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:120000,env:{...process.env,DATABASE_URL:'postgresql://test:test@127.0.0.1:1/ks_qa',STORAGE_DIR:'/tmp/ks-v121-acceptance',JWT_SECRET:'local-acceptance-only-secret-at-least-32-characters',SMTP_HOST:'',SMTP_USER:'',SMTP_PASSWORD:'',RECAPTCHA_ENABLED:'false',TURNSTILE_ENABLED:'false'}});
 fs.writeFileSync(path.join(root,'test-results',name+'.log'),result.stdout+'\n'+result.stderr);
 const row={name,status:result.status===0?'passed':'failed',durationMs:Math.round(performance.now()-started),finishedAt:new Date().toISOString()};scripts.push(row);console.log(JSON.stringify(row));
 if(result.status!==0)process.exitCode=1;
}
fs.writeFileSync(path.join(root,'test-results/v121-acceptance.json'),JSON.stringify({sourceDigest:digest,scripts},null,2));
