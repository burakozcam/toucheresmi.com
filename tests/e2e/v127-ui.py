# Local Web + isolated API fixture: real preview/evaluate handlers, in-memory DB.
# The fixture API adapter is documented in the release report; no live accounts.
import json,re,os
from pathlib import Path
from playwright.sync_api import sync_playwright
web=os.environ.get('KS_WEB_URL','http://127.0.0.1:3100')
errors=[]; result={}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox'])
 for width,label in [(1440,'desktop'),(390,'mobile')]:
  c=b.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
  c.add_init_script("sessionStorage.setItem('kurumsal-auth-token','isolated-ui');sessionStorage.setItem('kurumsal-splash-seen','1');localStorage.setItem('ks-analytics-consent','denied')")
  page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(web+'/panel');page.locator('.sidebar .nav-item').first.wait_for()
  if width<600:page.get_by_role('button',name=re.compile('Menü')).first.click()
  page.get_by_role('button',name='Sınav Değerlendir',exact=True).click()
  page.get_by_label('anonim-tek-optik.txt dosyasını seç').check()
  page.get_by_label('Değerlendirilecek sınav',exact=True).click();page.get_by_label('Yayınevi veya sınav ara').fill('Özdebir');page.get_by_role('button',name='Özdebir > Özdebir O8126',exact=True).click()
  page.get_by_role('button',name='FMT Seçiniz',exact=True).click();page.get_by_role('option',name=re.compile('Özdebir Tek')).click()
  page.get_by_label('İl',exact=True).select_option(label='Eskişehir');page.get_by_label('İlçe',exact=True).select_option(label='Tepebaşı');page.get_by_label('Kurum',exact=True).select_option('school')
  page.get_by_role('button',name='Seçili TXT’leri yükle ve değerlendir',exact=True).click()
  dialog=page.get_by_role('dialog',name='Uyarılarla tamamlandı');dialog.wait_for();assert '1 öğrenci' in dialog.inner_text()
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  page.screenshot(path=f'/tmp/v127-browser/{label}-evaluation.png',full_page=True)
  dialog.get_by_role('button',name='Sonuçları göster',exact=True).click();page.get_by_label('Yüklenen sınav',exact=True).wait_for();page.wait_for_function("document.querySelector('[aria-label=\"Yüklenen sınav\"]')?.value==='key'")
  result[label]='real UI -> preview -> warning approval -> evaluate -> result context passed'
  c.close()
 # Mock only Google and login response. Verify submit-time v3, retry token freshness.
 c=b.new_context(viewport={'width':1280,'height':900});c.add_init_script("sessionStorage.setItem('kurumsal-splash-seen','1');localStorage.setItem('ks-analytics-consent','denied');window.__execute=[];window.grecaptcha={ready:cb=>cb(),execute:async(key,options)=>{window.__execute.push(options.action);return 'fresh-'+window.__execute.length;}}")
 seen=[]
 def api(r):
  if '/human-verification' in r.request.url:d={'enabled':True,'provider':'recaptcha-v3','siteKey':'mock-public'};status=200
  elif '/auth/login' in r.request.url:seen.append(r.request.post_data_json);d={'error':'Test için hatalı parola'};status=401
  else:d=[];status=200
  r.fulfill(status=status,json=d,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'})
 c.route('**/api/**',api);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(web+'/login');page.locator('input[name=email]').first.fill('qa@example.invalid');page.locator('input[name=password]').first.fill('test-only-password-123')
 assert page.evaluate('window.__execute.length')==0
 for i in range(2):
  page.get_by_role('button',name=re.compile('^Giriş Yap')).first.click();page.locator('.login-message').filter(has_text='Test için hatalı parola').wait_for();page.wait_for_function(f'window.__execute.length==={i+1}')
 assert [v['humanToken'] for v in seen]==['fresh-1','fresh-2'];assert page.evaluate('window.__execute')==['login','login'];result['recaptcha']='no execute before submit; action login; fresh token on retry'
 c.close()
 # Consent applies to internal metrics too. Query URLs and private routes cannot emit metrics.
 c=b.new_context();c.add_init_script("sessionStorage.setItem('kurumsal-splash-seen','1')");metrics=[]
 def metric(r):
  if '/analytics/page' in r.request.url:metrics.append(r.request.post_data_json)
  r.fulfill(json=[],headers={'Access-Control-Allow-Origin':'*'})
 c.route('**/api/**',metric);page=c.new_page();page.goto(web+'/contact');page.get_by_role('button',name='Analitik için izin ver',exact=True).wait_for();assert metrics==[];page.get_by_role('button',name='Analitik için izin ver',exact=True).click();page.wait_for_timeout(350);assert len(metrics)==1 and metrics[0]['page']=='/contact'
 page.goto(web+'/contact?token=do-not-send');page.wait_for_timeout(200);assert len(metrics)==1
 assert not page.locator('script[src*="googletagmanager"]').count();result['consent']='no analytics before consent; one static page metric after consent; query and unconfigured Google excluded'
 c.close();b.close()
 assert not errors,errors
 print(json.dumps({'checks':result,'pageErrors':errors},ensure_ascii=False,indent=2))
