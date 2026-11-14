const fs=require('node:fs'),path=require('node:path');
const dest=path.resolve(__dirname,'../public/vendor/ocr');fs.mkdirSync(dest,{recursive:true});
for(const file of ['tesseract.min.js','worker.min.js','tesseract.min.js.LICENSE.txt','worker.min.js.LICENSE.txt'])fs.copyFileSync(path.join(path.dirname(require.resolve('tesseract.js/package.json')),'dist',file),path.join(dest,file));
const core=path.dirname(require.resolve('tesseract.js-core/package.json'));for(const file of fs.readdirSync(core).filter(f=>/\.wasm(?:\.js)?$/.test(f)||f==='LICENSE'))fs.copyFileSync(path.join(core,file),path.join(dest,file));
fs.copyFileSync(path.join(path.dirname(require.resolve('@tesseract.js-data/eng/package.json')),'4.0.0_best_int/eng.traineddata.gz'),path.join(dest,'eng.traineddata.gz'));
fs.copyFileSync(path.resolve(__dirname,'../../api/lib/pdf-text-recovery.js'),path.resolve(__dirname,'../public/araclar/pdf-text-recovery.js'));
