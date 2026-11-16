"""Local production QA. Uses synthetic public catalogue data on localhost:4000; no DB.
Start Web on 127.0.0.1:3110 with NEXT_PUBLIC_API_URL=http://localhost:4000.
"""
import json, threading, os, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
OUT = Path('test-results/v131-ui'); OUT.mkdir(parents=True, exist_ok=True)
PUBLISHERS = [{'id':'qa-p1','name':'Örnek Yayınları'},{'id':'qa-p2','name':'Deneme Yayınları'},{'id':'qa-p3','name':'Eğitim Yayınları'}]
ITEMS = [{'id':f'qa{i}','examName':f'Örnek Deneme {i+1}', 'grade':8 if i%2==0 else 7, 'publisherId':PUBLISHERS[i%3]['id'], 'publisher':PUBLISHERS[i%3], 'published':True, 'publishedAt':'2026-11-16T09:00:00Z', 'coverImage':'http://localhost:4000/qa-cover.svg' if i%2==0 else None, 'files':[{'id':f'file{i}','category':'ANSWER_KEY','originalFileName':'cevap.pdf','mimeType':'application/pdf','size':100,'createdAt':'2026-11-16T09:00:00Z'}]} for i in range(10)]
class Mock(BaseHTTPRequestHandler):
 def log_message(self,*a): pass
 def do_GET(self):
  url=urllib.parse.urlsplit(self.path); q=urllib.parse.parse_qs(url.query); path=url.path; status=200
  if path=='/api/answer-keys':
   rows=ITEMS[:]
   if q.get('search'): rows=[i for i in rows if q['search'][0].lower() in (i['examName']+' '+i['publisher']['name']).lower()]
   if q.get('grade'): rows=[i for i in rows if str(i['grade'])==q['grade'][0]]
   if q.get('publisherId'):rows=[i for i in rows if i['publisherId']==q['publisherId'][0]]
   d={'items':rows[:int(q.get('limit',['30'])[0])],'totalPages':1,'total':len(rows)}
  elif path=='/api/publishers': d=PUBLISHERS
  elif path.endswith('/pdf-info'):d={'books':[]}
  elif path.startswith('/api/answer-keys/'):
   d=next((i for i in ITEMS if i['id']==path.rsplit('/',1)[-1]),None);status=200 if d else 404
  elif path=='/api/blog':d={'items':[],'pages':1,'total':0}
  elif path.endswith('/logo') or path=='/qa-cover.svg':
   body=('<svg xmlns="http://www.w3.org/2000/svg" width="450" height="600"><rect width="450" height="600" fill="#274b7c"/><text x="40" y="80" fill="white" font-family="sans-serif" font-size="24">ÖRNEK YAYINLARI</text><text x="40" y="300" fill="white" font-family="sans-serif" font-size="44">DENEME</text><text x="40" y="540" fill="#b9cdec" font-size="22">TEST KAPAĞI · 8. SINIF</text></svg>').encode();self.send_response(200);self.send_header('Content-Type','image/svg+xml');self.send_header('Access-Control-Allow-Origin','*');self.end_headers();self.wfile.write(body);return
  elif path=='/api/public-config':d={}
  elif path=='/api/auth/human-verification':d={'enabled':False}
  elif path=='/api/public-results/schools':d=[]
  elif path=='/api/exam-schedule':d=[]
  else:d=[]
  self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Access-Control-Allow-Origin','*');self.end_headers();self.wfile.write(json.dumps(d).encode())
server=ThreadingHTTPServer(('127.0.0.1',4000),Mock);threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=os.environ.get('KS_WEB_URL','http://127.0.0.1:3110');results=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox'])
  for theme in ['light','dark']:
   for width in [320,390,768,1024,1440,1920]:
    c=b.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
    c.add_init_script("localStorage.setItem('kurumsal-theme',"+json.dumps(theme)+");localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')")
    c.add_init_script("""window.qaMetrics={lcp:0,cls:0,eventDurations:[]};for(const type of ['largest-contentful-paint','layout-shift','event']){try{new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='largest-contentful-paint')qaMetrics.lcp=e.startTime;if(type==='layout-shift'&&!e.hadRecentInput)qaMetrics.cls+=e.value;if(type==='event'&&e.interactionId)qaMetrics.eventDurations.push(e.duration)}}).observe({type,buffered:true,durationThreshold:16})}catch{}}""")
    page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE);expect(page.locator('.home-books .showcase-book')).to_have_count(10)
    expect(page.locator('h1')).to_contain_text('Sınava girdin.')
    assert page.title().count('Kurumsal Sınav')==1
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(theme,width,'home overflow')
    page.wait_for_function('document.querySelector(".workflow-hero").getAnimations({subtree:true}).length === 0')
    page.screenshot(path=str(OUT/f'home-{theme}-{width}.png'),full_page=True)
    metrics=page.evaluate('qaMetrics')
    # Standard GET search reaches the server-rendered catalogue.
    page.get_by_role('searchbox').fill('8. sınıf');page.get_by_role('button',name='Cevap anahtarlarını bul',exact=True).click()
    expect(page.locator('.answer-filter-panel select').nth(1)).to_have_value('8')
    expect(page.locator('.catalog-book')).to_have_count(5)
    page.get_by_role('searchbox').fill('Deneme 1');expect(page.locator('.catalog-book')).to_have_count(1)
    page.locator('.answer-filter-panel select').first.select_option('qa-p2');expect(page.locator('.catalog-book')).to_have_count(0)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(theme,width,'catalog overflow')
    page.screenshot(path=str(OUT/f'catalog-{theme}-{width}.png'),full_page=True)
    assert not errors,errors
    results.append({'theme':theme,'width':width,'overflow':False,'gradeSearch':True,'filtering':True,'reducedMotion':True,'errors':errors,'localHomeMetrics':metrics,'catalogEventDurationsMs':page.evaluate('qaMetrics.eventDurations')});c.close()
  (OUT/'responsive.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
  print('Responsive catalogue checks passed',flush=True)
  # Natural scroll reaches every state; inspect actual animation timelines.
  c=b.new_context(viewport={'width':1440,'height':1000});c.add_init_script("localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')")
  page=c.new_page();page.goto(BASE);hero=page.locator('.workflow-hero');hero.scroll_into_view_if_needed();hero.get_by_role('button',name='Animasyonu durdur',exact=True).click()
  assert hero.evaluate('(e)=>e.getAnimations({subtree:true}).every(a=>a.playState==="paused")')
  hero.get_by_role('button',name='Animasyonu oynat',exact=True).click();assert hero.evaluate('(e)=>e.getAnimations({subtree:true}).some(a=>a.playState==="running")')
  page.locator('.publisher-ribbon').scroll_into_view_if_needed();page.get_by_role('button',name='Şeridi durdur Ⅱ',exact=True).click();assert page.locator('.ribbon-track').evaluate('(e)=>e.getAnimations().every(a=>a.playState==="paused")')
  page.get_by_role('button',name='Şeridi oynat ▶',exact=True).click()
  story=page.locator('.optical-story');top=story.evaluate('(e)=>e.getBoundingClientRect().top+scrollY');length=story.evaluate('(e)=>e.offsetHeight-innerHeight');states=[]
  for n in range(7):
   page.evaluate('(y)=>scrollTo({top:y,behavior:"instant"})',top+length*(n+.4)/7);page.wait_for_timeout(120);states.append(story.get_attribute('data-step'));page.screenshot(path=str(OUT/f'story-{n}.png'))
  assert states==list(map(str,range(7))),states
  print('Scroll and pause controls passed',flush=True)
  # Detail links and per-exam metadata are rendered on the server.
  page.goto(BASE+'/cevap-anahtarlari');href=page.locator('.catalog-book h3 a').first.get_attribute('href');page.goto(BASE+href)
  expect(page.get_by_role('link',name='Cevap Anahtarını İndir',exact=True)).to_have_attribute('href','http://localhost:4000/api/answer-key-files/file0')
  assert page.locator('meta[property="og:image"]').get_attribute('content').endswith('/opengraph-image')
  assert page.locator('.related-exams .showcase-book').count()>0
  response=page.request.get(BASE+href+'/opengraph-image');assert response.status==200 and response.headers['content-type'].startswith('image/png'),response.status
  page.screenshot(path=str(OUT/'detail.png'),full_page=True)
  print('Detail and OG checks passed',flush=True)
  # Remaining public surfaces: narrow mobile, tablet, desktop, both themes.
  public_checks=[]
  for width in [320,768,1440]:
   for theme in ['light','dark']:
    ctx=b.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce');ctx.add_init_script("if(window===window.top){localStorage.setItem('kurumsal-theme',"+json.dumps(theme)+");localStorage.setItem('ks-analytics-consent','denied');sessionStorage.setItem('kurumsal-splash-seen','1')}")
    tab=ctx.new_page();js_errors=[];tab.on('pageerror',lambda e:js_errors.append(str(e)))
    tab.route('https://maps.google.com/**',lambda r:r.abort())
    for path in ['/sonuclar','/sinav-takvimi','/blog','/contact','/login','/login?register=1','/sinav-degerlendir','/pdf-duzenleyici',href]:
     tab.goto(BASE+path);tab.locator('h1').first.wait_for();tab.wait_for_timeout(150)
     if path=='/login?register=1':
      tab.get_by_role('button',name='Üye ol',exact=True).click();expect(tab.locator('.registration-form')).to_be_visible()
     assert tab.evaluate('document.documentElement.scrollWidth <= innerWidth'),(path,width,theme,'overflow')
     assert not js_errors,(path,js_errors)
     tab.screenshot(path=str(OUT/f'public-{path.replace("/","_").replace("?","-").replace("=","-")}-{theme}-{width}.png'),full_page=True)
     public_checks.append({'path':path,'width':width,'theme':theme,'overflow':False,'errors':[]})
    ctx.close()
  results.append({'otherPublicPages':public_checks})
  (OUT/'public-pages.json').write_text(json.dumps(public_checks,ensure_ascii=False,indent=2))
  # No JS still exposes real exam links and the GET search form.
  nojs=b.new_context(java_script_enabled=False);np=nojs.new_page();np.goto(BASE);assert np.locator('.home-books .showcase-book').count()==10;expect(np.locator('form[role="search"]')).to_be_visible();nojs.close()
  # Unavailable API is reported without inventing catalogue data.
  c.route('**/api/answer-keys?**',lambda route:route.fulfill(status=503,json={'error':'Test: servis geçici olarak kapalı'}))
  page.goto(BASE+'/cevap-anahtarlari');page.get_by_role('searchbox').fill('kapalı');expect(page.locator('.notice[role="alert"]')).to_contain_text('servis geçici olarak kapalı')
  frames=page.evaluate('()=>new Promise(resolve=>{let times=[];function tick(t){times.push(t);if(times.length<61)requestAnimationFrame(tick);else resolve(times.slice(1).map((t,i)=>t-times[i]))}requestAnimationFrame(tick)})')
  results.append({'frameMedianMs':sorted(frames)[len(frames)//2],'scrollStates':states,'heroPauseResume':True,'ribbonPauseResume':True,'detailDownloads':True,'relatedExams':True,'ogImage':True,'serverHTML':True,'errorState':True})
  b.close()
finally:server.shutdown();server.server_close()
(OUT/'qa.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
