"""Local production build, synthetic API, no live data or external HTTP traffic."""
import copy,json,pathlib
from playwright.sync_api import sync_playwright,expect
BASE='http://localhost:3146';API='http://localhost:4046'
OUT=pathlib.Path('test-results/temporary-permissions');OUT.mkdir(parents=True,exist_ok=True)
errors=[];checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 try:
  for width in [390,1440]:
   rows=[{'id':'active','note':'Aktif deneme','scopes':['FMT_DEMO'],'expiresAt':'2030-01-01T00:00:00Z','revokedAt':None,'user':{'dealerId':None,'dealer':None}},
         {'id':'expired','note':'Süresi dolmuş deneme','scopes':['PDF_TOOLS'],'expiresAt':'2020-01-01T00:00:00Z','revokedAt':None},
         {'id':'revoked','note':'İptal denemesi','scopes':['PDF_TOOLS'],'expiresAt':'2030-01-01T00:00:00Z','revokedAt':'2026-01-01T00:00:00Z'}]
   updates=[];fail=[False]
   ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=width==390,has_touch=width==390)
   def route(r):
    if r.request.url.startswith(BASE):r.continue_();return
    if not r.request.url.startswith(API):r.abort();return
    body={};status=200
    if '/api/account' in r.request.url:body={'id':'qa-admin','role':'SUPER_ADMIN','firstName':'Sentetik','lastName':'Yönetici','email':'qa@example.test','twoFactorEnabled':True}
    elif r.request.url.endswith('/temporary-access/dealers'):body=[{'id':'dealer-a','name':'Test Bayisi A'},{'id':'dealer-b','name':'Test Bayisi B'}]
    elif r.request.method=='PATCH':
     update=r.request.post_data_json;updates.append(update)
     if fail[0]:body={'error':'Sentetik kayıt hatası'};status=409
     else:
      rows[0]['scopes']=update['scopes'];dealer=update.get('dealerId')
      rows[0]['user']={'dealerId':dealer,'dealer':{'name':'Test Bayisi '+('A' if dealer=='dealer-a' else 'B')} if dealer else None};body=copy.deepcopy(rows[0])
    elif r.request.url.endswith('/temporary-access'):body={'rows':rows,'serverNow':'2026-11-24T12:00:00Z'}
    elif 'panel-notifications' in r.request.url:body={'notifications':[]}
    elif '/api/announcements' in r.request.url:body={'rows':[],'total':0}
    r.fulfill(status=status,content_type='application/json',body=json.dumps(body),headers={'Access-Control-Allow-Origin':BASE,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'})
   ctx.route('**/*',route)
   ctx.add_init_script('sessionStorage.setItem("kurumsal-auth-token","synthetic-admin");sessionStorage.setItem("kurumsal-splash-seen","1");sessionStorage.setItem("kurumsal-motivation-dismissed","1");localStorage.setItem("ks-analytics-consent","denied");localStorage.setItem("kurumsal-theme","dark");')
   page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(BASE+'/panel?section=temporary-members')
   if width==1440:page.locator('.sidebar-close').click()
   active=page.locator('.temporary-list article').filter(has_text='Aktif deneme')
   expect(active).to_be_visible()
   for note in ['Süresi dolmuş deneme','İptal denemesi']:
    expect(page.locator('.temporary-list article').filter(has_text=note).get_by_role('button',name='Yetkileri Düzenle',exact=True)).to_be_disabled()
   edit=active.get_by_role('button',name='Yetkileri Düzenle',exact=True);edit.click()
   form=active.get_by_role('form');expect(form.get_by_role('checkbox',name='FMT',exact=False)).to_be_checked()
   save=form.get_by_role('button',name='Yetkileri Kaydet',exact=True)
   form.get_by_role('checkbox',name='FMT',exact=False).uncheck();expect(save).to_be_disabled()
   form.get_by_role('checkbox',name='PDF',exact=False).check()
   form.get_by_role('checkbox',name='Bayi',exact=False).check();expect(save).to_be_disabled()
   form.get_by_label('Bağlı bayi').select_option('dealer-a');expect(save).to_be_enabled()
   form.get_by_role('button',name='Vazgeç',exact=True).click();assert not updates
   edit.click();form=active.get_by_role('form');expect(form.get_by_role('checkbox',name='FMT',exact=False)).to_be_checked()
   form.get_by_role('checkbox',name='PDF',exact=False).check()
   form.get_by_role('checkbox',name='Bayi',exact=False).check();form.get_by_label('Bağlı bayi').select_option('dealer-b')
   fail[0]=True;form.get_by_role('button',name='Yetkileri Kaydet',exact=True).click()
   expect(page.get_by_role('status').filter(has_text='Sentetik kayıt hatası')).to_be_visible();expect(form.get_by_role('checkbox',name='PDF',exact=False)).to_be_checked()
   fail[0]=False;form.get_by_role('button',name='Yetkileri Kaydet',exact=True).click()
   expect(form).to_have_count(0);expect(active).to_contain_text('Test Bayisi B')
   expect(page.get_by_role('status').filter(has_text='Yetkiler güncellendi')).to_be_visible()
   assert updates[-1]=={'scopes':['FMT_DEMO','PDF_TOOLS','DEALER_EXAMS'],'dealerId':'dealer-b'}
   edit.click();form=active.get_by_role('form');expect(form.get_by_label('Bağlı bayi')).to_have_value('dealer-b')
   form.get_by_role('checkbox',name='Bayi',exact=False).uncheck()
   form.get_by_role('button',name='Yetkileri Kaydet',exact=True).click();expect(form).to_have_count(0)
   assert updates[-1]=={'scopes':['FMT_DEMO','PDF_TOOLS']}
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   active.scroll_into_view_if_needed();page.screenshot(path=str(OUT/f'updated-{width}.png'))
   checks.append(f'{width}px: prefilled edit, validation, cancel, failure/retry, save, dealer removal, inactive grants and no overflow')
   print('PASS',checks[-1],flush=True);ctx.close()
  assert not errors,errors
  (OUT/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
 finally:browser.close()
