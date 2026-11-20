"use client";
import ActionButton from './action-button';
import {useState} from 'react';
import dynamic from 'next/dynamic';
const AnswerKeyManagement=dynamic(()=>import('./answer-key-management'),{loading:()=> <p role="status">Anahtarlar yükleniyor…</p>});
const BulkExams=dynamic(()=>import('./bulk-exams'),{loading:()=> <p role="status">Toplu sınav alanı yükleniyor…</p>});
const ExamManagement=dynamic(()=>import('./exam-management'),{loading:()=> <p role="status">Sınavlar yükleniyor…</p>});
type Mode='keys'|'bulk'|'later';
export default function ExamWorkspace({token,initialMode='keys',initialPublicationId=''}:{token:string;initialMode?:Mode;initialPublicationId?:string}){
 const [mode,setMode]=useState<Mode>(initialMode),[target,setTarget]=useState(initialPublicationId),[opened,setOpened]=useState<Mode[]>([initialMode]);
 const select=(next:Mode)=>{setMode(next);setOpened(previous=>previous.includes(next)?previous:[...previous,next]);};
 return <section className="exam-workspace"><p>Excel, PDF veya manuel cevap anahtarıyla sınavınızı tek akışta oluşturun. Kazanım bilgisi isteğe bağlıdır. PDF arşivi yayımlamak için optik değerlendirmeyi açmanız gerekmez.</p><div className="report-type-buttons" role="group" aria-label="Sınav yönetimi yöntemi">{([{id:'keys',label:'Tekli / toplu dosya ve mevcut anahtarlar'},{id:'bulk',label:'Toplu sınav hazırlama'},{id:'later',label:'Anahtarı daha sonra ekle'}] as const).map(item=><ActionButton data-help-id="panel-exam-workspace-1" data-help-variant={item.id} data-help-label={item.label} intent="manage" type="button" key={item.id} className={`button ${mode===item.id?'button-navy':'button-quiet'}`} aria-pressed={mode===item.id} onClick={()=>select(item.id)}>{item.label}</ActionButton>)}</div>{opened.includes('keys')&&<div hidden={mode!=='keys'}><AnswerKeyManagement token={token} initialPublicationId={target}/></div>}{opened.includes('bulk')&&<div hidden={mode!=='bulk'}><BulkExams token={token}/></div>}{opened.includes('later')&&<div hidden={mode!=='later'}><ExamManagement token={token} onOpenAnswerKeys={id=>{setTarget(id);select('keys');}}/></div>}</section>;
}
