// Read-only tracked-source scan. Never print matched lines or secret values.
const fs=require('node:fs');
const files=fs.readFileSync(0,'utf8').split('\0').filter(Boolean),findings=[];
const rules=[['private-key','HIGH',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['provider-token','HIGH',/\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|sk-proj-[A-Za-z0-9_-]{30,})\b/],['embedded-jwt','HIGH',/\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}\b/],['database-credential','HIGH',/postgres(?:ql)?:\/\/[^\s:'"]+:[^\s@'"]{10,}@(?!(?:127\.0\.0\.1|localhost))/]];
for(const file of files){if(!fs.existsSync(file)||!fs.statSync(file).isFile()||fs.statSync(file).size>2e6||/\.(?:pdf|png|webp|jpg|ttf|woff2?|xlsx?|ico)$|public\/vendor\//.test(file))continue;
 const lines=fs.readFileSync(file,'utf8').split('\n');lines.forEach((line,index)=>{for(const [rule,severity,re]of rules)if(re.test(line))findings.push({file,line:index+1,rule,severity,value:'REDACTED',review:'Candidate; assess synthetic fixtures or placeholders before declaring a secret.'});});
 if(/(?:^|\/)\.env(?:\.(?!example$)[^/]+)?$/.test(file))findings.push({file,rule:'tracked-environment',severity:'HIGH',value:'REDACTED'});
}
console.log(JSON.stringify({scope:'Git tracked files only; values omitted; heuristic scan is not proof of secret absence.',fileCount:files.length,findings},null,2));
