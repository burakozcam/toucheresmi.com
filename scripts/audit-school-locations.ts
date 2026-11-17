import {PrismaClient} from "@prisma/client";
import {resolveLocation,schoolLocationIdentity} from "../apps/api/lib/turkey-locations";
async function main(){const db=new PrismaClient();
try{const rows=await db.school.findMany({select:{id:true,name:true,city:true,district:true}});const groups=new Map<string,string[]>();const issues=[];for(const row of rows){const geo=resolveLocation(row.city,row.district);if(!geo){issues.push({id:row.id,issue:"unresolved",city:row.city,district:row.district});continue;}const key=schoolLocationIdentity(row.name,geo.city,geo.district);groups.set(key,[...(groups.get(key)??[]),row.id]);if(row.city!==geo.city||row.district!==geo.district)issues.push({id:row.id,issue:"normalization_proposed",...geo});}console.log(JSON.stringify({readOnly:true,issues,collisions:[...groups].filter(([,ids])=>ids.length>1).map(([,ids])=>({ids}))},null,2));}finally{await db.$disconnect();}

}
void main();
