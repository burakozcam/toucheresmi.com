require('./v146-env.cjs');
const {app}=require('../../apps/api/src/server.ts');
app.listen(4046,'127.0.0.1',()=>console.log('v146 synthetic localhost API ready: 4046'));
