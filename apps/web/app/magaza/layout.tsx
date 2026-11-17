import Link from "next/link";
import type {Metadata} from "next";
import ThemeToggle from "../theme-toggle";
import SiteFooter from "../site-footer";
import {storeData} from "./catalog";
import {notFound} from "next/navigation";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Mağaza"};
export default async function StoreLayout({children}:{children:React.ReactNode}){const status=await storeData("/status");if(!status.open)notFound();return <main className="landing"><header className="landing-header"><Link className="brand" href="/">KurumsalSınav</Link><nav className="header-actions"><Link href="/magaza">Mağaza</Link><ThemeToggle/></nav></header><div className="store-content">{children}<p>Ürün kataloğu · Çevrimiçi ödeme ve sipariş henüz sunulmamaktadır.</p></div><SiteFooter/></main>;}
