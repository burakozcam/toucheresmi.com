"""v1.4.8 real Chromium acceptance; all traffic stays on the two disposable localhost services."""
import json,pathlib,re
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'test-results/v148';BASE='http://localhost:3178';API='http://localhost:4078'
seed=json.loads((OUT/'ui-seed.json').read_text());checks=[];errors=[]
def passed(name):
 checks.append(name);print('PASS',name,flush=True);(OUT/'evaluation-ui.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
 def context(width=390,motion='reduce',theme='light',admin=False):
  ctx=browser.new_context(viewport={'width':width,'height':1000 if width>700 else 844},is_mobile=width<700,has_touch=width<700,reduced_motion=motion)
  ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith((BASE,API)) else r.abort())
  ctx.add_init_script("sessionStorage.setItem('kurumsal-splash-seen','1');sessionStorage.setItem('kurumsal-motivation-dismissed','1');localStorage.setItem('ks-analytics-consent','denied');localStorage.setItem('kurumsal-theme',"+json.dumps(theme)+");"+("sessionStorage.setItem('kurumsal-auth-token',"+json.dumps(seed['adminToken'])+");" if admin else ''))
  page=ctx.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)));return ctx,page
 def fits(page):assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 def no_session(page):assert not page.evaluate("sessionStorage.getItem('kurumsal-student-portal-token')")
 def number(page,district,school,no='555'):
  page.get_by_role('button',name='Öğrenci Numarasıyla Sorgula',exact=True).click();page.get_by_label('İl',exact=True).select_option(label='İstanbul');page.get_by_label('İlçe',exact=True).select_option(label=district);page.get_by_label('Kurum',exact=True).select_option(school);page.get_by_label('Öğrenci numarası',exact=True).fill(no);page.get_by_role('button',name='Sonuçları Göster',exact=True).click()
 # Real panel interactions; only preview/evaluate responses are controlled to isolate the three completion states.
 ctx,page=context(1440,admin=True);mode=['clean']
 def outcome(r):
  if r.request.url.endswith('/preview'):r.fulfill(json={'data':{'students':[{'id':str(i),'name':'Sentetik Öğrenci','branch':'8-A','sourceLines':[i+1]} for i in range(6)]},'checks':{'blockers':[],'warnings':[]},'previewToken':'synthetic-local-preview'});return
  if mode[0]=='failure':r.fulfill(status=422,json={'error':'Sentetik başarısız değerlendirme: güvenilir kayıt yok.'});return
  data={'students':[{'id':str(i),'name':'Sentetik Öğrenci','branch':'8-A','sourceLines':[i+1]} for i in range(6)],'warnings':['0 öğrencinin sözel oturumu eksik.'],'diagnostics':{'missingVerbal':0,'missingNumeric':0,'duplicateRecords':0,'rejectedLines':[]}}
  if mode[0]=='warning':data['warnings'].append('Kitapçık bilgisi eksik.');data['diagnostics']['missingNumeric']=2
  r.fulfill(json={'id':'synthetic-completion','schoolId':seed['schoolId'],'keyId':seed['keyId'],'data':data,'changes':{'added':6,'updated':0,'unchanged':0},'checks':{'warnings':[]}})
 page.route('**/api/optical/preview',outcome);page.route('**/api/optical/evaluate',outcome);page.goto(BASE+'/panel?section=exam');expect(page.locator('.optical-module')).to_be_visible()
 page.get_by_role('button',name='FMT Seçiniz',exact=True).click();page.get_by_role('option',name=re.compile('7108')).first.click();page.get_by_role('button',name='Değerlendirilecek sınav',exact=True).click();page.get_by_label('Yayınevi veya sınav ara',exact=True).fill(seed['examName']);page.locator('.exam-picker-exams button').filter(has_text=seed['examName']).click()
 page.get_by_label('İl',exact=True).select_option(label='İstanbul');page.get_by_label('İlçe',exact=True).select_option(label='Kadıköy');page.get_by_label('Kurum',exact=True).select_option(seed['schoolId'])
 for state in ['clean','warning','failure']:
  mode[0]=state;page.locator('.txt-archive-row:not(.txt-archive-head) input[type=checkbox]').first.check();page.get_by_role('button',name='Seçili TXT’leri yükle ve değerlendir',exact=True).click();dialog=page.locator('.evaluation-completion')
  if state=='failure':expect(page.locator('.optical-module>.notice.error')).to_contain_text('Sentetik başarısız');expect(dialog).not_to_be_visible();page.screenshot(path=str(OUT/'evaluation-failure.png'));continue
  expect(dialog).to_be_visible();expect(dialog.locator('h2')).to_have_text('Değerlendirme tamamlandı' if state=='clean' else 'Uyarılarla tamamlandı');expect(dialog).to_contain_text('6 öğrenci değerlendirildi. Sonuçlar kaydedildi.');assert dialog.get_by_role('button',name='Sonuçları göster',exact=True).is_enabled();assert dialog.locator('li').count()==(0 if state=='clean' else 2)
  if state=='warning':dialog.locator('summary').click();expect(dialog).to_contain_text('2 öğrencinin sayısal oturumu eksik.');assert '0 öğrencinin' not in dialog.inner_text()
  else:assert dialog.locator('summary').count()==0
  dialog.screenshot(path=str(OUT/f'evaluation-{state}.png'));dialog.get_by_role('button',name='Kapat',exact=True).click()
 ctx.close();assert not errors,errors;passed('Completion UI: six students / zero counters and zero warning rows = success; nonzero counter/record = warning; failed request shows error without success dialog; result/close controls retained');browser.close()
