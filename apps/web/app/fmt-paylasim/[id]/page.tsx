import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { API_URL } from "../../../lib/api";
import SharedFmt from "./client";
export const dynamic="force-dynamic";
async function info(id:string){try{const r=await fetch(`${process.env.API_INTERNAL_URL??API_URL}/api/public/fmt-shares/${encodeURIComponent(id)}/info`,{cache:"no-store"});if(!r.ok)return null;return await r.json() as {expiresAt:string};}catch{return null;}}
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params,data=await info(id);return {title:"Süreli FMT paylaşımı",description:data?`Paylaşımın son geçerlilik zamanı: ${new Date(data.expiresAt).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})}. Süre dolunca indirme kapanır.`:"Bu paylaşım sona ermiş veya iptal edilmiş olabilir.",robots:{index:false,follow:false},referrer:"no-referrer",openGraph:{title:"Süreli FMT paylaşımı",description:data?`Son geçerlilik: ${new Date(data.expiresAt).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})}`:"Paylaşım kullanılamıyor",images:[]}};}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params,data=await info(id);if(!data)notFound();return <SharedFmt id={id} expiresAt={data.expiresAt}/>;}
