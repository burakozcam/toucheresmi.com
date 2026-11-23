// Read-only: public tree only. Never follows links or changes private file permissions.
const fs=require('node:fs'),path=require('node:path');
function checkStaticAssets(root){
 const failures=[];let files=0,directories=0;
 function walk(file){const stat=fs.lstatSync(file),name=path.relative(root,file)||'.',mode=stat.mode&0o777;
  if(stat.isSymbolicLink()){failures.push({name,reason:'Statik ağaçta sembolik bağlantı incelenmeli'});return;}
  if(mode&0o002)failures.push({name,reason:'Herkese yazılabilir izin reddedildi'});
  if(stat.isDirectory()){directories++;if((mode&0o005)!==0o005)failures.push({name,reason:'Dizin herkese okunabilir ve geçilebilir olmalı (öneri 755)'});for(const child of fs.readdirSync(file))walk(path.join(file,child));}
  else if(stat.isFile()){files++;if(!(mode&0o004))failures.push({name,reason:'Dosya herkese okunabilir olmalı (öneri 644)'});}
  else failures.push({name,reason:'Beklenmeyen statik dosya türü'});
 }
 if(!fs.existsSync(root))failures.push({name:'.',reason:'Statik dizin bulunamadı'});else walk(root);return {files,directories,failures};
}
module.exports={checkStaticAssets};
if(require.main===module){const roots=['apps/web/public',...(process.argv.includes('--with-build')?['apps/web/.next/static']:[])],checks=roots.map(root=>({root,...checkStaticAssets(path.resolve(__dirname,'..',root))}));console.log(JSON.stringify({scope:'Yalnız public ve istenirse derlenmiş static ağacı; web sunucusu/transfer izinleri ayrıca kontrol edilmeli.',checks},null,2));if(checks.some(c=>c.failures.length))process.exitCode=1;}
