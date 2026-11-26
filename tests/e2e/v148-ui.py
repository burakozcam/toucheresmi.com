"""v1.4.8 real Chromium acceptance; all traffic stays on the two disposable localhost services."""
import json,pathlib,re
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'test-results/v148';BASE='http://localhost:3178';API='http://localhost:4078'
seed=json.loads((OUT/'ui-seed.json').read_text());checks=[];errors=[]
def passed(name):
 checks.append(name);print('PASS',name,flush=True);(OUT/'ui.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
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
 ctx,page=context();page.goto(BASE+'/sonuclar');number(page,'Kadıköy',seed['schoolId']);expect(page.locator('.public-result-item')).to_have_count(1);first=page.locator('.public-result-item').inner_text();no_session(page);assert page.get_by_text('Karnemi PDF indir',exact=True).count()==0
 number(page,'Üsküdar',seed['otherSchoolId']);expect(page.locator('.public-result-item')).to_have_count(1);second=page.locator('.public-result-item').inner_text();assert second!=first;no_session(page)
 page.get_by_label('Öğrenci numarası',exact=True).fill('not-found');page.get_by_role('button',name='Sonuçları Göster',exact=True).click();expect(page.locator('.student-entry .notice.error')).to_contain_text('bulunamadı');expect(page.locator('.public-result-item')).to_have_count(0)
 page.get_by_role('button',name='Öğrenciye Özel Erişim Kodu',exact=True).click();page.get_by_label('Öğrenciye özel erişim kodu',exact=True).fill(' '+seed['legacyCode']+' ');page.get_by_role('button',name='Kodla sonuçları göster',exact=True).click();expect(page.locator('.public-result-item')).to_have_count(1);no_session(page);assert page.locator('form select').count()==0
 page.get_by_label('Öğrenciye özel erişim kodu',exact=True).fill('x'*16);page.get_by_role('button',name='Kodla sonuçları göster',exact=True).click();expect(page.locator('.student-entry .notice.error')).to_contain_text('kod');expect(page.locator('.public-result-item')).to_have_count(0)
 fits(page);page.screenshot(path=str(OUT/'entry-mobile.png'));ctx.close();passed('Real number lookup returns each institution result in place; empty result; trimmed 16-character code works without personal session or location fields; invalid code')
 # Controlled list arrival/failure cases exercise the real component without altering database state.
 ctx,page=context();page.goto(BASE+'/sonuclar');page.get_by_role('button',name='Öğrenci Numarasıyla Sorgula',exact=True).click();page.get_by_label('İl',exact=True).select_option(label='İstanbul');held=[]
 def schools(r):
  if 'Kad%C4%B1k%C3%B6y' in r.request.url:held.append(r)
  elif '%C3%9Csk%C3%BCdar' in r.request.url:r.fulfill(json=[{'id':'fresh','name':'Yeni ilçe kurumu'}])
  elif 'Beykoz' in r.request.url:r.fulfill(status=503,json={'error':'Sentetik API hatası'})
  else:r.fulfill(json=[])
 page.route('**/api/student-portal/schools?*',schools);page.get_by_label('İlçe',exact=True).select_option(label='Kadıköy');expect(page.get_by_text('Kurumlar yükleniyor…',exact=True)).to_be_visible();page.get_by_label('İlçe',exact=True).select_option(label='Üsküdar');expect(page.locator('option[value=fresh]')).to_have_count(1)
 for r in held:
  try:r.fulfill(json=[{'id':'stale','name':'Eski yanıt'}])
  except Exception:pass
 assert page.locator('option[value=stale]').count()==0
 page.get_by_label('İlçe',exact=True).select_option(label='Beykoz');expect(page.get_by_text('Kurum listesi alınamadı.',exact=False)).to_be_visible();page.get_by_label('İlçe',exact=True).select_option(label='Adalar');expect(page.get_by_text('Bu ilçede kayıtlı etkin kurum bulunamadı.',exact=True)).to_be_visible();page.get_by_label('İl',exact=True).select_option(label='Ankara');assert page.get_by_label('İlçe',exact=True).input_value()=='';assert page.get_by_label('Kurum',exact=True).input_value()=='';ctx.close();passed('Loading, empty, API error, stale response suppression, province/district descendant clearing')
 # Actual manager screen and real issue/renew/export, followed by student login with its issued code.
 ctx,page=context(1440,admin=True);page.goto(BASE+'/panel?section=student-codes');panel=page.locator('.student-code-management');expect(panel).to_be_visible();expect(panel.get_by_role('button',name='Seçili sonuçları bağla ve kişisel kod oluştur',exact=True)).to_be_disabled();panel.get_by_label('Kurum',exact=True).select_option(seed['schoolId']);panel.get_by_label('Öğrenci numarası',exact=True).fill('555');expect(panel.get_by_role('heading',name=re.compile('Bağlanabilir sonuçlar'))).to_be_visible();panel.locator('.checkbox-row').filter(has_text=seed['examName']).get_by_role('checkbox').check();issue=panel.get_by_role('button',name='Seçili sonuçları bağla ve kişisel kodu yenile',exact=True);expect(issue).to_be_disabled();panel.get_by_role('checkbox',name=re.compile('Seçili sonuçların')).check();issue.click();expect(panel.locator('.student-issued-code code')).to_be_visible();issued=panel.locator('.student-issued-code code').inner_text();assert len(issued)==24
 # Renewal is independently verified through another click/confirmation cycle.
 panel.get_by_role('checkbox',name=re.compile('Seçili sonuçların')).check();issue.click();expect(panel.locator('.student-issued-code code')).not_to_have_text(issued);issued=panel.locator('.student-issued-code code').inner_text();page.screenshot(path=str(OUT/'manager-desktop.png'),full_page=True)
 login=ctx.new_page();login.goto(BASE+'/sonuclar');login.get_by_label('Öğrenciye özel erişim kodu',exact=True).fill(' '+issued+' ');login.get_by_role('button',name='Kodla sonuçları göster',exact=True).click();login.wait_for_url('**/sonuclarim');expect(login.locator('.public-result-item')).to_have_count(1);expect(login.get_by_role('button',name='Son sınavdan kaç aldım?',exact=True)).to_be_visible();login.close()
 dialogs=[]
 def confirm(d):dialogs.append(d.message);d.accept()
 page.on('dialog',confirm)
 for fmt in ['Excel','PDF']:
  with page.expect_download() as dl:panel.get_by_role('button',name='Kurum kodlarını yenile ve '+fmt+' indir',exact=True).click()
  dl.value.save_as(str(OUT/('browser-codes.'+('xlsx' if fmt=='Excel' else 'pdf'))));assert '2026-2027' in dialogs[-1] and 'oturumlar' in dialogs[-1] and 'öğrenci' in dialogs[-1]
 fits(page);ctx.close();passed('Real manager UI: missing selections disabled, number search, visible confirmation, personal issue and renewal, issued 24-character code opens student reports, Excel/PDF downloads confirm institution/year')
 # HTTP metadata and actual static asset response from production Next server.
 ctx,page=context(1440)
 import xml.etree.ElementTree as ET
 sitemap=ctx.request.get(BASE+'/sitemap.xml');assert sitemap.status==200;xml=ET.fromstring(sitemap.text());urls=[v.text for v in xml.findall('{*}url/{*}loc')];assert 'https://kurumsalsinav.com/calisma-plani' in urls;assert not any('/panel' in v or '/sonuclar' in v or 'key=' in v for v in urls)
 robots=ctx.request.get(BASE+'/robots.txt');assert robots.status==200 and 'Sitemap: https://kurumsalsinav.com/sitemap.xml' in robots.text()
 asset=ctx.request.get(BASE+'/open-ended-solution-v148.webp');assert asset.status==200 and asset.headers['content-type'].startswith('image/');assert asset.body()[:4]==b'RIFF';ctx.close();passed('Production HTTP: sitemap 200 valid XML and canonical study-plan URL, robots canonical sitemap, handwriting WebP 200/image bytes')
 # Both themes and widths: final reduced-motion states, footer spacing, panel branding.
 for width in [320,390,1440]:
  for theme in ['light','dark']:
   ctx,page=context(width,theme=theme,admin=True);requests=[];page.on('request',lambda r:requests.append(r.url));page.goto(BASE+'/');scenes=page.locator('.demo-scene');expect(scenes.nth(0)).to_have_class(re.compile('demo-open-ended'));expect(scenes.nth(1)).to_have_class(re.compile('demo-student-assistant'));expect(scenes.nth(0)).to_have_attribute('data-step','100');expect(page.locator('.open-demo-final')).to_have_attribute('data-visible','true');assert page.locator('.assistant-demo-turn:visible').count()==1
   for selector in ['.demo-open-ended','.demo-student-assistant']:
    section=page.locator(selector);section.scroll_into_view_if_needed();section.screenshot(path=str(OUT/f'{selector[1:]}-{width}-{theme}.png'));assert section.locator('h2').evaluate('e=>getComputedStyle(e).animationName')=='none'
   img=page.locator('.open-demo-photo img');assert img.evaluate('e=>e.complete&&e.naturalWidth===960');fits(page);assert not any('/api/student-' in u for u in requests)
   footer=page.locator('.home-brand-finale');footer.scroll_into_view_if_needed();pad=footer.evaluate('e=>parseFloat(getComputedStyle(e).paddingTop)');assert 149<=pad<=201;footer.screenshot(path=str(OUT/f'home-footer-{width}-{theme}.png'))
   page.goto(BASE+'/panel');expect(page.locator('.dashboard')).to_be_visible();foot=page.locator('.dashboard-footnote');expect(foot).to_contain_text('2026 - 2027');expect(foot).to_contain_text('v1.4.8');expect(foot.locator('.brand')).to_be_visible();flag=foot.locator('.turkish-flag').bounding_box();assert abs(flag['width']/flag['height']-1.5)<.01;assert flag['x']>=0 and flag['x']+flag['width']<=width;foot.screenshot(path=str(OUT/f'panel-footer-{width}-{theme}.png'));assert foot.locator('.brand').evaluate('e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest(".brand")===e}');fits(page);ctx.close()
 passed('320/390/1440 and two themes: readable demos, one assistant turn, asset loaded, no student API calls, reduced-motion final state, half-height footer gradient, panel logo/flag/version/year without overflow')
 # Motion: all lines track the scanner, point checks follow scan, final stays, replay works on desktop and mobile.
 for width in [390,1440]:
  ctx,page=context(width,motion='no-preference');page.goto(BASE+'/');scene=page.locator('.demo-open-ended');scene.scroll_into_view_if_needed();scene.get_by_role('button',name='Yeniden oynat',exact=True).click();page.wait_for_function("()=>+document.querySelector('.demo-open-ended').dataset.step>22");scene.get_by_role('button',name='Durdur',exact=True).click();step=int(scene.get_attribute('data-step'));scanned=min(1,max(0,(step-2)/52));assert scene.locator('.open-demo-read-lines [data-visible=true]').count()==sum(scanned>=t for t in [.3,.57,.84]);scene.screenshot(path=str(OUT/f'scan-{width}.png'));scene.get_by_role('button',name='Oynat',exact=True).click();page.wait_for_function("()=>document.querySelector('.demo-open-ended').dataset.step==='100'",timeout=10000);assert scene.locator('.open-demo-rubric [data-done=true]').count()==3;page.wait_for_timeout(800);expect(scene).to_have_attribute('data-step','100');scene.get_by_role('button',name='Yeniden oynat',exact=True).click();page.wait_for_function("()=>+document.querySelector('.demo-open-ended').dataset.step<20")
  assistant=page.locator('.demo-student-assistant');assistant.scroll_into_view_if_needed();assistant.get_by_role('button',name='Yeniden oynat',exact=True).click();height=assistant.locator('.scene-player').bounding_box()['height'];page.wait_for_function("()=>document.querySelector('.assistant-demo-question span').textContent.length>3");page.wait_for_function("()=>+document.querySelector('.demo-student-assistant').dataset.step>43");assert assistant.locator('.assistant-demo-turn:visible').count()==1;assert assistant.locator('.scene-player').bounding_box()['height']==height;page.wait_for_function("()=>document.querySelector('.demo-student-assistant').dataset.step==='100'",timeout=12000);assert assistant.locator('.assistant-demo-turn:visible').count()==1;assistant.get_by_role('button',name='Yeniden oynat',exact=True).click();page.wait_for_function("()=>+document.querySelector('.demo-student-assistant').dataset.step<20");ctx.close()
 passed('Desktop/mobile motion: scan/transcript synchronization, pause/resume, three rubric checks, persistent final states and replay, fixed assistant card height')
 ctx,page=context();page.route('**/open-ended-solution-v148.webp',lambda r:r.abort());page.goto(BASE+'/');page.locator('.demo-open-ended').scroll_into_view_if_needed();expect(page.locator('.open-demo-fallback')).to_be_visible();expect(page.locator('.open-demo-fallback')).to_contain_text('−2');page.screenshot(path=str(OUT/'image-fallback.png'));ctx.close();passed('Failed handwriting asset has readable local fallback')
 assert not errors,errors;passed('No JavaScript errors');browser.close()
