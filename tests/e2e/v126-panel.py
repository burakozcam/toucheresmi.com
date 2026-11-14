"""Production Web build UI with isolated anonymous API responses."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('KS_WEB_URL','http://127.0.0.1:3100');passed=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox'])
 for width in [1440,390]:
  context=b.new_context(viewport={'width':width,'height':1000},permissions=['clipboard-read','clipboard-write']);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def api(r):
   path=r.request.url.split('/api/',1)[-1].split('?')[0]
   if path=='account':data={'id':'owner','firstName':'Test','lastName':'Admin','email':'qa@example.invalid','role':'SUPER_ADMIN','mustChangePassword':False}
   elif path=='auth/setup':data={'token':'qa-setup-session','user':{'id':'owner','role':'SUPER_ADMIN','email':'qa@example.invalid'}}
   elif path=='shares':data=[{'id':'link','name':'Özdebir Sözel ve Sayısal Paylaşımı','category':'FMT','creator':'Admin','createdAt':'2026-11-15T00:00:00Z','expiresAt':'2027-01-01T12:30:00Z','status':'active','views':12,'downloads':3,'lastAccessAt':'2026-11-15T00:00:00Z','url':'https://example.invalid/fmt-paylasim/link#'+'x'*43}]
   elif path=='optical/fmt-shares' and r.request.method=='POST':data={'id':'new','url':'https://example.invalid/fmt-paylasim/new#'+'x'*43,'expiresAt':'2027-01-01T12:30:00Z'}
   else:data=[]
   r.fulfill(json=data,headers={'Access-Control-Allow-Origin':'*'})
  page.route('**/api/**',api);page.add_init_script("if(!sessionStorage.getItem('kurumsal-auth-token')){sessionStorage.setItem('kurumsal-auth-token','qa-dummy');sessionStorage.setItem('kurumsal-auth-user',JSON.stringify({id:'owner',role:'SUPER_ADMIN',firstName:'Test',lastName:'Admin'}));}")
  page.goto(base+'/panel',wait_until='domcontentloaded')
  def navigate(name):
   if width<600:page.get_by_role('button',name='Menüyü aç').click()
   page.get_by_role('button',name=name,exact=True).click()
  navigate('Paylaşım Bağlantıları');expect(page.get_by_role('heading',name='Paylaşım Bağlantıları')).to_be_visible();expect(page.locator('.share-link-card')).to_contain_text('12 görüntüleme')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'shares overflow {width}'
  navigate('FMT Paylaş');page.locator('.fmt-sharing input[type=checkbox]').first.check();page.locator('.fmt-share-controls>button').click();page.get_by_role('button',name='Süreli bağlantı oluştur',exact=True).click();expect(page.get_by_label('FMT paylaşım bağlantısı')).to_have_value('https://example.invalid/fmt-paylasim/new#'+'x'*43)
  assert page.locator('.fmt-share-panel').bounding_box()['width']>=240
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'fmt overflow {width}'
  assert not errors,errors;passed.append(f'share management and FMT panel {width}')
  page.goto(base+'/hesap-kur#'+'x'*43,wait_until='domcontentloaded');page.get_by_label('Yeni şifre',exact=True).fill('güvenli uzun parola cümlesi');page.get_by_label('Şifreyi tekrar yazın',exact=True).fill('güvenli uzun parola cümlesi');page.get_by_role('button',name='Şifremi belirle',exact=True).click();page.wait_for_url('**/panel');assert page.evaluate("sessionStorage.getItem('kurumsal-auth-token')")=='qa-setup-session';passed.append(f'invitation setup auto-login {width}');context.close()
 b.close();print(json.dumps({'passed':passed},ensure_ascii=False))
