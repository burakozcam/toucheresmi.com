import { compatibleStudent } from "./result-data";
import { SecurityError } from "./security-errors";
/** Transfer by verified identity, never by an id whose meaning may change after merging. */
export async function carryReaderGrants(db:any, previous:any, resultId:string, data:any){
 const grants=await db.studentResultAccess.findMany({where:{resultId:previous.id}});
 const mapped=grants.map((grant:any)=>{
  const old=previous.snapshot.data.students.find((s:any)=>s.id===grant.studentNo);
  if(!old)throw new SecurityError(409,"Öğrenci hesap bağlantısı kaynak kayıtla eşleşmiyor. Yönetici kontrolü gerekir.");
  const matches=data.students.filter((s:any)=>compatibleStudent(old,s));
  if(matches.length!==1)throw new SecurityError(409,"Öğrenci hesap bağlantısı belirsiz. Sonuç kaydedilmedi.");
  return{userId:grant.userId,resultId,studentNo:matches[0].id,studentName:matches[0].name};
 });
 if(mapped.length)await db.studentResultAccess.createMany({data:mapped,skipDuplicates:true});
}
