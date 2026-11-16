"""Public v1.3.3 pages on the local production build. Real API may run on localhost:4000."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
out=Path('test-results/v133/ui');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('KS_WEB_URL','http://127.0.0.1:3110');checks=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(reduced_motion='reduce')
 context.add_init_script("localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')")
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 for width in [320,768,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  for theme in ['light','dark']:
   for path in ['/verilerinizin-guvenligi','/release-candidate','/']:
    response=page.goto(base+path);assert response.status==200
    page.evaluate('(theme)=>{document.documentElement.dataset.theme=theme;localStorage.setItem("kurumsal-theme",theme)}',theme)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(width,theme,path)
    assert 'Release Candidate' not in page.locator('body').inner_text()
    if path=='/verilerinizin-guvenligi':
     expect(page.get_by_role('heading',name='İki aşamalı doğrulama',exact=True)).to_be_visible()
     expect(page.get_by_text('Panelden yüklenen TXT dosyaları şifreli arşivlenir.',exact=False)).to_be_visible()
    else:expect(page.locator('.version-badge')).to_contain_text('v1.3.3')
    if width in [320,1440]:page.screenshot(path=str(out/f'{path.strip("/") or "home"}-{theme}-{width}.png'),full_page=True)
   checks.append(f'Public security, release and home: {width}px / {theme}, no overflow, v1.3.3 and no candidate label')
 assert not errors,errors
 browser.close()
result={'passed':len(checks),'checks':checks,'pageErrors':errors};(out/'qa.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
