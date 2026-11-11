export type HumanConfig={enabled:boolean;secret:string;siteKey:string;hostname:string};
export async function verifyHuman(token:unknown,action:string,config:HumanConfig,request:typeof fetch=fetch){
 if(!config.enabled)return true;
 if(typeof token!=="string"||!token.length||token.length>2048)return false;
 try{const response=await request("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:config.secret,response:token}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)return false;const result=await response.json() as {success?:boolean;hostname?:string;action?:string};
 return result.success===true&&result.hostname===config.hostname&&result.action===action;
 }catch{return false;}
}
