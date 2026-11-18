import json,base64,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-results/v137/report-logo');seed=json.loads((out/'ui-seed.json').read_text());(out/'ui-input-logo.png').write_bytes(base64.b64decode(seed['image'].split(',')[1]));checks=[]
def ok(name):checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
 c.add_init_script('sessionStorage.setItem("kurumsal-auth-token",'+json.dumps(seed['token'])+');localStorage.setItem("ks-analytics-consent","denied");localStorage.setItem("kurumsal-theme","light");sessionStorage.setItem("kurumsal-splash-seen","1");')
 page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:3115/panel',wait_until='domcontentloaded');page.get_by_role('button',name='Sınav Sonuçları',exact=True).click()
 page.get_by_label('İl',exact=True).select_option('__missing__');page.get_by_label('İlçe',exact=True).select_option('__missing__');page.get_by_label('Sonuç kurumu',exact=True).select_option(seed['schoolId']);page.get_by_label('Yüklenen sınav',exact=True).select_option(seed['keyId'])
 toggle=page.get_by_role('checkbox',name='Sınava özel logo tanımla / ekle',exact=True);expect(toggle).to_be_enabled();expect(toggle).to_be_checked()
 toggle.uncheck();page.get_by_role('button',name='Logoyu kaydet',exact=True).click();expect(page.get_by_text('Varsayılan karne logosuna dönüldü.',exact=True)).to_be_visible()
 toggle.check();page.get_by_label('Sınava özel logo görseli',exact=True).set_input_files(str(out/'ui-input-logo.png'));page.get_by_role('button',name='Logoyu kaydet',exact=True).click();expect(page.get_by_text('Sınava özel logo kaydedildi. PDF karnelerine uygulanacak.',exact=True)).to_be_visible();ok('Dealer enables, uploads and saves exam-specific logo through the actual UI')
 page.get_by_role('checkbox',name='Karne altında kurumsalsinav.com yazısını göster',exact=True).uncheck()
 with page.expect_download() as info:page.get_by_role('button',name='Seçili raporu indir',exact=True).click()
 info.value.save_as(str(out/'browser-export.pdf'));text=subprocess.check_output(['pdftotext',str(out/'browser-export.pdf'),'-']).decode();assert 'kurumsalsinav.com' not in text and 'KURUMSAL SINAV' not in text and 'Kurumsal Sınav' in text;ok('Browser PDF download has custom header and platform footer while URL is off')
 for theme in ['light','dark']:
  for width in [390,1440]:
   page.set_viewport_size({'width':width,'height':1000});page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);page.wait_for_timeout(350);panel=page.locator('.exam-report-logo-settings');panel.scroll_into_view_if_needed();panel.screenshot(path=str(out/f'editor-{theme}-{width}.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 ok('Logo editor fits desktop/mobile and both themes')
 page.get_by_label('Yüklenen sınav',exact=True).select_option(index=0);expect(page.locator('.exam-report-logo-settings')).to_have_count(0);page.get_by_label('Yüklenen sınav',exact=True).select_option(seed['keyId']);expect(toggle).to_be_checked();ok('Saved exam logo is restored after changing selection')
 assert not errors,errors
 (out/'browser.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors},ensure_ascii=False,indent=2));b.close()
