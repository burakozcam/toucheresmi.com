"use client";
import {useEffect} from 'react';
/** Shared browser and panel navigation warning; the server remains the source of operation status. */
export function useOperationGuard(active:boolean){useEffect(()=>{
 if(!active)return;
 const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
 const navigate=(event:Event)=>{if(!confirm('İşlem devam ediyor. Ayrılırsanız yeniden göndermeden önce sunucudaki kayıt durumunu kontrol edin. Sayfadan ayrılsın mı?'))event.preventDefault();};
 window.addEventListener('beforeunload',unload);window.addEventListener('ks-panel-before-navigate',navigate);
 return()=>{window.removeEventListener('beforeunload',unload);window.removeEventListener('ks-panel-before-navigate',navigate);};
},[active]);}
