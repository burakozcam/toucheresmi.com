import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-results/v138/ui');out.mkdir(parents=True,exist_ok=True)
seed=json.loads(Path('test-results/v138/ui-seed.json').read_text());checks=[];colors=[]
def check(name):checks.append(name);print('PASS',name,flush=True)
def contrast(a,b):
 def lum(c):
  v=[int(x)/255 for x in re.findall(r'\d+',c)[:3]]
  return sum((x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4)*w for x,w in zip(v,[.2126,.7152,.0722]))
 x,y=lum(a),lum(b);return (max(x,y)+.05)/(min(x,y)+.05)
def readable(locator,label):
 data=locator.evaluate('e=>{let p=e;while(p&&getComputedStyle(p).backgroundColor==="rgba(0, 0, 0, 0)")p=p.parentElement;return {text:getComputedStyle(e).color,bg:p?getComputedStyle(p).backgroundColor:"rgb(255, 255, 255)"}}');data['label']=label;data['ratio']=contrast(data['text'],data['bg']);colors.append(data);assert data['ratio']>=4.5,data
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000},color_scheme='dark')
 context.add_init_script("localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')")
 page=context.new_page();page.set_default_timeout(12000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:3115',wait_until='networkidle');assert page.locator('html').get_attribute('data-theme')=='light';check('No saved preference defaults to light even with a dark OS')
 page.get_by_role('button',name='Karanlık moda geç').click();page.reload(wait_until='networkidle');assert page.locator('html').get_attribute('data-theme')=='dark';check('Saved dark choice survives navigation and reload')
 for theme in ['light','dark']:
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':1000});page.evaluate('(t)=>{localStorage.setItem("kurumsal-theme",t);document.documentElement.dataset.theme=t}',theme)
   page.goto('http://localhost:3115',wait_until='networkidle');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   page.screenshot(path=str(out/f'home-{theme}-{width}.png'),full_page=True)
   system=page.locator('.system-architecture');system.scroll_into_view_if_needed();assert system.locator('.architecture-module').count()==12
   assert all(n.is_visible() for n in system.locator('.architecture-module').all());system.screenshot(path=str(out/f'architecture-{theme}-{width}.png'))
 check('Home, all twelve functional areas and layout fit desktop/mobile in both themes')
 page.set_viewport_size({'width':1440,'height':1000});page.emulate_media(reduced_motion='reduce');page.reload(wait_until='networkidle');report=page.locator('.demo-report');report.scroll_into_view_if_needed();page.wait_for_timeout(150);assert report.locator('.scene-mini-report').get_attribute('data-visible')=='true';report.screenshot(path=str(out/'report-final.png'))
 for report_width in [1440,390]:
  page.set_viewport_size({'width':report_width,'height':1000});report.scroll_into_view_if_needed();note=report.locator('.scene-mini-report>small').bounding_box();footer=report.locator('.scene-footer').bounding_box();assert note['y']+note['height']<=footer['y'],(report_width,note,footer);report.screenshot(path=str(out/f'report-final-{report_width}.png'))
 page.set_viewport_size({'width':1440,'height':1000});assert page.locator('.real-report-hero>a').evaluate('e=>getComputedStyle(e).animationName')=='none';check('Reduced motion shows the final report and stops floating')
 page.emulate_media(reduced_motion='no-preference');report.get_by_role('button',name='Yeniden oynat').click();page.wait_for_timeout(500);report.get_by_role('button',name='Durdur',exact=True).click();elapsed=report.get_attribute('data-elapsed');page.wait_for_timeout(200);assert elapsed==report.get_attribute('data-elapsed');check('Report scene shares pause and progress timing')
 context.add_init_script('sessionStorage.setItem("kurumsal-auth-token",'+json.dumps(seed['token'])+')')
 for theme in ['light','dark']:
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':1000});page.evaluate('(t)=>localStorage.setItem("kurumsal-theme",t)',theme)
   for section in ['fmt-share','fmt-download','share-links','data-delete','results','exam','pdf-tools']:
    print('SCREEN',theme,width,section,flush=True);page.goto('http://localhost:3115/panel?section='+section,wait_until='domcontentloaded');page.locator('main.dashboard').wait_for();page.wait_for_timeout(300)
    assert page.locator('main.dashboard').get_attribute('data-management')=='true'
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(theme,width,section)
    if section in ['fmt-share','fmt-download']:
     page.locator('.fmt-library-card').first.wait_for();assert page.get_by_role('heading',name='FMT Paylaş ve İndir',exact=True).count()==1
     assert page.locator('.fmt-library-card h3').filter(has_text=re.compile('^7108$')).count()==1
     readable(page.locator('.fmt-library-card h3').first,f'FMT {theme}')
     if width==1440:
      assert page.locator('.side-nav').evaluate('e=>getComputedStyle(e).scrollbarWidth')=='thin'
      assert page.locator('.nav-active').evaluate('e=>getComputedStyle(e).boxShadow')=='none'
      page.locator('.nav-active').press('Tab');assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle')!='none'
    if section=='share-links':
     page.locator('.share-link-card').first.wait_for();assert page.locator('.share-link-card').count()<=25;assert not page.locator('.share-link-card').first.get_attribute('open');page.locator('.share-link-card summary').first.click();readable(page.locator('.share-link-card summary strong').first,f'Share {theme}')
    if section=='data-delete':
     page.locator('.deletion-category>button').first.wait_for();assert page.locator('.deletion-category').count()<=25;page.locator('.deletion-category>button').first.click();page.wait_for_timeout(200);assert page.locator('.deletion-category .deletion-category').count()>0
    if section=='results':
     toolbar=page.locator('.results-toolbar');boxes=[toolbar.locator('.button').nth(0).bounding_box(),toolbar.locator('select').bounding_box(),toolbar.locator('.button').nth(1).bounding_box()]
     if width==1440:assert max(b['y']+b['height'] for b in boxes)-min(b['y']+b['height'] for b in boxes)<2,boxes
     for card in page.locator('.results-choice-card').all():
      box=card.bounding_box();heading=card.locator('h2').bounding_box();assert heading['x']>=box['x']-2 and heading['x']+heading['width']<=box['x']+box['width']+2
    if section=='exam':
     rows=page.locator('.txt-archive-row:not(.txt-archive-head)');
     if rows.count():readable(rows.first.locator('strong').first,f'TXT {theme}')
    if section=='pdf-tools':
     frame=page.frame_locator('iframe[title="PDF Düzenleyici"]');frame.locator('body').wait_for();assert frame.locator('html').get_attribute('data-theme')==theme
     readable(frame.locator('.pdf-tool-tab strong').first,f'PDF card {theme}')
     frame.locator('body').screenshot(path=str(out/f'pdf-tools-{theme}-{width}.png'))
     # 10,000 synthetic records exercise UI scale only, not real PDF processing capacity.
     page.locator('iframe[title="PDF Düzenleyici"]').evaluate('e=>{e.contentWindow.PdfRegionOcr.review(Array.from({length:10000},(_,i)=>({page:i,value:String(i+1),confidence:99}))).then(r=>e.contentWindow.__reviewResult=r).catch(()=>{});}')
     dialog=frame.locator('.pdf-review');dialog.wait_for();assert not dialog.locator('details').get_attribute('open');assert dialog.locator('.pdf-review-row').count()==0
     readable(dialog.locator('.pdf-review-accept'),f'ZIP {theme}');readable(dialog.get_by_role('button',name='Vazgeç',exact=True),f'Cancel {theme}')
     dialog.locator('summary').click();expect(dialog.locator('.pdf-review-row')).to_have_count(50)
     dialog.get_by_label('Sayfa 1 çıktı adı',exact=True).fill('123456');dialog.get_by_role('button',name='Sonraki',exact=True).click();assert dialog.locator('.pdf-review-row').count()==50
     dialog.screenshot(path=str(out/f'zip-review-{theme}-{width}.png'));dialog.locator('.pdf-review-accept').click();page.wait_for_function("()=>document.querySelector('iframe').contentWindow.__reviewResult");assert page.locator('iframe').evaluate('e=>e.contentWindow.__reviewResult[0].value')=='123456'
     check(f'ZIP review {theme}/{width}: 10,000 metadata records, at most 50 rows, edit preserved and buttons readable')
     page.get_by_role('button',name='PDF Editörü · sayfa / metin / resim',exact=True).click();frame=page.frame_locator('iframe[title="PDF Düzenleyici"]');frame.locator('body').wait_for();assert frame.locator('html').get_attribute('data-theme')==theme
     page.get_by_role('button',name='Belge tara · kamera / dosya',exact=True).click()
    page.screenshot(path=str(out/f'{section}-{theme}-{width}.png'),full_page=True)
 check('Management screens, legacy FMT section, lazy deletion, share details, report toolbar and PDF tabs in four theme/viewport combinations')
 # Suspect records cannot bypass review, including unedited/empty names.
 page.goto('http://localhost:3115/panel?section=pdf-tools',wait_until='networkidle');frame=page.frame_locator('iframe');frame.locator('body').wait_for();page.locator('iframe').evaluate('e=>{void e.contentWindow.PdfRegionOcr.review([{page:0,value:"",confidence:0}]).catch(()=>{});}');d=frame.locator('.pdf-review');assert d.locator('.pdf-review-accept').is_disabled();d.locator('summary').click();d.get_by_label('Sayfa 1 çıktı adı',exact=True).fill('42');d.get_by_label('Sayfa 1 eşleşmesini kontrol ettim',exact=True).check();assert d.locator('.pdf-review-accept').is_disabled();d.locator('input[type=checkbox]').last.check();assert d.locator('.pdf-review-accept').is_enabled();d.get_by_role('button',name='Vazgeç',exact=True).click();check('Suspect/empty review requires individual inspection and explicit acknowledgment')
 assert not errors,errors
 (out/'checks.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'colors':colors,'clientErrors':errors},ensure_ascii=False,indent=2));browser.close()
