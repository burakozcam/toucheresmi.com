// Local synthetic acceptance server. Never accepts a remote DB.
const db='postgresql://ks135@127.0.0.1:55445/ks_v135';if(process.env.DATABASE_URL&&process.env.DATABASE_URL!==db)throw Error('Local disposable DB only');
Object.assign(process.env,{NODE_ENV:'test',DATABASE_URL:db,JWT_SECRET:'v137-synthetic-signing-key-never-for-production',MFA_ENCRYPTION_KEY:'d4'.repeat(32),TXT_STORAGE_KEY:'v137-synthetic-txt-key-never-for-production',STORAGE_DIR:'/tmp/ks-v137-http',RECAPTCHA_ENABLED:'false',TURNSTILE_ENABLED:'false',WEB_ORIGIN:'http://localhost:3115',RATE_LIMIT_STORE:'memory'});
const {app}=require('../../apps/api/src/server.ts');app.listen(4015,'127.0.0.1',()=>console.log('v137 synthetic API on 4015'));
