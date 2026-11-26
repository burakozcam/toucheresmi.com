"use client";
import dynamic from 'next/dynamic';
const AnswerKeyManagement=dynamic(()=>import('./answer-key-management'),{loading:()=> <p role="status">Anahtarlar yükleniyor…</p>});
export default function ExamWorkspace({token,initialPublicationId=''}:{token:string;initialMode?:'keys'|'bulk'|'later';initialPublicationId?:string}){
 return <section className="exam-workspace"><p>Excel, PDF veya manuel cevap anahtarıyla sınavınızı oluşturun. Kazanım bilgisi isteğe bağlıdır.</p><AnswerKeyManagement token={token} initialPublicationId={initialPublicationId}/></section>;
}
