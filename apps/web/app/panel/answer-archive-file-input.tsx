"use client";
import { useRef,useState } from "react";
export default function AnswerArchiveFileInput({label,onChange,disabled=false}:{label:string;onChange:(stamp:string)=>void;disabled?:boolean}){
 const input=useRef<HTMLInputElement>(null),[selected,setSelected]=useState(false);
 return <div><label>{label}<input ref={input} type="file" name="answerKeyFile" disabled={disabled} accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp" onChange={e=>{setSelected(!!e.target.files?.length);onChange(`${e.target.files?.[0]?.name}:${Date.now()}`);}}/></label>{selected&&<button type="button" className="button button-quiet" disabled={disabled} onClick={()=>{if(input.current)input.current.value="";setSelected(false);onChange(`removed:${Date.now()}`);}}>Ayrı cevap dosyasını kaldır</button>}</div>;
}
