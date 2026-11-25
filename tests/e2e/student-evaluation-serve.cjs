require('./student-evaluation-env.cjs');
const {app}=require('../../apps/api/src/server.ts');
app.listen(4076,'127.0.0.1',()=>console.log('Synthetic localhost API 4076'));
