"""Real local panel and report generators, synthetic in-memory API records only."""
import json, os, pathlib, re, urllib.request, zipfile
from playwright.sync_api import sync_playwright, expect

root=pathlib.Path(__file__).resolve().parents[2]
out=root/'test-results/panel-menu';out.mkdir(parents=True,exist_ok=True)
base='http://127.0.0.1:3123';api='http://127.0.0.1:4023'
tokens=json.load(urllib.request.urlopen(api+'/fixture'))['tokens']
checks=[];errors=[]
def check(name):
 checks.append(name);print('PASS',name,flush=True)
 (out/'checks.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},ensure_ascii=False,indent=2))
def state(el):
 return el.evaluate('''e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bg:s.backgroundColor,border:s.borderTopColor,borderWidth:s.borderTopWidth,radius:s.borderTopLeftRadius,color:s.color,translate:s.translate,outline:s.outlineStyle,outlineWidth:s.outlineWidth}}''')
def stable(a,b):
 for key in ['x','y','width','height']:assert abs(a[key]-b[key])<.1,(key,a,b)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
 context.route(re.compile(r'^https?://(?!localhost[:/]|127\.0\.0\.1[:/])'),lambda route:route.abort())
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(20000)
 def auth(role,path='/panel?section=results'):
  page.goto(base+'/robots.txt')
  page.evaluate('(t)=>{sessionStorage.clear();sessionStorage.setItem("kurumsal-auth-token",t);sessionStorage.setItem("kurumsal-splash-seen","1");localStorage.setItem("ks-analytics-consent","denied");localStorage.setItem("kurumsal-theme","light");}',tokens[role])
  page.goto(base+path);expect(page.locator('.dashboard')).to_be_visible()
  consent=page.get_by_role('button',name='Yalnızca Gerekli Olanlar',exact=True)
  if consent.is_visible():consent.click()
 def nav(section):
  if page.locator('.sidebar').bounding_box()['x']<0:page.get_by_role('button',name='Menüyü aç',exact=True).click()
  button=page.locator('[data-operation="'+section+'"]');category=button.locator('xpath=ancestor::div[contains(@class,"nav-group")]').first.locator('.nav-category')
  if category.get_attribute('aria-expanded')!='true':category.click()
  button.click();expect(button).to_have_attribute('aria-current','page')
 auth('SUPER_ADMIN','/panel?section=school-analysis')
 assert page.url.endswith('section=results')
 expect(page.locator('[data-operation=results]')).to_have_count(1)
 expect(page.locator('[data-operation=school-analysis]')).to_have_count(0)
 assert 'Rapor Al' not in page.locator('.side-nav').inner_text()
 check('Eski Rapor Al bağlantısı tek Sınav Sonuçları girişine yönlenir')
 expected=['FMT Yönetimi','Paylaşım Yönetimi','Öğrenciler','Sistem Kullanıcıları','Öğrenci Erişimi']
 for label in expected:expect(page.locator('.nav-category').filter(has_text=re.compile('^'+re.escape(label)+'$'))).to_have_count(1)
 category=page.locator('.nav-category').first;selected=page.locator('[data-operation=results]')
 for theme in ['light','dark']:
  page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
  page.wait_for_timeout(320)
  category.scroll_into_view_if_needed();category.press('Enter');expect(category).to_have_attribute('aria-expanded','false')
  page.mouse.move(900,50);page.wait_for_timeout(230);closed=state(category)
  category.hover();page.wait_for_timeout(230);hover=state(category);stable(closed,hover)
  assert closed['bg']==hover['bg'] and closed['border']==hover['border'] and closed['color']==hover['color'],(theme,closed,hover)
  category.press('Space');expect(category).to_have_attribute('aria-expanded','true')
  page.mouse.move(900,50);page.wait_for_timeout(230);opened=state(category);active=state(selected)
  expect(category).to_have_css('color','rgb(35, 128, 86)' if theme=='light' else 'rgb(115, 213, 164)')
  expect(selected).to_have_css('color','rgb(46, 101, 197)' if theme=='light' else 'rgb(139, 178, 255)')
  assert opened['bg']==closed['bg'] and opened['color']!=active['color'] and opened['border']!=active['border']
  transform=category.locator('.nav-category-arrow').evaluate('(e)=>getComputedStyle(e).transform')
  matrix=[float(v) for v in transform.removeprefix('matrix(').removesuffix(')').split(',')]
  assert all(abs(a-b)<.001 for a,b in zip(matrix,[0,1,-1,0,0,0])),transform
  assert category.locator('.nav-category-arrow').evaluate('(e)=>getComputedStyle(e).transitionDuration')=='0.2s'
  selected.hover();page.wait_for_timeout(230);selected_hover=state(selected);stable(active,selected_hover)
  assert selected_hover['bg']==active['bg'] and selected_hover['border']==active['border'] and selected_hover['color']==active['color']
  inactive=page.locator('[data-operation=exam]');inactive.scroll_into_view_if_needed();page.mouse.move(900,50);page.wait_for_timeout(230);normal=state(inactive)
  inactive.hover();page.wait_for_timeout(230);over=state(inactive);stable(normal,over)
  assert over['bg']!=normal['bg'] and over['border']!=normal['border']
  page.mouse.down();page.wait_for_timeout(230);stable(normal,state(inactive));page.mouse.move(900,50);page.mouse.up()
  expect(selected).to_have_attribute('aria-current','page');expect(category).to_have_attribute('aria-expanded','true')
  page.mouse.move(900,50);page.wait_for_timeout(230)
  assert state(category)['bg']==opened['bg'] and state(selected)['bg']==active['bg']
  category.focus();page.keyboard.press('Tab');expect(inactive).to_be_focused()
  focus=state(inactive);assert focus['outline']!='none' and float(focus['outlineWidth'][:-2])>=2
  # Every category and every submenu row has a real visible border/background.
  for button in page.locator('.nav-category').all():
   if button.get_attribute('aria-expanded')!='true':button.click()
  expect(page.locator('.nav-category[data-current=true]')).to_have_count(1)
  expect(category).to_have_attribute('data-current','true')
  for button in page.locator('.nav-category[data-current=false]').all():
   assert state(button)['color']!=state(category)['color']
  for button in page.locator('.side-nav .nav-category, .side-nav .nav-item').all():
   s=state(button);assert s['borderWidth']=='1px' and float(s['radius'][:-2])>=6 and s['bg']!='rgba(0, 0, 0, 0)',s
  assert selected.bounding_box()['x']>category.bounding_box()['x']
  category.scroll_into_view_if_needed();page.mouse.move(900,50);page.wait_for_timeout(230)
  page.locator('.sidebar').screenshot(path=str(out/f'menu-{theme}.png'))
  check(theme+': tüm satırlar kutulu; hover/press kaydırmaz; yeşil ve mavi kalıcı; ok ve klavye odağı çalışır')
 # Height interpolation and row ordering use real browser frames, including reversal.
 submenu=page.locator('#'+category.get_attribute('aria-controls'))
 category.click();page.wait_for_timeout(320)
 expect(submenu).to_have_attribute('inert','')
 assert submenu.bounding_box()['height']==0
 category.focus();page.keyboard.press('Tab');expect(page.locator('.nav-category').nth(1)).to_be_focused()
 frames=category.evaluate('''async e=>{
  const list=document.getElementById(e.getAttribute('aria-controls')),rows=[...list.querySelectorAll('.nav-item')],samples=[];
  e.click();const start=performance.now();
  await new Promise(resolve=>{function frame(now){samples.push({ms:now-start,height:list.getBoundingClientRect().height,opacity:rows.map(r=>+getComputedStyle(r).opacity)});if(now-start<330)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  return {samples,delays:rows.map(r=>getComputedStyle(r).transitionDelay),finalHeight:list.getBoundingClientRect().height};
 }''')
 assert any(0<s['height']<frames['finalHeight'] for s in frames['samples']),frames
 assert any(s['opacity'][0]>s['opacity'][-1] for s in frames['samples']),frames
 assert frames['samples'][-1]['opacity']==[1]*6,frames
 assert [float(d.split(',')[0].rstrip('s')) for d in frames['delays']]==[i*.02 for i in range(6)],frames
 (out/'submenu-animation.json').write_text(json.dumps(frames,indent=2))
 category.evaluate('''async e=>{for(let i=0;i<7;i++){e.click();await new Promise(r=>setTimeout(r,25));}}''')
 page.wait_for_timeout(320);expect(category).to_have_attribute('aria-expanded','false');assert submenu.bounding_box()['height']==0
 category.press('Enter');page.keyboard.press('Tab');expect(page.locator('[data-operation=exam]')).to_be_focused()
 page.wait_for_timeout(320);assert submenu.bounding_box()['height']==frames['finalHeight']
 check('260 ms yükseklik geçişi ve 20 ms sıralı satırlar gerçek karelerde görüldü; hızlı ters geçiş takılmadı, kapalı liste odak almaz')
 # The longest category still completes within 300 ms (11 rows, last delay 200 ms).
 longest=page.locator('.nav-category').filter(has_text=re.compile('^Yönetim$'))
 if longest.get_attribute('aria-expanded')=='true':longest.click()
 page.wait_for_timeout(320)
 long_list=page.locator('#'+longest.get_attribute('aria-controls'))
 longest.click();page.wait_for_timeout(310)
 for row in long_list.locator('.nav-item').all():expect(row).to_have_css('opacity','1')
 assert long_list.locator('.nav-item').last.evaluate('(e)=>getComputedStyle(e).transitionDelay.split(",")[0]')=='0.2s'
 longest.click()
 # Keep one category open for compact populated-screen screenshots.
 for button in page.locator('.nav-category').all()[1:]:
  if button.get_attribute('aria-expanded')=='true':button.click()
 desk=page.locator('.exam-results-desk')
 desk.get_by_label('Sınav ara',exact=True).fill('Deneme 8')
 desk.get_by_label('Rapor yayınevi',exact=True).select_option(label='Sentetik Yayınları')
 desk.get_by_label('Rapor sınıf filtresi',exact=True).select_option('8')
 expect(desk.locator('.evaluation-publisher')).to_have_count(1)
 desk.locator('.evaluation-publisher .evaluation-card').click()
 desk.locator('.results-choice-card').nth(1).get_by_role('button',name=re.compile('Sentetik Ankara Kurumu')).click()
 expect(desk.get_by_role('button',name='Seçili raporu indir',exact=True)).to_be_enabled()
 expect(desk.locator('.result-table').first).to_be_visible()
 desk.get_by_label('Sonuç sınıfı',exact=True).select_option('8')
 student_select=desk.get_by_label('Karne öğrencisi',exact=True)
 student_select.select_option(student_select.locator('option').nth(1).get_attribute('value'))
 desk.get_by_label('Rapor sıralaması',exact=True).select_option('name')
 desk.get_by_label('Genel katılımı ve genel sıralamayı göster',exact=True).uncheck()
 desk.get_by_label('Kurum katılımını ve kurum sıralamasını göster',exact=True).uncheck()
 desk.get_by_label('Karne altında kurumsalsinav.com yazısını göster',exact=True).uncheck()
 for fmt in ['pdf','xlsx','zip']:
  desk.get_by_label('İndirme biçimi',exact=True).select_option(fmt)
  with page.expect_download() as download:desk.get_by_role('button',name='Seçili raporu indir',exact=True).click()
  file=out/('student-report.'+fmt);download.value.save_as(str(file));assert file.stat().st_size>100
  if fmt=='pdf':assert file.read_bytes().startswith(b'%PDF-')
  else:
   with zipfile.ZipFile(file) as z:
    if fmt=='xlsx':assert 'xl/workbook.xml' in z.namelist()
    else:assert len(z.namelist())==1 and all(z.read(n).startswith(b'%PDF-') for n in z.namelist())
 check('Birleşik ekranda yayınevi/sınıf/kurum/öğrenci filtreleriyle gerçek PDF, Excel ve tek öğrencilik ZIP indirildi')
 desk.get_by_role('button',name='PDF önizle',exact=True).click()
 expect(desk.locator('.report-canvas-preview canvas').first).to_have_attribute('data-rendered','true',timeout=30000)
 desk.get_by_role('button',name='Önizlemeyi kapat',exact=True).click()
 for kind,fmt in [('Okul Sonuç Karnesi','pdf'),('Sınıf Sonuç Listesi','xlsx')]:
  desk.get_by_role('button',name=kind,exact=True).click();expect(desk.get_by_label('Liste şablonu',exact=True)).to_be_visible()
  desk.get_by_label('İndirme biçimi',exact=True).select_option(fmt)
  with page.expect_download() as download:desk.get_by_role('button',name='Seçili raporu indir',exact=True).click()
  file=out/(('school' if fmt=='pdf' else 'classes')+'.'+fmt);download.value.save_as(str(file));assert file.stat().st_size>100
 check('PDF.js önizleme, okul sonuç karnesi ve sınıf sonuç listesi çalışır')
 analysis=desk.locator('details').filter(has=page.get_by_text('Genel analiz ve Okul Çalışma Önerileri',exact=True))
 analysis.locator('summary').first.click();analysis.get_by_role('button',name='Analizi hazırla',exact=True).click()
 expect(analysis.get_by_role('heading',name='Sınav Kalite Karnesi',exact=True)).to_be_visible()
 with page.expect_download() as download:analysis.get_by_role('button',name='Genel analiz PDF indir',exact=True).click()
 download.value.save_as(str(out/'general-analysis.pdf'));assert (out/'general-analysis.pdf').read_bytes().startswith(b'%PDF-')
 analysis.get_by_role('button',name='Okul Çalışma Önerileri',exact=True).click();analysis.get_by_role('button',name='Analizi hazırla',exact=True).click()
 expect(analysis).to_contain_text('Son beş güncel sınav')
 check('Mevcut genel analiz PDF ve okul çalışma önerileri birleşik ekranın içinde erişilebilir')
 for width in [1440,390]:
  page.set_viewport_size({'width':width,'height':1000})
  for theme in ['light','dark']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
   if width==390:page.get_by_role('button',name='Menüyü aç',exact=True).click()
   category.scroll_into_view_if_needed();page.mouse.move(900 if width>390 else 380,50);page.wait_for_timeout(230)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   page.screenshot(path=str(out/f'results-{width}-{theme}.png'))
   if width==390:page.locator('[data-operation=results]').click()
 check('Açık/koyu tema ve masaüstü/mobil görünümde yatay taşma yok; mobil menü çalışır')
 page.set_viewport_size({'width':1440,'height':1000});nav('calendar');page.go_back();expect(selected).to_have_attribute('aria-current','page');page.go_forward();expect(page.locator('[data-operation=calendar]')).to_have_attribute('aria-current','page');nav('results');page.reload();expect(selected).to_have_attribute('aria-current','page')
 check('Birleşik ekran yenilemede, geri ve ileri gezinmede korunur')
 for theme in ['light','dark']:
  page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
  nav('calendar');page.mouse.move(900,50);page.wait_for_timeout(230)
  expect(category).to_have_attribute('data-current','false')
  expect(page.locator('.nav-category[data-current=true]')).to_have_count(1)
  calendar_category=page.locator('[data-operation=calendar]').locator('xpath=ancestor::div[contains(@class,"nav-group")]').first.locator('.nav-category')
  expect(calendar_category).to_have_attribute('data-current','true')
  expect(selected).not_to_have_attribute('aria-current','page')
  assert state(category)['color']!=state(calendar_category)['color']
  nav('results');page.mouse.move(900,50);page.wait_for_timeout(230)
  expect(category).to_have_attribute('data-current','true')
  expect(calendar_category).to_have_attribute('data-current','false')
  expect(page.locator('.nav-category[data-current=true]')).to_have_count(1)
  category.scroll_into_view_if_needed();page.locator('.sidebar').screenshot(path=str(out/f'menu-selection-{theme}.png'))
 check('Birden fazla açık grupta yalnız seçili ekranın ana başlığı yeşil; bölüm değişince eski başlık kurumsal maviye döner')
 for path in ['/panel?section=fmt-upload','/panel?section=fmt-edit']:
  page.goto(base+path);expect(page.locator('.fmt-workspace')).to_be_visible()
  fmt_category=page.locator('.nav-category').filter(has_text=re.compile('^FMT Yönetimi$'));fmt_selected=page.locator('[data-operation=fmt-upload]')
  expect(fmt_category).to_have_attribute('data-current','true');expect(fmt_selected).to_have_attribute('aria-current','page')
  expect(page.locator('.nav-category[data-current=true]')).to_have_count(1)
  page.reload();expect(fmt_selected).to_have_attribute('aria-current','page');expect(fmt_category).to_have_attribute('data-current','true')
  expect(fmt_category).to_have_css('color','rgb(35, 128, 86)');expect(fmt_selected).to_have_css('color','rgb(46, 101, 197)')
  page.mouse.move(900,50);page.wait_for_timeout(320);green=state(fmt_category);blue=state(fmt_selected)
  fmt_category.hover();page.wait_for_timeout(230);assert state(fmt_category)['bg']==green['bg']
  fmt_selected.hover();page.wait_for_timeout(230);assert state(fmt_selected)['bg']==blue['bg']
  category.click();expect(fmt_category).to_have_attribute('data-current','true');expect(category).to_have_attribute('data-current','false')
  page.mouse.move(900,50);page.wait_for_timeout(320);page.locator('.sidebar').screenshot(path=str(out/('fmt-menu-'+path.split('=')[1]+'.png')))
 check('FMT ekranı ve eski doğrudan FMT adresi yenilemede yeşil başlık/mavi satırı korur; başka menüyü açmak seçimi değiştirmez')
 nav('pdf-tools');expect(page.locator('.pdf-primary-tools')).to_be_visible()
 for label in ['PDF Düzenleyici','Dosya ve Sayfa İşlemleri','Belge Tarama']:
  expect(page.locator('.pdf-primary-tools strong').get_by_text(label,exact=True)).to_be_visible()
 for button in page.locator('.side-nav .nav-category, .side-nav .nav-item').all():assert button.evaluate('(e)=>getComputedStyle(e).textTransform')=='none'
 check('Ana/alt menü ve PDF araç başlıklarında doğal Türkçe yazım; FMT, PDF ve TXT kısaltmaları korunur')
 auth('DEALER');desk=page.locator('.exam-results-desk');expect(desk.locator('.evaluation-card')).to_have_count(2)
 assert 'Sentetik İzmir Kurumu' not in desk.inner_text()
 response=context.request.get(api+'/api/optical/result-exams/exam-a?schoolId=school-b',headers={'Authorization':'Bearer '+tokens['DEALER']});assert response.status==403
 response=context.request.get(api+'/api/optical/result-exams/exam-a/export?schoolId=school-b&format=pdf',headers={'Authorization':'Bearer '+tokens['NO_EXPORT']});assert response.status==403 and 'yetkiniz' in response.json()['error']
 check('Bayi kurum kapsamı ve kapalı rapor indirme yetkisi gerçek API politikalarında korunur')
 auth('SCHOOL_ADMIN','/panel?section=school-analysis');assert page.url.endswith('section=results')
 expect(page.locator('.exam-analytics')).to_be_visible();expect(page.locator('.exam-results-desk')).to_have_count(0)
 analytics=page.locator('.exam-analytics');analytics.get_by_role('combobox').nth(0).select_option('school-a');analytics.get_by_role('combobox').nth(1).select_option('exam-a');analytics.get_by_role('button',name='Analizi hazırla',exact=True).click();expect(analytics.get_by_role('heading',name='Sınav Kalite Karnesi',exact=True)).to_be_visible()
 response=context.request.get(api+'/api/optical/result-catalog',headers={'Authorization':'Bearer '+tokens['SCHOOL_ADMIN']});assert response.status==403
 response=context.request.get(api+'/api/exam-analytics/?schoolId=school-b&keyId=exam-a',headers={'Authorization':'Bearer '+tokens['SCHOOL_ADMIN']});assert response.status==404
 check('Okul yöneticisinin eski analiz erişimi korunur; kişisel sonuç/rapor ve başka kurum erişimi açılmaz')
 auth('SUPER_ADMIN')
 page.emulate_media(reduced_motion='reduce')
 category.click();expect(category).to_have_attribute('aria-expanded','false');assert submenu.bounding_box()['height']==0
 category.click();expect(category).to_have_attribute('aria-expanded','true')
 for el in [category.locator('.nav-category-arrow'),submenu,*submenu.locator('.nav-item').all()]:assert el.evaluate('(e)=>getComputedStyle(e).transitionDuration')=='0s'
 expect(selected).to_have_css('opacity','1');assert submenu.bounding_box()['height']>0
 check('Hareket azaltma tercihinde yükseklik, satır ve ok geçişleri atlanır')
 page.goto(base+'/');hero=page.locator('.real-report-hero');expect(hero).to_be_visible()
 page.locator('.splash-screen').wait_for(state='hidden') if page.locator('.splash-screen').count() else None
 image=hero.locator('img');expect(image).to_have_attribute('src','/home-report.webp?v=2')
 expect(image).to_have_js_property('naturalWidth',1980);expect(image).to_have_js_property('naturalHeight',2800)
 # The image remains fully opaque even when its visibility-controlled animation pauses.
 for theme in ['light','dark']:
  page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
  hero.scroll_into_view_if_needed()
  hero.evaluate('(e)=>e.dataset.floating="false"');expect(hero).to_have_css('opacity','1')
  assert image.evaluate('(e)=>getComputedStyle(e).filter')=='none'
  hero.screenshot(path=str(out/f'home-report-{theme}.png'))
 check('Ana sayfa raporu 1980×2800 kayıpsız görseli yükler; iki temada duraklatılmış animasyonda bile opaktır')
 assert not errors,errors;check('Chromium JavaScript hatası yok')
 context.close();browser.close()
