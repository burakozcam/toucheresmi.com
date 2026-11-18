import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('test-results/v137/ui');out.mkdir(parents=True,exist_ok=True)
seed=json.loads(Path('test-results/v137/ui-seed.json').read_text());checks=[];styles=[]
def luminance(rgb):
 channels=[int(c)/255 for c in re.findall(r'\d+',rgb)[:3]]
 return sum((v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4)*w for v,w in zip(channels,[.2126,.7152,.0722]))
def contrast(a,b):
 a,b=luminance(a),luminance(b)
 return (max(a,b)+.05)/(min(a,b)+.05)
def check(name):checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference')
 context.add_init_script("localStorage.setItem('kurumsal-theme','light');localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')")
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:3115',wait_until='networkidle')
 assert page.request.get('http://localhost:3115/favicon.ico').status==200
 assert page.locator('.turkish-flag').count()==1
 assert page.locator('.landing-header .button[data-intent]').count()==0
 check('Favicon, flag and unchanged home button palette')
 scene=page.locator('.demo-security');scene.scroll_into_view_if_needed();scene.get_by_role('button',name='Yeniden oynat').click();page.wait_for_timeout(3850);scene.get_by_role('button',name='Durdur',exact=True).click()
 matrix=scene.locator('.lock-shackle').evaluate('(e)=>getComputedStyle(e).transform');assert matrix not in ['none','matrix(1, 0, 0, 1, 0, 0)'],matrix
 page.wait_for_timeout(600);scene.screenshot(path=str(out/'lock-open-light.png'));elapsed=scene.get_attribute('data-elapsed');page.wait_for_timeout(350);assert elapsed==scene.get_attribute('data-elapsed')
 scene.get_by_role('button',name='Oynat',exact=True).click();page.wait_for_timeout(2000);scene.get_by_role('button',name='Durdur',exact=True).click()
 matrix=scene.locator('.lock-shackle').evaluate('(e)=>getComputedStyle(e).transform');assert matrix=='matrix(1, 0, 0, 1, 0, 0)',matrix
 scene.screenshot(path=str(out/'lock-closed-light.png'))
 elapsed=float(scene.get_attribute('data-elapsed'));bar=scene.locator('.scene-progress>i').evaluate('e=>new DOMMatrix(getComputedStyle(e).transform).a');assert abs(bar-min(1,elapsed/6000))<.03
 assert scene.locator('.lock-glint').evaluate('e=>new DOMMatrix(getComputedStyle(e).transform).e')>0
 scene.get_by_role('button',name='Oynat',exact=True).click();page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(200);offscreen=scene.get_attribute('data-elapsed');page.wait_for_timeout(400);assert offscreen==scene.get_attribute('data-elapsed');scene.scroll_into_view_if_needed();page.wait_for_timeout(200);assert offscreen!=scene.get_attribute('data-elapsed')
 check('Shared progress bar and glint; offscreen pause and resume')
 check('Open shackle, mechanical close and synchronized pause')
 for theme in ['light','dark']:
  for width in [390,768,1440]:
   page.set_viewport_size({'width':width,'height':1000});page.evaluate('(t)=>{document.documentElement.dataset.theme=t;localStorage.setItem("kurumsal-theme",t)}',theme);scene.scroll_into_view_if_needed();scene.screenshot(path=str(out/f'lock-{theme}-{width}.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 check('Security scene and header fit mobile/tablet/desktop in both themes')
 page.emulate_media(reduced_motion='reduce');page.reload(wait_until='networkidle');scene=page.locator('.demo-security');scene.scroll_into_view_if_needed();page.wait_for_timeout(150)
 assert scene.locator('.lock-shackle').evaluate('(e)=>getComputedStyle(e).transform')=='matrix(1, 0, 0, 1, 0, 0)'
 check('Reduced motion shows closed final state');page.emulate_media(reduced_motion='no-preference')
 context.add_init_script('sessionStorage.setItem("kurumsal-auth-token",'+json.dumps(seed['token'])+')')
 for theme in ['light','dark']:
  for width in [390,1440]:
   page.set_viewport_size({'width':width,'height':1000});page.goto('http://localhost:3115/panel?section=publishers',wait_until='networkidle');page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);page.wait_for_timeout(400)
   button=page.locator('.publisher-controls').get_by_role('button',name='Yayınevi Ekle');button.wait_for();box=button.bounding_box();assert 40<=box['height']<=64,box
   page.screenshot(path=str(out/f'publishers-{theme}-{width}.png'),full_page=True);assert page.locator('main.dashboard').get_attribute('data-management')=='true'
   styles.append(button.evaluate('e=>({theme:document.documentElement.dataset.theme,width:innerWidth,text:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor,height:e.getBoundingClientRect().height})'))
 check('Publisher add button compact in desktop/mobile and both themes')
 for theme in ['light','dark']:
  page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);page.wait_for_timeout(400)
  for b in page.locator('.publisher-controls .button[data-intent],.publisher-admin-actions .button[data-intent]').all()[:4]:
   s=b.evaluate('e=>({text:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor,tone:e.dataset.intent})');assert contrast(s['text'],s['background'])>=4.5,s
  button.hover();page.wait_for_timeout(200);s=button.evaluate('e=>({text:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor})');assert contrast(s['text'],s['background'])>=4.5
  button.evaluate('e=>e.disabled=true');assert button.evaluate('e=>getComputedStyle(e).cursor')=='not-allowed';s=button.evaluate('e=>({text:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor})');assert contrast(s['text'],s['background'])>=4.5,s;button.evaluate('e=>e.disabled=false')
 check('Real primary/destructive/quiet button contrast, hover and disabled styles')
 page.set_viewport_size({'width':1440,'height':1000});page.goto('http://localhost:3115/panel?section=result-editor',wait_until='networkidle')
 page.get_by_label('Kurum',exact=True).select_option(seed['schoolId']);page.wait_for_timeout(300);options=page.get_by_label('Yayınevi',exact=True).locator('option').all_text_contents();page.get_by_label('Yayınevi',exact=True).select_option(label=options[-1]);page.get_by_label('Sınav',exact=True).select_option(seed['keyId']);page.get_by_role('button',name='Verileri aç',exact=True).click();page.locator('.data-editor .editable-grid').wait_for(timeout=10000)
 page.get_by_text('İşlem geçmişi (',exact=False).click();assert page.get_by_text('Sonuç verileri düzenlendi.',exact=False).count()>0;page.screenshot(path=str(out/'result-editor.png'),full_page=True);check('Result editor renders legacy history without client exception')
 page.goto('http://localhost:3115/panel?section=exam',wait_until='networkidle');page.locator('input[type=file]').first.set_input_files('test-results/v136/4995-synthetic.txt');page.locator('.match-notice').first.wait_for(timeout=15000);page.wait_for_timeout(1500)
 for theme in ['light','dark']:
  page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);page.wait_for_timeout(400)
  for card in page.locator('.match-notice').all():
   data=card.evaluate('e=>({theme:document.documentElement.dataset.theme,text:getComputedStyle(e.querySelector("strong")).color,background:getComputedStyle(e).backgroundColor,content:e.innerText})');styles.append(data);assert contrast(data['text'],data['background'])>=4.5,data
  page.locator('.txt-suggestions').screenshot(path=str(out/f'suggestions-{theme}.png'))
 check('Real FMT/exam inference text captured with computed colors in both themes')
 page.goto('http://localhost:3115/missing-v137',wait_until='domcontentloaded');page.locator('.owner-arcade').wait_for(timeout=10000);page.get_by_role('button',name='Blok Atölyesi',exact=True).click();page.locator('.blocks-canvas').wait_for();page.screenshot(path=str(out/'owner-404.png'),full_page=True);page.get_by_role('button',name='İz Takibi',exact=True).click();page.locator('.brand-game-canvas').wait_for();check('Owner 404 offers three games and switches canvases')
 public=browser.new_context();pp=public.new_page();pp.goto('http://localhost:3115/missing-v137',wait_until='domcontentloaded');assert pp.locator('.owner-arcade').count()==0 and pp.locator('canvas').count()==0;check('Visitor sees ordinary 404 without game')
 assert not errors,errors
 (out/'checks.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'styles':styles,'clientErrors':errors},ensure_ascii=False,indent=2));browser.close()
