const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const name of ['lib','assets'])fs.cpSync(path.join(root,name),path.join(root,'dist',name),{recursive:true});
