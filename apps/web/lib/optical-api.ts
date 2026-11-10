import { API_URL } from "./api";
export class OpticalRequestError extends Error {
  constructor(message:string,public readonly status:number){super(message);this.name="OpticalRequestError";}
}
export async function opticalRequest(token:string,path:string,init:RequestInit={}) {
  const response=await fetch(`${API_URL}/api/optical${path}`,{...init,headers:{Authorization:`Bearer ${token}`,...init.headers}});
  if(response.status===204)return null;
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new OpticalRequestError(data?.error??`İstek tamamlanamadı (HTTP ${response.status}).`,response.status);
  return data;
}
export const jsonBody=(data:unknown):RequestInit=>({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
