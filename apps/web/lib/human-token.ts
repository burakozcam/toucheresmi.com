import {API_URL} from "./api";
type Config={enabled:boolean;provider?:string;siteKey?:string};
let configuration:Promise<Config>|undefined;
export function humanConfig():Promise<Config>{
 return configuration??=(fetch(`${API_URL}/api/auth/human-verification`,{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Güvenlik ayarları yüklenemedi. Lütfen yeniden deneyin.");return r.json();}).catch(e=>{configuration=undefined;throw e;}));
}
let loading:Promise<void>|undefined;
/** Execute only on submit. No form values, identities or result data are sent to Google. */
export async function getHumanToken(action:string,fallback=""):Promise<string>{
 const config=await humanConfig();if(!config.enabled)return "";
 if(config.provider!=="recaptcha-v3"){if(!fallback)throw Error("Lütfen formdaki güvenlik doğrulamasını tamamlayın.");return fallback;}
 const key=process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim()||config.siteKey;
 if(!key)throw Error("Güvenlik doğrulaması yapılandırılmamış. Lütfen kurum yöneticisine bildirin.");
 const google=()=> (window as any).grecaptcha;
 if(!google()?.execute){
  loading??=new Promise<void>((resolve,reject)=>{
   const script=document.createElement("script");script.src=`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;script.async=true;
   const timeout=window.setTimeout(()=>{script.remove();reject(Error("Google güvenlik hizmetine erişilemedi. Lütfen yeniden deneyin."));},10000);
   script.onload=()=>{clearTimeout(timeout);resolve();};script.onerror=()=>{clearTimeout(timeout);script.remove();reject(Error("Google güvenlik hizmetine erişilemedi. Lütfen yeniden deneyin."));};document.head.appendChild(script);
  }).catch(e=>{loading=undefined;throw e;});await loading;
 }
 return new Promise<string>((resolve,reject)=>{
  const timeout=window.setTimeout(()=>reject(Error("Güvenlik doğrulaması zaman aşımına uğradı. Lütfen yeniden deneyin.")),10000);
  try{google().ready(()=>{Promise.resolve(google().execute(key,{action})).then(t=>{clearTimeout(timeout);if(typeof t!=="string"||!t)reject(Error("Güvenlik doğrulaması tamamlanamadı."));else resolve(t);},()=>{clearTimeout(timeout);reject(Error("Güvenlik doğrulaması tamamlanamadı. Lütfen yeniden deneyin."));});});}catch{clearTimeout(timeout);reject(Error("Google güvenlik hizmeti yüklenemedi. Lütfen yeniden deneyin."));}
 });
}
