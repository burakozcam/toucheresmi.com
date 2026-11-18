import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {env} from './config';
import {SecurityError} from './security-errors';
const MiB=1048576;
/** Account limits, not os.totalmem()/CPU count. No timing penalty or durable queue. */
export const resourcePolicy={accountRam:4096*MiB,reserveRam:768*MiB,workerReserve:320*MiB,maxWorkers:2,processCeiling:1024*MiB};
export function admissionAllowed(processRss:number,accountRss:number|null){return processRss<resourcePolicy.processCeiling&&(accountRss===null||accountRss+resourcePolicy.workerReserve<resourcePolicy.accountRam-resourcePolicy.reserveRam);}
function startToken(pid:number){try{return fs.readFileSync(`/proc/${pid}/stat`,'utf8').split(') ')[1].split(' ')[19];}catch{return null;}}
// Enable only after validating that /proc UID visibility represents this CloudLinux account.
export function accountResidentMemory():number|null{
 if(process.platform!=='linux'||!process.getuid)return null;
 try{let total=0,found=false;const uid=process.getuid();for(const entry of fs.readdirSync('/proc')){if(!/^\d+$/.test(entry))continue;try{if(fs.statSync(`/proc/${entry}`).uid!==uid)continue;const status=fs.readFileSync(`/proc/${entry}/status`,'utf8'),rss=/^VmRSS:\s+(\d+)/m.exec(status);if(rss){total+=Number(rss[1])*1024;found=true;}}catch{/* A process may exit during inspection. */}}return found?total:null;}catch{return null;}
}
/** Atomic account-wide slots on a shared local STORAGE_DIR. Dead PIDs can be reclaimed.
 * PID reuse is detected with Linux start time. Active leases are never expired by age.
 * No claim of cross-host coordination or persistence across Passenger termination.
 */
export function acquireCpuLease(){
 if(!admissionAllowed(process.memoryUsage().rss,(process.env.CPU_ACCOUNT_PROC_MEMORY==='true'?accountResidentMemory():null)))throw new SecurityError(503,'Bellek kullanımı şu anda yüksek. Devam eden işlemler tamamlandıktan sonra yeniden deneyin.','CPU_MEMORY_PRESSURE');
 const dir=path.join(env.STORAGE_DIR,'.cpu-admission');fs.mkdirSync(dir,{recursive:true,mode:0o700});
 for(let i=0;i<resourcePolicy.maxWorkers;i++){
  const file=path.join(dir,`slot-${i}.json`),nonce=crypto.randomBytes(16).toString('hex');
  try{const temporary=path.join(dir,`owner-${process.pid}-${nonce}.json`);try{fs.writeFileSync(temporary,JSON.stringify({pid:process.pid,start:startToken(process.pid),nonce}),{flag:'wx',mode:0o600});fs.linkSync(temporary,file);}finally{try{fs.unlinkSync(temporary);}catch{}}return()=>{try{const current=JSON.parse(fs.readFileSync(file,'utf8'));if(current.nonce===nonce)fs.unlinkSync(file);}catch{}};
  }catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw new SecurityError(503,'Ortak işlem kapasitesi denetlenemedi. Özel depo izinlerini kontrol edin.','CPU_LEASE_UNAVAILABLE');}
  // Serialize stale-owner recovery. Re-read under this lock so two contenders
  // cannot unlink a new lease created after the first one reclaimed a dead PID.
  const reap=file+'.reap';let reaping=false;
  try{fs.mkdirSync(reap,{mode:0o700});reaping=true;const owner=JSON.parse(fs.readFileSync(file,'utf8'));if(!Number.isInteger(owner.pid)||owner.pid<1)continue;let dead=false;try{process.kill(owner.pid,0);}catch(error){dead=(error as NodeJS.ErrnoException).code==='ESRCH';}const current=startToken(owner.pid);if(dead||owner.start&&current&&owner.start!==current){fs.unlinkSync(file);i--;}}catch{/* Incomplete leases fail closed; never steal a live slot. */}finally{if(reaping)fs.rmdirSync(reap);}

 }
 throw new SecurityError(429,'Ağır işlem kapasitesi şu anda kullanımda. Kısa süre sonra yeniden deneyin.','CPU_CAPACITY');
}
