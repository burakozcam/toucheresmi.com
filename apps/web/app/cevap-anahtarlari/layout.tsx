import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deneme Sınavı Cevap Anahtarları",
  description: "1–12. sınıf deneme sınavı cevap anahtarları ve kazanım dosyaları. Yayınevi, sınıf ve sınav adına göre bulun, üyelik gerektirmeden indirin.",
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
