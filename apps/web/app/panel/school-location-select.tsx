"use client";
import {useEffect,useId,useMemo,useState} from "react";
export type LocationSchool={id:string;name:string;city?:string|null;district?:string|null};
const key=(value?:string|null)=>value?.trim().toLocaleLowerCase("tr-TR")||"__missing__";
export default function SchoolLocationSelect({schools,value,onChange,disabled=false,label="Kurum",loading=false}:{schools:LocationSchool[];value:string;onChange:(id:string)=>void;disabled?:boolean;label?:string;loading?:boolean}){
 const [city,setCity]=useState(""),[district,setDistrict]=useState("");const id=useId();
 useEffect(()=>{const selected=schools.find(s=>s.id===value);if(selected){setCity(key(selected.city));setDistrict(key(selected.district));}},[value,schools]);
 const cities=useMemo(()=>[...new Map(schools.map(s=>[key(s.city),{id:key(s.city),name:s.city?.trim()||"İl bilgisi girilmemiş"}])).values()].sort((a,b)=>a.name.localeCompare(b.name,"tr")),[schools]);
 const districts=useMemo(()=>[...new Map(schools.filter(s=>key(s.city)===city).map(s=>[key(s.district),{id:key(s.district),name:s.district?.trim()||"İlçe bilgisi girilmemiş"}])).values()].sort((a,b)=>a.name.localeCompare(b.name,"tr")),[schools,city]);
 const filtered=schools.filter(s=>key(s.city)===city&&key(s.district)===district);
 return <div className="school-location-fields"><label htmlFor={`${id}-city`}>İl<select id={`${id}-city`} aria-label="İl" value={city} disabled={disabled} onChange={e=>{setCity(e.target.value);setDistrict("");onChange("");}}><option value="">{loading&&!schools.length?"İller yükleniyor…":"İl seçin"}</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label htmlFor={`${id}-district`}>İlçe<select id={`${id}-district`} aria-label="İlçe" value={district} disabled={disabled||!city} onChange={e=>{setDistrict(e.target.value);onChange("");}}><option value="">İlçe seçin</option>{districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
 <label htmlFor={`${id}-school`}>{label}<select id={`${id}-school`} aria-label={label} value={value} disabled={disabled||!city||!district} onChange={e=>onChange(e.target.value)}><option value="">Kurum seçin</option>{filtered.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>;
}
