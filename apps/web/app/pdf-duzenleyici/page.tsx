import Link from "next/link";
import type { Metadata } from "next";
import PdfEditor from "./editor";
import SiteFooter from "../site-footer";
export const metadata: Metadata = { title: "PDF Düzenleyici ve Belge Tarama", description: "PDF birleştir, böl, görsele dönüştür. Kamera veya yüklenen evraktan taranmış PDF, PNG, JPEG ve WebP üret. Dosyalar cihazınızda işlenir.", alternates: { canonical: "/pdf-duzenleyici" } };
export default function PdfEditorPage() { return <main className="public-answer-page"><header className="landing-header"><Link className="brand" href="/"><span className="brand-mark">K</span><span>kurumsalsinav.com</span></Link><Link className="header-link" href="/">Ana Sayfa</Link></header><section className="answer-page-hero"><p className="hero-tag">DOSYALARIN CİHAZINDA KALIR</p><h1>PDF Düzenleyici.</h1><p>Dönüştür, birleştir, böl veya kameranla bir belge tara.</p></section><PdfEditor /><SiteFooter /></main>; }
