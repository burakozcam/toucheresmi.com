import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-results/v136/ui');seed=json.loads(Path('test-results/v136/upload-seed.json').read_text());checks=[]
def luminance(rgb):
 channels=[int(c)/255 for c in re.findall(r'\d+',rgb)[:3]]
 return sum((v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4)*weight for v,weight in zip(channels,[.2126,.7152,.0722]))
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference');c.add_init_script("localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')");page=c.new_page()
 for theme in ['light','dark']:
  page.goto('http://localhost:3115');page.wait_for_function('()=>document.querySelector(".demo-report").dataset.elapsed!==undefined');page.evaluate('(t)=>{document.documentElement.dataset.theme=t;localStorage.setItem("kurumsal-theme",t)}',theme)
  scene=page.locator('.demo-security');scene.scroll_into_view_if_needed();scene.get_by_role('button',name='Yeniden oynat').click();page.wait_for_timeout(3300);scene.get_by_role('button',name='Durdur',exact=True).click();scene.screenshot(path=str(out/f'optic-evaluated-{theme}.png'))
  assert scene.locator('[data-result=correct]').count()>0;assert scene.locator('[data-result=wrong]').count()>0
  page.evaluate('(token)=>sessionStorage.setItem("kurumsal-auth-token",token)',seed['token']);page.goto('http://localhost:3115/panel?section=exam')
  page.get_by_label('TXT dosyası',exact=True).set_input_files('test-results/v136/4995-synthetic.txt')
  meter=page.get_by_role('meter',name='FMT eşleşme oranı');expect(meter).to_be_visible(timeout=60000)
  colors=[]
  for delay in [0,600,800]:
   page.wait_for_timeout(delay);colors.append(meter.locator('i').evaluate('e=>getComputedStyle(e).backgroundColor'));expect(meter.locator('strong')).to_be_visible()
  assert len(set(colors))==3,colors
  middle=[int(v) for v in re.findall(r'\d+',colors[1])[:3]];assert middle[0]>130 and middle[1]>130 and middle[2]<80,colors
  rgb=[int(v) for v in re.findall(r'\d+',colors[-1])[:3]];assert rgb[1]>rgb[0] and rgb[1]>rgb[2],colors
  expect(page.locator('.txt-suggestions')).to_contain_text('4995 Deneme',timeout=90000)
  ratios=[]
  for card in page.locator('.match-notice').all():
   style=card.evaluate('e=>({color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor})');a,bg=luminance(style['color']),luminance(style['bg']);ratio=(max(a,bg)+.05)/(min(a,bg)+.05);assert ratio>=4.5,(theme,ratio,style);ratios.append(ratio)
  checks.append({'theme':theme,'meterColors':colors,'textContrastRatios':ratios,'greenRedOptic':True});print(checks[-1],flush=True)
 (out/'visual-details.json').write_text(json.dumps(checks,indent=2));b.close()
