import {SecurityError} from './security-errors';
const maxBytes=2*1024*1024;
export async function normalizeExamReportLogo(image:string){
 const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
 if(!match)throw new SecurityError(400,'PNG, JPEG veya WebP logo görseli seçin.','INVALID_REPORT_LOGO');
 if(Buffer.byteLength(match[2],'base64')>maxBytes)throw new SecurityError(413,'Logo görseli en fazla 2 MB olabilir.','REPORT_LOGO_TOO_LARGE');
 let sharp:typeof import('sharp').default;
 try{sharp=(await import('sharp')).default;}catch{throw new SecurityError(503,'Logo işleme aracı şu anda kullanılamıyor. Daha sonra yeniden deneyin.','REPORT_LOGO_UNAVAILABLE');}
 try{
  const input=Buffer.from(match[2],'base64'),engine=sharp(input,{limitInputPixels:4_000_000,failOn:'error'}),meta=await engine.metadata();
  if(meta.format!==match[1]||(meta.pages??1)>1||!meta.width||!meta.height)throw Error('Invalid raster');
  let bytes=await engine.rotate().resize({width:1200,height:240,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer();
  if(bytes.length>512*1024)bytes=await sharp(bytes).resize({width:640,height:128,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer();
  if(bytes.length>512*1024)throw Error('Output too large');
  return 'data:image/png;base64,'+bytes.toString('base64');
 }catch{throw new SecurityError(400,'Logo görseli okunamadı. En fazla 4 milyon piksel içeren, hareketsiz PNG, JPEG veya WebP kullanın.','INVALID_REPORT_LOGO');}
}
export function reportLogoBuffer(image?:string|null):Buffer|undefined{
 if(!image||image.length>720000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(image))return undefined;
 return Buffer.from(image.slice(image.indexOf(',')+1),'base64');
}
