"""Local production web and guarded synthetic API seed. No mocked server responses."""
import json,time,zipfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-results/v134/ui');out.mkdir(parents=True,exist_ok=True)
seed=json.loads(Path('test-results/v132/seed.json').read_text());base='http://localhost:3110';checks=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox'])
 c=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 c.add_init_script("localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')")
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 for width in [320,768,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  for theme in ['light','dark']:
   page.goto(base);page.evaluate('(t)=>{localStorage.setItem("kurumsal-theme",t);document.documentElement.dataset.theme=t}',theme)
   expect(page.locator('.version-badge')).to_contain_text('v1.3.4')
   expect(page.locator('.real-report-hero img')).to_be_visible()
   assert page.locator('.real-report-hero img').evaluate('(i)=>i.complete&&i.naturalWidth>0')
   assert 'HER CEVAP YENİ BİR BAŞLANGIÇ' not in page.locator('body').inner_text()
   assert page.get_by_role('button',name='Şeridi durdur Ⅱ').count()==0
   page.locator('.progress-section').scroll_into_view_if_needed()
   expect(page.locator('.progress-net')).to_contain_text('72')
   assert page.locator('.academic-line').evaluate('(n)=>getComputedStyle(n).animationName')=='none'
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.locator('.optical-story').scroll_into_view_if_needed();page.locator('.institution-section').scroll_into_view_if_needed();page.wait_for_timeout(100)
   assert page.locator('html').get_attribute('data-theme')==theme
   page.screenshot(path=str(out/f'home-{width}-{theme}.png'),full_page=True)
 checks.append('Home: 320/768/1440, light/dark, real anonymous report, version and reduced motion')
 # Natural timer progress completes without additional scrolling.
 page.emulate_media(reduced_motion='no-preference');page.goto(base);page.locator('.optical-story').scroll_into_view_if_needed();page.wait_for_timeout(4600);expect(page.locator('.optical-story')).to_have_attribute('data-step','6');checks.append('Intersection-triggered story completes at rest without scroll input')
 page.emulate_media(reduced_motion='reduce');page.set_viewport_size({'width':1440,'height':1000})
 page.goto(base);page.evaluate('(t)=>sessionStorage.setItem("kurumsal-auth-token",t)',seed['adminToken']);page.goto(base+'/panel?section=exam-records');expect(page.get_by_role('heading',name='Sınav ve Cevap Anahtarı Yönetimi',exact=True)).to_be_visible()
 page.get_by_role('button',name='Cevap anahtarı ekle',exact=True).first.click();expect(page.get_by_label('Cevap anahtarı giriş yöntemi',exact=True)).to_be_visible()
 page.screenshot(path=str(out/'exam-workspace.png'),full_page=True);checks.append('Unified exam management opens existing single/bulk/PDF/manual workflows')
 page.goto(base+'/panel?section=school-add');expect(page.get_by_role('heading',name='Yeni kurum ekle')).to_be_visible();city=page.locator('.school-form').get_by_label('İl',exact=True);district=page.locator('.school-form').get_by_label('İlçe',exact=True);assert city.locator('option').count()==82;city.select_option('İstanbul');district.select_option('Kadıköy');city.select_option('Ankara');assert district.input_value()=='';assert district.locator('option[value="Kadıköy"]').count()==0;checks.append('Institution dropdowns: 81 provinces, dependent districts, clear on province change')
 page.goto(base+'/panel?section=results')
 r=page.request.get('http://localhost:4000/api/optical/results/'+seed['resultId'],headers={'Authorization':'Bearer '+seed['adminToken']});assert r.ok;school_id=r.json()['schoolId']
 schools=page.request.get('http://localhost:4000/api/schools',headers={'Authorization':'Bearer '+seed['adminToken']}).json();place=next(s for s in schools if s['id']==school_id)
 page.get_by_label('İl',exact=True).select_option(label=place['city']);page.get_by_label('İlçe',exact=True).select_option(label=place['district']);page.get_by_label('Sonuç kurumu',exact=True).select_option(school_id);page.get_by_label('Yüklenen sınav',exact=True).select_option(seed['keyId']);expect(page.locator('.result-table').first).to_be_visible()
 for general in [False,True]:
  for school in [False,True]:
   page.get_by_role('checkbox',name='Genel katılımı ve genel sıralamayı göster',exact=True).set_checked(general);page.get_by_role('checkbox',name='Kurum katılımını ve kurum sıralamasını göster',exact=True).set_checked(school)
   with page.expect_response(lambda r:'/export?' in r.url and 'format=pdf' in r.url) as response:page.get_by_role('button',name='PDF önizle',exact=True).click()
   assert response.value.ok
   assert f'showSchoolParticipation={str(school).lower()}' in response.value.url
   assert f'showGeneralParticipation={str(general).lower()}' in response.value.url
   expect(page.locator('.report-canvas-preview canvas')).to_have_attribute('data-rendered','true',timeout=20000)
   for format in ['pdf','zip']:
    page.get_by_label('İndirme biçimi',exact=True).select_option(format)
    with page.expect_download() as download:page.get_by_role('button',name='Seçili raporu indir',exact=True).click()
    target=out/f'g{int(general)}-s{int(school)}.{format}';download.value.save_as(target)
    documents=[target.read_bytes()] if format=='pdf' else [zipfile.ZipFile(target).read(n) for n in zipfile.ZipFile(target).namelist()]
    assert documents
    for document in documents:
     text=subprocess.run(['pdftotext','-','-'],input=document,capture_output=True,check=True).stdout.decode()
     assert ('Genel Sıra' in text)==general
     assert ('Kurum Sırası' in text)==school

 page.screenshot(path=str(out/'report-builder.png'),full_page=True);checks.append('Report builder: four independent participation combinations, real PDF preview/download and ZIP contents')
 page.goto(base+'/panel?section=exam');page.get_by_label('TXT dosyası',exact=True).set_input_files('tests/fixtures/7108-anonymous.txt')
 apply=page.get_by_role('button',name='TXT dosyasını yükle ve önerilen seçimleri uygula',exact=True);expect(apply).to_be_visible(timeout=20000)
 with page.expect_response(lambda r:'/api/optical/txt-files' in r.url and r.request.method=='POST') as uploaded:apply.click()
 assert uploaded.value.ok
 expect(page.get_by_role('status').filter(has_text='TXT sunucuya yüklendi ve seçildi; önerilen seçimler uygulandı.')).to_be_visible()
 assert page.locator('.txt-archive-list input[type=checkbox]:checked').count()>=1
 page.screenshot(path=str(out/'txt-applied.png'),full_page=True);checks.append('Analyzed local TXT uploads, auto-selects archive/FMT/exam and shows persistent success')
 assert not errors,errors
 b.close()
(out/'qa.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'pageErrors':errors},ensure_ascii=False,indent=2));print(json.dumps({'passed':len(checks),'checks':checks,'pageErrors':errors},ensure_ascii=False))
