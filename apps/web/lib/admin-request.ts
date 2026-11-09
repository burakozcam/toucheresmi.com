import { API_URL } from "./api";
export async function adminRequest<T=any>(token:string,path:string,method="GET",body?:unknown):Promise<T>{
 const response=await fetch(`${API_URL}/api/admin${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(response.status===204)return undefined as T;
 const result=await response.json();if(!response.ok)throw new Error(result.error??"İşlem tamamlanamadı.");return result;
}
export async function readProfileImage(file:File):Promise<string>{
 if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>10*1024*1024)throw new Error("En fazla 10 MB PNG, JPEG veya WebP seçin.");
 const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement("canvas"),scale=Math.min(1,900/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext("2d")!.drawImage(image,0,0,canvas.width,canvas.height);const data=canvas.toDataURL("image/webp",.8);if(data.length>350000)throw new Error("Görsel çok ayrıntılı; daha küçük bir resim seçin.");return data;}finally{URL.revokeObjectURL(url);}
}
