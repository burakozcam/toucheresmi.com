const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const view=JSON.parse(fs.readFileSync('/tmp/v121-ui-view.json','utf8')),report=JSON.parse(fs.readFileSync('apps/api/assets/test-center-report.json','utf8'));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});const checks=[];
try{for(const width of [1440,390]){
 let exports=[],lookups=[],evaluations=0,accountAvatar=true,accountRole="SUPER_ADMIN";
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(12000);
 page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>{sessionStorage.setItem('kurumsal-auth-token','local-ui-test');sessionStorage.setItem('kurumsal-splash-seen','1');});
 await context.route('https://api.kurumsalsinav.com/**',async route=>{const u=new URL(route.request().url()),p=u.pathname;const fulfill=json=>route.fulfill({json});
 if(p==='/api/account')return fulfill({id:'admin',email:'test@example.test',role:accountRole,firstName:'Anonim',lastName:'Yönetici',avatar:!accountAvatar?null:'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="140"><rect width="80" height="140" fill="navy"/><circle cx="40" cy="70" r="30" fill="orange"/></svg>').toString('base64')});
 if(p==='/api/auth/human-verification')return fulfill({enabled:false});
 if(p==='/api/admin/test-center')return fulfill(report);
 if(p==='/api/public-results/schools'||p==='/api/schools')return fulfill([{id:'school',name:'Anonim Okul',city:'Ankara',district:'Çankaya'}]);
 if(p==='/api/public-results/grades')return fulfill(['8']);
 if(p==='/api/public-results/lookup'){lookups.push(route.request().postDataJSON());return fulfill([{keyId:'key',examName:view.keyName,student:view.data.students[0],summary:view.summary[0],ranking:view.rankings[view.data.students[0].id]}]);}
 if(p==='/api/optical/result-exams')return fulfill([{id:'key',name:view.keyName,uploadCount:1}]);
 if(p==='/api/optical/result-exams/key')return fulfill({...view,sourceResultIds:[]});
 if(p.endsWith('/export')||p==='/api/public-results/pdf'){const input=p.endsWith('/export')?Object.fromEntries(u.searchParams):route.request().postDataJSON();exports.push(input);const file=input.kind==='school'?'v121-okul-listesi':input.templateId==='summary-card'?'v121-1-sayfa':input.templateId==='two-page-card'?'v121-2-sayfa':'v121-kazanimli';return route.fulfill({contentType:'application/pdf',body:fs.readFileSync(`output/pdf/${file}.pdf`)});}
 if(p==='/api/optical/evaluation-templates')return fulfill([{id:'fmt',name:'Sistem FMT 7108',active:true,layout:require('../../apps/api/dist/src/optical-core.js').layout7108}]);
 if(p==='/api/optical/evaluation-exams')return fulfill([]);
 if(p==='/api/optical/txt-files')return fulfill([{id:'txt',name:'Anonim.txt',size:171,createdAt:'2026-11-12T00:00:00Z',evaluatedAt:null}]);
 if(p==='/api/optical/infer-fmt')return fulfill([{confidence:'strong',message:'Tahmin edilen FMT: 7108',candidates:[{id:'fmt',name:'Sistem FMT 7108',reasons:['Anonim kabul verisi']}]}]);
 if(/evaluate/.test(p)&&route.request().method()==='POST')evaluations++;
 if(p==='/api/admin/contact-messages')return fulfill({items:[],unreadCount:0});
 return fulfill([]);
 });
 await page.goto('http://127.0.0.1:3100/sonuclar');
 assert.equal(await page.locator('input[type=password]').count(),0);
 await page.getByLabel('Kurum',{exact:true}).selectOption('school');await page.getByLabel('Sınıf düzeyi / kademe',{exact:true}).selectOption('8');
 await page.getByLabel('Kurumunuzun verdiği sınav erişim kodu').fill('0123456789abcdef');await page.getByLabel('Öğrenci numarası',{exact:true}).fill('00101');await page.getByRole('button',{name:'Sonuçlarımı göster'}).click();await page.getByRole('heading',{name:view.keyName}).waitFor();assert.equal(lookups[0].accessCode,'0123456789abcdef');
 for(const [label,id]of [['1 Sayfalık Karne','summary-card'],['2 Sayfalık Karne','two-page-card'],['Kazanımlı Karne','detailed-card']]){console.log('pdf-choice',width,label);await page.getByRole('button',{name:label,exact:true}).click();const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Seçili karnemi PDF indir'}).click();await dl;assert.equal(exports.at(-1).templateId,id);}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.goto('http://127.0.0.1:3100/panel');if(width<700)await page.getByRole('button',{name:'Menüyü aç',exact:true}).click();await page.getByRole('button',{name:'Test Merkezi',exact:false}).click();await page.getByText(new RegExp(`Toplam ${report.summary.total}`)).waitFor();assert.equal(await page.getByRole('button',{name:/Testleri çalıştır|Terminal|Shell/}).count(),0);
 const avatar=page.locator('.header-avatar');const style=await avatar.evaluate(el=>{const r=el.getBoundingClientRect(),img=el.querySelector('img'),i=img.getBoundingClientRect(),s=getComputedStyle(img);return{dx:Math.abs(r.x+r.width/2-i.x-i.width/2),dy:Math.abs(r.y+r.height/2-i.y-i.height/2),fit:s.objectFit,pos:s.objectPosition};});console.log("avatar",width,style);await page.screenshot({path:`/tmp/v121-avatar-${width}.png`});assert.ok(style.dx<1&&style.dy<1);assert.equal(style.fit,'cover');assert.equal(style.pos,'50% 50%');
 console.log('results-start',width);if(width<700)await page.getByRole('button',{name:'Menüyü aç',exact:true}).click();await page.getByRole('button',{name:'Sınav Sonuçları',exact:false}).first().click();await page.getByLabel('İl',{exact:true}).selectOption('ankara');await page.getByLabel('İlçe',{exact:true}).selectOption('çankaya');await page.getByLabel('Sonuç kurumu',{exact:true}).selectOption('school');await page.getByLabel('Yüklenen sınav',{exact:true}).selectOption('key');
 for(const [label,id]of [['1 Sayfalık Karne','summary-card'],['2 Sayfalık Karne','two-page-card'],['Kazanımlı Karne','detailed-card']]){console.log('pdf-choice',width,label);await page.getByRole('button',{name:label,exact:true}).click();const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Seçili öğrenci karnesini PDF indir'}).click();await dl;assert.equal(exports.at(-1).templateId,id);assert.equal(exports.at(-1).kind,'cards');}
 console.log('list-start',width);await page.getByRole('button',{name:'Okul sonuç listesi',exact:true}).click();const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Seçili sonuç listesini PDF indir'}).click();await dl;assert.equal(exports.at(-1).kind,'school');assert.equal(exports.at(-1).templateId,'school-table');
 console.log('fmt-start',width);if(width<700)await page.getByRole('button',{name:'Menüyü aç',exact:true}).click();await page.getByRole('button',{name:'Sınav Değerlendir',exact:false}).first().click();await page.getByLabel('Anonim.txt dosyasını seç').check();await page.getByRole('button',{name:/Önerilen FMT.*Uygula/}).click();await page.getByRole('status').filter({hasText:'seçildi'}).waitFor();assert.equal(evaluations,0);
 await page.screenshot({path:`/tmp/v121-ui-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 accountAvatar=false;accountRole='DEALER';await page.reload();await page.locator('.header-avatar').waitFor();assert.equal(await page.locator('.header-avatar img').count(),0);assert.equal(await page.locator('.header-avatar').innerText(),'A');assert.equal(await page.getByRole('button',{name:'Test Merkezi',exact:false}).count(),0);
 checks.push({width,defaultAvatar:true,dealerCannotSeeTestCenter:true,guestWithoutAccount:true,accessCodePreserved:true,correctPdfEndpoints:true,readOnlyTestCenter:true,avatarCentered:true,fmtAppliedWithoutEvaluation:true,mobileOverflow:false});await context.close();
}fs.writeFileSync('/tmp/v121-ui-report.json',JSON.stringify({finishedAt:new Date().toISOString(),checks},null,2));console.log(JSON.stringify(checks,null,2));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
