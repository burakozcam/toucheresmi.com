import Link from "next/link";
import {notFound} from "next/navigation";
import {API_URL} from "../../lib/api";
export async function storeData(path:string){try{const r=await fetch(`${API_URL}/api/store${path}`,{cache:"no-store",signal:AbortSignal.timeout(5000)});if(r.ok)return await r.json();}catch{}notFound();}
export function Products({items}:{items:any[]}){return <div className="store-grid">{items.map(p=><article className="store-card" key={p.id}><Link href={`/magaza/urun/${encodeURIComponent(p.id)}`}>{p.images[0]&&<img src={p.images[0]} alt={p.name} width={200} height={260} loading="lazy" referrerPolicy="no-referrer"/>}<h2>{p.name}</h2></Link><Link href={`/magaza/marka/${encodeURIComponent(p.brand.slug)}`}>{p.brand.name}</Link><p>{p.discount>0&&<del>{Number(p.price).toFixed(2)} TL </del>}<strong>{(Number(p.price)*(100-p.discount)/100).toFixed(2)} TL</strong></p><small>{p.stock>0?"Stokta":"Stokta yok"}</small></article>)}</div>;}

export function CatalogPages({page,pages,path}:{page:number;pages:number;path:string}){return <nav className="studio-actions" aria-label="Ürün sayfaları">{page>1&&<Link href={`${path}?page=${page-1}`}>← Önceki</Link>}<span>{page} / {pages}</span>{page<pages&&<Link href={`${path}?page=${page+1}`}>Sonraki →</Link>}</nav>;}
