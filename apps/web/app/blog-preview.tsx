"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { API_URL } from "../lib/api";
export default function BlogPreview(){const [items,setItems]=useState<Array<{id:string;title:string;summary:string;image?:string}>>([]);
 useEffect(()=>{const controller=new AbortController();void fetch(`${API_URL}/api/blog`,{signal:controller.signal}).then(r=>r.ok?r.json():null).then(d=>{if(Array.isArray(d?.items))setItems(d.items.slice(0,3));}).catch(()=>{});return()=>controller.abort();},[]);
 return <section className="blog-section home-blog" aria-labelledby="home-blog-title"><div className="list-header-row"><div><p className="hero-tag">KURUMSAL SINAV’DAN</p><h2 id="home-blog-title">Blogdan son yazılar</h2></div><Link className="button button-quiet" href="/blog">Tüm yazılar →</Link></div>{items.length?<div className="blog-grid">{items.map(p=><article className="blog-card" key={p.id}><Link href={`/blog/${p.id}`}>{p.image&&<img src={p.image} className="blog-cover" alt={p.title} loading="lazy"/>}<h3>{p.title}</h3><p>{p.summary}</p><small>Yazıyı oku →</small></Link></article>)}</div>:<p>Yeni yazılarımızı blog sayfasından takip edebilirsiniz.</p>}</section>;
}
