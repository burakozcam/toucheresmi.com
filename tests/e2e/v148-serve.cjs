require('./v148-env.cjs');
const {app}=require('../../apps/api/src/server.ts');
app.listen(4078,'127.0.0.1',()=>console.log('Synthetic v148 localhost API 4078'));
