import fs from "node:fs/promises";
import path from "node:path";
import {prisma} from "./db";
import {env} from "./config";
export async function enrichReportView(view:any){
 const [school,key]=await Promise.all([
  prisma.school.findFirst({where:{id:view.schoolId},select:{city:true,district:true}}),
  prisma.opticalKey.findFirst({
   where:{id:view.keyId},
   select:{publication:{select:{
    publisherId:true,publisher:{select:{name:true}},
    scheduleEntries:{where:{published:true},select:{examDate:true}},
   }}},
  }),
 ]);
 const publication=key?.publication,dates=[...new Set((publication?.scheduleEntries??[]).map(row=>row.examDate.toISOString().slice(0,10)))];
 let publisherLogo:Buffer|undefined;
 if(publication?.publisherId){try{const logo=await prisma.publisherLogo.findUnique({where:{publisherId:publication.publisherId}});if(logo&&path.basename(logo.storedName)===logo.storedName){const file=path.join(env.STORAGE_DIR,"publisher-logos",logo.storedName);const stat=await fs.stat(file);if(stat.size<=512*1024)publisherLogo=await fs.readFile(file);}}catch{/* A missing optional logo must not prevent a result document. */}}
 return {...view,reportMetadata:{city:school?.city,district:school?.district,publisherName:publication?.publisher?.name,examDate:dates.length===1?dates[0]:undefined},publisherLogo};
}
