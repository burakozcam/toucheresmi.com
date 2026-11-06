import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME, SITE_URL } from "../config/site";
import "./styles.css";
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
  },
  twitter: {
    card: "summary",
    title: "Kurumsal Sınav | Optik Okuma ve Sınav Yönetimi",
    description: "Optik okuma, sınav değerlendirme ve raporlama süreçleri için kurumsal platform.",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" data-theme="dark">
      <body><SplashScreen />{children}</body>
    </html>
  );
}
