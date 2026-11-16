"""Read-only local history scan. Reports paths/lines/rule names, never matched values."""
import subprocess,re,json
from pathlib import Path
objects=subprocess.check_output(['git','rev-list','--objects','--all'],text=True).splitlines()
rules={
 'private-key':re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 'aws-access-key':re.compile(r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
 'github-token':re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{50,255})\b'),
 'google-api-key':re.compile(r'\bAIza[A-Za-z0-9_-]{35}\b'),
 'postgres-credential-uri':re.compile(r'postgres(?:ql)?://[^\s:"\']+:[^\s@"\']{12,}@[^\s/"\']+'),
}
findings=[];scanned=0;skipped=0;seen=set()
for item in objects:
 parts=item.split(' ',1)
 if len(parts)!=2:continue
 sha,name=parts
 if sha in seen:continue
 seen.add(sha)
 kind=subprocess.check_output(['git','cat-file','-t',sha],text=True).strip()
 if kind!='blob':continue
 size=int(subprocess.check_output(['git','cat-file','-s',sha],text=True))
 if size>2_000_000:skipped+=1;continue
 raw=subprocess.check_output(['git','cat-file','blob',sha])
 if b'\x00' in raw:skipped+=1;continue
 text=raw.decode('utf-8',errors='replace');scanned+=1
 if Path(name).name in ['.env','.env.local','.env.production']:findings.append({'blob':sha[:12],'path':name,'rule':'tracked-environment-file','line':1})
 for line_no,line in enumerate(text.splitlines(),1):
  for rule,pattern in rules.items():
   if pattern.search(line):
    # Explicit local/example credentials are not treated as confirmed secrets.
    if rule=='postgres-credential-uri' and any(t in line for t in ['localhost','127.0.0.1','example','test','TEST_']):continue
    findings.append({'blob':sha[:12],'path':name,'line':line_no,'rule':rule})
out={'scannedTextBlobs':scanned,'skippedBinaryOrLargeBlobs':skipped,'findings':findings,'scope':'All local Git refs; pattern scan only. No remote GitHub/account scans or sensitive values printed.'}
Path('test-results/v132').mkdir(parents=True,exist_ok=True)
Path('test-results/v132/history-scan.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps(out,ensure_ascii=False))
