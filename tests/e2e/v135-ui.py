"""Real local API/Web, isolated v135 synthetic seed. No response mocking."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base='http://localhost:3115';api='http://localhost:4015';out=Path('test-results/v135/ui');out.mkdir(parents=True,exist_ok=True)
seed=json.loads(Path('test-results/v135/ui-seed.json').read_text());checks=[];errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 c=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 c.add_init_script("localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')")
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 headers={'Authorization':'Bearer '+seed['token']}
 def setting(open):
  r=c.request.patch(api+'/api/admin/store/settings',headers=headers,data={'open':open,'confirm':True});assert r.ok,r.text()
 setting(False)
 for width in [320,768,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  for theme in ['light','dark']:
   page.goto(base);page.evaluate('(t)=>{document.documentElement.dataset.theme=t;localStorage.setItem("kurumsal-theme",t)}',theme)
   expect(page).to_have_title('KurumsalSınav | Ölçme ve Değerlendirme Sistemi')
   assert page.locator('.hero-spark').count()==0
   assert page.get_by_role('link',name='Mağaza',exact=True).count()==0
   expect(page.locator('.demo-report')).to_contain_text('Ahmet Çalışkan')
   page.locator('.demo-report').scroll_into_view_if_needed();expect(page.locator('.demo-report')).to_contain_text('240 / 340')
   assert '8 doğru' in page.locator('.demo-report').inner_text()
   page.locator('.demo-scanner').scroll_into_view_if_needed();expect(page.locator('.demo-lock')).to_be_visible()
   expect(page.get_by_text('Ahmet Ç****',exact=True)).to_be_visible()
   page.locator('.demo-steps').scroll_into_view_if_needed();expect(page.get_by_role('meter',name='Temsili sınav eşleşme oranı')).to_have_attribute('aria-valuenow','85')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'overflow {width} {theme}'
   if width in [320,1440]:page.locator('.demo-report').screenshot(path=str(out/f'report-{width}-{theme}.png'))
   checks.append(f'home-{width}-{theme}-reduced-motion')
 for path in ['/magaza','/magaza/urun/'+seed['productId'],'/magaza/marka/'+seed['brandSlug']]:
  r=page.goto(base+path);assert r.status==404,(path,r.status)
 checks.append('closed-store-pages-404')
 setting(True);page.goto(base);expect(page.get_by_role('link',name='Mağaza',exact=True)).to_be_visible()
 for path in ['/magaza','/magaza/urun/'+seed['productId'],'/magaza/marka/'+seed['brandSlug']]:
  r=page.goto(base+path);assert r.status==200;assert page.locator('.store-card,.store-detail').count()>0
 checks.append('open-store-pages-and-home-link');setting(False)
 page.goto(base+'/sonuclar');expect(page).to_have_title('Öğrenci Karnelerim | KurumsalSınav')
 panel=page.locator('.public-results-card>.management-panel')
 panel.get_by_label('İl',exact=True).select_option(label='İstanbul');panel.get_by_label('İlçe',exact=True).select_option(label='Kadıköy');expect(panel.get_by_label('Kurum',exact=True).locator('option')).not_to_have_count(1)
 checks.append('student-location-cascade')
 page.evaluate('(t)=>sessionStorage.setItem("kurumsal-auth-token",t)',seed['token'])
 page.goto(base+'/panel?section=store');expect(page).to_have_title('Yönetim Paneli | KurumsalSınav');expect(page.locator('.store-management')).to_be_visible()
 page.get_by_role('button',name='Ürünler',exact=True).click();expect(page.get_by_role('button',name='Toplu Ürün İndir · filtrelenen')).to_be_visible();expect(page.get_by_label('Toplu Ürün Yükle',exact=True)).to_be_visible()
 page.get_by_role('button',name='Kategoriler',exact=True).click();page.get_by_role('button',name='Kategori ekle',exact=True).click();expect(page.get_by_label('Üst kategori',exact=True)).to_be_visible()
 checks.append('admin-store-products-excel-categories')
 page.goto(base+'/panel?section=publishers');expect(page.get_by_role('button',name='＋ Yayınevi Ekle',exact=True)).to_be_visible();page.get_by_role('button',name='＋ Yayınevi Ekle',exact=True).click();expect(page.get_by_label('E-posta',exact=True)).to_be_visible();expect(page.get_by_role('button',name='Yayınevini kaydet')).to_be_visible()
 checks.append('admin-publisher-create-form')
 page.goto(base+'/panel?section=exam-records');expect(page.get_by_text('Sınavın yayınevini değiştir',exact=True).first).to_be_visible();page.get_by_text('Sınavın yayınevini değiştir',exact=True).first.click();expect(page.get_by_label('Hedef yayınevi',exact=True).first).to_be_visible()
 checks.append('exam-publisher-transfer-ui')
 page.goto(base+'/panel?section=student-codes');expect(page.get_by_role('heading',name='Öğrenci erişim kodları',exact=True)).to_be_visible();page.get_by_label('Kurum',exact=True).select_option(seed['schoolId']);expect(page.get_by_label('Akademik yıl',exact=True)).to_have_value('2026-2027');expect(page.get_by_role('button',name='Kurum kodlarını yenile ve PDF indir',exact=True)).to_be_visible()
 checks.append('admin-student-codes-ui')
 # Public animation with motion enabled: completion is finite and can be restarted.
 c2=browser.new_context(viewport={'width':390,'height':844},reduced_motion='no-preference');c2.add_init_script("localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')")
 mobile=c2.new_page();mobile.goto(base);mobile.locator('.demo-report').scroll_into_view_if_needed();expect(mobile.locator('.demo-report')).to_contain_text('240 / 340',timeout=12000);mobile.locator('.demo-report').get_by_role('button',name='Yeniden oynat').click();expect(mobile.locator('.demo-report')).to_contain_text('0 doğru');checks.append('finite-motion-and-replay-mobile');c2.close()
 assert not errors,errors
 (out/'checks.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
 browser.close();print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False))
