import { API_URL } from "./api";
export async function readerRequest(token:string,path:string,init:RequestInit={}) {
  const r=await fetch(`${API_URL}/api${path}`,{...init,cache:"no-store",headers:{Authorization:`Bearer ${token}`,...init.headers}});
  if(r.status===204)return null;
  const data=await r.json();if(!r.ok)throw new Error(data.error??"İşlem tamamlanamadı.");return data;
}
export const readerJson=(data:unknown):RequestInit=>({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
