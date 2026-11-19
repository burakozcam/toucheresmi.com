import json,re,time,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-results/v139/home-audit');out.mkdir(parents=True,exist_ok=True)
checks=[];records=[];errors=[]
def passed(name):checks.append(name);print('PASS',name,flush=True)
selectors=['.demo-report','.demo-security','.demo-academic','.system-architecture','.demo-inference','.demo-batch','[data-feature="announcements"]','[data-feature="help"]','[data-feature="sharing"]','.home-pdf-card']
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 if not os.environ.get('KS_HOME_TAIL_ONLY'):
  for theme in ['light','dark']:
   for width in [1440,390]:
    context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
    context.add_init_script('localStorage.setItem("kurumsal-theme",'+json.dumps(theme)+');localStorage.setItem("ks-analytics-consent","denied");sessionStorage.setItem("kurumsal-splash-seen","1")')
    page=context.new_page();page.set_default_timeout(20000);page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://localhost:3119',wait_until='networkidle');expect(page.locator('[data-home-scene]')).to_have_count(10)
    assert page.locator('.architecture-module').count()==12
    assert page.locator('.turkish-flag').count()==1 and page.locator('.security-lock').count()==1
    text=page.locator('body').inner_text()
    for forbidden in ['AYNI KAZANIM. FARKLI SINAVLAR.','2.000','709','84 kaynak','80,495','38,163','5.010','Bir sınav, yüzlerce kişisel karne']:
     assert forbidden not in text,forbidden
    assert not page.locator('a[href="/magaza"]').count()
    assert not page.locator('iframe').count(),'Heavy PDF workspaces should not load on the homepage'
    page.screenshot(path=str(out/f'full-{theme}-{width}.png'),full_page=True)
    for index,selector in enumerate(selectors):
     scene=page.locator(selector);scene.scroll_into_view_if_needed();page.wait_for_timeout(80)
     expect(scene).to_have_attribute('data-playing','false')
     assert scene.get_attribute('data-step')==scene.get_attribute('data-scene-last')
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(theme,width,selector)
     scene.screenshot(path=str(out/f'{index:02d}-{theme}-{width}-final.png'))
     # Actual bounding boxes and colors retained for review; no network or performance promises.
     records.append({'theme':theme,'width':width,'scene':selector,'step':scene.get_attribute('data-step'),'box':scene.bounding_box(),'color':scene.evaluate('e=>({ink:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor})')})
    contrast=page.evaluate(r"""()=>{
     const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number),lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
     const background=e=>{const layers=[];for(let n=e;n;n=n.parentElement)layers.push(rgb(getComputedStyle(n).backgroundColor));let base=[255,255,255];for(const c of layers.reverse()){const a=c.length===4?c[3]:1;base=base.map((v,i)=>v*(1-a)+c[i]*a);}return base;};
     return [...document.querySelectorAll('[data-home-scene] h2,[data-home-scene] p,[data-home-scene] small,.architecture-module>span,.discovery-categories>span,.discovery-channel')].filter(e=>e.getClientRects().length&&!e.closest('[data-visible=false],.scene-score,.demo-answers')).map(e=>{const s=getComputedStyle(e),a=lum(rgb(s.color)),b=lum(background(e));return {text:e.textContent.slice(0,80),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),size:parseFloat(s.fontSize),weight:parseFloat(s.fontWeight)};});
    }""")
    failures=[x for x in contrast if x['ratio']<(3 if x['size']>=24 or x['size']>=18.66 and x['weight']>=700 else 4.5)]
    assert not failures,(theme,width,failures)
    records.append({'theme':theme,'width':width,'textContrast':contrast})
    assert page.locator('[data-feature="announcements"] .discovery-stage').get_attribute('data-phase')=='history'
    assert page.locator('[data-feature="sharing"] .discovery-stage').get_attribute('data-phase')=='expired'
    expect(page.locator('.real-report-hero>a')).to_have_css('animation-name','none')
    passed(f'{theme} {width}px: all 10 scenes, final states, flag/lock and no overflow or false claims')
    context.close()
  # Run actual clocks in Chromium; Playwright virtual time exercises all RAF steps without long sleeps.
  context=browser.new_context(viewport={'width':1440,'height':1000})
  context.add_init_script('localStorage.setItem("ks-analytics-consent","denied");sessionStorage.setItem("kurumsal-splash-seen","1")')
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.clock.install();page.goto('http://localhost:3119',wait_until='networkidle')
  for motion_width in [1440,390]:
   page.set_viewport_size({'width':motion_width,'height':1000})
   for index,selector in enumerate(selectors):
    scene=page.locator(selector);scene.scroll_into_view_if_needed();page.clock.run_for(150)
    scene.get_by_role('button',name='Yeniden oynat',exact=True).click();page.clock.run_for(150)
    duration=int(scene.get_attribute('data-duration'));last=int(scene.get_attribute('data-scene-last'))
    seen={int(scene.get_attribute('data-step'))};readings=[]
    for n in range(round(duration*2/80)):
     page.clock.run_for(80)
     state=scene.evaluate('e=>({step:+e.dataset.step,elapsed:+e.dataset.elapsed,progress:+e.style.getPropertyValue("--scene-progress"),playing:e.dataset.playing})')
     seen.add(state['step']);readings.append(state)
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(motion_width,selector,state)
     expected=min(1,state['elapsed']/(duration-800));assert abs(expected-state['progress'])<.005,(selector,state)
     if set(range(last+1)).issubset(seen):break
    assert set(range(last+1)).issubset(seen),(selector,seen)
    scene.get_by_role('button',name='Durdur',exact=True).click();page.clock.run_for(100);before=scene.get_attribute('data-elapsed');page.clock.run_for(700);assert before==scene.get_attribute('data-elapsed')
    scene.screenshot(path=str(out/f'{index:02d}-playing-{motion_width}.png'))
    scene.get_by_role('button',name='Oynat',exact=True).click();page.clock.run_for(200)
    page.locator('.landing-header').scroll_into_view_if_needed();page.clock.run_for(200);before=scene.get_attribute('data-elapsed');page.clock.run_for(700);assert before==scene.get_attribute('data-elapsed'),selector
    records.append({'scene':selector,'motionReadings':readings,'seen':sorted(seen),'pausedOffscreen':True})
    passed(f'{motion_width}px {selector}: full clock, matching progress, pause/resume and viewport pause')
  # Decorative motion uses real observer state and the same visibility preference.
  hero=page.locator('.real-report-hero');hero.scroll_into_view_if_needed();page.clock.run_for(200);expect(hero).to_have_attribute('data-floating','true')
  ribbon=page.locator('.publisher-ribbon');ribbon.scroll_into_view_if_needed();page.clock.run_for(200);expect(hero).to_have_attribute('data-floating','false');expect(ribbon).to_have_attribute('data-paused','false')
  ribbon.get_by_role('button',name='Şeridi durdur').click();page.clock.run_for(100);expect(ribbon).to_have_attribute('data-paused','true')
  ribbon.get_by_role('button',name='Şeridi oynat').click();page.clock.run_for(100);expect(ribbon).to_have_attribute('data-paused','false')
  page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))');expect(ribbon).to_have_attribute('data-paused','true')
  page.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');expect(ribbon).to_have_attribute('data-paused','false')
  for selector in ['.home-exams','.institution-section','.home-tool-links']:
   page.locator(selector).scroll_into_view_if_needed();page.clock.run_for(150);expect(page.locator(selector)).to_have_attribute('data-entered','true')
  passed('Hero, publisher ribbon and section entrances obey viewport, controls and document visibility')
 else:
  context=browser.new_context(viewport={'width':390,'height':1000})
  context.add_init_script('localStorage.setItem("ks-analytics-consent","denied");sessionStorage.setItem("kurumsal-splash-seen","1")')
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.clock.install();page.goto('http://localhost:3119',wait_until='networkidle')
 # Specific lifecycle states; these are generated by actual scene clocks, no application state injection.
 for selector,steps in [('[data-feature="announcements"]',[(3,'preparing'),(4,'live'),(6,'history')]),('[data-feature="sharing"]',[(2,'scheduled'),(3,'active'),(6,'expired')])]:
  scene=page.locator(selector);scene.scroll_into_view_if_needed();page.clock.run_for(100);scene.get_by_role('button',name='Yeniden oynat',exact=True).click();page.clock.run_for(100)
  duration=int(scene.get_attribute('data-duration'))
  for step,phase in steps:
   for n in range(round(duration*2/80)):
    if int(scene.get_attribute('data-step'))==step:break
    page.clock.run_for(80)
   scene.get_by_role('button',name='Durdur',exact=True).evaluate('(e)=>e.click()');page.clock.run_for(100)
   assert scene.locator('.discovery-stage').get_attribute('data-phase')==phase,(selector,step,scene.get_attribute('data-step'))
   if phase=='scheduled':assert 'Örnek dosya erişime açık' not in scene.inner_text()
   scene.screenshot(path=str(out/f'detail-{selector.split(chr(34))[1]}-{phase}.png'))
   scene.get_by_role('button',name='Oynat',exact=True).evaluate('(e)=>e.click()');page.clock.run_for(100)
 passed('Announcement and share publication/expiry boundaries match the depicted lifecycle')
 # Browser visibility state exercises the real visibilitychange handlers.
 scene=page.locator('[data-feature="help"]');scene.scroll_into_view_if_needed();page.clock.run_for(200)
 page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))');page.clock.run_for(150);before=scene.get_attribute('data-elapsed');page.clock.run_for(800);assert before==scene.get_attribute('data-elapsed')
 expect(scene).to_have_attribute('data-playing','false')
 page.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');page.clock.run_for(200);expect(scene).to_have_attribute('data-playing','true')
 page.emulate_media(reduced_motion='reduce');page.clock.run_for(150);expect(scene).to_have_attribute('data-playing','false')
 passed('Document visibility handlers and live reduced-motion changes stop scene clocks')
 assert not errors,errors
 (out/('tail-acceptance.json' if os.environ.get('KS_HOME_TAIL_ONLY') else 'acceptance.json')).write_text(json.dumps({'checks':checks,'scenes':10,'modules':12,'errors':errors,'records':records},ensure_ascii=False,indent=2))
 browser.close()
