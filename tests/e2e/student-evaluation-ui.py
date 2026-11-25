"""Real local Chromium + disposable API; external HTTP(S) is blocked."""
import json,pathlib,re
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'test-results/student-evaluation';BASE='http://localhost:3176';API='http://localhost:4076'
seed=json.loads((OUT/'ui-seed.json').read_text());checks=[];errors=[];external=[]
def passed(name):
 checks.append(name);print('PASS',name,flush=True);(OUT/'ui.json').write_text(json.dumps({'checks':checks,'errors':errors,'blockedExternal':external},ensure_ascii=False,indent=2))
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
 def context(width=390,motion='reduce',theme='light'):
  ctx=browser.new_context(viewport={'width':width,'height':900 if width>700 else 844},is_mobile=width<700,has_touch=width<700,reduced_motion=motion)
  def route(r):
   if r.request.url.startswith((BASE,API)):r.continue_()
   else:external.append(r.request.url);r.abort()
  ctx.route('**/*',route);ctx.add_init_script("sessionStorage.setItem('kurumsal-splash-seen','1');sessionStorage.setItem('kurumsal-motivation-dismissed','1');localStorage.setItem('ks-analytics-consent','denied');localStorage.setItem('kurumsal-theme',"+json.dumps(theme)+");")
  page=ctx.new_page();page.set_default_timeout(12000);page.on('pageerror',lambda e:errors.append(str(e)));return ctx,page
 def fits(page):assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 # Entry methods and the real city/district request.
 ctx,page=context();page.goto(BASE+'/login');cards=page.locator('.login-types .login-type');assert cards.count()==4
 expect(cards.nth(2)).to_contain_text('Geçici Giriş');expect(cards.nth(3)).to_contain_text('Öğrenci Girişi');assert cards.nth(3).locator('svg').count()==1
 cards.nth(3).click();page.wait_for_url('**/sonuclar');assert page.locator('form input').count()==1;expect(page.get_by_label('Öğrenciye özel erişim kodu',exact=True)).to_be_visible();assert page.locator('form select').count()==0;assert page.get_by_text('Önceki sınava özel erişim koduyla sorgula').count()==0;assert page.get_by_text('Karne tasarımı ve yazdırma').count()==0
 page.get_by_role('button',name='Öğrenci Numarasıyla Sorgula',exact=True).click();page.get_by_label('İl',exact=True).select_option(label='İstanbul')
 with page.expect_response(lambda r:'/api/student-portal/schools?' in r.url) as response:page.get_by_label('İlçe',exact=True).select_option(label='Üsküdar')
 url=response.value.url;assert 'city=' in url and 'district=' in url
 page.get_by_label('Kurum',exact=True).select_option(seed['otherSchoolId']);page.get_by_label('Öğrenci numarası',exact=True).fill('555');assert page.locator('form input[type=password]').count()==0
 page.get_by_role('button',name='Sonuçlarımı sorgula',exact=True).click();expect(page.get_by_role('button',name='Kişisel kodla devam et',exact=True)).to_be_visible();page.get_by_role('button',name='Kişisel kodla devam et',exact=True).click();assert page.locator('form input').count()==1
 passed('Login card order/SVG; code-only form; real city/district institution list; number lookup asks no code and offers verification')
 # Error, empty, clearing and stale response cases use controlled responses only.
 page.get_by_role('button',name='Öğrenci Numarasıyla Sorgula',exact=True).click();held=[]
 def schools(r):
  u=r.request.url
  if 'Kad%C4%B1k%C3%B6y' in u:held.append(r)
  elif '%C3%9Csk%C3%BCdar' in u:r.fulfill(status=200,content_type='application/json',body=json.dumps([{'id':'fresh','name':'Yeni ilçe kurumu'}]))
  elif 'Beykoz' in u:r.fulfill(status=503,content_type='application/json',body='{"error":"Sentetik hata"}')
  else:r.fulfill(status=200,content_type='application/json',body='[]')
 page.route('**/api/student-portal/schools?*',schools)
 page.get_by_label('İlçe',exact=True).select_option(label='Kadıköy');expect(page.get_by_text('Kurumlar yükleniyor…',exact=True)).to_be_visible();page.get_by_label('İlçe',exact=True).select_option(label='Üsküdar');expect(page.locator('option[value=fresh]')).to_have_count(1)
 for old in held:
  try:old.fulfill(status=200,content_type='application/json',body='[{"id":"stale","name":"Eski ilçe"}]')
  except Exception:pass
 assert page.locator('option[value=stale]').count()==0
 page.get_by_label('Kurum',exact=True).select_option('fresh');page.get_by_label('İlçe',exact=True).select_option(label='Beykoz');expect(page.get_by_text('Kurum listesi alınamadı.',exact=False)).to_be_visible();assert page.get_by_label('Kurum',exact=True).input_value()==''
 page.get_by_role('button',name='Yeniden dene',exact=True).click();expect(page.get_by_text('Kurum listesi alınamadı.',exact=False)).to_be_visible();page.get_by_label('İlçe',exact=True).select_option(label='Adalar');expect(page.get_by_text('Bu ilçede kayıtlı etkin kurum bulunamadı.',exact=True)).to_be_visible();page.get_by_label('İl',exact=True).select_option(label='Ankara');assert page.get_by_label('İlçe',exact=True).input_value()=='';assert page.get_by_label('Kurum',exact=True).input_value()==''
 page.screenshot(path=str(OUT/'entry-mobile.png'));ctx.close();passed('Institution loading/error/retry/empty states; city/district clears descendants; stale response cannot overwrite new district')
 # Real personal-code session, report download, assistant and reload.
 ctx,page=context();page.goto(BASE+'/sonuclar');page.get_by_label('Öğrenciye özel erişim kodu',exact=True).fill(seed['code']);page.get_by_role('button',name='Karnelerimi göster',exact=True).click();page.wait_for_url('**/sonuclarim');expect(page.locator('.public-result-item')).to_have_count(1);expect(page.get_by_role('button',name='Son sınavdan kaç aldım?',exact=True)).to_be_visible();page.get_by_role('button',name='Son sınavdan kaç aldım?',exact=True).click();expect(page.locator('.assistant-answer')).to_have_count(1);expect(page.locator('.assistant-answer')).to_contain_text('puan')
 page.get_by_label('Sorun',exact=True).fill('Son karnemi göster');page.get_by_role('button',name='Sor',exact=True).click();expect(page.locator('.assistant-answer')).to_have_count(2)
 page.get_by_text('Karne tasarımı ve yazdırma',exact=True).click();expect(page.get_by_text('Karne altında kurumsalsinav.com yazısını göster',exact=True)).to_be_visible()
 with page.expect_download() as download:page.get_by_role('button',name='Karnemi PDF indir',exact=True).click()
 download.value.save_as(str(OUT/'browser-portal-report.pdf'));assert (OUT/'browser-portal-report.pdf').read_bytes().startswith(b'%PDF');fits(page);page.screenshot(path=str(OUT/'portal-mobile.png'),full_page=True)
 page.reload();expect(page.locator('.public-result-item')).to_have_count(1);page.get_by_role('button',name='Öğrenci oturumunu kapat',exact=True).click();page.wait_for_url('**/sonuclar');ctx.close();passed('Real code login → /sonuclarim; own result; working assistant/report action/PDF; reload and logout')
 # Email/password A, B, parent through the same selected-method form.
 for label in ['a','b','parent']:
  ctx,page=context(1440);page.goto(BASE+'/sonuclar#ogrenci-girisi');expect(page.get_by_label('E-posta',exact=True)).to_be_visible();assert page.locator('form').count()==1
  page.get_by_label('Hesap türü').select_option('PARENT' if label=='parent' else 'STUDENT');page.get_by_label('E-posta',exact=True).fill(seed[label]['email']);page.get_by_label('Şifre',exact=True).fill(seed[label]['password']);page.get_by_role('button',name='Hesabımla giriş yap',exact=True).click();page.wait_for_url('**/sonuclarim');expect(page.locator('.reader-results-grid article')).to_have_count(1);page.get_by_role('button',name='Sonucu ve karneyi gör',exact=True).click();expect(page.locator('.report-print-area')).to_be_visible();assert page.locator('.report-print-area').inner_text().find('OGRENCI678' if label=='b' else 'OGRENCI555')>=0
  assert ('OGRENCI555' if label=='b' else 'OGRENCI678') not in page.locator('.report-print-area').inner_text()
  fits(page);page.screenshot(path=str(OUT/f'account-{label}.png'));ctx.close()
 passed('Real student A/B and parent account forms; own on-screen report; no cross-student content')
 # New animations: deterministic reduced motion, desktop/mobile and both themes.
 for width in [320,390,1440]:
  for theme in ['light','dark']:
   ctx,page=context(width,theme=theme);requests=[];page.on('request',lambda r:requests.append(r.url));page.goto(BASE+'/');scenes=page.locator('.demo-scene');expect(scenes.nth(0)).to_have_class(re.compile('demo-open-ended'));expect(scenes.nth(1)).to_have_class(re.compile('demo-student-assistant'));expect(page.locator('.demo-open-ended')).to_have_attribute('data-step','100');expect(page.locator('.open-demo-final')).to_have_attribute('data-visible','true');assert page.locator('.assistant-demo-answer').count()==3
   for selector in ['.demo-open-ended','.demo-student-assistant']:
    section=page.locator(selector);section.scroll_into_view_if_needed();section.screenshot(path=str(OUT/f'{selector[1:]}-{width}-{theme}.png'));assert section.locator('h2').evaluate('e=>getComputedStyle(e).animationName')=='none'
   fits(page);assert not any('/api/student-' in url for url in requests);ctx.close()
 passed('Open-ended then assistant; stable headings; reduced motion final state; no student API in demos; 320/390/1440, both themes')
 # Full motion plays once, persists, replays; title does not move during steps.
 ctx,page=context(1440,motion='no-preference');page.goto(BASE+'/');scene=page.locator('.demo-open-ended');scene.scroll_into_view_if_needed();scene.get_by_role('button',name='Yeniden oynat',exact=True).click();heading=scene.locator('h2').bounding_box();page.wait_for_function("()=>document.querySelector('.demo-open-ended').dataset.step>15");assert scene.locator('.open-demo-scan').count()==1;assert scene.locator('h2').bounding_box()==heading;page.wait_for_function("()=>document.querySelector('.demo-open-ended').dataset.step==='100'",timeout=18000);page.wait_for_timeout(1800);expect(scene).to_have_attribute('data-step','100');scene.get_by_role('button',name='Yeniden oynat',exact=True).click();page.wait_for_function("()=>+document.querySelector('.demo-open-ended').dataset.step<20");assistant=page.locator('.demo-student-assistant');assistant.scroll_into_view_if_needed();assistant.get_by_role('button',name='Yeniden oynat',exact=True).click();page.wait_for_function("()=>document.querySelector('.assistant-demo-question span').textContent.length>4");assert assistant.locator('.assistant-demo-cursor').count()>=1;page.wait_for_function("()=>document.querySelector('.demo-student-assistant').dataset.step==='100'",timeout=25000);page.wait_for_timeout(1800);expect(assistant).to_have_attribute('data-step','100');assistant.get_by_role('button',name='Yeniden oynat',exact=True).click();page.wait_for_function("()=>+document.querySelector('.demo-student-assistant').dataset.step<20");ctx.close();passed('Visible once-only playback; scan and typed question; persistent final states; replay works; headings remain fixed')
 # Actual admin session with SVG controls and existing menu behavior.
 for width in [320,390,1440]:
  for theme in ['light','dark']:
   ctx,page=context(width,theme=theme);ctx.add_init_script("sessionStorage.setItem('kurumsal-auth-token',"+json.dumps(seed['adminToken'])+");");page.goto(BASE+'/panel');expect(page.locator('.dashboard')).to_be_visible();logout=page.get_by_role('button',name='Güvenli çıkış',exact=True);expect(logout).to_be_visible();assert logout.locator('svg').count()==1;assert '↪' not in logout.inner_text()
   for button in [logout,page.locator('.dashboard-actions .theme-toggle'),page.get_by_role('button',name='Hesap ayarlarını aç',exact=True)]:
    box=button.bounding_box();assert width>=700 or (box['width']>=43.9 and box['height']>=43.9);assert 0<=box['x'] and box['x']+box['width']<=width+1
   if width<700:
    page.get_by_role('button',name='Menüyü aç',exact=True).click();close=page.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True);expect(close).to_be_visible();assert close.bounding_box()['width']>=44;close.click();expect(page.locator('.dashboard')).to_have_attribute('data-menu-open','false')
   fits(page);assert page.get_by_text('Güncel hesap bilgilerine ulaşılamadı',exact=False).count()==0;page.screenshot(path=str(OUT/f'panel-{width}-{theme}.png'));ctx.close()
 passed('Actual admin: logout/menu SVG; 44px controls fit; existing mobile close behavior; both themes; account warning not reproduced')
 assert not errors,errors;passed('No JavaScript errors');browser.close()
