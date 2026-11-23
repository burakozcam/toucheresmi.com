"use client";
import {useState} from 'react';
import dynamic from 'next/dynamic';
import FmtManager from './fmt-manager';
import FmtSharing from './fmt-sharing';
const TxtConverter=dynamic(()=>import('./txt-converter'),{loading:()=> <p role="status">Dönüştürücü yükleniyor…</p>});
export default function FmtWorkspace({token,manage}:{token:string;manage:boolean}){
 const [tab,setTab]=useState('library');
 return <section className="fmt-workspace"><div className="workspace-choices" role="group" aria-label="FMT çalışma alanı"><button data-help-id="panel-fmt-workspace-1" className="workspace-choice" aria-pressed={tab==='library'} onClick={()=>setTab('library')}><strong>FMT yönetimi ve paylaşım</strong><small>Şablonlar, indirmeler ve paylaşım bağlantıları</small></button><button data-help-id="panel-fmt-workspace-2" className="workspace-choice" aria-pressed={tab==='convert'} onClick={()=>setTab('convert')}><strong>FMT Dönüştürücü</strong><small>Kaynak ve hedef yerleşimleri seçin</small></button></div><div hidden={tab!=='library'}>{manage?<FmtManager token={token}/>:<FmtSharing token={token}/>}</div>{tab==='convert'&&<TxtConverter token={token}/>}</section>;
}
