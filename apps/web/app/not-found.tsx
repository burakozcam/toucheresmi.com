import Link from "next/link";
import SiteFooter from "./site-footer";
import BreakGame from "./panel/break-game";
export default function NotFound(){return <main className="not-found-page" data-page-not-found="true"><section className="not-found-card"><Link href="/" className="not-found-brand" aria-label="Kurumsal Sınav ana sayfa"><span className="brand-mark not-found-logo">K</span><span>KURUMSAL SINAV</span></Link><p className="not-found-code" aria-hidden="true">404</p><h1>404 — Sayfa Bulunamadı</h1><p>Aradığın sayfayı bulamadık. İstersen biraz oyun oynayabilirsin.</p><Link className="button button-navy" href="/">Ana Sayfaya Dön →</Link><div className="not-found-game"><BreakGame initialMode="bird" restartLabel="Tekrar Oyna"/></div></section><SiteFooter/></main>;}
