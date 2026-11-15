"""Actual local Web/API/PostgreSQL UI acceptance. Only Google's JS is simulated.
Start v128-integration.cjs with V128_KEEP_SERVER=true, then run this script.
"""
import json,re,os,time,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('KS_WEB_URL','http://localhost:3100')
assert base in ['http://localhost:3100','http://127.0.0.1:3100']
seed=json.loads(Path('/tmp/v128-evidence/seed.json').read_text());out=Path('/tmp/v128-evidence');out.mkdir(exist_ok=True)
errors=[];checks=[];overflow=[];run_id=str(int(time.time()))
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
 # Four real login types; Google token generation only is mocked in the browser.
 for role in ([] if os.environ.get('V128_SKIP_LOGIN')=='true' else ['dealer','admin','student','parent']):
  c=context(browser,1280);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  if role in ['student','parent']:
   page.goto(base+'/sonuclar#ogrenci-girisi');form=page.locator('.student-login form');form.locator('select[name=role]').select_option('STUDENT' if role=='student' else 'PARENT')
  else:
   page.goto(base+'/login')
   if role=='admin':page.get_by_role('button',name=re.compile('Yönetici Girişi')).last.click()
   form=page.locator('form.login-form').last
  password_check(form);form.locator('input[name=email]').fill(seed['users'][role]);form.locator('input[name=password]').fill(seed['password']);assert page.evaluate('window.__captchaCalls.length')==0
  form.locator('button:not([type=button])').last.click();page.wait_for_url(re.compile('/(panel|sonuclarim)$'))
  assert page.evaluate("JSON.parse(sessionStorage.getItem('__v128CaptchaActions'))")==['login'];checks.append(role+' real form login')
  if role in ['student','parent']:
   page.get_by_role('button',name='Şifremi değiştir',exact=True).click();password_check(page.locator('.reader-password'));check_width(page,role+'-portal')
  c.close()
 # Cookie preferences: close on both actions, persist over route changes/refresh, reopen.
 for choice in ['Tümünü Kabul Et','Yalnızca Gerekli Olanlar']:
  c=context(browser,320,consent=None);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/contact');notice=page.get_by_role('complementary',name='Çerez tercihleri');notice.wait_for();notice.get_by_role('button',name=choice,exact=True).click();expect(notice).not_to_be_visible();page.reload();expect(page.get_by_role('complementary',name='Çerez tercihleri')).not_to_be_visible();page.goto(base+'/login');expect(page.get_by_role('complementary',name='Çerez tercihleri')).not_to_be_visible();page.get_by_role('button',name='Çerez Tercihleri',exact=True).first.click();expect(page.get_by_role('complementary',name='Çerez tercihleri')).to_be_visible();check_width(page,'cookie-'+('accept' if choice.startswith('Tüm') else 'necessary'));checks.append('cookie persistence '+choice);c.close()
 for width in [320,375,390,768,1024,1280,1920]:
  print('WIDTH',width,flush=True)
  c=context(browser,width,theme='light' if width in [375,1280] else 'dark');page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
  for route,label in [('/','home'),('/login','login'),('/cevap-anahtarlari','catalogue'),('/pdf-duzenleyici','pdf-tools'),('/contact','contact'),('/hesap-kur#not-a-real-invite','setup')]:
   page.goto(base+route,wait_until='domcontentloaded');page.wait_for_timeout(200)
   if route=='/login':password_check(page.locator('form.login-form').first)
   check_width(page,f'{label}-{width}')
  c.close()
  # Actual dealer panel -> sandboxed iframe, not the standalone HTML page.
  c=context(browser,width,'owner',theme='light' if width in [375,1280] else 'dark');page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/panel');page.locator('.sidebar .nav-item').first.wait_for();nav(page,'Sınav Listesi');frame=page.frame_locator('iframe[title="Sınav Listesi Düzenleyici"]');frame.locator('#fileInput').wait_for();expect(frame.locator('html')).to_have_attribute('data-theme','light' if width in [375,1280] else 'dark')
  frame.locator('html').evaluate('()=>new Promise(resolve=>{const t=setInterval(()=>{if(window.XLSX){clearInterval(t);resolve(true)}},40)})')
  bytes_=frame.locator('html').evaluate("()=>{const b=XLSX.utils.book_new();XLSX.utils.book_append_sheet(b,XLSX.utils.aoa_to_sheet([['Öğrenci No','Ad Soyad','Kampüs Bilgisi','Sınıf'],['1','Anonim Bir','Merkez Kampüs','8/A'],['2','Anonim İki','merkez kampüs','8/A'],['3','Anonim Üç','Kuzey Kampüs','8/B'],['4','Anonim Dört','Kuzey Kampüs','8/B']]),'Öğrenciler');return Array.from(new Uint8Array(XLSX.write(b,{type:'array',bookType:'xlsx'})));}")
  frame.locator('#fileInput').set_input_files({'name':'anonymous-roster.xlsx','mimeType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','buffer':bytes(bytes_)})
  frame.locator('#importBtn').click();expect(frame.locator('#tableCount')).to_have_text('4')
  def room(campus,name):
   frame.locator('#roomCampus').select_option(label=campus);frame.locator('#roomName').fill(name);frame.locator('#roomCapacity').fill('2');frame.locator('#roomFloor').fill('1');frame.locator('#addRoomBtn').click()
  room('Merkez Kampüs','101');expect(frame.locator('[data-remove-room]')).to_have_count(1);room('Merkez Kampüs','102');room('Kuzey Kampüs','101');expect(frame.locator('[data-remove-room]')).to_have_count(3)
  room('Merkez Kampüs','101');expect(frame.locator('[data-remove-room]')).to_have_count(3);expect(frame.locator('#toast')).to_contain_text('aynı adla')
  select=frame.locator('select[data-student-room]').first;select.select_option(label='101');assigned=select.input_value();room('Merkez Kampüs','103');expect(frame.locator('select[data-student-room]').first).to_have_value(assigned)
  assert '102' not in frame.locator('select[data-student-room]').nth(2).inner_text()
  inside=frame.locator('html').evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');assert inside['scroll']<=inside['width']+1,inside
  check_width(page,f'dealer-iframe-roster-{width}');checks.append('iframe XLSX/campus/add/duplicate/placement '+str(width))
  # All 196 students remain reachable in the editing tool; edit/undo and one real save.
  nav(page,'Sınav Verilerini Düzenle');page.get_by_label('Kurum',exact=True).select_option(seed['schoolId']);page.get_by_label('Yayınevi',exact=True).select_option(label=seed['publisherName']);page.get_by_label('Sınav',exact=True).select_option(seed['keyId']);page.get_by_role('button',name='Verileri aç',exact=True).click();page.get_by_text(re.compile('196 / 196 öğrenci')).wait_for();cell=page.get_by_role('textbox',name='1. satır TÜRKÇE 7',exact=True);old=cell.input_value();cell.fill('A' if old!='A' else 'B');expect(page.locator('.cell-changed')).to_have_count(1);page.get_by_role('button',name='Değişiklikleri önizle',exact=True).click();page.get_by_role('heading',name='Kaydetmeden önce kontrol',exact=True).wait_for();check_width(page,f'data-editor-{width}')
  if width==390:
   page.get_by_role('button',name='Onayla ve yeni revizyona kaydet',exact=True).click();page.get_by_text(re.compile('0 değiştirilen hücre')).wait_for();page.get_by_text(re.compile('İşlem geçmişi')).click();expect(page.locator('.edit-history').first).to_contain_text('answer')
  else:page.get_by_role('button',name='Kaydedilmemiş değişiklikleri geri al',exact=True).click();expect(page.locator('.cell-changed')).to_have_count(0)
  # Paging reaches the final student without rendering hundreds of rows at once.
  while page.get_by_role('button',name='Sonraki',exact=True).is_enabled():page.get_by_role('button',name='Sonraki',exact=True).click()
  expect(page.locator('.editable-grid tbody tr')).to_have_count(16);checks.append('196-row editor/preview/undo/page '+str(width))
  if width==390:
   page.get_by_label('Sınav',exact=True).select_option('');expect(page.locator('.editable-grid')).to_have_count(0)
   page.get_by_label('Sınav',exact=True).select_option(seed['keyId']);page.get_by_role('button',name='Verileri aç',exact=True).click();page.get_by_text(re.compile('196 / 196 öğrenci')).wait_for();checks.append('exam selection clears previous editing table')
  c.close()
  # Admin bulk entry and IndexedDB draft persistence.
  c=context(browser,width,'admin');page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept());page.goto(base+'/panel');page.locator('.sidebar .nav-item').first.wait_for();nav(page,'Toplu Sınav Ekle');page.get_by_role('button',name='Yeni sınav ekle',exact=True).click();card=page.locator('details.bulk-exam-card').last
  card.get_by_label('Yayınevi',exact=True).select_option(seed['publisherId']);card.get_by_label('Sınav adı',exact=True).fill('Tarayıcı sınavı '+str(width)+' '+run_id);card.get_by_label('Sınav tarihi',exact=True).fill('2026-11-15')
  tsv='TÜRKÇE\t1\t2\t\t\tA\t1\tT1\tAnonim kazanım 1\nTÜRKÇE\t2\t1\t\t\tB\t1\tT2\tAnonim kazanım 2\nMATEMATİK\t1\t1\t\t\tC\t2\tM1\tAnonim kazanım 3\nMATEMATİK\t2\t2\t\t\tD\t2\tM2\tAnonim kazanım 4'
  first=card.get_by_role('textbox',name='1. satır DERS',exact=True);first.evaluate("(el,text)=>{const data=new DataTransfer();data.setData('text/plain',text);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));}",tsv);expect(card.locator('.editable-grid tbody tr')).to_have_count(4)
  page.get_by_role('button',name='Taslak olarak sakla',exact=True).click();page.get_by_text('Taslaklar bu cihazda saklandı.',exact=True).wait_for();page.reload();page.locator('.sidebar .nav-item').first.wait_for();nav(page,'Toplu Sınav Ekle');card=page.locator('details.bulk-exam-card').last;expect(card.get_by_label('Sınav adı',exact=True)).to_have_value('Tarayıcı sınavı '+str(width)+' '+run_id);expect(card.locator('.editable-grid tbody tr')).to_have_count(4)
  check_width(page,f'bulk-exams-{width}')
  if width in [390,1280]:card.get_by_role('button',name='Bu sınavı kaydet',exact=True).click();expect(card.locator('> summary')).to_contain_text('Kaydedildi')
  checks.append('bulk paste/4 rows/refresh '+str(width));c.close()
 print('BROWSER ERRORS',errors,'OVERFLOW',overflow,flush=True)
 assert not errors,errors
 assert not overflow,json.dumps(overflow,ensure_ascii=False)
 result={'checks':checks,'widths':[320,375,390,768,1024,1280,1920],'javascriptErrors':errors,'overflow':overflow}
 (out/'browser.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False,indent=2));browser.close()
