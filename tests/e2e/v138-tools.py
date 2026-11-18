import json,zipfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-results/v138/tools');checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox']);page=b.new_page(accept_downloads=True);page.set_default_timeout(20000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:3115/araclar/pdf-tools.html',wait_until='domcontentloaded')
 page.locator('[data-tool=split-text]').click();page.locator('#tool-files').set_input_files(str(out/'two-pages.pdf'))
 expect(page.locator('#text-page-layer span').first).to_be_visible()
 page.locator('#text-page-layer span').first.evaluate('e=>{const range=document.createRange();range.selectNodeContents(e);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);e.parentElement.dispatchEvent(new MouseEvent("mouseup",{bubbles:true}));}')
 expect(page.locator('#run-tool')).to_be_enabled();page.locator('#run-tool').click();dialog=page.locator('.pdf-review');expect(dialog).to_be_visible();dialog.locator('summary').click();expect(dialog.locator('.pdf-review-row')).to_have_count(2);dialog.get_by_label('Sayfa 1 çıktı adı',exact=True).fill('12345');
 with page.expect_download() as info:dialog.locator('.pdf-review-accept').click()
 info.value.save_as(str(out/'split-edited.zip'))
 with zipfile.ZipFile(out/'split-edited.zip') as z:
  assert set(z.namelist())=={'12345.pdf','20296.pdf'},z.namelist()
  for name in z.namelist():z.extract(name,out);assert 'Pages:           1' in subprocess.check_output(['pdfinfo',str(out/name)]).decode()
 checks.append('Actual two-page PDF selection, editable review, ZIP generation and one-page PDF contents')
 # Existing local OCR engine, invoked against a synthetic rendered region.
 result=page.evaluate('''async()=>{const mock={getViewport:({scale})=>({width:400*scale,height:120*scale}),render:({canvasContext:ctx})=>{ctx.fillStyle='white';ctx.fillRect(0,0,1240,400);ctx.fillStyle='black';ctx.font='bold 130px Arial';ctx.fillText('10295',60,220);return{promise:Promise.resolve()};}};return PdfRegionOcr.read(mock,{segments:[{xStart:0,xEnd:1,yStart:0,yEnd:1}]},true);}''')
 assert result['text']=='10295',result;checks.append('Local WASM OCR still reads the synthetic numeric region')
 # Smoke every other existing tool after replacing the blocked CDN dependencies.
 from PIL import Image
 Image.new('RGB',(120,80),'white').save(out/'source.png');(out/'source.csv').write_text('Name,Score\nSynthetic,99\n')
 cases=[('merge',[out/'two-pages.pdf',out/'two-pages.pdf']),('split',[out/'two-pages.pdf']),('pdf-image',[out/'two-pages.pdf']),('image-pdf',[out/'source.png']),('image-image',[out/'source.png']),('excel-pdf',[out/'source.csv']),('pdf-excel',[out/'two-pages.pdf'])]
 for tool,files in cases:
  page.locator('[data-tool="'+tool+'"]').click();page.locator('#tool-files').set_input_files([str(f) for f in files])
  if tool=='split':page.locator('#page-ranges').fill('1,2')
  expect(page.locator('#run-tool')).to_be_enabled()
  with page.expect_download() as info:page.locator('#run-tool').click()
  file=out/(tool+'-'+info.value.suggested_filename);info.value.save_as(str(file));assert file.stat().st_size>50
  if file.suffix=='.pdf':
   text=subprocess.check_output(['pdfinfo',str(file)]).decode();assert 'Pages:' in text
   if tool=='merge':assert 'Pages:           4' in text
  elif file.suffix in ['.zip','.xlsx']:
   with zipfile.ZipFile(file) as z:
    assert len(z.namelist())>0
    if tool=='pdf-image':assert len(z.namelist())==2 and all(n.endswith('.png') for n in z.namelist())
    if tool=='pdf-excel':assert 'xl/workbook.xml' in z.namelist()
  checks.append('Actual local tool download: '+tool)
 assert not errors,errors
 (out/'checks.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors},ensure_ascii=False,indent=2));print(json.dumps(checks,ensure_ascii=False));b.close()
