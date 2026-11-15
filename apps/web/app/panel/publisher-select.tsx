"use client";
import SearchableSelect from "./searchable-select";
export type PublisherOption={id:string;name:string};
export default function PublisherSelect({publishers,value,onChange,label="Yayınevi seçin"}:{publishers:PublisherOption[];value:string;onChange:(id:string)=>void;label?:string}){
 return <SearchableSelect options={publishers.map(p=>({id:p.id,label:p.name}))} value={value} onChange={onChange} label={label} placeholder="Yayınevi ara…"/>;
}
