import { API_URL } from "./api";
export async function opticalRequest(token:string,path:string,init:RequestInit={}) {
  const response=await fetch(`${API_URL}/api/optical${path}`,{...init,headers:{Authorization:`Bearer ${token}`,...init.headers}});
  const data=await response.json();if(!response.ok)throw new Error(data.error??"İşlem tamamlanamadı.");return data;
}
export const jsonBody=(data:unknown):RequestInit=>({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
