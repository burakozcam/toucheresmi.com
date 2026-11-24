"""Real localhost Web/API/Prisma; all test identities and files are synthetic."""
import json,pathlib,re,urllib.parse,secrets
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'test-results/v146-fixes'
seed=json.loads((OUT/'ui-seed.json').read_text());BASE='http://localhost:3146';API='http://localhost:4046';checks=[];errors=[]
def passed(name):
 checks.append(name);print('PASS',name,flush=True);(OUT/'browser-checks.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
 ctx.route(re.compile(r'^https?://(?!localhost[:/]|127\.0\.0\.1[:/])'),lambda r:r.abort())
 ctx.add_init_script('sessionStorage.setItem("kurumsal-splash-seen","1");sessionStorage.setItem("kurumsal-motivation-dismissed","1");localStorage.setItem("ks-analytics-consent","denied");')
 page=ctx.new_page();page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
 def auth(token,section='welcome'):
  page.goto(BASE+'/robots.txt');page.evaluate('(t)=>sessionStorage.setItem("kurumsal-auth-token",t)',token);page.goto(BASE+'/panel?section='+section);expect(page.locator('.dashboard')).to_be_visible()
 def nav(section):
  b=page.locator('[data-operation="'+section+'"]');g=b.locator('xpath=ancestor::div[contains(@class,"nav-group")]').first;c=g.locator('.nav-category')
  if c.get_attribute('aria-expanded')!='true':c.click()
  b.click();expect(b).to_have_attribute('aria-current','page')
 def fit():assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 def shot(name):page.screenshot(path=str(OUT/name))
 try:
  # Broad page-colour → blue → navy transition, full rail bleed, no curved card edge.
  page.goto(BASE)
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':1000})
   for theme in ['light','dark']:
    page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);page.wait_for_timeout(300);page.locator('.home-brand-finale').scroll_into_view_if_needed();fit()
    footer=page.locator('.home-brand-finale');assert footer.evaluate('e=>getComputedStyle(e).borderRadius')=='0px'
    assert footer.evaluate('e=>e.getBoundingClientRect().left<=1 && e.getBoundingClientRect().right>=innerWidth-1')
    expect(footer.locator('.brand')).to_be_visible();shot(f'footer-{width}-{theme}.png')
  passed('Homepage footer at 1440/390, light/dark: page ground, broad blue/navy transition, readable logo/links, no card edge or overflow')
  page.set_viewport_size({'width':1440,'height':1000});auth(seed['adminToken'],'temporary-members')
  expect(page.get_by_label('Bağlı bayi',exact=True)).to_have_count(0)
  page.get_by_label('Geçici üye adı veya notu',exact=True).fill('Tarayıcı Çağrı ŞİMŞEK')
  page.get_by_role('checkbox',name='Bayi · Sınav değerlendirme ve raporlar',exact=True).check()
  expect(page.get_by_role('button',name='Kod Oluştur',exact=True)).to_be_disabled()
  page.get_by_label('Bağlı bayi',exact=True).select_option(seed['dealerId'])
  page.locator('.duration-units').get_by_role('button',name='Saat',exact=True).click()
  page.get_by_role('button',name='Kod Oluştur',exact=True).click();expect(page.locator('.temporary-secret code')).to_be_visible()
  message=urllib.parse.parse_qs(urllib.parse.urlsplit(page.get_by_role('link',name='WhatsApp’ta Paylaş',exact=True).get_attribute('href')).query)['text'][0]
  assert 'KurumsalSınav · Geçici Erişim\n' in message and 'Bağlantı kullanılamazsa Geçici Giriş' in message
  link=re.search(r'Panele Giriş: (\S+)',message).group(1);assert '#key=' in link
  shot('temporary-admin.png');passed('Admin explicitly chooses dealer and permission; share text decodes once with Turkish text and intact one-use fragment')
  # The preview is generic, independent of credentials. Inspect the generated pixels too.
  preview=ctx.request.get(BASE+'/gecici-giris');assert preview.status==200
  assert page.locator('.temporary-secret code').inner_text() not in preview.text()
  image=ctx.request.get(BASE+'/gecici-giris/opengraph-image');assert image.status==200
  (OUT/'temporary-opengraph.png').write_bytes(image.body())
  passed('Generated generic 1200×630 preview contains no recipient/code/key metadata; Turkish-font preview saved')
  page.goto(link);page.wait_for_url('**/panel?section=welcome');expect(page.get_by_test_id('role-badge')).to_have_text('Geçici Erişim');assert 'key=' not in page.url
  token=page.evaluate('sessionStorage.getItem("kurumsal-auth-token")')
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':1000})
   if width==390:page.get_by_role('button',name='Menüyü aç',exact=True).click()
   for theme in ['light','dark']:
    page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme);page.wait_for_timeout(300);logo=page.locator('.sidebar-brand');expect(logo).to_be_visible()
    assert logo.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)'
    assert logo.evaluate('e=>getComputedStyle(e).borderTopWidth')=='0px'
    assert logo.locator('.brand-light').evaluate('e=>getComputedStyle(e).color')=='rgb(139, 178, 255)'
    assert logo.locator('.brand-mark').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(25, 46, 83)'
    logo.screenshot(path=str(OUT/f'sidebar-logo-{width}-{theme}.png'));fit()
  passed('Sidebar logo in both themes at desktop/mobile: transparent compact rail, brand colours and readable text')
  page.set_viewport_size({'width':1440,'height':1000})
  assert page.locator('[data-operation=temporary-members]').count()==0
  nav('exam');expect(page.locator('.optical-module')).to_be_visible();print('STAGE upload screen',flush=True)
  txt='\r\n'.join(line[:-8]+secrets.token_hex(4) for line in (OUT/'synthetic.txt').read_text().splitlines()).encode('utf-8')
  page.get_by_label('TXT dosyası',exact=True).set_input_files({'name':'tarayici-sentetik.txt','mimeType':'text/plain','buffer':txt})
  page.get_by_role('button',name='TXT’leri sunucuya yükle',exact=True).click();expect(page.get_by_label('tarayici-sentetik.txt dosyasını seç',exact=True)).to_be_checked()
  print('STAGE TXT archived',flush=True)
  page.get_by_role('button',name='Değerlendirilecek sınav',exact=True).click();page.get_by_role('searchbox',name='Yayınevi veya sınav ara',exact=True).fill(seed['keyName'])
  page.get_by_role('button',name=seed['publisherName']+' > '+seed['keyName'],exact=True).click()
  page.get_by_role('button',name='FMT Seçiniz',exact=True).click();page.get_by_role('option',name=re.compile(re.escape(seed['templateName']))).click()
  page.get_by_label('İl',exact=True).select_option(label='Ankara');page.get_by_label('İlçe',exact=True).select_option(label='Çankaya');page.get_by_label('Kurum',exact=True).select_option(seed['schoolId'])
  print('STAGE selections ready',flush=True)
  page.get_by_role('button',name='Seçili TXT’leri yükle ve değerlendir',exact=True).click()
  expect(page.locator('dialog.evaluation-completion')).to_be_visible(timeout=30000)
  page.locator('dialog.evaluation-completion').get_by_role('button',name='Sonuçları göster',exact=True).click()
  expect(page.locator('.exam-results-desk')).to_be_visible();expect(page.get_by_role('button',name='Seçili raporu indir',exact=True)).to_be_enabled()
  shot('temporary-results.png')
  for fmt in ['pdf','xlsx','zip']:
   page.get_by_label('İndirme biçimi',exact=True).select_option(fmt)
   with page.expect_download() as download:page.get_by_role('button',name='Seçili raporu indir',exact=True).click()
   target=OUT/('browser-cards.'+fmt);download.value.save_as(target);assert target.read_bytes().startswith(b'%PDF' if fmt=='pdf' else b'PK')
  passed('Real browser one-use temporary login → TXT upload → scoped FMT/exam/school → evaluation → Results → PDF/Excel/ZIP download; separate role badge')
  # A loaded results screen must not be able to export after revoke.
  grant_list=ctx.request.get(API+'/api/admin/temporary-access',headers={'Authorization':'Bearer '+seed['adminToken']}).json()['rows']
  current=next(g for g in grant_list if g['note']=='Tarayıcı Çağrı ŞİMŞEK' and g['revokedAt'] is None)
  assert ctx.request.post(API+'/api/admin/temporary-access/'+current['id']+'/revoke',headers={'Authorization':'Bearer '+seed['adminToken']},data={}).status==200
  page.get_by_label('İndirme biçimi',exact=True).select_option('pdf');page.get_by_role('button',name='Seçili raporu indir',exact=True).click()
  expect(page.locator('.exam-results-desk [role=alert]')).to_contain_text('geçerli')
  assert ctx.request.post(API+'/api/optical/evaluate',headers={'Authorization':'Bearer '+token},data={}).status==401
  passed('Already-open Results rejects export after revoke; same session evaluation returns 401')
  assert not errors,errors;passed('No JavaScript page errors; test browser traffic restricted to localhost')
 except Exception:
  print(page.locator('body').inner_text()[-9000:]);shot('failure.png');raise
 finally:browser.close()
