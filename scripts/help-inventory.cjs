/* Run explicitly after adding controls. IDs are written once and survive DOM changes. */
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),app=path.join(root,'apps/web/app');
const files=[...fs.readdirSync(path.join(app,'panel')).filter(n=>n.endsWith('.tsx')&&!/^(help-|training-scene|sidebar-resize|break-game|block-game|store-management)/.test(n)).map(n=>'panel/'+n),'pdf-duzenleyici/editor.tsx','pdf-duzenleyici/scanner.tsx','location-fields.tsx','password-field.tsx','report-type-buttons.tsx','answer-pdf-options.tsx','sinav-takvimi/schedule-calendar.tsx','sinav-degerlendir/report-card.tsx','theme-toggle.tsx','human-verification.tsx'];
const records={},summary=[],reserved=new Set(files.flatMap(f=>[...fs.readFileSync(path.join(app,f),"utf8").matchAll(/data-help-id="([^"]+)"/g)].map(m=>m[1])));
for(const relative of files){const file=path.join(app,relative),source=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),inserts=[];let serial=0,count=0;
 function text(n){
  if(ts.isJsxText(n))return n.text.trim();
  if(ts.isStringLiteral(n))return n.text;
  if(ts.isJsxExpression(n)&&n.expression){const e=n.expression;if(ts.isStringLiteral(e))return e.text;if(ts.isConditionalExpression(e))return [text(e.whenTrue),text(e.whenFalse)].filter(Boolean).join(' / ');return '';}
  if(ts.isJsxElement(n))return n.children.map(text).filter(Boolean).join(' ');
  return '';
 }
 function attr(n,key){const a=n.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(tree)===key);return a?.initializer&&ts.isStringLiteral(a.initializer)?a.initializer.text:'';}
 function visit(n){if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){const tag=n.tagName.getText(tree);if(['button','ActionButton','input','select','textarea','summary','a','Link'].includes(tag)){
  count++;serial++;let id=attr(n,'data-help-id');if(!id||records[id]){const oldId=id;id=relative.replace(/\.tsx$/,'').replace(/\//g,'-')+'-'+serial;while(reserved.has(id)||records[id])id+='x';reserved.add(id);if(oldId){const a=n.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(tree)==='data-help-id');inserts.push({at:a.initializer.getStart(tree),end:a.initializer.end,text:JSON.stringify(id)});}else inserts.push({at:n.tagName.end,text:` data-help-id="${id}"`});}
  const parent=ts.isJsxElement(n.parent)?n.parent:null,children=parent?.children??[],type=attr(n,'type')||tag;
  let container=n.parent;while(container&&!ts.isJsxElement(container))container=container.parent;
  const labelText=container&&container.openingElement.tagName.getText(tree)==='label'?container.children.filter(ts.isJsxText).map(t=>t.text.trim()).filter(Boolean).join(' '):'';
  const fallback={input:type==='checkbox'?'Kayıt veya seçenek seçimi':type==='file'?'Dosya seçimi':'Bilgi girişi',select:'Seçim alanı',textarea:'Açıklama alanı',summary:'Ayrıntıları aç / kapat'}[tag]||'Kayıt işlemi';
  const label=attr(n,'data-help-label')||labelText||attr(n,'aria-label')||attr(n,'title')||(tag==='select'?'':children.map(text).filter(Boolean).join(' ').replace(/\s+/g,' ').slice(0,180))||attr(n,'placeholder')||fallback;
  const options=[];if(parent&&tag==='select'){function option(o){if(ts.isJsxElement(o)&&o.openingElement.tagName.getText(tree)==='option')options.push(o.children.map(text).join(' '));else ts.forEachChild(o,option);}option(parent);}
  const name=label;
  records[id]={id,file:'apps/web/app/'+relative,tag,type,label:name,options:options.filter(Boolean),accept:attr(n,'accept'),required:n.attributes.properties.some(a=>a.name?.getText(tree)==='required'),min:attr(n,'min'),max:attr(n,'max'),review:!name||/^(button|ActionButton)$/.test(tag)&&name.length<3};
 }}ts.forEachChild(n,visit);}
 visit(tree);let updated=source;for(const change of inserts.sort((a,b)=>b.at-a.at))updated=updated.slice(0,change.at)+change.text+updated.slice(change.end??change.at);if(updated!==source)fs.writeFileSync(file,updated);
 summary.push({file:relative,controls:count});
}
fs.writeFileSync(path.join(app,'panel/help-controls.json'),JSON.stringify(records,null,2)+'\n');fs.writeFileSync(path.join(root,'docs/v139-help-inventory.json'),JSON.stringify({files:summary,total:Object.keys(records).length,needsLabelReview:Object.values(records).filter(r=>r.review).map(r=>r.id)},null,2)+'\n');
console.log('Stable help controls:',Object.keys(records).length,'label review:',Object.values(records).filter(r=>r.review).length);
