// Fixed offline suite. No shell, no web entry point, no production credentials.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {catalog,categories,sourceDigest}=require('./test-center-catalog.cjs');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ks-v121-tests-'));
if(Number(process.versions.node.split('.')[0])<22)throw Error('Test raporu için Node.js 22.8+ kullanın.');
const tests=catalog(root),raw=path.join(temp,'events.jsonl'),startedAt=new Date().toISOString(),started=performance.now();
const child=spawnSync(process.execPath,['--import','tsx','--test','--test-concurrency=1','--test-isolation=none','--test-reporter=./tests/reporters/test-center.cjs','--test-reporter-destination='+raw,'tests/run.ts'],{cwd:root,encoding:'utf8',timeout:180000,env:{...process.env,DATABASE_URL:'postgresql://test:test@127.0.0.1:1/ks_qa',JWT_SECRET:'offline-test-only-secret-at-least-32-characters',STORAGE_DIR:temp,SMTP_HOST:'',SMTP_USER:'',SMTP_PASSWORD:'',ADMIN_EMAIL:'',ADMIN_PASSWORD:'',RECAPTCHA_SECRET_KEY:'',TURNSTILE_SECRET_KEY:'',RECAPTCHA_ENABLED:'false',TURNSTILE_ENABLED:'false'}});
const events=fs.existsSync(raw)?fs.readFileSync(raw,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)):[];
for(const t of tests){const matches=events.filter(e=>e.name===t.name);if(matches.length===1)Object.assign(t,matches[0]);}
const count=rows=>({total:rows.length,passed:rows.filter(t=>t.status==='passed').length,failed:rows.filter(t=>t.status==='failed').length,skipped:rows.filter(t=>t.status==='skipped').length,notRun:rows.filter(t=>t.status==='not_run').length});
const digest=sourceDigest(root);
const scripts=fs.readdirSync(path.join(root,'tests/e2e')).filter(f=>/\.(cjs|ts|py)$/.test(f)).filter(f=>!['tls.cjs','v114-flows.cjs'].includes(f)).map(file=>({name:file,type:file.includes('postgres')?'PostgreSQL entegrasyon':/pdf/.test(file)?'PDF stres / QA':'Tarayıcı / entegrasyon',status:'not_run'}));
scripts.push({name:'api-package-smoke.cjs',type:'Derlenmiş API / Passenger sözleşmesi',status:'not_run'},{name:'browser-v105.cjs',type:'Eski tarayıcı kabul betiği',status:'not_run'});
try{const evidence=JSON.parse(fs.readFileSync(path.join(root,'test-results/v121-acceptance.json'),'utf8'));if(evidence.sourceDigest===digest)for(const script of scripts){const recorded=evidence.scripts.find(s=>s.name===script.name);if(recorded&&['passed','failed','skipped','not_run'].includes(recorded.status))Object.assign(script,recorded);}}catch{}
const report={schemaVersion:1,version:'1.2.2-rc.1',startedAt,finishedAt:new Date().toISOString(),durationMs:Math.round(performance.now()-started),exitCode:child.status??1,sourceDigest:digest,scope:'Yerel Node testleri; veritabanı sahte bağlantı + izole taklitler. Üretim kabul kanıtı değildir. Tarayıcı/DB betikleri ayrıca raporlanır.',summary:count(tests),categories:categories.map(name=>({name,...count(tests.filter(t=>t.category===name))})),tests,scripts};
fs.writeFileSync(path.join(root,'apps/api/assets/test-center-report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(temp,'runner.log'),child.stdout+'\n'+child.stderr);
console.log(JSON.stringify({summary:report.summary,exitCode:report.exitCode,durationMs:report.durationMs,log:path.join(temp,'runner.log'),failed:tests.filter(t=>t.status==='failed').map(t=>t.name)},null,2));
process.exitCode=child.status??1;
