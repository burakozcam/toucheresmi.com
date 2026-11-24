"""Real localhost production Web/API against the disposable v146 database."""
import json,pathlib,re
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'test-results/v146';seed=json.loads((OUT/'ui-seed.json').read_text());checks=[];errors=[]
BASE='http://localhost:3146';API='http://localhost:4046'
def check(name):
 checks.append(name);print('PASS',name,flush=True);(OUT/'browser-checks.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
 ctx.route(re.compile(r'^https?://(?!localhost[:/]|127\.0\.0\.1[:/])'),lambda r:r.abort())
 ctx.add_init_script('sessionStorage.setItem("kurumsal-splash-seen","1");sessionStorage.setItem("kurumsal-motivation-dismissed","1");localStorage.setItem("ks-analytics-consent","denied");')
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 def auth(token,section='welcome'):
  page.goto(BASE+'/robots.txt');page.evaluate('(t)=>sessionStorage.setItem("kurumsal-auth-token",t)',token);page.goto(BASE+'/panel?section='+section);expect(page.locator('.dashboard')).to_be_visible()
 def nav(section):
  b=page.locator('[data-operation="'+section+'"]');g=b.locator('xpath=ancestor::div[contains(@class,"nav-group")]').first;c=g.locator('.nav-category')
  if c.get_attribute('aria-expanded')!='true':c.click()
  b.click();expect(b).to_have_attribute('aria-current','page')
 def no_overflow():assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 auth(seed['adminToken'])
 expect(page.get_by_test_id('role-badge')).to_have_text('Süper Admin')
 for theme in ['light','dark']:
  page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);page.wait_for_timeout(300)
  logo=page.locator('.sidebar-brand');expect(logo).to_contain_text('sinav.com');assert logo.locator('.brand-mark').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(25, 46, 83)'
  assert logo.locator('.brand-light').evaluate('e=>getComputedStyle(e).color')=='rgb(46, 101, 197)'
  assert logo.locator('.brand-light').evaluate('e=>e.getBoundingClientRect().width>50 && e.scrollWidth<=e.clientWidth+1')
  logo.screenshot(path=str(OUT/f'panel-logo-{theme}.png'))
 auth(seed['aToken']);expect(page.get_by_test_id('role-badge')).to_have_text('Bayi')
 tools=page.locator('.nav-category').filter(has_text='Araçlar');expect(tools.locator('.nav-count')).to_be_visible();assert tools.get_attribute('aria-expanded')=='false'
 total=int(tools.locator('.nav-count').inner_text());tools.click()
 child_counts=page.locator('#'+tools.get_attribute('aria-controls')+' .nav-count').all_inner_texts();assert sum(map(int,child_counts))==total
 nav('announcements');page.locator('.announcement-row').filter(has_text='Yeni').get_by_role('button',name='Detayları görüntüle',exact=True).first.click();expect(page.locator('dialog.announcement-dialog')).to_be_visible()
 expect(tools.locator('.nav-count')).to_have_text(str(total-1)) if total>1 else expect(tools.locator('.nav-count')).to_have_count(0)
 page.locator('dialog.announcement-dialog').get_by_role('button',name='Kapat',exact=True).click()
 check('Brand palette in two themes; verified admin/dealer role badges; Tools closed/open sum and read decrement')
 # Preserve typed support text when the server rejects a create.
 nav('support-create');page.get_by_label('Destek konusu',exact=True).fill('Tarayıcı Destek Denemesi');page.get_by_label('Destek açıklaması',exact=True).fill('Hata sonrasında bu metin korunmalı.');
 page.route(API+'/api/support',lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"Sentetik gönderim hatası"}'))
 page.get_by_role('button',name='Talebi Gönder',exact=True).click();expect(page.locator('.support-workspace [role=alert]')).to_contain_text('Sentetik');expect(page.get_by_label('Destek açıklaması',exact=True)).to_have_value('Hata sonrasında bu metin korunmalı.')
 page.unroute(API+'/api/support');page.get_by_label('Destek görseli',exact=True).set_input_files({'name':'proof.png','mimeType':'image/png','buffer':__import__('base64').b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')})
 # Use a well-formed PNG produced by the actual browser canvas.
 image=page.evaluate('()=>{let c=document.createElement("canvas");c.width=80;c.height=50;let x=c.getContext("2d");x.fillStyle="#2563eb";x.fillRect(0,0,80,50);return c.toDataURL().split(",")[1];}')
 page.get_by_label('Destek görseli',exact=True).set_input_files({'name':'proof.png','mimeType':'image/png','buffer':__import__('base64').b64decode(image)})
 page.get_by_role('button',name='Talebi Gönder',exact=True).click();expect(page.locator('.support-sent')).to_contain_text('Gönderildi');expect(page.locator('.support-sent')).to_contain_text('Talep numaranız:')
 auth(seed['adminToken'],'support-inbox');page.locator('.support-ticket-row').filter(has_text='Tarayıcı Destek Denemesi').first.click();page.get_by_label('Destek yanıtı',exact=True).fill('Tarayıcı üzerinden yanıtlandı.');page.get_by_label('Destek durumu',exact=True).select_option('IN_PROGRESS');page.get_by_role('button',name='Yanıtı Gönder',exact=True).click();expect(page.locator('.support-update').last).to_contain_text('Tarayıcı üzerinden yanıtlandı.')
 expect(page.locator('.support-detail')).to_contain_text('Hesap Türü');expect(page.locator('.support-detail')).to_contain_text('Bayi');expect(page.locator('.support-detail')).to_contain_text('Belirlenemedi')
 page.get_by_role('button',name='Talep Görselini Aç',exact=True).click();expect(page.locator('.support-image')).to_be_visible()
 page.screenshot(path=str(OUT/'support-admin.png'),full_page=True)
 auth(seed['aToken']);support=page.locator('.nav-category').filter(has_text='Destek');expect(support.locator('.nav-count')).to_be_visible();nav('support-mine');page.locator('.support-ticket-row').filter(has_text='Tarayıcı Destek Denemesi').first.click();expect(page.locator('.support-detail')).to_contain_text('Tarayıcı üzerinden yanıtlandı.');expect(page.locator('.support-detail')).to_contain_text('İşlem Devam Ediyor')
 # Read the seeded ticket too: all own reply badges must disappear.
 row=page.locator('.support-ticket-row').filter(has_text='Sentetik Destek');row.first.click();expect(support.locator('.nav-count')).to_have_count(0)
 check('Support UI: failed submit preserves text; valid image/new ticket number; admin reply/status/device; user read removes closed-parent badge')
 # Compact duration selector and explicit reveal/share flow.
 auth(seed['adminToken'],'temporary-members');page.get_by_label('Geçici üye adı veya notu',exact=True).fill('Tarayıcı Yeni Geçici');page.get_by_role('checkbox',name='FMT Yönetimi · Deneme Alanı',exact=True).check()
 for unit,count in [('Dakika',4),('Saat',7),('Gün',6),('Ay',6),('Yıl',1)]:
  page.locator('.duration-units').get_by_role('button',name=unit,exact=True).click();expect(page.locator('.duration-values button')).to_have_count(count)
 page.locator('.duration-units').get_by_role('button',name='Dakika',exact=True).click();page.get_by_role('button',name='Kod Oluştur',exact=True).click();expect(page.locator('.temporary-secret code')).to_be_visible()
 issued_code=page.locator('.temporary-secret code').inner_text();share=page.get_by_role('link',name='WhatsApp’ta Paylaş',exact=True);href=share.get_attribute('href');assert href.startswith('https://wa.me/?text=');assert issued_code in __import__('urllib.parse',fromlist=['unquote']).unquote(href)
 message=__import__('urllib.parse',fromlist=['unquote']).unquote(href);assert 'Panele Giriş:' in message and 'kodla giriş' in message
 page.screenshot(path=str(OUT/'temporary-admin.png'),full_page=True)
 check('Temporary admin: one duration unit at a time, estimated end, code result and user-sent WhatsApp message')
 # Generic GET/preview never consumes the key and exposes no private metadata.
 grant=seed['grant'];key=grant['link'].split('#key=')[1]
 preview=ctx.request.get(BASE+'/gecici-giris?preview=1');assert preview.status==200
 html=preview.text();assert key not in html and grant['code'] not in html and grant['note'] not in html
 assert ctx.request.get(BASE+'/gecici-giris/opengraph-image').status==200
 # Open link in a new browser context, allow automatic POST once.
 direct=browser.new_context(viewport={'width':390,'height':844});direct.route(re.compile(r'^https?://(?!localhost[:/]|127\.0\.0\.1[:/])'),lambda r:r.abort());direct.add_init_script('localStorage.setItem("ks-analytics-consent","denied");sessionStorage.setItem("kurumsal-splash-seen","1");')
 dp=direct.new_page();dp.on('pageerror',lambda e:errors.append(str(e)));dp.goto(BASE+'/gecici-giris#key='+key);dp.wait_for_url('**/panel?section=welcome');expect(dp.get_by_test_id('role-badge')).to_have_text('Geçici Erişim');assert 'key=' not in dp.url
 expect(dp.locator('.temporary-remaining')).to_contain_text('dakika kaldı');assert dp.locator('[data-operation=results]').count()==0
 dp.get_by_role('button',name='Menüyü aç',exact=True).click()
 dp.locator('[data-operation=fmt-upload]').locator('xpath=ancestor::div[contains(@class,"nav-group")]').locator('.nav-category').click();dp.locator('[data-operation=fmt-upload]').click();expect(dp.get_by_role('heading',name='FMT Yönetimi · Deneme Alanı',exact=True)).to_be_visible()
 dp.get_by_role('button',name='FMT’yi İncele',exact=True).click();expect(dp.locator('.temporary-fmt-result')).to_be_visible();dp.screenshot(path=str(OUT/'temporary-mobile.png'),full_page=True)
 # Replaying a consumed link falls back to manual code, while reusable code still works.
 dp.goto(BASE+'/gecici-giris#key='+key);expect(dp.get_by_role('link',name='Geçici Giriş ile Devam Et',exact=True)).to_be_visible();assert 'key=' not in dp.url
 dp.get_by_role('link',name='Geçici Giriş ile Devam Et',exact=True).click();expect(dp.get_by_label('Erişim kodu',exact=True)).to_be_visible();dp.get_by_label('Erişim kodu',exact=True).fill(grant['code']);dp.get_by_role('button',name='Giriş Yap',exact=True).click();dp.wait_for_url('**/panel?section=welcome')
 direct.close();check('Preview safe/generic OG; one-use link auto-login clears URL; isolated mobile FMT; replay fallback and reusable code login')
 # Slow/failing/fresh success account requests: the gate does not read any credentials.
 auth(seed['aToken']);page.route(API+'/api/account',lambda r:r.fulfill(status=503,content_type='application/json',body='{"error":"Sentetik hata"}'));page.reload();expect(page.locator('.panel-session-screen')).to_be_visible();expect(page.locator('.panel-session-screen [role=alert]')).to_contain_text('ulaşılamadı');page.emulate_media(reduced_motion='reduce');assert page.locator('.panel-session-gate>.security-lock').evaluate('e=>getComputedStyle(e).animationName')=='none';page.screenshot(path=str(OUT/'session-error-reduced.png'));page.emulate_media(reduced_motion='no-preference');page.unroute(API+'/api/account')
 def delayed(route):
  page.wait_for_timeout(350);route.continue_()
 page.route(API+'/api/account',delayed);page.reload(wait_until='domcontentloaded');expect(page.locator('.panel-session-gate')).to_be_visible();assert page.locator('.panel-session-screen').evaluate('e=>e.getBoundingClientRect().height>=innerHeight')
 word=page.locator('.session-demo').inner_text();assert len(word)==8 and all(c in 'Şifreniz*' for c in word)
 expect(page.locator('.dashboard')).to_be_visible();page.unroute(API+'/api/account');page.reload();expect(page.locator('.dashboard')).to_be_visible()
 page.emulate_media(reduced_motion='reduce');page.screenshot(path=str(OUT/'panel-final.png'));page.emulate_media(reduced_motion='no-preference')
 check('Session gate: full screen ground, fixed demo text, waiting/error/quick success and reduced-motion panel')
 page.goto(BASE)
 for width in [1440,390]:
  page.set_viewport_size({'width':width,'height':1000})
  for theme in ['light','dark']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);page.wait_for_timeout(300);page.locator('.home-brand-finale').scroll_into_view_if_needed();no_overflow();page.screenshot(path=str(OUT/f'home-footer-{width}-{theme}.png'))
 check('Homepage-only brand finale: both themes, desktop/mobile, centered brand and no overflow')
 assert not errors,errors;check('No JavaScript page errors; localhost-only browser traffic')
 browser.close()
