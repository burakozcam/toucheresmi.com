"use client";
import {useEffect,useRef,useState} from 'react';
import {opticalRequest} from '../../lib/optical-api';
import ActionButton from './action-button';
type Logo={image:string|null;enabled:boolean;canEdit:boolean};
export default function ExamReportLogo({token,schoolId,keyId,disabled=false,onLogoChange}:{token:string;schoolId:string;keyId:string;disabled?:boolean;onLogoChange:(image:string|null)=>void}){
 const [image,setImage]=useState<string|null>(null),[enabled,setEnabled]=useState(false),[saved,setSaved]=useState<Logo|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{let active=true;const controller=new AbortController();onLogoChange(null);setLoading(true);setError('');
 void opticalRequest(token,`/result-exams/${encodeURIComponent(keyId)}/report-logo?schoolId=${encodeURIComponent(schoolId)}`,{signal:controller.signal}).then((data:Logo)=>{if(active){setSaved(data);setImage(data.image);setEnabled(data.enabled);onLogoChange(data.enabled?data.image:null);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;controller.abort();};},[token,schoolId,keyId,onLogoChange]);
 async function pick(file?:File){
  if(!file)return;setError('');setMessage('');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){setError('En fazla 2 MB PNG, JPEG veya WebP seçin.');return;}
  try{const result=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Görsel dosyası okunamadı.'));reader.readAsDataURL(file);});setImage(result);}catch(e){setError((e as Error).message);}
 }
 async function save(){if(busy||disabled||!saved?.canEdit)return;setBusy(true);setError('');setMessage('');try{
  const data:Logo=await opticalRequest(token,`/result-exams/${encodeURIComponent(keyId)}/report-logo`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({schoolId,enabled,...(image&&image!==saved.image?{image}:{})})});setSaved(data);setImage(data.image);setEnabled(data.enabled);onLogoChange(data.enabled?data.image:null);setMessage(data.enabled?'Sınava özel logo kaydedildi. PDF karnelerine uygulanacak.':'Varsayılan karne logosuna dönüldü.');
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const locked=disabled||busy||loading||!saved?.canEdit,changed=!!saved&&(saved.enabled!==enabled||saved.image!==image);
 return <div className="exam-report-logo-settings"><label className="checkbox-row"><input type="checkbox" checked={enabled} disabled={locked} onChange={e=>{setEnabled(e.target.checked);setMessage('');}}/>Sınava özel logo tanımla / ekle</label>{loading&&<p className="field-help" role="status">Sınavın logo ayarı yükleniyor…</p>}{enabled&&<div className="exam-report-logo-editor">{image&&<div className="exam-report-logo-preview"><img src={image} alt="Sınava özel logo önizlemesi"/></div>}<input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Sınava özel logo görseli" disabled={locked} onChange={e=>void pick(e.target.files?.[0])}/><p className="field-help">PNG, JPEG veya WebP · en fazla 2 MB / 4 milyon piksel. Görsel, oranı korunarak sabit başlık alanına sığdırılır. Kaydedilen logo yalnız bu kurumun seçili sınavına uygulanır.</p></div>}{(enabled||changed)&&<ActionButton type="button" intent="save" className="button button-navy" loading={busy} disabled={locked||!changed||(enabled&&!image)} onClick={()=>void save()}>Logoyu kaydet</ActionButton>}{saved&&!saved.canEdit&&<p className="field-help">Logo değiştirmek için sonuç düzenleme yetkisi gereklidir.</p>}{changed&&<p className="field-help">Değişikliğin karnelere uygulanması için logoyu kaydedin.</p>}{error&&<p className="notice error" role="alert">{error}</p>}{message&&<p className="notice success" role="status">{message}</p>}</div>;
}
