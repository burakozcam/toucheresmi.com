"""Actual local Web/API/PostgreSQL UI acceptance. Only Google's JS is simulated.
Start v128-integration.cjs with V128_KEEP_SERVER=true, then run this script.
"""
import json,re,os,time,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('KS_WEB_URL','http://localhost:3100')
assert base in ['http://localhost:3100','http://127.0.0.1:3100']
seed=json.loads(Path('/tmp/v128-evidence/seed.json').read_text());out=Path('/tmp/v128-evidence');out.mkdir(exist_ok=True)
errors=[];checks=[];overflow=[]
def check_width(page,label):
 page.wait_for_timeout(80)
 dims=page.evaluate('({view:innerWidth,scroll:document.documentElement.scrollWidth})')
 if dims['scroll']>dims['view']+1:
  details=page.evaluate("[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+2&&getComputedStyle(e).position!=='fixed'}).slice(-8).map(e=>({tag:e.tagName,cls:String(e.className),right:e.getBoundingClientRect().right}))")
  overflow.append({'page':label,'dimensions':dims,'elements':details})
 page.screenshot(path=str(out/(label+'.png')),full_page=True)
def context(browser,width,role=None,theme='dark',consent='denied'):
 c=browser.new_context(viewport={'width':width,'height':1000},locale='tr-TR',reduced_motion='reduce')
 init=f"sessionStorage.setItem('kurumsal-splash-seen','1');localStorage.setItem('kurumsal-theme',{json.dumps(theme)});"
 if consent:init+=f"localStorage.setItem('ks-analytics-consent',{json.dumps(consent)});"
 if role:init+=f"sessionStorage.setItem('kurumsal-auth-token',{json.dumps(seed[role+'Token'])});"
 init+="window.__captchaCalls=[];window.grecaptcha={ready:cb=>cb(),execute:async(key,options)=>{window.__captchaCalls.push(options.action);sessionStorage.setItem('__v128CaptchaActions',JSON.stringify([...JSON.parse(sessionStorage.getItem('__v128CaptchaActions')||'[]'),options.action]));return 'ok:'+options.action+':'+crypto.randomUUID();}}"
 c.add_init_script("if (window === window.top) {"+init+"}");return c

def nav(page,name):
 menu=page.get_by_role('button',name='Menüyü aç',exact=True)
 if menu.is_visible():menu.click()
 page.locator('.sidebar').get_by_role('button',name=name,exact=True).click()

def password_check(scope):
 field=scope.locator('.password-field').first;input=field.locator('input');input.fill('Yerel test parolası 2026')
 before=input.bounding_box();button=field.locator('.password-toggle');button.click();expect(input).to_have_attribute('type','text');expect(button).to_have_attribute('aria-pressed','true')
 after=input.bounding_box();assert abs(before['width']-after['width'])<1 and abs(before['height']-after['height'])<1
 button.press('Space');expect(input).to_have_attribute('type','password')

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 for width in [320,375,390,768,1024,1280,1920]:
  print('COVER WIDTH',width,flush=True)
  c=context(browser,width,'admin');page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/panel');page.locator('.sidebar .nav-item').first.wait_for();nav(page,'Cevap Anahtarları')
  card=page.locator('.answer-key-card').filter(has=page.locator('code').filter(has_text=seed['bulkId']));card.wait_for();title=card.locator('h4').inner_text();editor=card.locator('.cover-editor');editor.locator('summary').click()
  image=page.evaluate("()=>{const c=document.createElement('canvas');c.width=800;c.height=600;const x=c.getContext('2d');x.fillStyle='#33456b';x.fillRect(0,0,800,600);x.fillStyle='#fee9ac';x.fillRect(150,90,460,420);return c.toDataURL('image/png').split(',')[1]}")
  import base64
  editor.get_by_label('Kapak görseli',exact=True).set_input_files({'name':'anonymous-cover.png','mimeType':'image/png','buffer':base64.b64decode(image)})
  editor.locator('canvas').wait_for();editor.get_by_label('Yakınlaştır',exact=True).fill('1.4');editor.get_by_label('Yatay konum',exact=True).fill('30');editor.get_by_label('Dikey konum',exact=True).fill('60');check_width(page,'cover-crop-'+str(width));editor.get_by_role('button',name='Kırpmayı uygula ve kapağı kaydet',exact=True).click();expect(editor.locator('.cover-thumbnail')).to_be_visible();assert editor.locator('.cover-thumbnail').get_attribute('src').startswith('data:image/webp')
  public=c.new_page();public.goto(base+'/cevap-anahtarlari');book=public.locator('article').filter(has=public.locator('h3').filter(has_text=title)).first
  cover=public.get_by_alt_text(title+' kapağı').first;expect(cover).to_be_visible();check_width(public,'catalogue-cover-'+str(width));link=public.locator('a').filter(has=cover).first
  href=public.locator('a[href*="'+seed['bulkId']+'"]').first.get_attribute('href');public.goto(base+href);expect(public.get_by_alt_text(title+' kapağı',exact=True)).to_be_visible();check_width(public,'exam-detail-'+str(width));public.close()
  editor.get_by_role('button',name='Kapağı kaldır',exact=True).click();expect(editor.locator('.cover-thumbnail')).to_have_count(0);checks.append('cover upload/crop/save/public/detail/remove '+str(width))
  for label in ['Sınav Değerlendir','Sınav Sonuçları','Öğrenci / Veli Hesapları','FMT Paylaş','Paylaşım Bağlantıları','Üye Kayıtları','Hesap Ayarları']:
   nav(page,label);page.wait_for_timeout(150);check_width(page,'panel-'+str(width)+'-'+str(len(checks)));checks.append(label+' responsive '+str(width))
  c.close()
 print('BROWSER ERRORS',errors,'OVERFLOW',overflow,flush=True)
 assert not errors,errors
 assert not overflow,json.dumps(overflow,ensure_ascii=False)
 (out/'covers-browser.json').write_text(json.dumps({'checks':checks,'javascriptErrors':errors,'overflow':overflow},ensure_ascii=False,indent=2));print(checks);browser.close()
