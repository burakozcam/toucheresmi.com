"""Production browser QA for the SVG workflow, themes, motion controls and widths."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('/tmp/v129-evidence');out.mkdir(exist_ok=True);widths=[320,375,390,768,1024,1280,1920];errors=[];overflow=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 for theme in ['light','dark']:
  for width in widths:
   c=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce');c.add_init_script("localStorage.setItem('kurumsal-theme',"+json.dumps(theme)+");localStorage.setItem('ks-analytics-consent','denied')");page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://localhost:3100');hero=page.locator('.workflow-hero');expect(hero).to_be_visible();expect(hero.locator('.wf-report')).to_be_visible();page.wait_for_function('document.querySelector(".workflow-hero").getAnimations({subtree:true}).length===0');animations=hero.evaluate('(e)=>e.getAnimations({subtree:true}).map(a=>({name:a.animationName,target:a.effect.target.getAttribute(\"class\"),state:a.playState}))');assert not animations,animations
   dims=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
   if dims['scroll']>width+1:overflow.append([theme,width,dims])
   hero.screenshot(path=str(out/f'hero-{theme}-{width}.png'));c.close()
 c=browser.new_context(viewport={'width':1280,'height':1000},reduced_motion='no-preference');c.add_init_script("localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')");page=c.new_page();page.goto('http://localhost:3100');hero=page.locator('.workflow-hero');hero.scroll_into_view_if_needed();pause=hero.get_by_role('button',name='Animasyonu durdur',exact=True);pause.click();expect(hero.get_by_role('button',name='Animasyonu oynat',exact=True)).to_have_attribute('aria-pressed','true');assert hero.evaluate('(e)=>e.getAnimations({subtree:true}).every(a=>a.playState==="paused")')
 hero.get_by_role('button',name='Animasyonu oynat',exact=True).click();assert hero.evaluate('(e)=>e.getAnimations({subtree:true}).some(a=>a.playState==="running")')
 for seconds in [0,4,8,12,15.8]:
  hero.evaluate('(e,t)=>e.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=t*1000})',seconds);hero.screenshot(path=str(out/f'hero-sequence-{seconds}.png'))
 # Browser frame cadence is diagnostic; it cannot certify all production devices at 60 FPS.
 cadence=page.evaluate('()=>new Promise(resolve=>{let times=[];function tick(t){times.push(t);if(times.length<61)requestAnimationFrame(tick);else resolve(times.slice(1).map((t,i)=>t-times[i]))}requestAnimationFrame(tick)})')
 assert not errors,errors;assert not overflow,overflow
 result={'widths':widths,'themes':['light','dark'],'reducedMotion':True,'pauseResume':True,'sequenceFrames':5,'javascriptErrors':errors,'overflow':overflow,'browserFrameMedianMs':sorted(cadence)[len(cadence)//2]};(out/'hero.json').write_text(json.dumps(result,indent=2));print(result);browser.close()
