"""Run tests/v130.test.ts first; start local production Web on 127.0.0.1:3110. API calls are mocked; no database is accessed."""
import json,re,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
Path('test-results/v130-ui').mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox'])
 for width in [390,1440]:
  c=b.new_context(viewport={'width':width,'height':1000})
  c.add_init_script("sessionStorage.setItem('kurumsal-auth-token','v130-ui-test');sessionStorage.setItem('kurumsal-splash-seen','1');localStorage.setItem('ks-analytics-consent','denied')")
  seen=[]
  def api(route):
   url=route.request.url
   if '/api/account' in url:d={'id':'qa','role':'SUPER_ADMIN','firstName':'Test','lastName':'Yönetici','email':'qa@example.invalid'}
   elif '/api/admin/publishers' in url:d=[{'id':'a','name':'İlk Yayınevi','active':True},{'id':'b','name':'Özdebir','active':True}]
   elif '/api/schools' in url:d=[{'id':'school','name':'Anonim Kurum','city':'İstanbul','district':'Maltepe','active':True}]
   elif '/result-exams/key/export' in url:
    seen.append(url);route.fulfill(status=200,body=Path('output/pdf/v130/o8126-general-hidden.pdf').read_bytes(),headers={'Content-Type':'application/pdf','Access-Control-Allow-Origin':'*'});return
   elif '/result-exams/key' in url:
    d=json.loads(Path('test-results/v130-view.json').read_text());d['data']['students']=d['data']['students'][:1];s=d['data']['students'][0];d['rankings']={s['id']:{'generalRank':1,'generalCount':3,'schoolRank':1,'schoolCount':1,'classRank':1,'classCount':1}};d['generalCount']=3;d['sourceResultIds']=[]
   elif '/result-exams?' in url:d=[{'id':'key','name':'Anonim Sınav','uploadCount':1}]
   elif '/contact-messages' in url:d={'items':[],'unreadCount':0}
   else:d=[]
   route.fulfill(status=200,json=d,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type'})
  c.route('**/api/**',api);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(os.environ.get('KS_WEB_URL','http://127.0.0.1:3110')+'/panel');page.locator('.sidebar .nav-item').first.wait_for()
  def nav(name):
   if width<600:page.get_by_role('button',name=re.compile('Menü')).first.click()
   page.get_by_role('button',name=name,exact=True).click()
  nav('Cevap Anahtarları');page.get_by_role('button',name='Cevap anahtarı ekle',exact=True).click()
  trigger=page.get_by_role('button',name='Yayınevi seçin',exact=True);trigger.click();page.get_by_role('combobox',name='Yayınevi seçin içinde ara').fill('öz');page.get_by_role('option',name='Özdebir',exact=True).click();expect(trigger).to_have_attribute('aria-expanded','false');expect(trigger).to_contain_text('Özdebir')
  trigger.click();page.get_by_role('combobox',name='Yayınevi seçin içinde ara').press('Escape');expect(trigger).to_have_attribute('aria-expanded','false')
  trigger.click();page.get_by_role('heading',name='Cevap anahtarı ekle',exact=True).click();expect(trigger).to_have_attribute('aria-expanded','false')
  trigger.click();search=page.get_by_role('combobox',name='Yayınevi seçin içinde ara');search.fill('ilk');search.press('ArrowDown');search.press('Enter');expect(trigger).to_have_attribute('aria-expanded','false');expect(trigger).to_contain_text('İlk Yayınevi')
  page.screenshot(path=f'test-results/v130-ui/publisher-{width}.png',full_page=True)
  nav('Sınav Sonuçları');page.get_by_label('İl',exact=True).select_option(label='İstanbul');page.get_by_label('İlçe',exact=True).select_option(label='Maltepe');page.get_by_label('Sonuç kurumu',exact=True).select_option('school');page.get_by_label('Yüklenen sınav',exact=True).select_option('key')
  toggle=page.get_by_role('checkbox',name='Genel katılımı göster',exact=True);expect(toggle).to_be_checked();toggle.uncheck();page.get_by_role('button',name='PDF önizle',exact=True).click();page.locator('iframe.report-pdf-preview').wait_for();assert seen and 'showGeneralParticipation=false' in seen[-1]
  toggle.check();expect(page.locator('iframe.report-pdf-preview')).to_have_count(0);page.get_by_role('button',name='PDF önizle',exact=True).click();page.locator('iframe.report-pdf-preview').wait_for();assert 'showGeneralParticipation=true' in seen[-1]
  assert not errors,errors
  page.screenshot(path=f'test-results/v130-ui/options-{width}.png',full_page=True)
  results.append({'width':width,'selectionClose':True,'selectedLabel':True,'escape':True,'outside':True,'keyboardSearch':True,'pdfOptionForwarded':True,'previewInvalidated':True,'pageErrors':errors});c.close()
 b.close()
Path('test-results/v130-ui/ui.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(results)
