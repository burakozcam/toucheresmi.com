import crypto from "node:crypto";
export type HumanConfig={enabled:boolean;secret:string;siteKey:string;hostname:string;minScore?:number;provider?:"turnstile"|"recaptcha-v2"|"recaptcha-v3"};
// Providers enforce one-use globally. This also rejects simultaneous/replayed requests
// in this process without storing raw tokens. Expired entries are bounded and removed.
const caches=new WeakMap<typeof fetch,Map<string,number>>();
export async function verifyHuman(token:unknown,action:string,config:HumanConfig,request:typeof fetch=fetch){
 if(!config.enabled)return true;
 if(!config.secret||!config.hostname)return false;
 if(typeof token!=="string"||!token.length||token.length>16384)return false;
 let attempts=caches.get(request);if(!attempts){attempts=new Map();caches.set(request,attempts);}
 const now=Date.now(),provider=config.provider??"turnstile";
 for(const [key,expires] of attempts)if(expires<=now)attempts.delete(key);
 const digest=crypto.createHash("sha256").update(`${provider}:${config.siteKey}:${token}`).digest("hex");
 if(attempts.has(digest)||attempts.size>=10000)return false;attempts.set(digest,now+300000);
 try{const url=provider.startsWith("recaptcha-")?"https://www.google.com/recaptcha/api/siteverify":"https://challenges.cloudflare.com/turnstile/v0/siteverify";
 const response=await request(url,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:config.secret,response:token}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)return false;
 const result=await response.json() as {success?:boolean;hostname?:string;action?:string;score?:number;challenge_ts?:string;"error-codes"?:string[]};
 if(result.success!==true||result.hostname!==config.hostname||result["error-codes"]?.length)return false;
 if(provider==="recaptcha-v2"||provider==="recaptcha-v3"){
  const issued=Date.parse(result.challenge_ts??"");
  const fresh=Number.isFinite(issued)&&issued<=now+30000&&now-issued<=120000;
  if(provider==="recaptcha-v3")return fresh&&result.action===action&&typeof result.score==="number"&&Number.isFinite(result.score)&&result.score>=(config.minScore??0.5)&&result.score<=1;
  return fresh;
 }
 return result.action===action;
 }catch{return false;}
}
