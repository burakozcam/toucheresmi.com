/** New infrastructure dependencies for legacy handler-level tests. No security assertion relies on these permissive doubles.
 * v132-security.cjs exercises real auth, policy, transactions, quota and two dealers against disposable PostgreSQL.
 */
import {beforeEach,afterEach} from "node:test";
let undo:Array<()=>void>=[];
beforeEach(async()=>{
 const {prisma}=await import("../apps/api/src/db");let dealerId="dealer-1";
 function stub(object:any,key:string,fn:any){const original=object[key];object[key]=fn;undo.push(()=>object[key]=original);}
 stub(prisma.dealer,"findUnique",async({where}:any)=>{dealerId=where.id;return{id:where.id,active:true,restrictedRegions:false,regions:[],dailyStudentLimit:null,canCreateSchool:true,canEditSchool:true,canEvaluate:true,canDeleteResult:true,canEditResult:true,canReevaluate:true,canExport:true};});
 stub(prisma.user,"findUnique",async()=>({id:"unit-user",active:true,role:"DEALER",dealerId,passwordHash:"unit-hash"}));
 stub(prisma.user,"update",async({where,data}:any)=>({id:where.id,...data}));
 stub(prisma.authSession,"create",async({data}:any)=>({id:"unit-session",...data}));
 stub(prisma.authSession,"findUnique",async()=>null);
 stub(prisma.authSession,"updateMany",async()=>({count:0}));
 stub(prisma.trustedDevice,"updateMany",async()=>({count:0}));
 stub(prisma.dealerDailyUsage,"upsert",async()=>({id:"unit-usage",students:0,evaluations:0}));
 stub(prisma.dealerDailyUsage,"update",async()=>({}));
 stub(prisma.dealerQuotaStudent,"findMany",async()=>[]);
 stub(prisma.dealerQuotaStudent,"createMany",async({data}:any)=>({count:data.length}));
 stub(prisma.dealerActivity,"create",async({data}:any)=>({id:"unit-activity",...data}));
 stub(prisma.publicResultCode,"createMany",async({data}:any)=>({count:data.length}));
 stub(prisma.school,"findMany",async()=>[]);
 stub(prisma.school,"findUnique",async()=>({city:null,district:null}));
 stub(prisma.examReportLogo,"findUnique",async()=>null);
 stub(prisma.opticalKey,"findUnique",async()=>({publication:null}));
 stub(prisma.opticalResult,"findMany",async()=>[]);
 stub(prisma,"$queryRaw",async()=>[]);
});
afterEach(()=>{for(const restore of undo.reverse())restore();undo=[];});
