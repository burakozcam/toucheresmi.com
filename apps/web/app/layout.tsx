import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";

export const metadata: Metadata = {
  title: "kurumsalsinav.com | Optik Okuma ve Sınav Yönetimi",
  description: "Optik okuma, sınav değerlendirme ve raporlama platformu.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
