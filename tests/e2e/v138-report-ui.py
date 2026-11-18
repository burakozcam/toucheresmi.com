import json,zipfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-results/v138/report-ui');out.mkdir(parents=True,exist_ok=True)
seed=json.loads(Path('test-results/v137/report-logo/ui-seed.json').read_text());checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':1440,'height':1000},accept_downloads=True);c.add_init_script('sessionStorage.setItem("kurumsal-auth-token",'+json.dumps(seed['token'])+');localStorage.setItem("kurumsal-theme","light");localStorage.setItem("ks-analytics-consent","denied");sessionStorage.setItem("kurumsal-splash-seen","1");')
 page=c.new_page();page.set_default_timeout(20000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://localhost:3115/panel',wait_until='domcontentloaded');page.get_by_role('button',name='Sınav Sonuçları',exact=True).click()
 page.get_by_label('İl',exact=True).select_option('__missing__');page.get_by_label('İlçe',exact=True).select_option('__missing__');page.get_by_label('Sonuç kurumu',exact=True).select_option(seed['schoolId']);page.get_by_label('Yüklenen sınav',exact=True).select_option(seed['keyId']);expect(page.get_by_role('button',name='PDF önizle',exact=True)).to_be_enabled()
 page.get_by_role('button',name='PDF önizle',exact=True).click();expect(page.locator('.report-canvas-preview canvas').first).to_have_attribute('data-rendered','true',timeout=30000);checks.append('Actual authorized report preview renders a PDF canvas')
 for format in ['pdf','xlsx','zip']:
  page.get_by_label('İndirme biçimi').select_option(format)
  with page.expect_download() as download:page.get_by_role('button',name='Seçili raporu indir',exact=True).click()
  path=out/('report.'+format);download.value.save_as(str(path));assert path.stat().st_size>100
  if format=='pdf':assert path.read_bytes().startswith(b'%PDF-')
  else:
   with zipfile.ZipFile(path) as z:
    if format=='zip':assert all(name.endswith('.pdf') and z.read(name).startswith(b'%PDF-') for name in z.namelist());assert len(z.namelist())>0
    else:assert 'xl/workbook.xml' in z.namelist()
 checks.append('Actual PDF, XLSX and per-student PDF ZIP downloads contain valid files')
 for theme in ['light','dark']:
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':1000});page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);page.locator('.results-toolbar').first.scroll_into_view_if_needed();page.locator('.results-toolbar').first.screenshot(path=str(out/f'toolbar-{theme}-{width}.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 checks.append('Populated report toolbar fits desktop/mobile in both themes')
 assert not errors,errors;(out/'checks.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors},ensure_ascii=False,indent=2));print(checks);b.close()
