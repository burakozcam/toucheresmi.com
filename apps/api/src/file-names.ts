import path from "node:path";
export function fileExtension(name:string){
 const compound=name.match(/\.tar\.(?:gz|bz2|xz|zst)$/i)?.[0];
 const extension=compound??path.extname(name);
 return Buffer.byteLength(extension,"utf8")<=64?extension:"";
}
const shorten=(value:string,bytes:number)=>{let result="",size=0;for(const char of value){const count=Buffer.byteLength(char,"utf8");if(size+count>bytes)break;result+=char;size+=count;}return result;};
/** Keep the original suffix even when a UTF-8 file name exceeds the download name limit. */
export function safeFilename(name:string){
 const clean=name.replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,"_")||"dosya",extension=fileExtension(clean);
 if(Buffer.byteLength(clean,"utf8")<=180)return clean;
 return shorten(extension?clean.slice(0,-extension.length):clean,180-Buffer.byteLength(extension,"utf8"))+extension;
}
/** Renaming changes the display name, never the file format. A missing suffix is restored. */
export function renamedFilename(previous:string,requested:string){
 const extension=fileExtension(previous),clean=requested.replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,"_");
 return safeFilename(extension&&!clean.toLowerCase().endsWith(extension.toLowerCase())?clean+extension:clean);
}
/** Multer passes multipart filename bytes through latin1. Decode only a strict UTF-8 round trip. */
export function uploadFilename(original:string){
 if([...original].some(char=>char.codePointAt(0)! > 255))return original;
 const bytes=Buffer.from(original,"latin1");
 try{const decoded=new TextDecoder("utf-8",{fatal:true}).decode(bytes);return Buffer.from(decoded,"utf8").equals(bytes)?decoded:original;}catch{return original;}
}
