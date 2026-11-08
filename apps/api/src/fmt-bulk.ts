import { verificationSchema } from "./fmt-verification";
import { z } from "zod";
import { decodeOptical,opticalLayoutSchema } from "./optical-core";
export const templateInput=z.object({verification:verificationSchema.optional(),name:z.string().trim().min(2).max(140),originalFmt:z.string().min(1).max(64000),originalBase64:z.string().max(90000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/).optional(),layout:opticalLayoutSchema}).superRefine((t,ctx)=>{
  if(t.originalBase64){const bytes=Buffer.from(t.originalBase64,"base64");if(bytes.length>64000||decodeOptical(bytes)!==t.originalFmt)ctx.addIssue({code:"custom",message:`${t.name}: özgün FMT dosyası metinle eşleşmiyor.`});}
});
export const bulkTemplatesInput=z.object({templates:z.array(templateInput).min(1).max(30)}).superRefine((v,ctx)=>{const seen=new Set<string>();for(const t of v.templates){const name=t.name.toLocaleLowerCase("tr-TR");if(seen.has(name))ctx.addIssue({code:"custom",message:`Şablon adı tekrar ediyor: ${t.name}`});seen.add(name);}});
