// Environment validation only. Values, secrets and database URLs are never printed.
function validateEnvironment(environment,nodeMajor){
const errors=[];const need=name=>{if(!environment[name]?.trim())errors.push(`${name} eksik`);};
function https(name){need(name);try{const u=new URL(environment[name]);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error();}catch{errors.push(`${name} geçerli, kimlik bilgisi içermeyen HTTPS URL olmalı`);}}
if(nodeMajor!==22)errors.push('Üretim ön kontrolü Node.js 22 gerektirir');
https('NEXT_PUBLIC_API_URL');https('WEB_ORIGIN');
for(const name of ['DATABASE_URL','JWT_SECRET','TXT_STORAGE_KEY','MFA_ENCRYPTION_KEY','STORAGE_DIR'])need(name);
if(environment.RATE_LIMIT_STORE!=='database')errors.push('RATE_LIMIT_STORE database olmalı');
if(environment.RECAPTCHA_ENABLED!=='true')errors.push('Üretim reCAPTCHA etkin olmalı');
const v2=environment.RECAPTCHA_VERSION==='v2';
for(const name of v2?['RECAPTCHA_V2_SITE_KEY','RECAPTCHA_V2_SECRET_KEY']:['RECAPTCHA_SITE_KEY','RECAPTCHA_SECRET_KEY'])need(name);
const publicName=v2?'NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY':'NEXT_PUBLIC_RECAPTCHA_SITE_KEY';
if(environment[publicName]&&environment[publicName]!==environment[v2?'RECAPTCHA_V2_SITE_KEY':'RECAPTCHA_SITE_KEY'])errors.push(`${publicName} API site anahtarıyla uyuşmuyor`);
for(const name of Object.keys(environment).filter(n=>n.startsWith('NEXT_PUBLIC_')))if(/SECRET|PASSWORD|TOKEN|PRIVATE|DATABASE|ENCRYPTION|STORAGE_KEY/.test(name))errors.push(`${name} frontend için uygun değil`);
return [...new Set(errors)];
}
module.exports={validateEnvironment};
if(require.main===module){const errors=validateEnvironment(process.env,Number(process.versions.node.split('.')[0]));if(errors.length){for(const error of errors)console.error(error);process.exitCode=1;}else console.log('Ön kontrol başarılı. Değerler yazdırılmadı. Yedek ve staging kabulü ayrıca gerekir.');}
