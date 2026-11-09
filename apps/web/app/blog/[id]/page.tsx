import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { API_URL } from "../../../lib/api";
import { SITE_URL } from "../../../config/site";
import SiteFooter from "../../site-footer";
export const dynamic="force-dynamic";
const getPost=cache(async(id:string)=>{const r=await fetch(`${API_URL}/api/blog/${encodeURIComponent(id)}`,{next:{revalidate:60},signal:AbortSignal.timeout(4000)});if(r.status===404)notFound();if(!r.ok)throw new Error("Blog servisine ulaşılamıyor.");return r.json();});
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params;try{const p=await getPost(id);return{title:p.title,description:p.summary,alternates:{canonical:`/blog/${id}`},openGraph:{type:"article",title:p.title,description:p.summary,url:`${SITE_URL}/blog/${id}`,publishedTime:p.createdAt,modifiedTime:p.updatedAt}};}catch{return{title:"Blog",robots:{index:false}};}}
export default async function Post({params}:{params:Promise<{id:string}>}){const {id}=await params;const p=await getPost(id);return <main className="landing"><header className="landing-header"><Link className="brand" href="/">Kurumsal Sınav</Link><Link href="/blog">← Tüm yazılar</Link></header><article className="blog-article"><p className="hero-tag">BLOG · {new Date(p.createdAt).toLocaleDateString("tr-TR",{timeZone:"Europe/Istanbul"})}</p><h1>{p.title}</h1><p className="blog-summary">{p.summary}</p>{p.image&&<img src={p.image} className="blog-cover" alt={p.title}/>}<div className="blog-content">{p.content}</div></article><SiteFooter/></main>;}
