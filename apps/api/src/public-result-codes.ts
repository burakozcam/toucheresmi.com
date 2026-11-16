import crypto from "node:crypto";
import {studentReportAccessCode} from "./result-identity";
export const publicCodeHash=(code:string)=>crypto.createHash("sha256").update(code).digest("hex");
export async function indexResultCodes(db:any,schoolId:string,keyId:string,students:any[]){
 if(!students.length)return;
 await db.publicResultCode.createMany({data:students.map(student=>({codeHash:publicCodeHash(studentReportAccessCode(schoolId,keyId,student)),schoolId,keyId})),skipDuplicates:true});
}
