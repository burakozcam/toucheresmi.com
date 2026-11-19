/** Decode bounded binary frames. No completed ZIP is returned without the terminal count. */
export async function downloadReportFrames(response:Response,onProgress:(message:string)=>void){
 const reader=response.body?.getReader();if(!reader)throw Error('Tarayıcı indirme akışını okuyamıyor.');
 let pending=new Uint8Array(0),done=false,totalBytes=0;const zip:BlobPart[]=[];
 try{while(true){const next=await reader.read();if(next.done)break;const combined=new Uint8Array(pending.length+next.value.length);combined.set(pending);combined.set(next.value,pending.length);pending=combined;
  while(pending.length>=5){const tag=String.fromCharCode(pending[0]),length=new DataView(pending.buffer,pending.byteOffset+1,4).getUint32(0);if(length>1024*1024)throw Error('Rapor yanıtı geçersiz.');if(pending.length<5+length)break;const payload=pending.slice(5,5+length);pending=pending.slice(5+length);if(done)throw Error('Rapor yanıtı geçersiz.');
   if(tag==='Z'){zip.push(payload);totalBytes+=payload.length;}
   else {const value=JSON.parse(new TextDecoder().decode(payload));if(tag==='E')throw Error(value.error??'Karne hazırlanamadı.');if(tag==='P'){onProgress(value.stage==='pdf'?`${value.done} / ${value.total} öğrenci karnesi hazır.`:value.stage==='zip'?'ZIP dosyası aktarılıyor.':'Karne verileri hazırlanıyor.');}else if(tag==='D'){if(value.size!==totalBytes)throw Error('ZIP indirmesi tamamlanamadı.');done=true;}else throw Error('Rapor yanıtı geçersiz.');}
  }
 }if(!done||pending.length)throw Error('ZIP indirmesi yarıda kesildi. Yeniden denemeden önce bağlantınızı kontrol edin.');onProgress('İndirme hazır.');return new Blob(zip,{type:'application/zip'});
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
