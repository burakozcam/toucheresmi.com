// Hard-coded, disposable localhost only. Refuse inherited production configuration.
const database='postgresql://ks142:synthetic-v142-local-only@127.0.0.1:55452/ks_v142_acceptance';
if(process.env.DATABASE_URL&&process.env.DATABASE_URL!==database)throw Error('Exclusive v142 localhost database required');
Object.assign(process.env,{NODE_ENV:'test',DATABASE_URL:database,JWT_SECRET:'v142-synthetic-signing-key-never-for-production',MFA_ENCRYPTION_KEY:'e8'.repeat(32),TXT_STORAGE_KEY:'v142-synthetic-txt-key-never-for-production',STORAGE_DIR:'/tmp/ks-v142-http',RECAPTCHA_ENABLED:'false',TURNSTILE_ENABLED:'false',WEB_ORIGIN:'http://localhost:3122',RATE_LIMIT_STORE:'memory',ALLOW_REMOTE_DATABASE:'false'});
