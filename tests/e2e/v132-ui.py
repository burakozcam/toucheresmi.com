"""Actual production Web + API + PostgreSQL using only v132-security.cjs synthetic seed.
No HTTP API mocking. CAPTCHA is disabled only in this isolated API process.
"""
import json,os,time,base64,hmac,hashlib,struct
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-results/v132/ui');out.mkdir(parents=True,exist_ok=True)
seed=json.loads(Path('test-results/v132/seed.json').read_text());base='http://localhost:3110';api='http://localhost:4000';checks=[];errors=[]
def totp(secret):
 step=int(time.time())//30;mac=hmac.new(base64.b32decode(secret+'='*((8-len(secret)%8)%8)),struct.pack('>Q',step),hashlib.sha1).digest();o=mac[-1]&15;return str((struct.unpack('>I',mac[o:o+4])[0]&0x7fffffff)%1000000).zfill(6)
def nav(page,name):
 toggle=page.get_by_role('button',name='Menüyü aç',exact=True)
 if toggle.is_visible():toggle.click()
 page.locator('.sidebar').get_by_role('button',name=name,exact=True).click()
def login(page,email,admin=False,recovery=None):
 page.goto(base+'/login?type='+('admin' if admin else 'dealer'))
 if admin:page.get_by_role('button',name='Yönetici Girişi',exact=False).last.click()
 form=page.locator('form.login-form').last;form.locator('input[name=email]').fill(email);form.locator('input[name=password]').fill(seed['password']);form.locator('button:not([type=button])').last.click()
 if recovery:
  page.get_by_label('İki aşamalı doğrulama kodu').fill(recovery);page.get_by_role('button',name='Doğrula ve giriş yap',exact=True).click()
 page.wait_for_url(base+'/panel');page.locator('.sidebar').wait_for()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox'])
 c=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 c.add_init_script("if(window===window.top){localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1');}")
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 login(page,seed['admin']['email'],True,seed['admin']['recovery'][int(os.environ.get('V132_RECOVERY_INDEX','0'))]);admin_token=page.evaluate("sessionStorage.getItem('kurumsal-auth-token')")
 nav(page,'Bayiler');page.get_by_role('row').filter(has_text=seed['dealer']['email']).get_by_role('button',name='Yönet',exact=True).click();expect(page.get_by_role('heading',name='İşlem yetkileri',exact=True)).to_be_visible()
 toggle=page.get_by_role('checkbox',name='Sınav sonuçlarını silebilir / geri yükleyebilir',exact=True);toggle.uncheck();page.get_by_role('button',name='Yetkileri kaydet',exact=True).click();expect(page.get_by_role('status')).to_contain_text('hemen uygulanır')
 dealer=c.new_page();dealer.on('pageerror',lambda e:errors.append(str(e)));login(dealer,seed['dealer']['email']);dealer_token=dealer.evaluate("sessionStorage.getItem('kurumsal-auth-token')")
 denied=dealer.request.post(api+'/api/optical/results/'+seed['resultId']+'/delete',headers={'Authorization':'Bearer '+dealer_token},data={'confirm':True});assert denied.status==403
 toggle.check();page.get_by_role('button',name='Yetkileri kaydet',exact=True).click();expect(page.get_by_role('status')).to_contain_text('hemen uygulanır');checks.append('UI permission edit applies immediately to live dealer API');print('Permissions UI passed',flush=True)
 page.screenshot(path=str(out/'dealer-before-region.png'),full_page=True)
 # Region modes, quota and actual detail view remain usable at all widths and themes.
 page.get_by_label('Erişim modu',exact=True).select_option('restricted');page.get_by_label('Bölge',exact=True).select_option('city');page.get_by_label('İl',exact=True).select_option('İstanbul');page.get_by_label('İlçe',exact=True).select_option('Kadıköy');page.get_by_role('button',name='Bölge kuralı ekle',exact=True).click();page.get_by_label('Kota',exact=True).select_option('500')
 page.get_by_role('button',name='Yetkileri kaydet',exact=True).click();expect(page.get_by_role('status')).to_contain_text('hemen uygulanır')
 for width in [320,768,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  for theme in ['light','dark']:
   page.evaluate('(theme)=>{document.documentElement.dataset.theme=theme;localStorage.setItem("kurumsal-theme",theme)}',theme)
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),('dealer details overflow',width,theme)
   page.screenshot(path=str(out/f'dealer-details-{theme}-{width}.png'),full_page=True)
 page.set_viewport_size({'width':1440,'height':1000});page.get_by_label('Erişim modu',exact=True).select_option('free');page.get_by_label('Kota',exact=True).select_option('unlimited');page.get_by_role('button',name='Yetkileri kaydet',exact=True).click();expect(page.get_by_role('status')).to_contain_text('hemen uygulanır');checks.append('Regional rules, quota form and responsive dealer detail: 320/768/1440, light/dark')
 # Representation opens a new isolated tab. The child has no opener/admin token.
 with c.expect_page() as popup:page.get_by_role('button',name='Bayi Paneline Geç',exact=True).click()
 child=popup.value;child.wait_for_url(base+'/panel');expect(child.locator('.impersonation-banner')).to_contain_text('hesabını yönetici olarak görüntülüyorsunuz')
 assert child.evaluate('window.opener===null');assert '#represent' not in child.url
 assert child.evaluate("sessionStorage.getItem('kurumsal-auth-token')")!=admin_token
 assert page.evaluate("sessionStorage.getItem('kurumsal-auth-token')")==admin_token
 child.screenshot(path=str(out/'impersonation.png'),full_page=True);
 with child.expect_event('close'):child.get_by_role('button',name='Admin Paneline Dön',exact=True).click()
 checks.append('Impersonation banner, no opener/admin token, bounded child session and return to original admin tab')
 nav(page,'Bayi Faaliyetleri');expect(page.locator('.dealer-metrics')).to_be_visible();expect(page.get_by_role('checkbox',name='Görünürken 60 saniyede yenile',exact=True)).not_to_be_checked();page.screenshot(path=str(out/'activities.png'),full_page=True);checks.append('Activity filters/statistics load without default polling')
 nav(page,'Hesap Ayarları');expect(page.get_by_role('heading',name='Oturumlar ve iki aşamalı doğrulama',exact=True)).to_be_visible();expect(page.get_by_role('heading',name='Aktif oturumlar',exact=True)).to_be_visible();page.screenshot(path=str(out/'sessions.png'),full_page=True);checks.append('Session/trusted-device UI and administrator step-up controls')
 # Dealer sees only B institutions in its real selectors.
 nav(dealer,'Kurum Yönetimi');expect(dealer.get_by_role('heading',name='Eklediğiniz kurumlar',exact=True)).to_be_visible();content=dealer.locator('.school-list-panel').first.inner_text();assert seed['schools'][0]['name'] not in content and seed['schools'][1]['name'] not in content
 dealer.screenshot(path=str(out/'dealer-own-schools.png'),full_page=True);checks.append('Dealer institution UI excludes other dealer names')
 # Personal guest code resolves its institution; the global institution directory is absent.
 guest=c.new_page();guest.on('pageerror',lambda e:errors.append(str(e)));guest.goto(base+'/sonuclar');expect(guest.get_by_label('Kurum',exact=True).locator('option')).to_have_count(1)
 guest.get_by_label('Kurumunuzun verdiği sınav erişim kodu',exact=True).fill(seed['accessCode']);guest.get_by_role('button',name='Erişim kodumla kurumumu bul',exact=True).click();expect(guest.get_by_label('Kurum',exact=True).locator('option')).to_have_count(2);guest.get_by_label('Öğrenci numarası',exact=True).fill(seed.get('guestIdentifier','00001'));guest.get_by_role('button',name='Sonuçlarımı göster',exact=True).click();expect(guest.locator('.public-result-item')).to_have_count(1);guest.screenshot(path=str(out/'guest-result.png'),full_page=True);checks.append('Guest personal code resolves only its own institution and published result')
 # Visitor design retained under new headers/CSP.
 for width in [320,768,1440]:
  guest.set_viewport_size({'width':width,'height':1000});guest.goto(base);expect(guest.locator('h1')).to_contain_text('Sınava girdin.');assert guest.evaluate('document.documentElement.scrollWidth <= innerWidth');guest.screenshot(path=str(out/f'home-{width}.png'),full_page=True)
 checks.append('v1.3.1 visitor design retained at mobile/tablet/desktop with CSP')
 # Optional real first-time administrator UI setup, with RFC-compatible TOTP.
 if seed.get('newAdmin'):
  ctx=b.new_context(viewport={'width':390,'height':1000},reduced_motion='reduce');ctx.add_init_script("localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')");first=ctx.new_page();first.goto(base+'/login?type=admin');first.get_by_role('button',name='Yönetici Girişi',exact=False).last.click();form=first.locator('form.login-form').last;form.locator('input[name=email]').fill(seed['newAdmin']);form.locator('input[name=password]').fill(seed['password']);form.locator('button:not([type=button])').last.click();expect(first.get_by_role('heading',name='İki aşamalı doğrulamayı kur',exact=True)).to_be_visible();expect(first.get_by_role('img',name='Doğrulama uygulaması kurulum QR kodu')).to_be_visible();first.get_by_text('Manuel kurulum anahtarı',exact=True).click();secret=first.locator('.mfa-secret').inner_text();first.screenshot(path=str(out/'mfa-setup-mobile.png'),full_page=True);first.get_by_label('İki aşamalı doğrulama kodu').fill(totp(secret));first.get_by_role('button',name='Kurulumu doğrula',exact=True).click();expect(first.locator('.recovery-codes code')).to_have_count(10);assert first.evaluate('document.documentElement.scrollWidth <= innerWidth');first.screenshot(path=str(out/'mfa-recovery-mobile.png'),full_page=True);first.get_by_role('button',name='Kodlarımı kaydettim, devam et',exact=True).click();first.wait_for_url(base+'/panel');checks.append('First-time mandatory admin MFA QR/manual setup, TOTP confirmation and one-time recovery-code UI');ctx.close()
 assert not errors,errors
 b.close()
(out/'qa.json').write_text(json.dumps({'checks':checks,'passed':len(checks),'pageErrors':errors},ensure_ascii=False,indent=2));print({'passed':len(checks),'pageErrors':errors,'checks':checks})
