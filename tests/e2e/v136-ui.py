"""Real local Web/API; synthetic 4995 rows. No production requests or API mocks."""
import json,time,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-results/v136/ui');out.mkdir(parents=True,exist_ok=True)
seed=json.loads(Path('test-results/v136/upload-seed.json').read_text());checks=[];errors=[]
scenes=['demo-report','demo-security','demo-academic','demo-inference','demo-batch']
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox'])
 c=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 c.add_init_script("localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')")
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 if not os.environ.get('V136_UPLOAD_ONLY'):
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':1000})
   for theme in ['light','dark']:
    page.goto('http://localhost:3115');page.wait_for_function('()=>document.querySelector(".demo-report").dataset.elapsed!==undefined');page.evaluate('(t)=>{localStorage.setItem("kurumsal-theme",t);document.documentElement.dataset.theme=t}',theme)
    expect(page.locator('.demo-report')).to_contain_text('486 / 500')
    for name in scenes:
     scene=page.locator('.'+name);scene.scroll_into_view_if_needed()
     expect(scene.locator('.scene-progress')).to_be_visible()
     assert scene.evaluate('e=>getComputedStyle(e).getPropertyValue("--scene-progress").trim()')=='1'
     if width in [390,1440]:scene.screenshot(path=str(out/f'{name}-{width}-{theme}.png'))
    assert page.locator('.optic-row').count()==8
    for row in page.locator('.optic-row').all():
     assert row.locator('i').all_text_contents()==['A','B','C','D','E'];assert row.locator('[data-marked=true]').count()==1
    expect(page.locator('.demo-security')).to_contain_text('Ahmet Ç****')
    expect(page.locator('.demo-academic')).to_contain_text('C Yayınları')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,theme)
    checks.append(f'home-{width}-{theme}-reduced-motion');print(checks[-1],flush=True)
  # Each scene must complete, pause at full, wrap, pause outside viewport and resume.
  for width,theme in [(1440,'light'),(390,'dark')]:
   page.set_viewport_size({'width':width,'height':1000});page.emulate_media(reduced_motion='no-preference')
   page.goto('http://localhost:3115');page.wait_for_function('()=>document.querySelector(".demo-report").dataset.elapsed!==undefined');page.evaluate('(t)=>{localStorage.setItem("kurumsal-theme",t);document.documentElement.dataset.theme=t;document.documentElement.style.scrollBehavior="auto"}',theme)
   for name in scenes:
    scene=page.locator('.'+name);scene.scroll_into_view_if_needed();scene.get_by_role('button',name='Yeniden oynat').click()
    page.wait_for_timeout(350)
    initial=float(scene.evaluate('e=>e.style.getPropertyValue("--scene-progress")'))
    assert 0<initial<.3,(name,initial)
    page.wait_for_function('(name)=>Number(document.querySelector("."+name).style.getPropertyValue("--scene-progress"))===1',arg=name,timeout=12000)
    transform=scene.locator('.scene-progress i').evaluate('e=>getComputedStyle(e).transform');assert transform.startswith('matrix(1, 0, 0, 1,'),transform
    page.wait_for_function('(name)=>{const v=Number(document.querySelector("."+name).style.getPropertyValue("--scene-progress"));return v>0&&v<.2}',arg=name,timeout=3000)
    scene.get_by_role('button',name='Durdur',exact=True).click();frozen=scene.get_attribute('data-elapsed');page.wait_for_timeout(250);assert scene.get_attribute('data-elapsed')==frozen
    scene.get_by_role('button',name='Oynat',exact=True).click();page.wait_for_timeout(250);assert scene.get_attribute('data-elapsed')!=frozen
    page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(300);frozen=scene.get_attribute('data-elapsed');page.wait_for_timeout(350);assert scene.get_attribute('data-elapsed')==frozen,(name,'offscreen clock advanced')
    scene.scroll_into_view_if_needed();page.wait_for_timeout(250);assert scene.get_attribute('data-elapsed')!=frozen
    checks.append(f'loop-bar-pause-resume-{name}-{width}-{theme}');print(checks[-1],flush=True)
 # Actual upload with motion enabled verifies text during and after meter animation.
 page.emulate_media(reduced_motion='no-preference');page.set_viewport_size({'width':1440,'height':1000})
 page.goto('http://localhost:3115');page.evaluate('(token)=>sessionStorage.setItem("kurumsal-auth-token",token)',seed['token'])
 page.goto('http://localhost:3115/panel?section=exam');page.get_by_label('TXT dosyası',exact=True).set_input_files('test-results/v136/4995-synthetic.txt')
 expect(page.locator('.match-notice-content').first).to_contain_text('Önerilen FMT: Sistem FMT 7108',timeout=60000)
 expect(page.locator('.txt-suggestions')).to_contain_text('4995 Deneme',timeout=90000)
 for width in [390,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  for theme in ['light','dark']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
   for card in page.locator('.match-notice').all():
    expect(card.locator('.match-notice-content>strong')).to_be_visible()
    style=card.evaluate('e=>({color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor})');assert style['color']!=style['bg']
    meter=card.get_by_role('meter');expect(meter).to_have_attribute('aria-valuenow','100')
    label=meter.locator('strong');expect(label).to_be_visible()
    delta=label.evaluate('e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return Math.abs((a.x+a.width/2)-(b.x+b.width/2))+Math.abs((a.y+a.height/2)-(b.y+b.height/2))}');assert delta<2
    summary=card.locator('summary');summary.click();expect(summary).to_have_text('Detayları gizle');expect(card.locator('details p').first).to_be_visible();summary.click();expect(summary).to_have_text('Detayları göster')
   page.locator('.txt-suggestions').screenshot(path=str(out/f'suggestions-{width}-{theme}.png'))
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   checks.append(f'fmt-exam-names-details-percentage-{width}-{theme}')
 # Apply actual suggestions, archive file, select isolated institution, evaluate in browser.
 page.set_viewport_size({'width':1440,'height':1000});page.get_by_role('button',name='TXT dosyasını yükle ve önerilen seçimleri uygula',exact=True).click()
 expect(page.locator('.txt-local-files')).to_have_count(0,timeout=60000)
 school=page.locator('.exam-upload-settings');school.get_by_label('İl',exact=True).select_option(label='İstanbul');school.get_by_label('İlçe',exact=True).select_option(label='Kadıköy');school.get_by_label('Kurum',exact=True).select_option(seed['schoolId'])
 page.get_by_role('button',name='Seçili TXT’leri yükle ve değerlendir',exact=True).click()
 expect(page.locator('.evaluation-completion')).to_be_visible(timeout=90000);expect(page.locator('.evaluation-completion')).to_contain_text('4995 öğrenci değerlendirildi')
 page.locator('.evaluation-completion').screenshot(path=str(out/'4995-browser-completion.png'));checks.append('real-browser-4995-upload-infer-suggest-evaluate')
 assert not errors,errors
 (out/('checks-upload.json' if os.environ.get('V136_UPLOAD_ONLY') else 'checks.json')).write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors},ensure_ascii=False,indent=2));print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False));b.close()
