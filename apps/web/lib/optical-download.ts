import {API_URL} from './api';
/** Shared authenticated download for the library and existing management actions. */
export async function downloadOpticalFile(token:string,path:string,filename:string){
 const response=await fetch(`${API_URL}/api/optical${path}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
 if(!response.ok){const data=await response.json();throw new Error(data.error??'Dosya indirilemedi.');}
 const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');
 link.href=url;link.download=filename.replace(/[\\/:*?"<>|\x00-\x1f]/g,'-');document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
