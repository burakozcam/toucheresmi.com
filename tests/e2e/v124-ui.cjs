// Isolated browser UI verification: every API response is synthetic.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{sessionStorage.setItem('kurumsal-auth-token','synthetic-token');sessionStorage.setItem('kurumsal-splash-seen','1');});
 const schools=[{id:'school',name:'Chat GPT Ortaokulu',city:'İstanbul',district:'Maltepe'}];
 const template={id:'fmt',name:'Örnek FMT',active:true,layout:{lineLength:171,fields:{},lessons:[{name:'TÜRKÇE',start:52,length:20}]}};
 const key={id:'key',name:'1. Deneme',active:true,publisher:{id:'publisher',name:'OpenAI Yayınları'},grade:8,publicationId:'pub',evaluationReady:true,lessonCounts:{TÜRKÇE:20},questionCount:20,booklets:['A']};
 const warning='TXT satır 1: 171 karakter bekleniyor, 131 bulundu. Eksik alanlar boş değerlendirildi; net değişebilir.';
 const data={questions:[{lesson:'TÜRKÇE',number:1,answer:'A',positions:{A:1},weight:null}],students:[{id:'1',name:'Örnek Öğrenci',school:schools[0].name,branch:'8-A',answers:['A'],booklets:{TÜRKÇE:'A'},sourceLines:[1]}],warnings:[warning],lineCount:1};
 const snapshot={id:'result',schoolId:'school',keyId:'key',schoolName:schools[0].name,keyName:key.name,templateName:template.name,data,penalty:3,summary:[{id:'1',net:1,score:null,lessons:[]}],checks:{blockers:[],warnings:[warning]},previewToken:'synthetic'};
 let fmtScore=.77,examPercent=85;
 let archive=[{id:'txt',name:'ornek.txt',size:131,createdAt:new Date().toISOString(),evaluatedAt:null,resultId:null,uploadedBy:'Admin'}],evaluated=false;
 await context.route('**/api/**',async route=>{
 const req=route.request(),url=new URL(req.url()),path=url.pathname;let result=[];
 if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});return;}
 if(path==='/api/account')result={id:'user',role:'DEALER',firstName:'Test',lastName:'Kullanıcı',email:'test@example.test'};
 else if(path==='/api/schools')result=schools;
 else if(path==='/api/optical/evaluation-templates')result=[template];
 else if(path==='/api/optical/evaluation-exams')result=[key];
 else if(path==='/api/optical/txt-files')result=archive;
 else if(path==='/api/optical/txt-files/txt'&&req.method()==='DELETE'){archive=[];result={deleted:true};}
 else if(path==='/api/optical/infer-fmt')result=[{confidence:'possible',candidates:[{id:'fmt',name:template.name,score:fmtScore,reasons:['Alan konumları uyumlu.']}]}];
 else if(path==='/api/optical/suggest-exams')result={items:[{...key,publisher:'OpenAI Yayınları',matchPercent:examPercent,matched:17,compared:20}]};
 else if(path==='/api/optical/preview'){assert.deepEqual(JSON.parse(req.postData()).fileIds,['txt']);result=snapshot;}
 else if(path==='/api/optical/evaluate'){evaluated=true;archive[0].evaluatedAt=new Date().toISOString();result=snapshot;}
 else if(path==='/api/optical/result-exams')result=[{id:'key',name:key.name,publisher:'OpenAI Yayınları',uploadCount:1}];
 else if(path==='/api/optical/result-exams/key')result={...snapshot,generalCount:1,rankings:{'1':{generalRank:1,generalCount:1,schoolRank:1,schoolCount:1,classRank:1,classCount:1}},sourceResultIds:['result']};
 await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(result)});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3100/panel');await page.getByRole('button',{name:/Sınav Değerlendir$/}).click();
 await page.getByLabel('ornek.txt dosyasını seç',{exact:true}).check();
 const both=page.getByRole('button',{name:'İkisini de uygula',exact:true});await both.waitFor();
 assert.equal(await both.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 102, 0)');
 await page.getByText(/Önerilen FMT: Örnek FMT · %77/).waitFor();await page.getByText(/Önerilen sınav:.*%85/).waitFor();for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const percent of [0,50,100]){
   fmtScore=percent/100;examPercent=percent;
   await page.getByLabel('ornek.txt dosyasını seç',{exact:true}).uncheck();await page.getByLabel('ornek.txt dosyasını seç',{exact:true}).check();
   await both.waitFor();const meters=page.getByRole('meter');await meters.first().waitFor();
   assert.equal(await meters.count(),2);
   for(const meter of await meters.all()){
    assert.equal(await meter.getAttribute('aria-valuenow'),String(percent));
    const fill=meter.locator('.match-meter-fill');
    assert.equal(await fill.evaluate(e=>getComputedStyle(e).animationName),'match-fill-in');
    await page.waitForFunction(e=>getComputedStyle(e).transform==='matrix(1, 0, 0, 1, 0, 0)',await fill.elementHandle());
    const size=await meter.evaluate(e=>({track:e.getBoundingClientRect().width,fill:e.firstElementChild.getBoundingClientRect().width,hue:getComputedStyle(e).getPropertyValue('--match-hue')}));
    assert.ok(Math.abs(size.fill-size.track*percent/100)<1);
    assert.equal(Number(size.hue),percent===0?0:percent===50?45:140);
   }
   await page.screenshot({path:`/tmp/v124-match-${viewport.width}-${percent}.png`});
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.match-meter-fill').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});
 await both.click();
 await page.locator('.exam-upload-settings .searchable-select > button').filter({hasText:'Örnek FMT'}).waitFor();
 await page.getByLabel('İl',{exact:true}).selectOption({label:'İstanbul'});await page.getByLabel('İlçe',{exact:true}).selectOption({label:'Maltepe'});await page.getByLabel('Kurum',{exact:true}).selectOption('school');
 await page.getByRole('button',{name:'Seçili TXT’leri yükle ve değerlendir',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Sınav değerlendirildi'});await dialog.waitFor();assert.ok(evaluated);await dialog.getByText(warning,{exact:true}).waitFor();
 await page.screenshot({path:'/tmp/v124-completion.png'});
 await dialog.getByRole('button',{name:'Sonuçları göster',exact:true}).click();
 await page.getByRole('button',{name:'PDF indir',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('select[aria-label="Yüklenen sınav"]')?.value==='key');
 assert.equal(await page.getByLabel('Sonuç kurumu',{exact:true}).inputValue(),'school');assert.equal(await page.getByLabel('İl',{exact:true}).locator('option:checked').textContent(),'İstanbul');assert.equal(await page.getByLabel('İlçe',{exact:true}).locator('option:checked').textContent(),'Maltepe');assert.ok(await page.getByRole('button',{name:'PDF indir',exact:true}).isEnabled());
 await page.screenshot({path:'/tmp/v124-results.png'});
 await page.getByRole('button',{name:/Sınav Değerlendir$/}).click();await page.getByText('· Admin',{exact:true}).waitFor();await page.getByRole('button',{name:'ornek.txt dosyasını sil',exact:true}).click();await page.getByText('Henüz sunucuya TXT yüklenmedi.',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: 0/50/100 fill widths, colors, animation, mobile, reduced motion; percentages, orange apply-both, warning dialog, preselected results, owner label and archive delete.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
