# Browser regression against a local Web server. All API responses are isolated mocks; no live account or database is used.
import json,re,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[2]
js="""
const fs=require('fs'),{parseOptical,opticalSummary}=require('./apps/api/src/optical-core'),{layoutOzdebirSingle:layout}=require('./apps/api/src/ozdebir-layout');
const text=fs.readFileSync('tests/fixtures/ozdebir/split-anonymous.txt','utf8');
const questions=layout.lessons.flatMap(l=>Array.from({length:['SOSYAL','DİN','İNGİLİZCE'].includes(l.name)?10:20},(_,i)=>({lesson:l.name,number:i+1,answer:'A',weight:1,positions:{A:i+1,B:i+1}})));
const data=parseOptical(text,layout,questions,'Anonim Kurum',{allowMismatch:true});
console.log(JSON.stringify({layout,snapshot:{id:'r',data,summary:opticalSummary(data,3),schoolName:'Anonim Kurum',keyName:'Özdebir Test',templateName:'Özdebir',penalty:3,checks:{warnings:data.warnings,blockers:[]},previewToken:'test-token'}}));
"""
j=json.loads(subprocess.check_output([os.environ.get('NODE_BINARY','node'),'--import','tsx','-e',js],cwd=root,text=True));snap=j['snapshot']; school={'id':'school','name':'Anonim Kurum','city':'Eskişehir','district':'Tepebaşı'}
exam={'id':'key','name':'Özdebir Test','publisher':{'id':'pub','name':'Özdebir'},'grade':8,'active':True,'questionCount':90,'booklets':['A','B'],'lessonCounts':{q['lesson']:sum(x['lesson']==q['lesson'] for x in snap['data']['questions']) for q in snap['data']['questions']}}
archive=[{'id':'txt','name':'anonim-eskişehir.txt','size':23637,'createdAt':'2026-11-14T00:00:00Z','evaluatedAt':None,'resultId':None,'uploadedBy':'Test Bayi'}]
view={**snap,'generalCount':105,'sourceResultIds':['r'],'rankings':{s['id']:{'generalRank':None,'generalCount':105,'schoolRank':None,'schoolCount':105,'classRank':None,'classCount':105} for s in snap['data']['students']}}
errors=[]
def route(r):
 url=r.request.url; path=url.split('/api/',1)[-1].split('?')[0]
 if path=='account':d={'id':'user','email':'qa@example.invalid','firstName':'Test','lastName':'Bayi','role':'DEALER','mustChangePassword':False}
 elif path=='schools':d=[school]
 elif path=='optical/txt-files':d=archive
 elif path=='optical/evaluation-templates':d=[{'id':'fmt','name':'Özdebir Tek / İki Oturum','active':True,'layout':j['layout'],'originalFmt':''}]
 elif path=='optical/evaluation-exams':d=[exam]
 elif path=='optical/infer-fmt':d=[]
 elif path=='optical/preview':d=snap
 elif path=='optical/evaluate':d=snap
 elif path=='optical/result-exams':d=[{'id':'key','publisher':'Özdebir','name':'Özdebir Test','uploadCount':1}]
 elif path=='optical/result-exams/key':d=view
 else:d=[]
 r.fulfill(json=d,headers={'Access-Control-Allow-Origin':'*'})
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox'])
 for width,label in [(1440,'desktop'),(390,'mobile')]:
  c=b.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
  c.add_init_script("sessionStorage.setItem('kurumsal-auth-token','ui-qa');sessionStorage.setItem('kurumsal-splash-seen','1')")
  c.route('**/api/**',route);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(os.environ.get('KS_WEB_URL','http://127.0.0.1:3100')+'/panel');page.locator('.sidebar .nav-item').first.wait_for()
  if width<600:page.locator('.mobile-menu-button').click() if page.locator('.mobile-menu-button').count() else page.get_by_role('button',name=re.compile('Menü')).first.click()
  page.get_by_role('button',name='Sınav Değerlendir',exact=True).click()
  page.get_by_label('anonim-eskişehir.txt dosyasını seç').check()
  page.get_by_label('Değerlendirilecek sınav',exact=True).click();page.get_by_label('Yayınevi veya sınav ara').fill('Özdebir');page.get_by_role('button',name='Özdebir > Özdebir Test',exact=True).click()
  page.get_by_role('button',name='FMT Seçiniz',exact=True).click();page.get_by_role('option',name=re.compile('Özdebir Tek')).click()
  page.get_by_label('İl',exact=True).select_option(label='Eskişehir');page.get_by_label('İlçe',exact=True).select_option(label='Tepebaşı');page.get_by_label('Kurum',exact=True).select_option('school')
  page.screenshot(path=f'/tmp/ks-v125-{label}.png',full_page=True)
  font=page.locator('.sidebar .nav-item').first.evaluate('(e)=>getComputedStyle(e).fontSize');assert font=='14px',font
  overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not overflow,f'{label}: horizontal overflow'
  page.get_by_role('button',name='Seçili TXT’leri yükle ve değerlendir',exact=True).click()
  dialog=page.get_by_role('dialog',name='Uyarılarla tamamlandı');dialog.wait_for();assert '105 öğrenci' in dialog.inner_text();assert '1 öğrencinin sayısal' in dialog.inner_text()
  page.screenshot(path=f'/tmp/ks-v125-{label}-completion.png',full_page=True)
  dialog.get_by_role('button',name='Sonuçları göster',exact=True).click()
  page.get_by_label('Yüklenen sınav',exact=True).wait_for();page.wait_for_function("document.querySelector('[aria-label=\"Yüklenen sınav\"]').value==='key'")
  assert page.get_by_label('Sonuç kurumu',exact=True).input_value()=='school';assert page.get_by_role('button',name='PDF indir',exact=True).is_enabled()
  page.screenshot(path=f'/tmp/ks-v125-{label}-results.png',full_page=True)
  c.close()
 assert not errors,errors
 print(json.dumps({'desktop':'passed','mobile':'passed','completion':'105 students, 1 missing numeric','result_context':'school/key preselected','page_errors':errors},ensure_ascii=False))
 b.close()
