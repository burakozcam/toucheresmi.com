import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME, SITE_URL, SITE_VERSION } from "../config/site";
import "./styles.css";
import "./interactions.css";
import "./panel-navigation.css";
import "./v146.css";
import AnalyticsConsent from "./analytics-consent";
import VisitorTracker from "./visitor-tracker";
import SplashScreen from "./splash-screen";

import './v149.css';

export const metadata: Metadata = {
  verification: {google:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION||undefined},
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KurumsalSınav | Ölçme ve Değerlendirme Sistemi",
    template: "%s | KurumsalSınav",
  },
  description: "Optik okuma, sınav değerlendirme ve raporlama süreçleri için kurumsal platform.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
    title: "KurumsalSınav | Ölçme ve Değerlendirme Sistemi",
    description: "Optik okuma, sınav değerlendirme ve raporlama süreçleri için kurumsal platform.",
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, type: "image/png", alt: "Kurumsal Sınav" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KurumsalSınav | Ölçme ve Değerlendirme Sistemi",
    description: "Optik okuma, sınav değerlendirme ve raporlama süreçleri için kurumsal platform.",
  },
  icons: { icon: [{ url: `/favicon.svg?v=${SITE_VERSION.slice(1)}`, type: "image/svg+xml" }] },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" data-theme="light" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html: "try{document.documentElement.dataset.theme=localStorage.getItem('kurumsal-theme')==='dark'?'dark':'light'}catch(e){}"}}/></head>
      <body><AnalyticsConsent/><VisitorTracker/><SplashScreen />{children}</body>
    </html>
  );
}
