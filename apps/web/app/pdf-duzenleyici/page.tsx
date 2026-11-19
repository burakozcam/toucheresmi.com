import Link from "next/link";
import type { Metadata } from "next";
import PdfEditor from "./editor";
import ThemeToggle from "../theme-toggle";
import SiteFooter from "../site-footer";
export const metadata: Metadata = { title: "PDF ve Belge Araçları", description: "PDF birleştir, böl, görsele dönüştür. Kamera veya yüklenen evraktan taranmış PDF, PNG, JPEG ve WebP üret. Dosyalar cihazınızda işlenir.", alternates: { canonical: "/pdf-duzenleyici" } };
export default function PdfEditorPage() { return <main className="public-answer-page"><header className="landing-header"><Link className="brand" href="/"><span className="brand-mark">K</span><span>kurumsalsinav.com</span></Link><nav className="header-actions"><ThemeToggle/><Link className="header-link" href="/">Ana Sayfa</Link></nav></header><section className="answer-page-hero"><p className="hero-tag">DOSYALARIN CİHAZINDA KALIR</p><h1>PDF ve Belge Araçları.</h1><p>Dönüştür, birleştir, böl veya kameranla bir belge tara.</p></section><PdfEditor /><SiteFooter /></main>; }
