"use client";
import { useEffect,useState } from "react";
import type { OpticalQuestion } from "../../lib/optical";
import { opticalRequest,jsonBody } from "../../lib/optical-api";
import { questionProblems } from "../../lib/optical-admin-validation";
import OpticalKeyEditor from "./optical-key-editor";
export default function StoredKeyEditor({token,keyId,onSaved,onClose}:{token:string;keyId:string;onSaved:()=>void;onClose:()=>void}){
 const [questions,setQuestions]=useState<OpticalQuestion[]>([]),[penalty,setPenalty]=useState(3),[fingerprint,setFingerprint]=useState(""),[error,setError]=useState(""),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{void opticalRequest(token,`/keys/${keyId}`).then(k=>{setQuestions(k.questions);setPenalty(k.penalty);setFingerprint(k.fingerprint);}).catch(e=>setError(e.message));},[token,keyId]);
 async function save(){setBusy(true);setError("");try{await opticalRequest(token,`/keys/${keyId}`,{...jsonBody({questions,penalty,confirmImport:true,expectedFingerprint:fingerprint}),method:"PATCH"});onSaved();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="stored-key-editor"><h3>Sorular ve kazanımlar</h3><p>Önceki öğrenci sonuçları korunur. Bu sınavın güncel cevap PDF’si onaylanan tablodan yenilenir.</p>{error&&<p className="notice error" role="alert">{error}</p>}<label>Değerlendirme kuralı<select aria-label="Kayıtlı anahtar yanlış götürme" value={penalty} onChange={e=>{setPenalty(Number(e.target.value));setConfirmed(false);}}><option value={0}>Yanlış doğruyu götürmez</option><option value={3}>3 yanlış 1 doğru</option><option value={4}>4 yanlış 1 doğru</option></select></label><OpticalKeyEditor questions={questions} onChange={q=>{setQuestions(q);setConfirmed(false);}} busy={busy} editableIdentity/><label className="checkbox-row"><input type="checkbox" checked={confirmed} disabled={busy||!!questionProblems(questions).length} onChange={e=>setConfirmed(e.target.checked)}/>Tüm soruları ve kazanımları inceledim; değişiklikleri onaylıyorum.</label><div className="studio-actions"><button className="button button-navy" disabled={busy||!confirmed} onClick={()=>void save()}>Anahtarı ve PDF’yi güncelle</button><button className="button button-quiet" disabled={busy} onClick={onClose}>Vazgeç</button></div></section>;
}
