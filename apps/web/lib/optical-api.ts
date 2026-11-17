import { API_URL } from "./api";
export class OpticalRequestError extends Error {
  constructor(message:string,public readonly status:number){super(message);this.name="OpticalRequestError";}
}
export async function opticalRequest(token:string,path:string,init:RequestInit={}) {
  let response:Response;
  try{response=await fetch(`${API_URL}/api/optical${path}`,{...init,headers:{Authorization:`Bearer ${token}`,...init.headers}});}
  catch(error){
    if(init.signal?.aborted){
      if(init.signal.reason?.name==="TimeoutError")throw new OpticalRequestError("İşlem zaman aşımına uğradı. Dosya listesini kontrol edip yeniden deneyin.",0);
      throw error;
    }
    if(error instanceof TypeError)throw new OpticalRequestError("Sunucuya ulaşılamadı veya bağlantı kesildi. Bağlantınızı kontrol edin. Kayıt işlemi yaptıysanız yeniden denemeden önce dosya listesini yenileyin.",0);
    throw error;
  }
  if(response.status===204)return null;
  const data=await response.json().catch(()=>null);
  if(!response.ok){
    const fallback=response.status===413?"Dosya veya istek boyutu sınırı aşıldı.":[408,504].includes(response.status)?"İşlem zaman aşımına uğradı.":response.status>=500?(path==="/evaluate"?"Değerlendirme sırasında sunucu hatası oluştu. Dosya listesini kontrol edin.":"Sunucu isteği tamamlayamadı. Lütfen yeniden deneyin."):`İstek tamamlanamadı (HTTP ${response.status}).`;
    throw new OpticalRequestError(typeof data?.error==="string"?data.error:fallback,response.status);
  }
  if(data===null)throw new OpticalRequestError("Sunucudan geçerli bir yanıt alınamadı. Dosya listesini yenileyin.",response.status);
  return data;
}
export const jsonBody=(data:unknown):RequestInit=>({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
