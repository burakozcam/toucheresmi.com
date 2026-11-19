import {prepareReportResources} from './report-resources';
import fs from 'node:fs/promises';
import path from 'node:path';
import {setImmediate as yieldTurn} from 'node:timers/promises';
import {reportPdf,selectedStudents,type ReportOptions} from './result-pdf';
import {acquireCpuLease} from './resource-admission';
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes:Buffer){let crc=0xffffffff;for(const b of bytes)crc=table[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
/** ZIP STORE: PDFs already use compressed streams. One PDF buffer, small central directory. */
export class StoredZip {
 private offset=0;private central:Buffer[]=[];
 constructor(private file:fs.FileHandle){}
 private async write(b:Buffer){let done=0;while(done<b.length){const {bytesWritten}=await this.file.write(b,done,b.length-done);if(!bytesWritten)throw Error('ZIP yazılamadı.');done+=bytesWritten;}this.offset+=b.length;}
 async add(name:string,bytes:Buffer){const filename=Buffer.from(name,'utf8'),crc=crc32(bytes),header=Buffer.alloc(30),central=Buffer.alloc(46);if(this.offset+bytes.length>0xffffffff||this.central.length>=65535)throw Error('ZIP boyut sınırı aşıldı.');
 header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(bytes.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(filename.length,26);
 central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(bytes.length,20);central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(filename.length,28);central.writeUInt32LE(this.offset,42);
 this.central.push(Buffer.concat([central,filename]));await this.write(header);await this.write(filename);await this.write(bytes);
 }
 async finish(){const start=this.offset;for(const b of this.central)await this.write(b);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(this.central.length,8);end.writeUInt16LE(this.central.length,10);end.writeUInt32LE(this.offset-start,12);end.writeUInt32LE(start,16);await this.write(end);return this.offset;}
}
export async function studentZip(view:any,options:ReportOptions,root:string,signal?:AbortSignal,onProgress?:(done:number,total:number)=>void|Promise<void>){
 const release=acquireCpuLease();
 const start=performance.now(),cpu=process.cpuUsage();let directory:string|undefined;
 try{view=prepareReportResources(view);await fs.mkdir(root,{recursive:true,mode:0o700});directory=await fs.mkdtemp(path.join(root,'report-'));await fs.chmod(directory,0o700);const file=path.join(directory,'reports.zip'),handle=await fs.open(file,'wx',0o600),zip=new StoredZip(handle),students=selectedStudents(view,options),pdfMs:number[]=[];let zipMs=0,peakRss=process.memoryUsage().rss,firstPdfMs=0;
 try{for(const [i,student]of students.entries()){signal?.throwIfAborted();await yieldTurn();const at=performance.now(),bytes=await reportPdf(view,{...options,studentId:student.id});pdfMs.push(performance.now()-at);if(i===0)firstPdfMs=performance.now()-start;signal?.throwIfAborted();const z=performance.now();const filename=`${i+1}-${student.studentNo??student.id}-${student.name}`.replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,'-').replace(/\.{2,}/g,'-').slice(0,160)+'.pdf';await zip.add(filename,bytes);zipMs+=performance.now()-z;peakRss=Math.max(peakRss,process.memoryUsage().rss);await onProgress?.(i+1,students.length);}const z=performance.now(),size=await zip.finish();zipMs+=performance.now()-z;const usage=process.cpuUsage(cpu);return {file,directory,metrics:{count:students.length,size,firstPdfMs,pdfMs,zipMs,totalMs:performance.now()-start,peakRss,cpuMs:(usage.user+usage.system)/1000}};}finally{await handle.close();}
 }catch(e){if(directory)await fs.rm(directory,{recursive:true,force:true});throw e;}finally{release();}
}
