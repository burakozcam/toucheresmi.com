// Native dynamic import stays intact when TypeScript's CommonJS output is built.
const {normalize}=require("./pdf-text-recovery");
let modulePromise;
exports.readPdfText=async function(bytes,options={}){
 const pdfjs=await(modulePromise??=import('pdfjs-dist/legacy/build/pdf.mjs'));
 const task=pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,disableFontFace:true});
 const doc=await task.promise;
 try{if(options.safeUpload){if(await doc.hasJSActions())throw new Error('PDF çalıştırılabilir JavaScript eylemleri içeremez.');const attachments=await doc.getAttachments();if(attachments&&Object.values(attachments).some(a=>/\.(exe|dll|js|vbs|ps1|bat|cmd|com|scr)$/i.test(a.filename||'')))throw new Error('PDF çalıştırılabilir ek içeremez.');}if(doc.numPages>100)throw new Error('PDF en fazla 100 sayfa olabilir.');const pages=[];
 for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),content=await page.getTextContent();pages.push(content.items.filter(t=>typeof t.str==='string'&&t.str.trim()).map(t=>({text:normalize(t.str),x:t.transform[4],y:t.transform[5],width:t.width})));}return pages;
 }finally{await doc.destroy();}
};
