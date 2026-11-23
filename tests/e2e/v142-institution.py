"""Focused visual acceptance of the institution scene. Local Web only; no database."""
import json,os,pathlib,re,subprocess,time,urllib.request
from playwright.sync_api import sync_playwright,expect
root=pathlib.Path(__file__).resolve().parents[2];out=root/'test-results/v142/institution';out.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];metrics=[]
def passed(name):
 checks.append(name);print('PASS',name,flush=True)
def luminance(rgb):
 values=[c/255 for c in rgb[:3]];v=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in values];return .2126*v[0]+.7152*v[1]+.0722*v[2]
def contrast(a,b):
 l1,l2=sorted([luminance(a),luminance(b)],reverse=True);return (l1+.05)/(l2+.05)
def color(value):return [float(v) for v in re.findall(r'[\d.]+',value)[:3]]
log=(out/'web.log').open('w');server=subprocess.Popen(['node',str(root/'node_modules/next/dist/bin/next'),'start','-p','3123','-H','127.0.0.1'],cwd=root/'apps/web',env={**os.environ,'NEXT_PUBLIC_API_URL':'http://localhost:4022'},stdout=log,stderr=subprocess.STDOUT)
try:
 for _ in range(100):
  if server.poll() is not None:raise RuntimeError('Local Web failed; inspect test-results/v142/institution/web.log')
  try:
   if urllib.request.urlopen('http://localhost:3123/robots.txt',timeout=1).status==200:break
  except Exception:time.sleep(.15)
 else:raise RuntimeError('Local Web did not become ready')
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1000})
  context.route(re.compile(r'^https?://(?!localhost[:/]|127\.0\.0\.1[:/])'),lambda r:r.abort())
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://localhost:3123',wait_until='load')
  consent=page.get_by_role('button',name='Yalnızca Gerekli Olanlar',exact=True)
  if consent.is_visible():consent.click()
  section=page.locator('#kurumlar');scene=section.locator('.system-architecture')
  expect(section.get_by_role('heading',name='Arkasında güçlü bir sistem var.')).to_be_visible()
  expect(scene.locator('.architecture-heading')).to_contain_text('12 işlevsel alan. Tek platform.')
  assert scene.locator('.architecture-module').count()==12 and scene.locator('.architecture-map>svg path').count()==24
  paths=scene.locator('.architecture-map>svg path').evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("d"))')
  for width in [1440,768,390]:
   page.set_viewport_size({'width':width,'height':1000})
   for theme in ['light','dark']:
    if page.evaluate('document.documentElement.dataset.theme')!=theme:page.locator('.theme-toggle').click()
    scene.scroll_into_view_if_needed();page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    view=section.evaluate('''e=>{const s=getComputedStyle(e),h=getComputedStyle(e.querySelector('h2')),p=getComputedStyle(e.querySelector(':scope>div>p:not(.hero-tag)')),b=getComputedStyle(e.querySelector('.hero-buttons>.button')),other=getComputedStyle(document.querySelector('.demo-inference'));return {background:s.backgroundColor,heading:h.color,copy:p.color,buttonBackground:b.backgroundColor,buttonText:b.color,columns:s.gridTemplateColumns,gap:s.gap,padding:s.padding,referenceColumns:other.gridTemplateColumns,referenceGap:other.gap,referencePadding:other.padding};}''')
    assert view['columns']==view['referenceColumns'] and view['gap']==view['referenceGap'] and view['padding']==view['referencePadding'],view
    for name,fg,bg in [('heading',view['heading'],view['background']),('copy',view['copy'],view['background']),('button',view['buttonText'],view['buttonBackground'])]:assert contrast(color(fg),color(bg))>=4.5,(width,theme,name,view)
    if theme=='light':assert min(color(view['background']))>230 and max(color(view['heading']))<100,view
    assert scene.locator('.architecture-map>svg path').evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("d"))')==paths
    bounds=scene.bounding_box();outer=section.bounding_box();assert bounds['x']>=outer['x']-1 and bounds['x']+bounds['width']<=outer['x']+outer['width']+1
    section.screenshot(path=str(out/f'{width}-{theme}.png'),animations='disabled');metrics.append({'width':width,'theme':theme,**view})
  passed('1440/768/390 px: theme colors, 4.5+ text/button contrast, matching scene layout, no horizontal overflow')
  passed('Twelve cards and twenty-four original SVG connection paths preserved in every viewport/theme')
  page.set_viewport_size({'width':1440,'height':1000});scene.scroll_into_view_if_needed();expect(scene).to_have_attribute('data-playing','true');before=scene.get_attribute('data-elapsed');page.wait_for_timeout(250);assert scene.get_attribute('data-elapsed')!=before
  scene.get_by_role('button',name='Durdur',exact=True).click();expect(scene).to_have_attribute('data-playing','false');scene.get_by_role('button',name='Oynat',exact=True).click();expect(scene).to_have_attribute('data-playing','true');scene.get_by_role('button',name='Yeniden oynat',exact=True).click();expect(scene).to_have_attribute('data-playing','true');passed('Scene clock, pause, play and replay controls work')
  page.emulate_media(reduced_motion='reduce');expect(scene).to_have_attribute('data-playing','false');page.emulate_media(reduced_motion='no-preference');passed('Reduced-motion preference retained')
  section.get_by_role('link',name=re.compile('Birlikte çalışalım')).click();expect(page).to_have_url(re.compile('/contact$'));page.go_back();section.get_by_role('link',name=re.compile('Kurum girişi')).click();expect(page).to_have_url(re.compile('/login$'));passed('Contact and institution login buttons retain real local navigation')
  assert not errors,errors;passed('No Chromium page errors');browser.close()
finally:
 server.terminate()
 try:server.wait(timeout=5)
 except subprocess.TimeoutExpired:server.kill();server.wait()
 log.close();(out/'acceptance.json').write_text(json.dumps({'checks':checks,'pageErrors':errors,'metrics':metrics},ensure_ascii=False,indent=2)+'\n')
