import type { Metadata } from "next";
import Download from "./download";
export const metadata:Metadata={title:"Özel dosya paylaşımı",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function Page({params}:{params:Promise<{id:string}>}){return <Download id={(await params).id}/>;}
