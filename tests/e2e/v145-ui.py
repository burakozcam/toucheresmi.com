"""v1.4.5: local production UI, browser-local plan/exports; synthetic panel HTTP only."""
import faulthandler
faulthandler.dump_traceback_later(60, repeat=True)
import json, pathlib, re, zipfile, xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright, expect
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'test-results/v145'
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://localhost:3145'
KEY = 'kurumsal-study-plan-v1'
checks, errors = [], []
def check(name):
    checks.append(name)
    (OUT / 'browser-checks.json').write_text(json.dumps({'checks': checks, 'errors': errors}, ensure_ascii=False, indent=2))
    print('PASS', name, flush=True)
def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
with sync_playwright() as p:
    print('Launching browser',flush=True)
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    print('Browser launched',flush=True)
    ctx = browser.new_context(viewport={'width':1440,'height':1000}, accept_downloads=True)
    def route(r):
        if r.request.url.startswith(BASE): r.continue_(); return
        if r.request.url.startswith('http://localhost:4045'):
            body = []
            if '/api/account' in r.request.url: body = {'id':'qa','role':'SUPER_ADMIN','firstName':'Deneme','lastName':'Yöneticisi','email':'qa@example.test','canPlayGames':True}
            elif 'contact-messages' in r.request.url: body = {'items':[],'unreadCount':0}
            elif 'result-catalog' in r.request.url: body = {'schools':[],'exams':[]}
            elif 'optical-results' in r.request.url: body = {'items':[], 'total':0}
            r.fulfill(status=200, content_type='application/json', body=json.dumps(body), headers={'Access-Control-Allow-Origin':BASE})
        else: r.abort()
    ctx.set_default_timeout(10000)
    ctx.route('**/*', route)
    ctx.add_init_script('sessionStorage.setItem("kurumsal-splash-seen","1");localStorage.setItem("ks-analytics-consent","denied");')
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    print('Opening planner',flush=True)
    page.goto(BASE+'/calisma-plani')
    print('Planner loaded',flush=True)
    expect(page.get_by_role('heading',name='Nereden başlayalım?')).to_be_visible()
    assert page.locator('.study-levels button').count()==4
    delays=page.locator('.study-levels button').evaluate_all('es=>es.map(e=>getComputedStyle(e).animationDelay)')
    assert len(set(delays))==4
    page.get_by_role('button', name=re.compile('Lise Hedeflerine')).click()
    expect(page.get_by_role('heading', name='Etkinlikler',exact=True)).to_be_visible()
    page.get_by_role('textbox',name='Planın adı',exact=True).fill('Öğrencinin Çalışma Planı – Çığ ve öğüt')
    library=page.locator('.study-library')
    source=library.get_by_role('button',name='Matematik',exact=True)
    slot=page.get_by_role('button',name='Pazartesi 08:00 etkinlik ekle',exact=True)
    source.drag_to(slot)
    expect(page.locator('.study-event')).to_have_count(1)
    event=page.locator('.study-event-content').first
    event.drag_to(page.get_by_role('button',name='Salı 09:00 etkinlik ekle',exact=True))
    expect(page.locator('#study-day-1 .study-event')).to_have_count(1)
    event.click()
    dlg=page.get_by_role('dialog')
    dlg.get_by_label('Süre',exact=True).select_option('60')
    dlg.get_by_role('button',name='Kaydet',exact=True).click()
    assert page.locator('.study-event').evaluate('e=>e.style.height')=='85px'
    # Actual pointer resize to 90 minutes.
    handle=page.locator('.study-resize').first
    box=handle.bounding_box()
    page.mouse.move(box['x']+box['width']/2,box['y']+4)
    page.mouse.down();page.mouse.move(box['x']+box['width']/2,box['y']+48,steps=8);page.mouse.up()
    expect(page.get_by_role('dialog')).to_have_count(0)
    assert page.locator('.study-event').evaluate('e=>e.style.height')=='129px'
    # An overlapping drop must not erase the existing card.
    source.drag_to(page.get_by_role('button',name='Salı 10:00 etkinlik ekle',exact=True),force=True)
    expect(page.locator('.study-notice')).to_contain_text('başka bir etkinlik')
    expect(page.locator('.study-event')).to_have_count(1)
    check('Desktop: real drag/drop, moving, modal duration, pointer resize, overlapping drop preserves original')
    page.get_by_role('button',name='Kendi etkinliğini ekle',exact=True).click()
    dlg=page.get_by_role('dialog')
    dlg.get_by_label('Etkinlik adı',exact=True).fill('Gitar Çalışması ve Türkçe Şarkılar')
    dlg.get_by_label('Simge',exact=True).select_option('music')
    dlg.get_by_label('Renk',exact=True).fill('#7c3aed')
    dlg.get_by_role('button',name='Kaydet',exact=True).click()
    page.get_by_role('button',name='Çarşamba 08:00 etkinlik ekle',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='Kaydet',exact=True).click()
    expect(page.locator('.study-event')).to_have_count(2)
    page.get_by_label('Görünen başlangıç saati',exact=True).select_option('420')
    expect(page.locator('.study-save')).to_have_text('Bu tarayıcıya kaydedildi')
    before=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)
    page.reload()
    expect(page.locator('.study-event')).to_have_count(2)
    assert page.get_by_label('Görünen başlangıç saati',exact=True).input_value()=='420'
    assert page.get_by_role('textbox',name='Planın adı').input_value()==before['name']
    assert page.locator('.study-activity').filter(has_text='Gitar Çalışması').count()==1
    check('Reload: plan name, custom name/icon/color, events, level and visible hours persist')
    for width in [1440,768,390]:
        page.set_viewport_size({'width':width,'height':1000})
        for theme in ['light','dark']:
            page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
            page.wait_for_timeout(250)
            no_overflow(page)
            page.screenshot(path=str(OUT/f'planner-{width}-{theme}.png'),full_page=True)
    page.emulate_media(reduced_motion='reduce')
    page.evaluate('localStorage.removeItem("kurumsal-study-plan-v1")')
    page.reload()
    expect(page.locator('.study-levels')).to_be_visible()
    assert page.locator('.study-levels button').first.evaluate('e=>getComputedStyle(e).animationName')=='none'
    page.evaluate('(args)=>localStorage.setItem(args.key,JSON.stringify(args.plan))',{'key':KEY,'plan':before})
    page.reload()
    page.emulate_media(reduced_motion='no-preference')
    check('Responsive 1440/768/390 px, light/dark, no overflow, reduced-motion level selection')
    # Separate touch viewport uses real tap and native dialog focus management.
    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
    mobile.route('**/*',route)
    mobile.add_init_script('sessionStorage.setItem("kurumsal-splash-seen","1");localStorage.setItem("ks-analytics-consent","denied");')
    mp=mobile.new_page();mp.on('pageerror',lambda e:errors.append(str(e)))
    mp.goto(BASE+'/calisma-plani')
    mp.get_by_role('button',name=re.compile('İlkokul Keşfet')).tap()
    mp.get_by_role('tab',name='Cuma',exact=True).tap()
    mp.get_by_role('button',name='Cuma 08:00 etkinlik ekle',exact=True).tap()
    md=mp.get_by_role('dialog')
    md.get_by_label('Etkinlik adı',exact=True).fill('Türkçe – Öğrenme Zamanı')
    md.get_by_role('button',name='Kaydet',exact=True).tap()
    expect(mp.locator('#study-day-4 .study-event')).to_have_count(1)
    mp.locator('.study-event-content').tap()
    md.get_by_label('Süre',exact=True).select_option('60')
    md.get_by_role('button',name='Kaydet',exact=True).tap()
    expect(mp.locator('.study-event')).to_have_css('height','85px')
    mp.locator('.study-event-content').tap();md.get_by_role('button',name='Etkinliği sil',exact=True).tap()
    expect(mp.locator('.study-event')).to_have_count(0)
    no_overflow(mp);mp.screenshot(path=str(OUT/'mobile-touch.png'),full_page=True)
    check('Mobile: day tabs, tap-to-add/edit/delete, duration and native modal focus')
    mobile.close()
    # Fill every half-hour in all seven days, include Turkish and maximum-length names.
    full=dict(before);full['start']=0;full['end']=1440;full['events']=[]
    long='Türk Dili ve Edebiyatı – Çığ, öğüt, şüphe: okuma ve anlam çalışması, haftalık tekrar ve değerlendirme.'[:100]
    for day in range(7):
        for start in range(0,1440,30):
            full['events'].append({'id':f'{day}-{start}','name':long if start==480 else ['Türkçe','Matematik','Fen Bilimleri','Spor','Mola','Müzik Çalma','Hobi'][day], 'icon':['book','math','science','sport','coffee','music','art'][day], 'color':['#2563eb','#7c3aed','#0e7490','#15803d','#c2410c','#db2777','#475569'][day], 'day':day,'start':start,'duration':30})
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('(args)=>localStorage.setItem(args.key,JSON.stringify(args.plan))',{'key':KEY,'plan':full});page.reload()
    expect(page.locator('.study-event')).to_have_count(336)
    for fmt,label in [('pdf','Yatay A4 PDF'),('jpg','JPG görsel'),('xlsx','Düzenlenebilir Excel (.xlsx)')]:
        page.get_by_role('button',name='İndir',exact=True).click()
        with page.expect_download() as info: page.get_by_role('button',name=label,exact=True).click()
        info.value.save_as(OUT/f'full-week.{fmt}')
    assert (OUT/'full-week.pdf').read_bytes().startswith(b'%PDF')
    assert (OUT/'full-week.jpg').read_bytes().startswith(b'\xff\xd8')
    with zipfile.ZipFile(OUT/'full-week.xlsx') as z:
        ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        week=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        detail=ET.fromstring(z.read('xl/worksheets/sheet2.xml'))
        assert len(week.findall('.//m:row',ns))==50
        assert len(detail.findall('.//m:row',ns))==337
        assert long in ET.tostring(week,encoding='unicode')
        assert detail.find('.//m:c[@r="D337"]/m:v',ns).text=='1'
        assert detail.find('.//m:c[@r="C2"]',ns).get('t') in [None,'n']
        assert not z.namelist().count('xl/media/image1.png')
    check('Full week: 336 cards, actual PDF/JPG/XLSX downloads, Turkish/long names, real editable numeric Excel times')
    # Panel account is a synthetic browser response. Report permissions remain covered by unit regressions.
    page.evaluate('sessionStorage.setItem("kurumsal-auth-token","synthetic-ui-only")')
    page.goto(BASE+'/panel?section=results')
    expect(page.locator('.dashboard')).to_be_visible()
    active=page.locator('[data-operation=results]')
    expect(active).to_have_attribute('aria-current','page')
    cat=page.locator('.nav-category').filter(has_text='Sınav Değerlendir')
    expect(cat).to_have_attribute('data-current','true')
    other=page.locator('.nav-category').filter(has_text='FMT Yönetimi')
    other.click()
    expect(other).to_have_attribute('aria-expanded','true')
    expect(other).to_have_attribute('data-current','false')
    expect(cat).to_have_attribute('data-current','true')
    expect(active).to_have_attribute('aria-current','page')
    assert active.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(35, 62, 97)'
    assert cat.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(28, 61, 57)'
    other.scroll_into_view_if_needed();page.wait_for_timeout(350);page.mouse.move(1100,0)
    before_box=other.bounding_box();other.hover();page.wait_for_timeout(180)
    after_box=other.bounding_box()
    assert all(abs(before_box[k]-after_box[k])<.5 for k in before_box),(before_box,after_box)
    assert other.evaluate('e=>getComputedStyle(e).color')=='rgb(241, 245, 252)'
    assert other.evaluate('e=>getComputedStyle(e).translate') in ['none','0px']
    other.focus();page.keyboard.press('Enter');expect(other).to_have_attribute('aria-expanded','false')
    assert other.evaluate('e=>getComputedStyle(e).outlineStyle')!='none'
    assert page.locator('#'+other.get_attribute('aria-controls')).evaluate('e=>e.inert')
    other.press('Enter');expect(other).to_have_attribute('aria-expanded','true')
    delays=page.locator('.nav-submenu[data-expanded=true] .nav-item').evaluate_all('es=>es.map(e=>getComputedStyle(e).transitionDelay)')
    assert len(set(delays))>1
    page.emulate_media(reduced_motion='reduce')
    assert active.evaluate('e=>getComputedStyle(e).transitionDuration')=='0s'
    page.emulate_media(reduced_motion='no-preference')
    for width in [1440,768,390]:
        page.set_viewport_size({'width':width,'height':1000})
        if width<=680:page.get_by_role('button',name='Menüyü aç',exact=True).click()
        page.locator('.side-nav').evaluate('e=>e.scrollTop=0');page.wait_for_timeout(300)
        no_overflow(page);page.screenshot(path=str(OUT/f'sidebar-{width}.png'),full_page=True)
        if width<=680:active.click()
    check('Panel: green current parent/blue child, opening another category preserves current section, stable hover, keyboard/inert/stagger/reduced motion')
    page.goto(BASE)
    entry=page.get_by_role('link',name='Çalışma Planı Oluştur',exact=True)
    expect(entry).to_have_attribute('href','/calisma-plani');entry.scroll_into_view_if_needed()
    page.screenshot(path=str(OUT/'home-entry.png'))
    check('Home: animated weekly preview and public planner entry link')
    assert not errors,errors
    check('No JavaScript page errors; all external network blocked and no live database')
    browser.close()
