"""Actual shared CSS in isolated browser fixtures; no API, server, env or DB access."""
import json, pathlib, re
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'test-results/v143/hover'
OUT.mkdir(parents=True, exist_ok=True)
css = '\n'.join((ROOT / 'apps/web/app' / f).read_text() for f in ['styles.css', 'interactions.css'])
css = re.sub(r'^@import[^\n]*\n', '', css, flags=re.MULTILINE)
html = '''<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>CSS</style></head><body>
<div class="dashboard" data-management="true"><main class="dashboard-main" style="padding:24px">
<h1>Yönetim / Bayi ortak etkileşimleri</h1><div class="studio-actions">
<button id="save" class="button button-navy" data-intent="save">Kaydet</button>
<button id="danger" class="button button-danger" data-intent="danger">Sil</button>
<button id="quiet" class="button button-quiet">İptal</button>
<button id="plain">Yenile</button><button id="positioned" class="password-toggle" style="position:relative;transform:translateY(-50%)">Göster</button><input id="submit" type="submit" value="Gönder">
<a id="link" href="#target" class="button button-navy">Rapor aç</a>
<button id="disabled" class="button button-navy" data-intent="save" disabled>Devre dışı</button>
<button id="aria-disabled" class="button button-navy" aria-disabled="true">Yetki yok</button>
<button id="busy" class="button button-navy" aria-busy="true">Yükleniyor</button></div>
<div class="workspace-choices" style="margin:24px 0">
<button id="workspace" class="workspace-choice" aria-pressed="true"><strong>FMT Yönetimi</strong><small>Seçili çalışma alanı</small></button>
<button id="evaluation" class="evaluation-card" aria-pressed="false"><strong>Sınav sonucu</strong><small>Kurum ve rapor seç</small></button></div>
<div class="pdf-center-cards pdf-secondary-tools"><button id="pdf" class="pdf-center-card"><strong>PDF birleştir</strong><small>Belge işlemleri</small></button></div>
<nav style="margin:24px 0"><button id="nav" class="nav-item nav-active" data-operation="results">Rapor Al</button>
<button id="category" class="nav-category" aria-expanded="true">Sınav Değerlendir</button></nav>
<button id="logout" class="header-logout">Güvenli Çıkış</button>
<div class="floating-panel searchable-select-popover"><ul><li><button id="option">Kurum seç</button></li></ul></div>
<output id="target" aria-live="polite">0</output></main></div>
<script>let count=0;document.getElementById('save').onclick=()=>{document.getElementById('target').textContent=++count};</script>
</body></html>'''.replace('CSS', css)
ids = ['save','danger','quiet','plain','submit','link','workspace','evaluation','pdf','nav','category','logout','option','positioned']
checks=[]
def record(name): checks.append(name); print('PASS',name,flush=True)
def state(el): return el.evaluate('''e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {translate:s.translate,transform:s.transform,shadow:s.boxShadow,bg:s.backgroundColor,duration:s.transitionDuration,outline:s.outlineStyle,outlineWidth:s.outlineWidth,padding:s.padding,width:r.width,height:r.height,offsetTop:e.offsetTop};}''')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1100})
 context.route('**/*',lambda route:route.abort())
 page=context.new_page(); page.set_content(html)
 for theme in ['light','dark']:
  page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
  for key in ids:
   el=page.locator('#'+key); page.mouse.move(0,0);page.wait_for_timeout(230);el.scroll_into_view_if_needed();base=state(el)
   el.hover();page.wait_for_timeout(230);hover=state(el)
   assert hover['translate']=='0px -2px',(theme,key,hover)
   assert hover['shadow']!=base['shadow'],(theme,key,'shadow',hover)
   assert all(abs(float(x.strip()[:-1])-.2)<.005 for x in hover['duration'].split(',')),(theme,key,hover['duration'])
   assert base['width']==hover['width'] and base['height']==hover['height'] and base['padding']==hover['padding'] and base['offsetTop']==hover['offsetTop'],(key,'layout shifted')
   page.mouse.down();page.wait_for_timeout(230);assert state(el)['translate']=='0px 1px',(theme,key,'active');page.mouse.up()
  record(theme+': 14 button/link/card/menu/portal controls have 200 ms lift, tint/shadow, press and stable layout')
  for key in ['disabled','aria-disabled','busy']:
   el=page.locator('#'+key);page.mouse.move(0,0);page.wait_for_timeout(230);base=state(el);el.hover(force=True);page.wait_for_timeout(230);after=state(el)
   assert after['translate']=='none' and after['shadow']==base['shadow'] and after['bg']==base['bg'],(theme,key,base,after)
   assert after['duration']=='0s',(key,after)
  record(theme+': disabled, aria-disabled and busy controls have no hover change/animation')
  page.mouse.move(0,0);page.locator('#save').focus();page.keyboard.press('Tab');focused=page.locator(':focus');focus=state(focused)
  assert focused.get_attribute('id')=='danger' and focus['outline']!='none' and float(focus['outlineWidth'][:-2])>=2,(focused.get_attribute('id'),focus,page.evaluate('document.activeElement.outerHTML'))
  record(theme+': keyboard Tab and visible focus ring preserved')
  page.emulate_media(reduced_motion='reduce');page.locator('#save').hover();page.wait_for_timeout(50)
  assert state(page.locator('#save'))['translate']=='none' and state(page.locator('#save'))['duration']=='0s'
  positioned=page.locator('#positioned');page.mouse.move(0,0);before=state(positioned);positioned.hover();assert state(positioned)['transform']==before['transform']
  page.locator('#save').hover();page.mouse.down();assert state(page.locator('#save'))['translate']=='none' and state(page.locator('#save'))['transform']=='none';page.mouse.up()
  record(theme+': reduced motion removes hover/press movement and transitions')
  page.emulate_media(reduced_motion='no-preference')
  for width in [1440,768,390]:
   page.set_viewport_size({'width':width,'height':1100});page.mouse.move(0,0);page.wait_for_timeout(230)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(theme,width,'overflow')
   page.screenshot(path=str(OUT/f'{width}-{theme}.png'),full_page=True)
  record(theme+': 1440/768/390 px without horizontal overflow')
 page.locator('#target').evaluate('e=>e.textContent="0"');page.locator('#save').click();assert page.locator('#target').inner_text()!='0'
 page.locator('#link').click();assert page.evaluate('location.hash')=='#target';record('Existing click handlers and anchor navigation remain functional')
 mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 mobile.route('**/*',lambda route:route.abort());mp=mobile.new_page();mp.set_content(html)
 assert mp.evaluate('matchMedia("(hover: none) and (pointer: coarse)").matches')
 for theme in ['light','dark']:
  mp.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);mp.wait_for_timeout(230)
  for key in ['save','workspace','evaluation','nav','pdf']:
   el=mp.locator('#'+key);before=state(el);el.tap();mp.wait_for_timeout(550);after=state(el)
   assert after['translate']=='none' and after['shadow']==before['shadow'] and after['bg']==before['bg'],(theme,key,before,after)
 record('Touch device: no persistent hover lift/color/shadow in either theme')
 browser.close()
(OUT/'acceptance.json').write_text(json.dumps({'checks':checks,'scope':'Actual CSS, isolated representative control fixtures. No authenticated live panel or server deployment.'},ensure_ascii=False,indent=2)+'\n')
print(f'{len(checks)} checks passed')
