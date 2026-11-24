"""Touch Chromium against the local production build; synthetic API, no DB or external traffic."""
import json,pathlib,re
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'test-results/mobile-menu';OUT.mkdir(parents=True,exist_ok=True)
BASE='http://localhost:3146';API='http://localhost:4046';checks=[];errors=[]
def passed(name):
 checks.append(name);print('PASS',name,flush=True);(OUT/'after.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 def context(width=390,height=844,mobile=True,role='DEALER',scopes=None):
  ctx=browser.new_context(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
  def route(r):
   if r.request.url.startswith(BASE):r.continue_();return
   if r.request.url.startswith(API):
    body=[]
    if '/api/account' in r.request.url:
     body={'id':'menu-qa','role':role,'firstName':'Mobil','lastName':'Denemesi','email':'qa@example.test','canPlayGames':False}
     if role=='TEMPORARY':body['temporary']={'id':'synthetic-grant','scopes':scopes or [],'expiresAt':'2030-01-01T00:00:00Z'}
    elif 'panel-notifications' in r.request.url:body={'notifications':[]}
    elif '/api/announcements' in r.request.url:body={'rows':[],'total':0}
    elif 'dealer-policy' in r.request.url:body={'dailyUsed':0,'dailyStudentLimit':100,'dailyRemaining':100,'restrictedRegions':False}
    elif 'result-catalog' in r.request.url:body={'schools':[],'exams':[]}
    r.fulfill(status=200,content_type='application/json',body=json.dumps(body),headers={'Access-Control-Allow-Origin':BASE});return
   r.abort()
  ctx.route('**/*',route);ctx.add_init_script('sessionStorage.setItem("kurumsal-auth-token","synthetic-menu-only");sessionStorage.setItem("kurumsal-splash-seen","1");sessionStorage.setItem("kurumsal-motivation-dismissed","1");localStorage.setItem("ks-analytics-consent","denied");localStorage.setItem("ks-sidebar-width","310");')
  pg=ctx.new_page();pg.set_default_timeout(10000);pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.goto(BASE+'/panel');expect(pg.locator('.dashboard')).to_be_visible();return ctx,pg
 def closed(pg):
  expect(pg.locator('.dashboard')).to_have_attribute('data-menu-open','false')
  expect(pg.locator('.sidebar')).to_have_attribute('inert','')
  expect(pg.locator('.sidebar-overlay')).to_have_attribute('data-open','false')
  expect(pg.locator('.sidebar-rail')).to_be_visible()
  pg.wait_for_function('()=>document.body.style.position!=="fixed" && document.body.style.overflow!=="hidden" && document.documentElement.style.overflow!=="hidden"')
  assert pg.locator('.sidebar-overlay').evaluate('e=>getComputedStyle(e).pointerEvents')=='none'
  expect(pg.locator('.cookie-preference-link')).to_be_visible()
 def opened(pg):
  expect(pg.locator('.dashboard')).to_have_attribute('data-menu-open','true')
  expect(pg.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True)).to_be_visible()
  expect(pg.locator('.sidebar-overlay')).to_have_attribute('data-open','true')
  pg.wait_for_function('()=>document.body.style.position==="fixed" && document.documentElement.style.overflow==="hidden"');pg.wait_for_function('()=>document.querySelector(".sidebar").getBoundingClientRect().left>=-0.5')
  expect(pg.locator('.cookie-preference-link')).not_to_be_visible()
  close=pg.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True).bounding_box()
  brand=pg.locator('.sidebar-brand').bounding_box()
  assert close['width']>=43.99 and close['height']>=43.99, close
  assert abs((close['y']+close['height']/2)-(brand['y']+brand['height']/2))<2
  assert close['x']>=brand['x']+brand['width']
  assert pg.locator('.logout-button').evaluate('e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest(".logout-button")===e}')
 def fits(pg):assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 try:
  ctx,page=context();closed(page)
  page.get_by_role('button',name='Araçlar menüsünü aç',exact=True).tap();opened(page)
  tools=page.locator('.nav-category').filter(has_text='Araçlar');expect(tools).to_have_attribute('aria-expanded','true')
  tools.tap();expect(tools).to_have_attribute('aria-expanded','false');tools.tap();expect(tools).to_have_attribute('aria-expanded','true')
  assert page.locator('.sidebar').evaluate('e=>getComputedStyle(e).transitionDuration')=='0.25s, 0s'
  page.wait_for_timeout(240);page.screenshot(path=str(OUT/'mobile-open.png'))
  page.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True).tap();closed(page)
  page.get_by_role('button',name='FMT Yönetimi menüsünü aç',exact=True).tap();opened(page)
  expect(page.locator('.nav-category').filter(has_text='FMT Yönetimi')).to_have_attribute('aria-expanded','true')
  page.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True).tap();closed(page)
  page.get_by_role('button',name='Araçlar menüsünü aç',exact=True).tap();opened(page)
  page.locator('[data-operation=pdf-tools]').tap();closed(page)
  expect(page.locator('.pdf-editor')).to_be_visible();assert 'section=pdf-tools' in page.url
  assert page.evaluate('window.scrollY')==0
  fits(page);page.screenshot(path=str(OUT/'mobile-selected-tool.png'))
  passed('Touch 390×844: rail → open → Tools toggle closed/open → logo-row close → reopen → select PDF tool; drawer/backdrop close and chosen screen is visible')
  # Restore real scroll position on dismiss; touch scroll must work again afterwards.
  page.evaluate('window.scrollTo(0,250)');y=page.evaluate('window.scrollY');assert y>0
  page.get_by_role('button',name='Araçlar menüsünü aç',exact=True).tap();opened(page)
  assert page.evaluate('document.body.style.top')==f'-{y}px'
  page.locator('.side-nav').evaluate('e=>e.scrollTop=e.scrollHeight')
  assert page.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True).bounding_box()['y']<50
  page.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True).tap();closed(page)
  page.wait_for_timeout(280);assert abs(page.evaluate('window.scrollY')-y)<2
  cdp=ctx.new_cdp_session(page)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':220,'y':650}]})
  for point in range(620,250,-30):
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':220,'y':point}]});page.wait_for_timeout(16)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  page.wait_for_timeout(250);assert page.evaluate('window.scrollY')>y
  passed('Close remains at top after long menu scroll; original page scroll is restored and touch scrolling works after dismissal')
  # Tap the backdrop, Escape, and keyboard focus containment.
  page.get_by_role('button',name='Araçlar menüsünü aç',exact=True).tap();opened(page)
  page.touchscreen.tap(385,250);closed(page)
  page.get_by_role('button',name='Araçlar menüsünü aç',exact=True).tap();opened(page)
  page.keyboard.press('Shift+Tab');assert page.evaluate('document.activeElement.closest(".sidebar")!==null')
  page.keyboard.press('Tab');assert page.evaluate('document.activeElement.closest(".sidebar")!==null')
  page.keyboard.press('Escape');closed(page)
  expect(page.get_by_role('button',name='Araçlar menüsünü aç',exact=True)).to_be_focused()
  passed('Backdrop tap and Escape dismiss; keyboard focus stays in mobile menu and returns to the opener')
  for width,height in [(320,568),(390,844),(768,1024),(844,390)]:
   page.set_viewport_size({'width':width,'height':height});page.evaluate('window.scrollTo(0,0)')
   for theme in ['light','dark']:
    page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);page.wait_for_timeout(280)
    closed(page);fits(page);page.screenshot(path=str(OUT/f'rail-{width}-{theme}.png'))
    page.get_by_role('button',name='Araçlar menüsünü aç',exact=True).tap();opened(page);fits(page)
    assert page.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True).bounding_box()['y']<50
    page.screenshot(path=str(OUT/f'drawer-{width}-{theme}.png'))
    page.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True).tap();closed(page)
  page.emulate_media(reduced_motion='reduce');page.get_by_role('button',name='Araçlar menüsünü aç',exact=True).tap();opened(page)
  assert page.locator('.sidebar').evaluate('e=>getComputedStyle(e).transitionDuration.split(",").every(t=>parseFloat(t)<=0.001)')
  page.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True).tap();closed(page)
  passed('320/390/768/844 touch layouts, portrait/landscape and light/dark: accessible close, no overflow; reduced-motion preference respected')
  # Breakpoint changes must release the mobile body lock.
  page.get_by_role('button',name='Araçlar menüsünü aç',exact=True).tap();opened(page)
  page.set_viewport_size({'width':1440,'height':1000});page.wait_for_timeout(300)
  assert page.evaluate('document.body.style.position!=="fixed"')
  expect(page.locator('.sidebar-overlay')).to_have_attribute('data-open','false')
  page.set_viewport_size({'width':390,'height':844});closed(page);ctx.close()
  passed('Crossing the desktop breakpoint releases body lock/backdrop; returning to mobile starts closed')
  desk,dp=context(1440,1000,False)
  expect(dp.locator('.dashboard')).to_have_attribute('data-menu-open','true');dp.wait_for_timeout(300)
  assert dp.locator('.dashboard-main').bounding_box()['x']==310
  dp.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True).click();closed(dp);dp.wait_for_timeout(300)
  assert dp.locator('.dashboard-main').bounding_box()['x']==56
  dp.get_by_role('button',name='Araçlar menüsünü aç',exact=True).click();expect(dp.locator('.dashboard')).to_have_attribute('data-menu-open','true')
  dp.wait_for_timeout(300);assert dp.locator('.dashboard-main').bounding_box()['x']==310
  dp.locator('[data-operation=pdf-tools]').click();expect(dp.locator('.pdf-editor')).to_be_visible()
  expect(dp.locator('.dashboard')).to_have_attribute('data-menu-open','true');fits(dp)
  for theme in ['light','dark']:
   dp.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);dp.wait_for_timeout(280);dp.screenshot(path=str(OUT/f'desktop-open-{theme}.png'))
  dp.locator('.sidebar').get_by_role('button',name='Menüyü kapat',exact=True).click();dp.wait_for_timeout(300);dp.screenshot(path=str(OUT/'desktop-rail.png'));desk.close()
  passed('Desktop close expands content to icon rail; reopen preserves saved 310px width; selecting tool keeps desktop menu open')
  for scopes,allowed in [(['PDF_TOOLS'],['Araçlar']),(['FMT_DEMO'],['FMT Yönetimi'])]:
   temp,tp=context(role='TEMPORARY',scopes=scopes);closed(tp)
   assert tp.locator('.sidebar-rail [data-menu-group]').evaluate_all('es=>es.map(e=>e.dataset.menuGroup)')==allowed
   temp.close()
  assert not errors,errors;passed('Rail obeys existing role/scope visibility; no JavaScript errors or external requests')
 except Exception:
  try:print(page.locator('body').inner_text()[-7000:]);page.screenshot(path=str(OUT/'failure.png'))
  except Exception:pass
  raise
 finally:browser.close()
