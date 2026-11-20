"use client";
import {useState} from 'react';
import dynamic from 'next/dynamic';
import FmtSharing from './fmt-sharing';
import {opticalRequest} from '../../lib/optical-api';
import type {TemplateRecord} from '../../lib/optical';
const FmtBulkUpload=dynamic(()=>import('./fmt-bulk-upload'));
/** Management and dealer downloads reuse the same compact library; write privileges stay server-side. */
export default function FmtManager({token}:{token:string}){
 const [items,setItems]=useState<TemplateRecord[]>([]),[open,setOpen]=useState(false),[revision,setRevision]=useState(0),[error,setError]=useState('');
 async function load(){try{setItems(await opticalRequest(token,'/templates'));setRevision(v=>v+1);}catch(e){setError((e as Error).message);}}
 return <section><FmtSharing key={revision} token={token} manage/>{error&&<p role="alert">{error}</p>}<details className="fmt-upload-details" onToggle={e=>{const visible=e.currentTarget.open;setOpen(visible);if(visible)void load();}}><summary data-help-id="panel-fmt-manager-1">FMT yükle veya toplu ekle</summary>{open&&<FmtBulkUpload token={token} templates={items} onSaved={load}/>}</details></section>;
}
