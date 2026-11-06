import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yayımlanmış Cevap Anahtarları",
  description: "Yayınevi ve sınıf filtreleriyle yayımlanmış cevap anahtarlarını ve kazanım dosyalarını bulun.",
  alternates: { canonical: "/cevap-anahtarlari" },
  openGraph: {
    title: "Yayımlanmış Cevap Anahtarları",
    description: "Yayınevi ve sınıf filtreleriyle yayımlanmış cevap anahtarlarını ve kazanım dosyalarını bulun.",
    url: "/cevap-anahtarlari",
  },
};

export default function AnswerKeysLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
