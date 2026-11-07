/* Run after production build/server on :3105 and isolated Chrome CDP on :9225.
   UI checks use explicit fixture API responses; they do not contact the database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const WebSocket = require('next/dist/compiled/ws');
const baseUrl = process.env.BROWSER_TEST_URL || 'http://127.0.0.1:3105';
(async () => {
  const tabs = await (await fetch('http://127.0.0.1:9225/json/list')).json();
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.once('open', r));
  let sequence = 0; const pending = new Map();
  ws.on('message', data => { const m = JSON.parse(data); if (m.id && pending.has(m.id)) { const {resolve,reject} = pending.get(m.id); pending.delete(m.id); m.error ? reject(Error(JSON.stringify(m.error))) : resolve(m.result); } });
  const send = (method, params = {}) => new Promise((resolve,reject) => { const id = ++sequence; pending.set(id,{resolve,reject}); ws.send(JSON.stringify({id,method,params})); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', {expression,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const wait = async expression => { for(let i=0;i<120;i++){ if(await evaluate(expression)) return; await new Promise(r=>setTimeout(r,100)); } throw Error('Timeout: '+expression); };
  const click = text => evaluate(`(()=>{ const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().endsWith(${JSON.stringify(text)})); if(!b) throw Error('Missing button '+${JSON.stringify(text)}); b.click(); })()`);
  const navigate = async path => { await send('Page.navigate',{url:baseUrl+path}); await wait('document.readyState === "complete"'); };
  if(process.argv.includes('--inspect')) { console.log(await evaluate(`({body:document.body.innerText.slice(-3500), dialogs:[...document.querySelectorAll('dialog')].map(d=>d.innerText)})`)); ws.close(); return; }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    localStorage.setItem('kurumsal-game-sound','on');
    sessionStorage.setItem('kurumsal-auth-token','fixture-token');
    const user={id:'fixture-admin',email:'admin@example.test',firstName:'Test',lastName:'Yönetici',role:'SUPER_ADMIN'};
    sessionStorage.setItem('kurumsal-auth-user',JSON.stringify(user));
    const original=window.fetch;
    window.fetch=async (url, options={})=>{
      if(!String(url).includes('api.kurumsalsinav.com')) return original(url,options);
      const path=new URL(String(url)).pathname;
      let data=[];
      if(path==='/api/account') data=user;
      else if(path.includes('contact-messages')) data={items:[],totalPages:1,unreadCount:0};
      else if(path.includes('registration-requests')) data={items:[],totalPages:1};
      else if(path==='/api/admin/users') data={items:[],totalPages:1};
      else if(path==='/api/admin/publishers') data=[{id:'fixture-p',name:'PARAF',active:true},{id:'fixture-o',name:'OKYANUS',active:true}];
      return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
    };`});
  await navigate('/panel'); await wait(`document.body.textContent.includes('Blok Zamanı')`);
  await click('Blok Zamanı'); await wait(`!!document.querySelector('.blocks-canvas')`); await click('Başlat'); await evaluate(`document.querySelector('.game-studio button').focus()`); await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32}); await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32}); await wait(`Number(document.querySelector('.game-scores b').textContent)>0`); await click('Hızlı düşür');
  assert.ok(await evaluate(`document.querySelector('.game-scores').textContent.includes('Skor')`));
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`),'Panel overflow');
  await click('Duraklat'); await click('Devam et');
  await click('Kıvrıla Kıvrıla K'); await wait(`!!document.querySelector('.brand-game-canvas')`); await click('Oyuna başla');
  await evaluate(`(async()=>{document.querySelector('.brand-game-canvas').scrollIntoView({block:'center'});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);})()`);
  await evaluate(`window.__headY=()=>{const c=document.querySelector('.brand-game-canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(d[i]===255&&d[i+1]===255&&d[i+2]===255)return y;}return 999;}`);
  const snakeY=await evaluate(`window.__headY()`);
  const rect=await evaluate(`(()=>{const r=document.querySelector('.brand-game-canvas').getBoundingClientRect();return {x:r.x+80,y:r.y+60}})()`);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x,y:rect.y}]});
  await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x,y:rect.y-40}]});
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(`window.__headY() < ${snakeY}`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.brand-game-canvas')).touchAction`),'none');
  await click('Duraklat'); await click('Ses: Açık'); assert.equal(await evaluate(`localStorage.getItem('kurumsal-game-sound')`),'off');
  await click('K ile Uçma Zamanı'); await wait(`document.querySelector('.game-studio h2')?.textContent === 'K ile Uçma Zamanı'`); await click('Oyuna başla');
  await evaluate(`(async()=>{document.querySelector('.brand-game-canvas').scrollIntoView({block:'center'});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);})()`);
  const birdY=await evaluate(`window.__headY()`);
  const bird=await evaluate(`(()=>{const r=document.querySelector('.brand-game-canvas').getBoundingClientRect();return {x:r.x+80,y:r.y+60}})()`);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[bird]}); await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(`window.__headY() < ${birdY}`);
  assert.ok(await evaluate(`document.body.textContent.includes('Ses: Kapalı')`));
  await navigate('/rebuilder.html'); await wait(`!!document.querySelector('#addRoomBtn')`);
  await evaluate(`document.querySelector('#addRoomBtn').click()`); await wait(`!!document.querySelector('dialog[open] input')`);
  await evaluate(`document.querySelector('dialog[open] input').value='Mobil 101';document.querySelector('dialog[open] form').requestSubmit()`);
  await wait(`document.querySelector('dialog[open] input')?.value==='20'`);
  await evaluate(`document.querySelector('dialog[open] form').requestSubmit()`);
  await wait(`document.querySelector('#roomList').textContent.includes('Mobil 101')`);
  assert.ok(await evaluate(`document.querySelector('#roomList').textContent.includes('20 kişilik')`));
  await evaluate(`document.querySelector('[data-edit-room]').click()`); await wait(`!!document.querySelector('dialog[open] input')`);
  await evaluate(`document.querySelector('dialog[open] input').value='Mobil 102';document.querySelector('dialog[open] form').requestSubmit()`);
  for(const text of ['20','','']) { await wait(`!!document.querySelector('dialog[open] input')`); await evaluate(`document.querySelector('dialog[open] form').requestSubmit()`); }
  await wait(`document.querySelector('#roomList').textContent.includes('Mobil 102')`);
  await evaluate(`document.querySelector('[data-remove-room]').click()`); await wait(`!!document.querySelector('dialog[open]')`); await evaluate(`document.querySelector('dialog[open] form').requestSubmit()`);
  await wait(`!document.querySelector('[data-remove-room]')`);
  console.log('PASS mobile: panel layout, block controls, snake swipe, bird touch, persisted sound, classroom add/edit/delete');
  await navigate('/login'); await wait(`!!document.querySelector('.auth-page')`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.auth-page'),'::before').animationName`),'auth-ambient');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.auth-page'),'::before').animationName`),'none');
  const metadata=await evaluate(`Object.fromEntries([...document.querySelectorAll('meta[property^="og:"]')].map(e=>[e.getAttribute('property'),e.content]))`);
  assert.equal(metadata['og:image:width'],'1200'); assert.equal(metadata['og:image:height'],'630'); assert.equal(metadata['og:image:type'],'image/png');
  assert.ok(metadata['og:image'].startsWith('https://kurumsalsinav.com/'));
  const image=await fetch(baseUrl+'/opengraph-image'); const bytes=Buffer.from(await image.arrayBuffer());
  assert.equal(image.status,200); assert.ok(image.headers.get('content-type').includes('image/png')); assert.equal(bytes.readUInt32BE(16),1200); assert.equal(bytes.readUInt32BE(20),630);
  fs.mkdirSync('test-results',{recursive:true}); fs.writeFileSync('test-results/og-v105.png',bytes);
  console.log('PASS login gradient/reduced motion and OG PNG metadata 1200x630');
  await navigate('/pdf-duzenleyici'); await wait(`document.body.textContent.includes('Belge tara')`); await click('Belge tara · kamera / dosya');
  await wait(`!!document.querySelector('.document-scanner')`);
  assert.ok(await evaluate(`document.querySelector('.document-scanner select').options.length===3`));
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`),'Scanner overflow');
  await evaluate(`(async()=>{ const c=document.createElement('canvas');c.width=20;c.height=20;const ctx=c.getContext('2d');ctx.fillStyle='red';ctx.fillRect(0,0,20,20);const blob=await new Promise(r=>c.toBlob(r,'image/png'));const dt=new DataTransfer();dt.items.add(new File([blob],'red.png',{type:'image/png'}));const input=document.querySelector('.document-scanner input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await wait(`document.querySelector('.scanner-preview canvas')?.width===20`);
  for(const mode of ['color','gray','bw']) {
    await evaluate(`(()=>{const select=document.querySelector('.document-scanner select');select.value='${mode}';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await wait(`(()=>{const c=document.querySelector('.scanner-preview canvas');const p=c.getContext('2d').getImageData(1,1,1,1).data;return ${mode==='color' ? 'p[0]===255 && p[1]===0' : mode==='gray' ? 'p[0]===p[1] && p[0]>0 && p[0]<255' : 'p[0]===0 && p[1]===0'};})()`);
  }
  await evaluate(`(()=>{ const blobs=new Map(),original=URL.createObjectURL;URL.createObjectURL=function(b){const url=original.call(URL,b);blobs.set(url,b);return url;};HTMLAnchorElement.prototype.click=function(){window.__downloadBlob=blobs.get(this.href);}; })()`);
  for(const format of ['png','jpeg','webp','pdf']) {
    await evaluate(`(()=>{window.__downloadBlob=null;const select=[...document.querySelectorAll('.scanner-settings select')].at(-1);select.value='${format}';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await click('Taranmış belgeyi indir ↓'); await wait(`!!window.__downloadBlob`);
    assert.equal(await evaluate(`window.__downloadBlob.type`),format==='pdf'?'application/pdf':'image/'+format);
    assert.ok(await evaluate(`window.__downloadBlob.size > 20`));
  }
  await evaluate(`(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError')};})()`);
  await click('Kamerayla tara'); await wait(`document.body.textContent.includes('Kamera izni verilmedi')`);
  console.log('PASS mobile scanner: color/gray/BW preview pixels; PNG/JPEG/WebP/PDF blobs; simulated camera permission denial');
  await navigate('/panel'); await wait(`document.body.textContent.includes('Sınav Takvimi')`); await click('Sınav Takvimi');
  await wait(`!!window.XLSX && !!document.querySelector('.schedule-management input[type=file]')`);
  await evaluate(`(()=>{const x=window.XLSX, book=x.utils.book_new();const rows=[['Yayınevi','Sınıf','Deneme No','Uygulama Tarihi','Kapsam','Cevap Anahtarı ID'],...Array.from({length:2500},(_,i)=>['PARAF',String(Math.floor(i/999)+1),i%999+1,'17.02.2027','Kapsam',''])];rows[1][0]='Paraf Mor';rows[2][3]='31.02.2027';rows[3]=[...rows[4]];x.utils.book_append_sheet(book,x.utils.aoa_to_sheet(rows),'Takvim');const file=new File([x.write(book,{type:'array',bookType:'xlsx'})],'2500.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const dt=new DataTransfer();dt.items.add(file);const input=document.querySelector('.schedule-management input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await wait(`document.body.textContent.includes('Toplam 2500')`);
  assert.equal(await evaluate(`document.querySelectorAll('.schedule-preview tbody tr').length`),50);
  assert.ok(await evaluate(`document.body.textContent.includes('Hatalı 2') && document.body.textContent.includes('Mükerrer 1')`));
  assert.ok(await evaluate(`document.body.textContent.includes('PARAF önerisini kabul et')`));
  await click('PARAF önerisini kabul et'); await wait(`document.body.textContent.includes('Geçerli 2498')`);
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`),'Schedule overflow');
  console.log('PASS mobile 2500-row XLSX preview: 50 DOM rows, invalid/duplicate isolation, publisher suggestion confirmation');
  for(const width of [390,768,1440]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
    for(const path of ['/','/login','/sinav-takvimi','/sinav-degerlendir','/pdf-duzenleyici']) {
      await navigate(path);
      assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth`),`Overflow ${path} at ${width}`);
    }
  }
  console.log('PASS public page horizontal overflow checks at 390/768/1440px');
  ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
