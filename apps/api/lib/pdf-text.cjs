// Native dynamic import stays intact when TypeScript's CommonJS output is built.
let modulePromise;
exports.readPdfText=async function(bytes){
 const pdfjs=await(modulePromise??=import('pdfjs-dist/legacy/build/pdf.mjs'));
 const task=pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,disableFontFace:true});
 const doc=await task.promise;
 try{if(doc.numPages>100)throw new Error('PDF en fazla 100 sayfa olabilir.');const pages=[];
 for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),content=await page.getTextContent();pages.push(content.items.filter(t=>typeof t.str==='string'&&t.str.trim()).map(t=>({text:t.str,x:t.transform[4],y:t.transform[5],width:t.width})));}return pages;
 }finally{await doc.destroy();}
};
