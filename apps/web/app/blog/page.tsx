import Link from "next/link";
import type { Metadata } from "next";
import { API_URL } from "../../lib/api";
import SiteFooter from "../site-footer";
export const dynamic="force-dynamic";
export async function generateMetadata({searchParams}:{searchParams:Promise<{page?:string}>}):Promise<Metadata>{const query=await searchParams,page=Math.max(1,Math.min(10000,Number(query.page)||1));return{title:page>1?`Blog · Sayfa ${page}`:"Blog",description:"Sınav, eğitim ve değerlendirme üzerine Kurumsal Sınav yazıları.",alternates:{canonical:page>1?`/blog?page=${page}`:"/blog"}};}
export default async function Blog({searchParams}:{searchParams:Promise<{page?:string}>}){
 const {page:query}=await searchParams,page=Math.max(1,Math.min(10000,Number(query)||1));let data:any,error="";
 try{const r=await fetch(`${API_URL}/api/blog?page=${page}`,{next:{revalidate:60},signal:AbortSignal.timeout(4000)});if(!r.ok)throw new Error();data=await r.json();}catch{error="Yazılara şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.";}
 return <main className="landing"><header className="landing-header"><Link className="brand" href="/">Kurumsal Sınav</Link><Link className="button button-quiet" href="/">Ana sayfa</Link></header><section className="blog-section"><p className="hero-tag">KURUMSAL SINAV</p><h1>Blog</h1><p>Eğitim ve sınav süreçlerine dair yazılar.</p>{error&&<p role="alert">{error}</p>}<div className="blog-grid">{data?.items.map((post:any)=><article className="blog-card" key={post.id}><Link href={`/blog/${post.id}`}>{post.image&&<img src={post.image} className="blog-cover" alt={post.title} loading="lazy"/>}<h2>{post.title}</h2><p>{post.summary}</p><small>{new Date(post.createdAt).toLocaleDateString("tr-TR",{timeZone:"Europe/Istanbul"})} · Yazıyı oku →</small></Link></article>)}</div>{data&&!data.total&&<p>Henüz yayımlanmış yazı yok.</p>}<nav className="studio-actions" aria-label="Blog sayfaları">{page>1&&<Link className="button button-quiet" href={`/blog?page=${page-1}`}>Önceki</Link>}{page<data?.pages&&<Link className="button button-quiet" href={`/blog?page=${page+1}`}>Sonraki</Link>}</nav></section><SiteFooter/></main>;
}
