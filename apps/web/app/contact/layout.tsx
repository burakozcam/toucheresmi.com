import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Kurumsal Sınav destek ekibiyle iletişime geçin.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Kurumsal Sınav ile İletişim",
    description: "Kurumsal Sınav destek ekibiyle iletişime geçin.",
    url: "/contact",
  },
};

export default function ContactLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
