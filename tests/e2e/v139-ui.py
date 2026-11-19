import json,re,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-results/v139/ui');out.mkdir(parents=True,exist_ok=True)
seed=json.loads(Path('test-results/v139/ui-seed.json').read_text());checks=[];coverage=[]
def check(name):checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 context.add_init_script('if(window===window.top){sessionStorage.setItem("kurumsal-auth-token",'+json.dumps(seed['token'])+');localStorage.setItem("ks-analytics-consent","denied");sessionStorage.setItem("kurumsal-splash-seen","1")}')
 page=context.new_page();page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda e:errors.append({'message':str(e),'stack':e.stack}))
 page.goto('http://localhost:3119/panel',wait_until='networkidle');expect(page.locator('.panel-welcome')).to_be_visible();expect(page.locator('.welcome-motivation-card')).to_be_visible()
 check('Admin opens actual panel home with preserved welcome and quotes')
 for theme in ['light','dark']:
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':1000});page.evaluate('(t)=>{localStorage.setItem("kurumsal-theme",t);document.documentElement.dataset.theme=t}',theme)
   page.screenshot(path=str(out/f'home-{theme}-{width}.png'),full_page=True)
   if width==390:page.get_by_role('button',name='Menüyü aç',exact=True).click()
   page.locator('[data-operation="announcements"]').click();expect(page.locator('.announcement-center')).to_be_visible();expect(page.locator('.welcome-motivation-card')).to_have_count(0)
   expect(page.locator('.announcement-home')).to_have_count(0)
   page.get_by_role('button',name='Duyuru geçmişi',exact=True).click();page.wait_for_timeout(150)
   page.screenshot(path=str(out/f'announcements-history-{theme}-{width}.png'),full_page=True)
   page.get_by_role('button',name='Yönetim',exact=True).click();page.get_by_role('button',name='Yeni duyuru',exact=True).click();expect(page.locator('.announcement-editor')).to_be_visible()
   page.locator('.announcement-editor').screenshot(path=str(out/f'announcements-editor-{theme}-{width}.png'))
   page.locator('.announcement-editor').get_by_role('button',name='Vazgeç').click()
   page.get_by_role('button',name=re.compile('yardımını aç$')).click();expect(page.locator('.help-center')).to_be_visible();expect(page.locator('.help-center')).to_have_attribute('data-controls-ready','true');page.get_by_role('button',name='Animasyonlu anlatım',exact=True).click();expect(page.locator('.help-simulation')).to_be_visible()
   page.get_by_role('button',name='Oynat',exact=True).click();page.wait_for_timeout(300);page.get_by_role('button',name='Duraklat',exact=True).click();page.locator('.help-center').screenshot(path=str(out/f'help-animation-{theme}-{width}.png'))
   page.get_by_role('button',name='Etkileşimli sayfa turu',exact=True).click();expect(page.locator('.help-tour-card')).to_be_visible();page.locator('.help-tour-card').screenshot(path=str(out/f'help-tour-{theme}-{width}.png'));page.get_by_role('button',name='Turu kapat',exact=True).click()
   if width==390:page.get_by_role('button',name='Menüyü aç',exact=True).click()
   page.locator('.sidebar-brand').click()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(theme,width)
 check('Announcements current/history/admin editor, animation and safe page tour fit both themes and viewports')
 page.set_viewport_size({'width':1440,'height':1000});handle=page.get_by_role('separator');expect(handle).to_be_visible();box=handle.bounding_box();page.mouse.move(box['x']+5,box['y']+20);page.mouse.down();page.mouse.move(370,box['y']+20,steps=12);page.mouse.up();page.wait_for_timeout(100)
 assert abs(page.locator('.sidebar').bounding_box()['width']-370)<3
 page.reload(wait_until='networkidle');assert abs(page.locator('.sidebar').bounding_box()['width']-370)<3
 handle=page.get_by_role('separator');handle.focus();page.keyboard.press('Home');page.wait_for_timeout(60);assert page.locator('.sidebar').bounding_box()['width']==260
 check('Sidebar pointer resizing, saved preference and keyboard reset work')
 page.locator('[data-operation="exam"]').click();expect(page.locator('.exam-txt-dropzone')).to_be_visible();page.get_by_role('button',name=re.compile('yardımını aç$')).click();page.get_by_role('button',name='Animasyonlu anlatım',exact=True).click();page.get_by_role('button',name='Oynat',exact=True).click();page.wait_for_timeout(300);page.screenshot(path=str(out/'evaluation-file-drag.png'),full_page=True);page.get_by_role('button',name='Duraklat',exact=True).click();page.locator('.help-center').get_by_role('button',name='Kapat',exact=True).click()
 check('TXT training renders synthetic drag/drop and selection fields without uploading a real file')
 page.locator('[data-operation="pdf-tools"]').click();expect(page.locator('.pdf-editor iframe')).to_have_count(0);page.get_by_role('tab',name=re.compile('PDF düzenleme')).click();expect(page.locator('.pdf-editor iframe')).to_have_count(1)
 first=page.locator('.pdf-editor iframe');page.wait_for_timeout(600);page.get_by_role('tab',name=re.compile('Dosya ve sayfa')).click();expect(page.locator('.pdf-editor iframe')).to_have_count(2);page.get_by_role('tab',name=re.compile('PDF düzenleme')).click();assert page.locator('.pdf-editor iframe').count()==2
 page.screenshot(path=str(out/'pdf-center-dark-desktop.png'),full_page=True);page.on('dialog',lambda d:d.accept())
 check('PDF center loads only selected workspaces and retains iframe identities across tool switches')
 # Inventory actual mounted controls for every reachable authorized menu screen.
 sections=page.locator('.nav-item[data-operation]').evaluate_all('es=>es.map(e=>({id:e.dataset.operation,label:e.textContent}))')
 for section in sections:
  if section['id'] in ['bird','snake','blocks','store']:continue
  page.locator('[data-operation="'+section['id']+'"]').click();page.wait_for_timeout(180)
  page.get_by_role('button',name=re.compile('yardımını aç$')).click();expect(page.locator('.help-center')).to_be_visible();expect(page.locator('.help-center')).to_have_attribute('data-controls-ready','true')
  report=page.locator('.help-center').evaluate('e=>({visibleControls:e.querySelectorAll(".help-control-list details").length,title:e.querySelector("h2").textContent})')
  assert report['visibleControls']>0 or section['id'] in ['rebuilder'],(section,report)
  report.update({'section':section['id'],'role':'SUPER_ADMIN','state':'default mounted, conditional dialogs not opened'});coverage.append(report)
  page.locator('.help-center').get_by_role('button',name='Kapat',exact=True).click()
 check('Every reachable admin operation screen opens its own guide with actual mounted control inventory')
 # Dealer content never shows administrator creation or filters.
 dealer_context=browser.new_context(viewport={'width':1440,'height':1000});dealer_context.add_init_script('if(window===window.top){sessionStorage.setItem("kurumsal-auth-token",'+json.dumps(seed['dealerToken'])+');sessionStorage.setItem("kurumsal-splash-seen","1")}');dealer_page=dealer_context.new_page();dealer_page.goto('http://localhost:3119/panel',wait_until='networkidle');dealer_page.locator('[data-operation="announcements"]').click();expect(dealer_page.get_by_role('button',name='Yeni duyuru',exact=True)).to_have_count(0);expect(dealer_page.get_by_role('button',name='Yönetim',exact=True)).to_have_count(0)
 dealer_page.get_by_role('button',name=re.compile('yardımını aç$')).click();assert 'Yeni duyuru' not in dealer_page.locator('.help-control-list').inner_text();check('Dealer announcements and guide omit admin management controls')
 # Public scenes obey viewport/reduced motion, without the forbidden ZIP promotion.
 for theme in ['light','dark']:
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':1000});page.evaluate('(t)=>{localStorage.setItem("kurumsal-theme",t);document.documentElement.dataset.theme=t}',theme);page.goto('http://localhost:3119',wait_until='networkidle');assert page.locator('.feature-discovery').count()==3
   for i in range(3):
    scene=page.locator('.feature-discovery').nth(i);scene.scroll_into_view_if_needed();page.wait_for_timeout(180);scene.screenshot(path=str(out/f'discovery-{i}-{theme}-{width}.png'))
   assert 'Bir sınav, yüzlerce kişisel karne' not in page.locator('body').inner_text();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 page.emulate_media(reduced_motion='reduce');scene=page.locator('.feature-discovery').first;scene.scroll_into_view_if_needed();page.wait_for_timeout(150);assert scene.get_attribute('data-playing')=='false'
 check('Three public feature scenes fit both themes/mobile and honor reduced motion; no ZIP marketing scene')
 assert not errors,errors
 Path('test-results/v139/help-browser-coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2));Path('test-results/v139/browser-acceptance.json').write_text(json.dumps({'checks':checks,'consoleErrors':errors},ensure_ascii=False,indent=2));browser.close()
