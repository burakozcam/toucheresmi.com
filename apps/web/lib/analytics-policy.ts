/** Exact public paths only. No dynamic IDs, private tokens, query strings or fragments. */
export const analyticsPages=new Set(["/","/cevap-anahtarlari","/sinav-degerlendir","/sinav-takvimi","/pdf-duzenleyici","/verilerinizin-guvenligi","/blog","/contact"]);
export function analyticsPage(path:string,search="",hash=""){return analyticsPages.has(path)&&!search&&!hash?path:null;}
export const CONSENT_KEY="ks-analytics-consent";
