import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME, SITE_URL } from "../config/site";
import "./styles.css";
import VisitorTracker from "./visitor-tracker";
import SplashScreen from "./splash-screen";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kurumsal Sınav | Optik Okuma ve Sınav Yönetimi",
    template: "%s | Kurumsal Sınav",
  },
  description: "Optik okuma, sınav değerlendirme ve raporlama süreçleri için kurumsal platform.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
    title: "Kurumsal Sınav | Optik Okuma ve Sınav Yönetimi",
    description: "Optik okuma, sınav değerlendirme ve raporlama süreçleri için kurumsal platform.",
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, type: "image/png", alt: "Kurumsal Sınav" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kurumsal Sınav | Optik Okuma ve Sınav Yönetimi",
    description: "Optik okuma, sınav değerlendirme ve raporlama süreçleri için kurumsal platform.",
  },
  icons: { icon: [{ url: "/favicon.svg?v=1.1.3", type: "image/svg+xml" }] },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" data-theme="dark">
      <body><VisitorTracker/><SplashScreen />{children}</body>
    </html>
  );
}
