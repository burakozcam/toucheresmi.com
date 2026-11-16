import type {RequestHandler} from "express";
import type {AuthenticatedRequest} from "./auth";
/** Bound resident parsing/report jobs per Passenger worker; not a commercial student quota. */
export function heavyWorkGuard(maxTotal=4,maxPerUser=2):RequestHandler{
 let total=0;const users=new Map<string,number>();
 return(q:AuthenticatedRequest,r,n)=>{
  if(!(["/preview","/evaluate"].includes(q.path)||/\/export$/.test(q.path)||q.path.includes("/re-evaluate"))){n();return;}
  const id=q.user?.id;if(!id){r.status(401).json({error:"Oturum açmanız gerekiyor."});return;}
  const used=users.get(id)??0;if(total>=maxTotal||used>=maxPerUser){r.setHeader("Retry-After","2");r.status(429).json({error:"Devam eden işleminizin tamamlanmasını bekleyip yeniden deneyin."});return;}
  total++;users.set(id,used+1);let released=false;const release=()=>{if(released)return;released=true;total--;const count=(users.get(id)??1)-1;if(count)users.set(id,count);else users.delete(id);};r.once("finish",release);r.once("close",release);n();
 };
}
