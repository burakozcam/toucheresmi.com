"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyRecord } from "../../lib/optical";

export default function ExamPicker({exams,value,onChange,disabled=false}:{exams:KeyRecord[];value:string;onChange:(id:string)=>void;disabled?:boolean}){
  const [open,setOpen]=useState(false),[query,setQuery]=useState(""),[expanded,setExpanded]=useState<string[]>([]);
  const root=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const selected=exams.find(exam=>exam.id===value);
  const groups=useMemo(()=>{
    const text=query.trim().toLocaleLowerCase("tr-TR"),byPublisher=new Map<string,{id:string;name:string;exams:KeyRecord[]}>();
    for(const exam of exams){const publisher=exam.publisher??{id:"other",name:"Diğer sınavlar"};
      if(text&&!`${publisher.name} ${exam.name} ${exam.grade??""}`.toLocaleLowerCase("tr-TR").includes(text))continue;
      if(!byPublisher.has(publisher.id))byPublisher.set(publisher.id,{...publisher,exams:[]});byPublisher.get(publisher.id)!.exams.push(exam);
    }
    return [...byPublisher.values()].sort((a,b)=>a.name.localeCompare(b.name,"tr")).map(group=>({...group,exams:group.exams.sort((a,b)=>a.name.localeCompare(b.name,"tr",{numeric:true}))}));
  },[exams,query]);
  useEffect(()=>{const close=(event:MouseEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);};document.addEventListener("click",close);return()=>document.removeEventListener("click",close);},[]);
  useEffect(()=>{if(open)search.current?.focus();},[open]);
  return <div className="exam-picker" ref={root} onKeyDown={event=>{if(event.key==="Escape"){setOpen(false);trigger.current?.focus();}}}>
    <button ref={trigger} type="button" className="exam-picker-trigger" aria-label="Değerlendirilecek sınav" aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={()=>{setOpen(v=>!v);setQuery("");setExpanded(selected?[selected.publisher?.id??"other"]:[]);}}>
      <span>{selected?<><small>{selected.publisher?.name??"Diğer sınavlar"}</small><strong>{selected.name}</strong></>:<><small>Yayınevi → sınav</small><strong>Sınav seçin</strong></>}</span><span className="exam-picker-select">Seç <span aria-hidden="true">⌄</span></span>
    </button>
    {open&&<div className="exam-picker-popover" role="dialog" aria-label="Sınav seçimi">
      <input ref={search} type="search" aria-label="Yayınevi veya sınav ara" placeholder="Yayınevi, sınav adı veya sınıf ara…" value={query} onChange={e=>setQuery(e.target.value)}/>
      <div className="exam-picker-groups">{groups.map(group=>{const isOpen=!!query.trim()||expanded.includes(group.id);return <div className="exam-picker-group" key={group.id}>
        <button type="button" className="exam-picker-publisher" aria-expanded={isOpen} onClick={()=>setExpanded(current=>current.includes(group.id)?current.filter(id=>id!==group.id):[...current,group.id])}><span aria-hidden="true">{isOpen?"⌄":"›"}</span><strong>{group.name}</strong><small>{group.exams.length} sınav</small></button>
        {isOpen&&<div className="exam-picker-exams">{group.exams.map(exam=><button type="button" key={exam.id} className={exam.id===value?"selected":""} aria-label={`${group.name} > ${exam.name}`} aria-pressed={exam.id===value} onClick={()=>{onChange(exam.id);setOpen(false);trigger.current?.focus();}}><span><strong>{exam.name}</strong><small>{exam.grade?`${exam.grade}. sınıf · `:""}{exam.questionCount?`${exam.questionCount} soru · ${exam.booklets.join("/")} kitapçık`:"Cevap eşleştirmesi tamamlanmalı"}</small></span><span aria-hidden="true">{exam.id===value?"✓":"→"}</span></button>)}</div>}
      </div>;})}{!groups.length&&<p className="exam-picker-empty">{exams.length?"Aramanızla eşleşen sınav bulunamadı.":"Henüz cevap anahtarı yüklenmiş sınav bulunamadı."}</p>}</div>
      <footer>Cevap anahtarı bulunan sınavlar yayınevlerine göre listelenir.</footer>
    </div>}
  </div>;
}
