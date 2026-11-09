"use client";
import { useEffect,useState } from "react";
import { opticalRequest,jsonBody } from "../../lib/optical-api";
import StoredKeyEditor from "./stored-key-editor";
type Publication={id:string;examName:string;grade:number;opticalKey?:{id:string}|null;publisher:{name:string}};
export default function LegacyKeyLink({token,publications,onSaved}:{token:string;publications:Publication[];onSaved:()=>void}){
 const [keys,setKeys]=useState<Array<{id:string;name:string;publicationId?:string|null}>>([]),[error,setError]=useState(""),[editing,setEditing]=useState("");
 async function load(){setKeys((await opticalRequest(token,"/keys")).filter((k:{publicationId?:string|null})=>!k.publicationId));}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[token,publications]);
 if(!keys.length&&!error)return null;
 return <details><summary>Önceki sürümden sınava bağlanmamış anahtarlar ({keys.length})</summary><p>Mevcut anahtarı düzenleyebilir veya kütüphanedeki sınavına bağlayabilirsiniz. Yeni bir sınav kopyası oluşturulmaz.</p>{error&&<p role="alert">{error}</p>}{keys.map(k=><div key={k.id} className="optical-record"><strong>{k.name}</strong><button className="button button-quiet" onClick={()=>setEditing(k.id)}>Soruları düzenle</button><label>Sınava bağla<select aria-label={`${k.name} sınav eşleştirmesi`} value="" onChange={async e=>{if(!e.target.value)return;try{await opticalRequest(token,`/keys/${k.id}`,{...jsonBody({publicationId:e.target.value}),method:"PATCH"});await load();onSaved();}catch(e){setError((e as Error).message);}}}><option value="">Sınav seçin</option>{publications.filter(p=>!p.opticalKey).map(p=><option key={p.id} value={p.id}>{p.publisher.name} · {p.grade}. Sınıf · {p.examName}</option>)}</select></label></div>)}{editing&&<StoredKeyEditor token={token} keyId={editing} onClose={()=>setEditing("")} onSaved={()=>{setEditing("");void load();}}/>}</details>;
}
