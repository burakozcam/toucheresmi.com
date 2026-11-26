require('./v149-env.cjs');
const {app}=require('../../apps/api/src/server.ts'),{startDigitalExamExpiryWorker}=require('../../apps/api/src/digital-exams.ts');
startDigitalExamExpiryWorker();app.listen(4079,'127.0.0.1',()=>console.log('Synthetic v149 localhost API 4079'));
