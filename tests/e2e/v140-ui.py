import json,re,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
seed=json.loads(Path('test-results/v140/ui-seed.json').read_text())
out=Path('test-results/v140/ui');out.mkdir(exist_ok=True)
checks=[];errors=[];metrics={}
def check(name):checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True)
 context.add_init_script("sessionStorage.setItem('kurumsal-auth-token',"+json.dumps(seed['token'])+");localStorage.setItem('kurumsal-theme','light');")
 page=context.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',str(e),flush=True)));page.on('dialog',lambda d:d.accept())
 page.goto('http://localhost:3120/panel');expect(page.locator('.dashboard')).to_be_visible();expect(page.locator('.announcement-home')).to_be_visible();check('Admin panel home displays current announcements')
 def nav(section):
  page.locator('[data-operation="'+section+'"]').click();expect(page.locator('.dashboard-content h1')).to_be_visible()
 def help_open():
  page.get_by_role('button',name=re.compile('yardımını aç$')).click();expect(page.locator('.help-center')).to_be_visible();expect(page.locator('.help-center')).to_have_attribute('data-controls-ready','true')
 nav('fmt-share');expect(page.locator('.fmt-library-card').first).to_be_visible();help_open();expect(page.locator('.help-simulation')).to_be_visible();check('Animated explanation is the default lazy guide tab')
 page.get_by_role('button',name='Kontrol açıklamaları',exact=True).click();count=page.locator('.help-control-list details').count();rows=page.locator('.dashboard-content .fmt-library-card').count();assert count<rows*4;assert 'paylaşmak için seç' not in page.locator('.help-control-list').inner_text().lower() or count<20
 page.locator('.help-center').get_by_role('button',name='Kapat',exact=True).click()
 page.evaluate("""()=>{const host=document.createElement('div');host.id='synthetic-repeat-test';for(let i=0;i<500;i++){const b=document.createElement('button');b.dataset.helpId='panel-fmt-sharing-2';b.textContent='KULLANICI_VERISI_'+i;b.setAttribute('aria-label','KULLANICI_VERISI_'+i);host.append(b);}document.querySelector('.dashboard-content').append(host)}""")
 help_open();page.get_by_role('button',name='Kontrol açıklamaları',exact=True).click();assert page.locator('.help-control-list details').count()==count;assert 'KULLANICI_VERISI' not in page.locator('.help-center').inner_text();check('500 repeated record controls produce one function with no dynamic record names')
 page.get_by_role('button',name='Etkileşimli sayfa turu',exact=True).click();expect(page.locator('.help-tour-card')).to_be_visible();assert page.locator('.help-tour').evaluate('e=>getComputedStyle(e).position')=='fixed';page.get_by_role('button',name='Sonraki adım',exact=True).click();page.get_by_role('button',name='Turu kapat',exact=True).click();page.evaluate("document.getElementById('synthetic-repeat-test').remove()");check('Tour highlights real controls behind a blocking overlay without invoking them')
 nav('announcements');page.get_by_role('button',name='Otomatik duyuru ayarları',exact=True).click();expect(page.get_by_role('heading',name='Otomatik duyuru ayarları',exact=True)).to_be_visible();setting=page.locator('.announcement-center form').filter(has=page.get_by_text('Yeni FMT',exact=True));setting.locator('input[type=checkbox]').uncheck();setting.get_by_role('button',name='Ayarı kaydet',exact=True).click();expect(page.get_by_role('status').filter(has_text='Duyuru ayarı sunucuya kaydedildi.')).to_be_visible();page.get_by_role('button',name='Ayarları kapat',exact=True).click();page.get_by_role('button',name='Geçmiş sürümleri içe aktar',exact=True).click();expect(page.get_by_role('status').filter(has_text='Zaten bulunan:')).to_be_visible();check('Settings save and history import show distinct confirmed server feedback')
 nav('publishers');expect(page.locator('.publisher-item').first).to_be_visible();assert page.locator('.publisher-item').count()<=25;page.get_by_placeholder('Yayınevi ara...').fill('Sayfalama');expect(page.locator('.publisher-item')).to_have_count(25);page.get_by_role('navigation',name='Yayınevi sayfaları').get_by_role('button',name='Sonraki',exact=True).click();expect(page.get_by_role('navigation',name='Yayınevi sayfaları')).to_contain_text('2 /');check('Publisher search and SQL pages show at most 25 records')
 nav('fmt-upload');expect(page.locator('.fmt-sharing')).to_be_visible();page.locator('.fmt-sharing').get_by_label('Kaynak',exact=True).select_option('system');expect(page.locator('.fmt-library-card').first).to_be_visible();check('FMT management reuses the compact categorized sharing library')
 nav('pdf-tools');expect(page.locator('.pdf-center-cards')).to_be_visible();assert page.locator('.pdf-center-cards [role=tab]').count()==11
 page.get_by_role('tab',name=re.compile('PDF Birleştir')).click();frame=page.frame_locator('iframe[title="PDF ve Görsel Araçları"]');expect(frame.locator('#tool-title')).to_have_text('PDF dosyalarını birleştir');expect(frame.locator('.pdf-tool-tabs')).to_be_hidden()
 page.get_by_role('tab',name=re.compile('PDF Böl')).click();expect(frame.locator('#tool-title')).to_contain_text('böl');page.get_by_role('tab',name=re.compile('PDF düzenleme')).click();expect(page.locator('iframe[title="PDF Editörü"]')).to_be_visible();page.get_by_role('tab',name=re.compile('PDF Böl')).click();expect(frame.locator('#tool-title')).to_contain_text('böl');check('All PDF tools share one card grid and opened workspaces survive tool changes')
 nav('exam-records');expect(page.get_by_role('button',name='Cevap anahtarı ekle',exact=True)).to_be_visible();page.get_by_role('button',name='Cevap anahtarı ekle',exact=True).click();page.get_by_label('Cevap anahtarı giriş yöntemi').select_option('manual');page.locator('.exam-template-picker summary').click();page.get_by_label('Hazır / kişisel şablon',exact=True).select_option('builtin-lgs');page.get_by_role('button',name='Yapıyı taslağa uygula',exact=True).click();expect(page.locator('.optical-key-preview tbody tr')).to_have_count(30);assert page.locator('.optical-bubbles button').count()==120
 page.locator('.optical-bubbles button').first.click();expect(page.locator('.optical-bubbles button').first).to_have_attribute('aria-pressed','true');page.get_by_label('Optik seçenek sayısı').select_option('3');assert page.locator('.optical-bubbles button').count()==90
 with page.expect_download() as event:page.get_by_role('button',name='Düzenlenen anahtarı Excel indir',exact=True).click()
 download=event.value;download.save_as(out/'draft-key.xlsx');assert (out/'draft-key.xlsx').stat().st_size>1000;check('LGS template creates 90 questions; 30-row optical editor uses 3/4 choices and exports real Excel')
 nav('reevaluate');expect(page.get_by_role('button',name='Yeniden değerlendirmeyi önizle',exact=True)).to_be_visible();page.get_by_label('Sınav',exact=True).select_option(seed['keyId']);page.get_by_label('Kurum kapsamı').select_option(seed['schoolId']);page.get_by_role('button',name='Yeniden değerlendirmeyi önizle',exact=True).click();expect(page.locator('.dashboard-content')).to_contain_text('zaten güncel');check('Central reevaluation shows actual current-state counts')
 nav('backup-center');expect(page.locator('.dashboard-content')).to_contain_text('Hazırlık sayfası');assert page.locator('.dashboard-content .management-panel button').count()==0;check('Backup center is an honest preparation page with no fake restore action')
 nav('export-center');page.get_by_label('Veri türü',exact=True).select_option('txt');expect(page.get_by_label('Bayi ID',exact=True)).to_be_visible();assert page.get_by_label('Kategori ID',exact=True).count()==0;page.get_by_label('Veri türü',exact=True).select_option('products');expect(page.get_by_label('Kategori ID',exact=True)).to_be_visible();assert page.get_by_label('Bayi ID',exact=True).count()==0;check('Export center displays only data-specific filters')
 nav('audit-logs');expect(page.get_by_role('heading',name='Saklama ve bakım')).to_be_visible();expect(page.locator('.audit-maintenance')).to_contain_text('Zamanlanmış otomatik silme kurulmadı');check('Audit maintenance shows real storage/retention and explicitly reports automation disabled')
 # Ten palettes and both brightness modes use shared tokens and preserve non-reloading preference.
 names=['Zümrüt ve Altın','Pembe ve Zeytin','Lacivert ve Bakır','Bordo ve Şampanya','Safir ve Gümüş','Antrasit ve Turkuaz','Mor ve Lavanta','Orman ve Krem','Petrol ve Mercan','Gece Mavisi ve Buz']
 for i,name in enumerate(names):
  page.locator('.palette-picker summary').click();page.locator('.palette-options').get_by_role('button',name=name,exact=True).click();assert page.evaluate('localStorage.getItem("kurumsal-palette")')==page.locator('html').get_attribute('data-palette')
  for theme in ['light','dark']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
   assert page.locator('.dashboard-content').evaluate('e=>e.scrollWidth<=e.clientWidth+2')
 page.screenshot(path=str(out/'audit-midnight-dark-1440.png'),full_page=True);check('All ten palettes render in light and dark using persistent shared tokens')
 page.set_viewport_size({'width':390,'height':844});page.evaluate("document.documentElement.dataset.theme='light'")
 page.get_by_role('button',name='Menüyü aç',exact=True).click();nav('student-codes');expect(page.get_by_label('Kurum',exact=True)).to_be_visible();expect(page.locator('.dashboard-content h1')).to_have_text('Öğrenci Erişim Kodları');assert page.get_by_role('heading',name='Öğrenci Erişim Kodları',exact=True).count()==1;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2');expect(page.locator('.sidebar')).not_to_have_class(re.compile('sidebar-open'));page.screenshot(path=str(out/'student-codes-mobile.png'),full_page=True,animations='disabled');check('Mobile student code page has one heading and no horizontal overflow')
 help_open();page.screenshot(path=str(out/'guide-mobile.png'),full_page=True);page.locator('.help-center').get_by_role('button',name='Kapat',exact=True).click()
 # Separate dealer context proves new admin-only centers stay out of the menu.
 dc=browser.new_context(viewport={'width':1440,'height':1000});dc.add_init_script("sessionStorage.setItem('kurumsal-auth-token',"+json.dumps(seed['dealerToken'])+");");dp=dc.new_page();dp.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE_ERROR',str(e),flush=True)));dp.goto('http://localhost:3120/panel');expect(dp.locator('.dashboard')).to_be_visible();assert dp.locator('[data-operation="export-center"]').count()==0;assert dp.locator('[data-operation="backup-center"]').count()==0;expect(dp.locator('[data-operation="announcements"]')).to_be_visible();expect(dp.locator('[data-operation="reevaluate"]')).to_be_visible();check('Dealer retains announcements/reevaluation and cannot see admin centers')
 # Compare the previous max-height strip behavior with reserved layout at real scene steps.
 hc=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference')
 hc.add_init_script("localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')")
 hp=hc.new_page();hp.on('pageerror',lambda e:errors.append(str(e)));hp.clock.install();hp.goto('http://localhost:3120',wait_until='networkidle');hp.add_style_tag(content='html{scroll-behavior:auto!important}')
 layout=[]
 for width in [1440,390]:
  hp.set_viewport_size({'width':width,'height':1000});scene=hp.locator('.demo-inference');scene.scroll_into_view_if_needed();hp.clock.run_for(200)
  for mode in ['previous-height-rule','reserved-strips']:
   style=hp.add_style_tag(content='.scene-field-strips{max-height:0!important;min-height:0!important;overflow:hidden!important;transition:max-height .3s,opacity .3s!important}.scene-pipeline li[data-active=true] .scene-field-strips{max-height:25px!important}') if mode=='previous-height-rule' else None
   scene.get_by_role('button',name='Yeniden oynat',exact=True).click();hp.clock.run_for(150);heights=[];scroll=[];steps=set()
   for i in range(160):
    hp.clock.run_for(50);state=scene.evaluate('e=>({height:e.getBoundingClientRect().height,y:scrollY,step:+e.dataset.step})');heights.append(state['height']);scroll.append(state['y']);steps.add(state['step'])
   layout.append({'width':width,'mode':mode,'heightRangePx':max(heights)-min(heights),'scrollRangePx':max(scroll)-min(scroll),'steps':sorted(steps)})
   if mode=='reserved-strips':
    assert max(heights)-min(heights)<=1,(width,layout)
    assert max(scroll)-min(scroll)<=1,(width,layout)
   if style:style.evaluate('e=>e.remove()')
 metrics['inferenceLayout']=layout;scene.screenshot(path=str(out/'inference-layout-mobile.png'));hc.close();check('File-to-evaluation scene reserves strip heights across actual animation steps at desktop/mobile widths')
 assert not errors,errors
 Path('test-results/v140/browser-acceptance.json').write_text(json.dumps({'checks':checks,'pageErrors':errors,'metrics':metrics},ensure_ascii=False,indent=2));browser.close()
