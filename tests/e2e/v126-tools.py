"""Local, anonymous browser regression. No live database or real student documents."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[2]
base=os.environ.get('KS_TOOLS_URL','http://127.0.0.1:3180')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox']);errors=[];checks=[]
 for width in [1440,390]:
  page=browser.new_page(viewport={'width':width,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/rebuilder.html',wait_until='domcontentloaded');page.wait_for_function('window.XLSX')
  page.locator('#addRoomBtn').click();expect(page.locator('#roomName')).to_be_focused()
  page.locator('#roomName').fill('101');page.locator('#roomCapacity').fill('24');page.locator('#roomForm button').click();expect(page.locator('#roomList')).to_contain_text('101')
  # A genuine XLSX workbook with Turkish, spaced headers and a bad row.
  data=page.evaluate('''()=>{const b=XLSX.utils.book_new();XLSX.utils.book_append_sheet(b,XLSX.utils.aoa_to_sheet([
   [' Öğrenci No ',' Ad Soyad ',' Kampüs Bilgisi ',' Sınıf '],['0001','Anonim Bir',' Merkez  Kampüs ','8/A'],['0002','Anonim İki','merkez kampüs','8/A'],['0003','','Hatalı','8/A']]),'Öğrenciler');return Array.from(new Uint8Array(XLSX.write(b,{type:'array',bookType:'xlsx'})));}''')
  page.locator('#fileInput').set_input_files({'name':'anonim.xlsx','mimeType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','buffer':bytes(data)})
  expect(page.locator('[data-map-key="campus"]')).not_to_have_value('');page.locator('#importBtn').click()
  expect(page.locator('#tableCount')).to_have_text('2');expect(page.locator('[data-key="campus"]').first).to_have_value('Merkez Kampüs');expect(page.locator('[data-key="campus"]').nth(1)).to_have_value('Merkez Kampüs')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),str(page.evaluate("()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(-12).map(e=>({id:e.id,tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right}))})"))
  checks.append(f'roster xlsx/campus/bad-row/classroom/{width}');page.close()
 page=browser.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/araclar/pdf-tools.html',wait_until='domcontentloaded')
 page.wait_for_function('window.PdfRegionOcr && window.Tesseract')
 # Test actual local WASM OCR on a rendered numeric region. This is not the missing Limit PDF.
 network=[];page.on('request',lambda req:network.append(req.url))
 result=page.evaluate('''async()=>{const mock={getViewport:({scale})=>({width:400*scale,height:120*scale}),render:({canvasContext:ctx})=>{ctx.fillStyle='white';ctx.fillRect(0,0,1240,400);ctx.fillStyle='black';ctx.font='bold 130px Arial';ctx.fillText('10295',60,220);return{promise:Promise.resolve()};}};return PdfRegionOcr.read(mock,{segments:[{xStart:0,xEnd:1,yStart:0,yEnd:1}]},true);}''')
 assert result['text']=='10295',result
 assert all(url.startswith(base) or url.startswith('blob:') for url in network),network
 checks.append(f'local WASM OCR: {result["text"]}, confidence {result["confidence"]}')
 page.evaluate("window.reviewResult=null;void PdfRegionOcr.review([{page:0,value:'1029',confidence:30}]).then(r=>window.reviewResult=r)")
 page.get_by_role('textbox',name='Sayfa 1 çıktı adı').fill('10295');page.get_by_role('button',name='Kontrol ettim · ZIP hazırla').click();page.wait_for_function('window.reviewResult')
 assert page.evaluate('reviewResult[0].value')=='10295';checks.append('low-confidence editable review')
 assert not errors,errors
 print(json.dumps({'passed':checks,'javascriptErrors':errors},ensure_ascii=False,indent=2));browser.close()
