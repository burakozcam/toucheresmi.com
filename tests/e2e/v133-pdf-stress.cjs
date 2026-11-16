// Synthetic bulk cards; regression against retaining every student's page objects.
const fs=require('node:fs'),assert=require('node:assert/strict');
Object.assign(process.env,{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',JWT_SECRET:'v133-pdf-only-test-secret-never-for-production',STORAGE_DIR:'/tmp/ks-v133-pdf'});
const PDFDocument=require('pdfkit'),original=PDFDocument.prototype.flushPages;let peakBufferedPages=0;
PDFDocument.prototype.flushPages=function(...args){peakBufferedPages=Math.max(peakBufferedPages,this._pageBuffer.length);return original.apply(this,args);};
(async()=>{
 try{
  const view=JSON.parse(fs.readFileSync('test-results/v130-view.json','utf8')),source=view.data.students[0],summary=view.summary[0],rank=view.rankings[source.id];
  view.data.students=Array.from({length:150},(_,i)=>({...structuredClone(source),id:'bulk-'+i,studentNo:String(i+1).padStart(5,'0'),name:'ANONİM ÖĞRENCİ '+i}));
  view.summary=view.data.students.map(s=>({...structuredClone(summary),id:s.id}));view.rankings=Object.fromEntries(view.data.students.map(s=>[s.id,rank]));
  const rssBeforePdfMB=Math.round(process.memoryUsage().rss/1048576),start=performance.now(),{reportPdf}=require('../../apps/api/src/result-pdf.ts'),bytes=await reportPdf(view,{kind:'cards',order:'name',hideIdentity:true,templateId:'two-page-card'}),durationMs=Math.round(performance.now()-start),rssAfterPdfMB=Math.round(process.memoryUsage().rss/1048576);
  assert.ok(peakBufferedPages<=2,'Completed student page objects must be flushed');
  // The upload reader intentionally caps untrusted PDFs at 100 pages. This is our own generated document.
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs'),document=await pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,disableFontFace:true}).promise;
  const pageCount=document.numPages;assert.equal(pageCount,300);
  try{for(let i=1;i<=pageCount;i++){const page=await document.getPage(i),text=await page.getTextContent();assert.ok(text.items.some(t=>t.str===(i%2?'1/2':'2/2')));page.cleanup();}}finally{await document.destroy();}
  fs.mkdirSync('test-results/v133',{recursive:true});fs.writeFileSync('test-results/v133/bulk-cards.pdf',bytes);
  console.log(JSON.stringify({students:150,pages:pageCount,peakBufferedPages,bytes:bytes.length,durationMs,rssBeforePdfMB,rssAfterPdfMB,rssAfterTextInspectionMB:Math.round(process.memoryUsage().rss/1048576),scope:'Synthetic single-process bulk cards, not production capacity'},null,2));
 }finally{PDFDocument.prototype.flushPages=original;}
})().catch(e=>{console.error(e);process.exit(1)});
