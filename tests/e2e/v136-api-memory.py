"""API/client in separate processes: observe the API's actual RSS, synthetic DB only."""
import json,subprocess,re,time
from pathlib import Path
from playwright.sync_api import sync_playwright
seed=json.loads(Path('test-results/v136/upload-seed.json').read_text());headers={'Authorization':'Bearer '+seed['token']};records=[]
pid=subprocess.check_output(['pgrep','-f','^node --max-old-space-size=256 --import tsx tests/e2e/v135-serve.cjs$'],text=True).strip()
def memory():
 s=Path('/proc/'+pid+'/status').read_text();return {key:int(re.search(r'^'+key+r':\s*(\d+)',s,re.M)[1]) for key in ['VmRSS','VmHWM']}
with sync_playwright() as p:
 c=p.request.new_context(base_url='http://localhost:4015',extra_http_headers=headers,timeout=90000)
 files=c.get('/api/optical/txt-files');assert files.ok,files.text();file_ids=[f['id'] for f in files.json() if f['name']=='4995-synthetic.txt'][:1];assert file_ids
 body={'fileIds':file_ids,'schoolId':seed['schoolId'],'templateId':seed['templateId'],'keyId':seed['keyId'],'encoding':'auto','mergeSessions':'true'}
 before=memory();r=c.post('/api/optical/preview',data=body);assert r.ok,r.text()[:300];data=r.json();assert len(data['data']['students'])==4995;token=data['previewToken'];del data;r.dispose();records.append({'stage':'preview',**memory()})
 r=c.post('/api/optical/evaluate',data={**body,'previewToken':token,'confirmWarnings':'true'});assert r.status==201,r.text()[:300];assert len(r.json()['data']['students'])==4995;r.dispose();records.append({'stage':'evaluate',**memory()})
 r=c.get('/api/optical/result-exams/'+body['keyId']+'?schoolId='+body['schoolId']);assert r.ok,r.text()[:300];data=r.json();assert len(data['data']['students'])==4995;assert len(data['rankings'])==4995;assert all(rank['schoolCount']==4995 and rank['schoolRank']==1 for rank in data['rankings'].values());r.dispose();records.append({'stage':'results-and-ranks',**memory()});c.dispose()
report={'records':4995,'nodeHeapCapMiB':256,'before':before,'stages':records};Path('test-results/v136/api-process-memory.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
