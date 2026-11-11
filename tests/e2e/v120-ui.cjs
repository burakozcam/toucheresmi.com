const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
try{
 const publishers=[{id:'p1',name:'Birinci Yayın',active:true},{id:'p2',name:'İkinci Yayın',active:true}];
 const records=['7108 Anonim Deneme','8050 Anonim Deneme','Genel Anonim Sınav'].map((examName,i)=>({id:'qa-'+i,examName,publisherId:publishers[i%2].id,publisher:publishers[i%2],grade:8,files:[],published:true,publishedAt:'2026-11-12T00:00:00Z',createdAt:'2026-11-12T00:00:00Z',showInEvaluation:false}));
 for(const role of ['SUPER_ADMIN','DEALER']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{sessionStorage.setItem('kurumsal-auth-token','local-ui-test');sessionStorage.setItem('kurumsal-splash-seen','1');});
  let remoteSearch=false,finishInitial;const initialDone=new Promise(resolve=>finishInitial=resolve);
  await context.route('https://api.kurumsalsinav.com/**',async route=>{const url=new URL(route.request().url());if(url.pathname==='/api/account')return route.fulfill({json:{id:'qa-user',firstName:'Anonim',lastName:'Test',role}});
   if(url.pathname.endsWith('/publishers'))return route.fulfill({json:publishers});
   if(url.pathname==='/api/admin/answer-keys')return route.fulfill({json:records});
   if(url.pathname==='/api/answer-keys'){if(role==='DEALER'&&!url.searchParams.has('search')){await new Promise(resolve=>setTimeout(resolve,1200));await route.fulfill({json:{items:records.slice(0,1),totalPages:1}});finishInitial();return;}const search=url.searchParams.get('search')??'';if(search)remoteSearch=true;return route.fulfill({json:{items:search?records.filter(r=>(r.examName+' '+r.publisher.name).toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))):records.slice(0,1),totalPages:1}});}
   if(url.pathname==='/api/auth/human-verification')return route.fulfill({json:{enabled:false}});
   return route.fulfill({json:[]});});
  await page.goto('http://127.0.0.1:3100/panel');await page.getByRole('button',{name:/Cevap Anahtarları$/}).click();
  const search=page.getByRole('searchbox',{name:'Cevap anahtarlarında ara',exact:true});await search.waitFor();await search.fill('8050');await page.getByRole('heading',{name:'8050 Anonim Deneme',exact:true}).waitFor();assert.equal(await page.locator('.answer-key-card').count(),1);
  if(role==='DEALER'){assert.equal(remoteSearch,true);await initialDone;await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await page.getByRole('heading',{name:'8050 Anonim Deneme',exact:true}).isVisible(),true);}
  await search.fill('İkinci Yayın');await page.getByRole('heading',{name:'8050 Anonim Deneme',exact:true}).waitFor();
  await search.fill('hiçbir-kayıt-yok');await page.getByText('Aramanızla eşleşen cevap anahtarı bulunamadı.',{exact:true}).waitFor();
  await search.fill('');await search.focus();assert.equal(await search.evaluate(el=>document.activeElement===el),true);assert.ok(await search.evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>0));
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:'/tmp/ks-v120-search-'+role+'-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(errors,[]);await context.close();
 }
 const context=await browser.newContext(),page=await context.newPage();let payload;
 await context.addInitScript(()=>sessionStorage.setItem('kurumsal-splash-seen','1'));
 await context.route('https://api.kurumsalsinav.com/**',route=>{const u=new URL(route.request().url());if(u.pathname==='/api/auth/human-verification')return route.fulfill({json:{enabled:true,provider:'recaptcha-v2',siteKey:'public-qa-key'}});if(u.pathname==='/api/auth/login'){payload=route.request().postDataJSON();return route.fulfill({status:401,json:{error:'Anonim test yanıtı'}});}return route.fulfill({json:[]});});
 await context.route('https://www.google.com/recaptcha/api.js*',route=>route.fulfill({contentType:'application/javascript',body:`window.grecaptcha={ready:f=>f(),render:(el,opts)=>{const b=document.createElement('button');b.type='button';b.textContent='Anonim doğrulama';b.onclick=()=>opts.callback('qa-captcha-token');el.appendChild(b);return 1;},reset:()=>{}};`}));
 await page.goto('http://127.0.0.1:3100/login');await page.getByRole('button',{name:'Anonim doğrulama',exact:true}).click();await page.locator('input[name=email]').fill('qa@example.test');await page.locator('input[name=password]').fill('anonymous-password');await page.getByRole('button',{name:/^Giriş Yap/}).click();await page.getByText('Anonim test yanıtı',{exact:false}).waitFor();assert.equal(payload.humanToken,'qa-captcha-token');assert.equal(payload.role,'DEALER');
 console.log(JSON.stringify({adminSearch:true,publisherAndExamSearch:true,remoteReadonlySearchBeyondFirstPage:true,emptyState:true,keyboardFocus:true,mobileOverflow:false,recaptchaWidgetToApiToken:true,provider:'mocked Google widget; no live keys'}));
 await context.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
