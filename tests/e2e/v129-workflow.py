"""Real browser/API/DB: admin authoring -> dealer upload -> optical evaluation -> exports.
Requires v128-integration.cjs V128_KEEP_SERVER=true and the production Web on localhost:3100.
Google JS/siteverify only are mocked by the local harness. All data is anonymous.
"""
import json,re,time,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base='http://localhost:3100';api='http://127.0.0.1:4000';out=Path('/tmp/v129-evidence');out.mkdir(exist_ok=True)
seed=json.loads(Path('/tmp/v128-evidence/seed.json').read_text());questions=json.loads((out/'source-questions.json').read_text());checks=[];errors=[];failed=[];stamp=str(time.time_ns())
def context(browser,role,width=1280,motion='reduce'):
 c=browser.new_context(viewport={'width':width,'height':1000},permissions=['clipboard-read','clipboard-write'],reduced_motion=motion,locale='tr-TR',accept_downloads=True)
 c.add_init_script("if(window===window.top){localStorage.setItem('ks-analytics-consent','denied');localStorage.setItem('kurumsal-theme','dark');sessionStorage.setItem('kurumsal-splash-seen','1');window.grecaptcha={ready:cb=>cb(),execute:async(k,o)=>'ok:'+o.action+':'+crypto.randomUUID()};}")
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failed.append([r.status,r.url]) if r.status>=400 and r.url.startswith(api) else None)
 # Login through the actual form; no seeded sessionStorage token bypass.
 page.goto(base+'/login')
 if role=='admin':page.get_by_role('button',name=re.compile('Yönetici Girişi')).last.click()
 form=page.locator('form.login-form').last;form.locator('input[name=email]').fill(seed['users']['admin' if role=='admin' else 'dealer']);form.locator('input[name=password]').fill(seed['password']);form.locator('button:not([type=button])').last.click();page.wait_for_url(base+'/panel');page.locator('.sidebar .nav-item').first.wait_for();return c,page

def nav(page,label):
 button=page.get_by_role('button',name='Menüyü aç',exact=True)
 if button.is_visible():button.click()
 page.locator('.sidebar').get_by_role('button',name=label,exact=True).click()
def select_publisher(form,name):
 form.locator('.publisher-select-trigger').click();form.get_by_role('combobox',name='Yayınevi ara',exact=True).fill(name);form.get_by_role('option',name=name,exact=True).click()
def paste(page,cell,text,shortcut='Control+v',html=None):
 cell.focus()
 if html:page.evaluate('(v)=>navigator.clipboard.write([new ClipboardItem({\"text/plain\":new Blob([v.text],{type:\"text/plain\"}),\"text/html\":new Blob([v.html],{type:\"text/html\"})})])',{'text':text,'html':html})
 else:page.evaluate('(t)=>navigator.clipboard.writeText(t)',text)
 page.keyboard.press(shortcut)
def save_key(page,publisher,name,manual=False):
 nav(page,'Cevap Anahtarları');page.get_by_role('button',name='Cevap anahtarı ekle',exact=True).first.click();form=page.locator('form.answer-key-form');expect(form.get_by_label('Cevap anahtarının sınav kaydı')).to_have_value('');select_publisher(form,publisher);form.get_by_label('Sınav / deneme adı',exact=True).fill(name)
 if manual:
  form.get_by_label('Cevap anahtarı giriş yöntemi').select_option('manual')
  for lesson in dict.fromkeys(q['lesson'] for q in questions):
   if not form.get_by_label('Yeni anahtar dersi').is_visible():form.get_by_text('Elle ders / soru ekle veya cevap dizisi yapıştır',exact=True).click()
   rows=[q for q in questions if q['lesson']==lesson];form.get_by_label('Yeni anahtar dersi').fill(lesson);form.get_by_label('Yeni ders soru sayısı').fill(str(len(rows)));form.get_by_label('Yeni ders katsayısı').fill('1.25');form.get_by_label('Yeni ders cevap dizisi').fill(''.join(q['answer'] for q in rows));form.get_by_role('button',name='Dersi ve soruları ekle',exact=True).click()
  form.get_by_label('B kitapçığını kullan',exact=True).check()
  form.get_by_label('Anahtar ders filtresi').select_option('')
  for q in questions:form.get_by_label(f"{q['lesson']} {q['number']} B soru numarası",exact=True).fill(str(q['positions']['B']))
  form.get_by_label('TÜRKÇE 1 kazanım kodu',exact=True).fill('T.8.3.1');form.get_by_label('TÜRKÇE 1 kazanım metni',exact=True).fill('Türkçe metinden çıkarım yapar.')
  form.get_by_label('Elle hazırlanan anahtarı onaylıyorum',exact=True).check()
 else:
  form.locator('input[name=learningOutcomesFile]').set_input_files(out/'anonymous-key.xlsx');form.get_by_text('Tam düzenlenebilir önizleme · 90 soru',exact=True).wait_for();form.get_by_label('Tam önizlemeyi ve yayını onaylıyorum',exact=True).check()
 with page.expect_response(lambda r:r.url==api+'/api/admin/answer-keys' and r.request.method=='POST') as saved:form.get_by_role('button',name='Cevap anahtarı ekle',exact=True).click()
 response=saved.value;data=response.json();assert response.status==201,data;page.get_by_text('Sınav ve cevap anahtarı kaydedildi.',exact=True).wait_for();checks.append(('manual' if manual else 'Excel')+' authoring without existing exam');return data['answerKey']['id']

def evaluate(page,publisher,name,path,template,expected_students,label):
 nav(page,'Sınav Değerlendir');page.get_by_text(re.compile('Değerlendirmeye başlamak için:')).wait_for();page.get_by_label('TXT dosyası',exact=True).set_input_files(path);page.get_by_role('button',name='TXT’leri sunucuya yükle',exact=True).click();page.get_by_text(re.compile('TXT sunucuya yüklendi')).wait_for()
 page.get_by_role('button',name='Değerlendirilecek sınav',exact=True).click();page.get_by_role('searchbox',name='Yayınevi veya sınav ara',exact=True).fill(name);page.get_by_role('button',name=publisher+' > '+name,exact=True).click()
 page.get_by_role('button',name='FMT Seçiniz',exact=True).click();page.get_by_role('combobox',name='FMT Seçiniz içinde ara',exact=True).fill(template);page.get_by_role('option',name=re.compile(re.escape(template))).first.click()
 page.get_by_label('İl',exact=True).select_option(label='İstanbul');page.get_by_label('İlçe',exact=True).select_option(label='Kadıköy');page.get_by_label('Kurum',exact=True).select_option(seed['schoolId'])
 button=page.get_by_role('button',name='Seçili TXT’leri yükle ve değerlendir',exact=True);expect(button).to_be_enabled()
 with page.expect_response(lambda r:r.url==api+'/api/optical/evaluate' and r.request.method=='POST') as result:button.click()
 response=result.value;snapshot=response.json();assert response.status==201,snapshot;assert len(snapshot['data']['students'])==expected_students
 dialog=page.get_by_role('dialog');expect(dialog).to_be_visible();expect(dialog).to_contain_text(f'{expected_students} öğrenci değerlendirildi.');page.screenshot(path=str(out/(label+'-evaluation.png')),full_page=True)
 # External reference counts, rather than simply comparing the engine to itself.
 if label=='7108':
  refs=json.loads(Path('tests/fixtures/7108-v128/reference-anonymous.json').read_text());matched=0
  for ref in refs:
   student=next(s for s in snapshot['data']['students'] if ref['sourceLine'] in s['sourceLines']);summary=next(s for s in snapshot['summary'] if s['id']==student['id'])
   for i,lesson in enumerate(ref['lessons']):
    row=next(r for r in summary['lessons'] if r['lesson']==lesson['lesson']);assert row['correct']==ref['correct'][i];assert row['wrong']==ref['wrong'][i];matched+=1
  assert matched==240
 else:
  totals=sorted((sum(l['correct'] for l in s['lessons']),sum(l['wrong'] for l in s['lessons']),sum(l['blank'] for l in s['lessons'])) for s in snapshot['summary']);assert totals==[(88,1,1),(90,0,0),(90,0,0)],totals
 dialog.get_by_role('button',name='Sonuçları göster',exact=True).click();desk=page.locator('.exam-results-desk');expect(desk.get_by_role('button',name='Excel indir',exact=True)).to_be_enabled();expect(desk.locator('.management-panel').filter(has=page.get_by_role('heading',name=name,exact=True)).locator('.result-table tbody tr')).to_have_count(expected_students)
 with page.expect_download() as download:desk.get_by_role('button',name='Excel indir',exact=True).click()
 download.value.save_as(out/(label+'-results.xlsx'))
 student=desk.get_by_label('Karne öğrencisi');student.select_option(index=1)
 with page.expect_download() as download:desk.get_by_role('button',name='PDF indir',exact=True).click()
 download.value.save_as(out/(label+'-card.pdf'));assert (out/(label+'-card.pdf')).read_bytes().startswith(b'%PDF-')
 page.screenshot(path=str(out/(label+'-results.png')),full_page=True);(out/(label+'-snapshot.json')).write_text(json.dumps(snapshot,ensure_ascii=False));checks.append(label+' real TXT/FMT/school/evaluate/results/XLSX/PDF');return snapshot

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox']);c,page=context(browser,'admin');publisher=seed['publisherName'];ozpub=publisher.replace('Ankara QA','Özdebir QA');name7108='v129 Excel 7108 '+stamp;nameoz='v129 Elle Özdebir '+stamp
 save_key(page,publisher,name7108);save_key(page,ozpub,nameoz,True)
 # Use real Calc selection output, a real browser clipboard and trusted keyboard paste.
 nav(page,'Toplu Sınav Ekle');page.get_by_role('button',name='Yeni sınav ekle',exact=True).click();card=page.locator('.bulk-exam-card').last;first=card.get_by_role('textbox',name='1. satır DERS',exact=True);calc=json.loads((out/'calc-clipboard.json').read_text())
 for key in ['five','column','wide','quoted']:
  data=calc[key];paste(page,first,data['text'],html=data['html']);expect(card.locator('.editable-grid tbody tr')).to_have_count(data['rows']);values=card.locator('textarea').evaluate_all('(els)=>els.map(e=>e.value)')
  for r in range(data['rows']):
   for col in range(data['columns']):assert values[r*9+col]==data['cells'][r][col],(key,r,col,values[r*9+col],data['cells'][r][col])
  page.keyboard.press('Control+z');expect(card.locator('.editable-grid tbody tr')).to_have_count(1);expect(first).to_have_value('');page.keyboard.press('Control+Shift+z');expect(card.locator('.editable-grid tbody tr')).to_have_count(data['rows']);page.keyboard.press('Control+z');checks.append('Calc trusted paste+undo+redo '+key)
 # Start at a non-first cell; empty cells and decimal spelling must survive.
 target=card.get_by_role('textbox',name='1. satır B SORU NO',exact=True);paste(page,target,'1\t\t3\r\n4\t5\t6');expect(target).to_have_value('1');expect(card.get_by_role('textbox',name='2. satır D SORU NO',exact=True)).to_have_value('6');page.keyboard.press('Control+z');expect(card.locator('.editable-grid tbody tr')).to_have_count(1)
 paste(page,first,'Türkçe');paste(page,first,'Fen');page.keyboard.press('Meta+z');expect(first).to_have_value('Türkçe');page.keyboard.press('Meta+Shift+z');expect(first).to_have_value('Fen');page.keyboard.press('Control+z');page.keyboard.press('Control+z');expect(first).to_have_value('')
 paste(page,card.get_by_role('textbox',name='1. satır KAZANIM METNİ',exact=True),'A\tB');expect(card.get_by_role('textbox',name='1. satır KAZANIM METNİ',exact=True)).to_have_value('');expect(page.get_by_text(re.compile('Yapıştırılan alan tablo sınırını aşıyor'))).to_be_visible();checks.append('paste offset/overwrite undo/overflow rejection')
 # Create a real 90-question exam from 90×8 plus 90×1 trusted clipboard pastes.
 card.get_by_label('Yayınevi',exact=True).select_option(seed['publisherId']);card.get_by_label('Sınav adı',exact=True).fill('v129 Toplu 90 '+stamp);card.get_by_label('Sınav tarihi',exact=True).fill('2026-11-15')
 rows=[[q['lesson'],str(q['number']),str(q['positions']['B']),'','',q['answer'],'1,25','T.İ.'+str(i+1)] for i,q in enumerate(questions)]
 paste(page,first,'\r\n'.join('\t'.join(r) for r in rows));expect(card.locator('.editable-grid tbody tr')).to_have_count(90)
 gain='"Türkçe: çıkarım yapar.\nİkinci satır ve ""alıntı"""';paste(page,card.get_by_role('textbox',name='1. satır KAZANIM METNİ',exact=True),'\r\n'.join([gain]*90));expect(card.get_by_role('textbox',name='90. satır KAZANIM METNİ',exact=True)).to_have_value('Türkçe: çıkarım yapar.\nİkinci satır ve "alıntı"');expect(card.locator('[aria-invalid=true]')).to_have_count(0)
 card.get_by_role('button',name='Bu sınavı kaydet',exact=True).click();expect(card.locator('>summary')).to_contain_text('Kaydedildi');checks.append('90-question bulk save after 90×8 and 90×1 pastes')
 c.close();c,page=context(browser,'dealer');evaluate(page,publisher,name7108,Path('tests/fixtures/7108-v128/ankara-anonymous.txt'),'7108',196,'7108');evaluate(page,ozpub,nameoz,out/'ozdebir-anonymous.txt','Özdebir Tek Oturum',3,'ozdebir');c.close()
 assert not errors,errors;assert not failed,failed
 (out/'workflow.json').write_text(json.dumps({'checks':checks,'javascriptErrors':errors,'failedApiResponses':failed},ensure_ascii=False,indent=2));print(json.dumps({'checks':checks,'javascriptErrors':errors,'failedApiResponses':failed},ensure_ascii=False,indent=2));browser.close()
