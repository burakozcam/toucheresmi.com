"use client";
import {reportTemplates} from "../../api/lib/report-templates";
export default function ReportTypeButtons({value,onChange}:{value:string;onChange:(value:string)=>void}){return <label className="report-type-choice">Karne tasarımı<select value={value} onChange={e=>onChange(e.target.value)}>{reportTemplates.filter(t=>t.family==="cards").map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><small>Uzun kazanım içerikleri bilgi kaybı olmadan devam sayfalarına aktarılır.</small></label>;}
