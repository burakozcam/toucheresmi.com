import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş Yap",
  openGraph: { title: "Kurumsal Sınav · Giriş", description: "Kurumsal Sınav hesabınıza güvenle giriş yapın.", url: "https://kurumsalsinav.com/login", type: "website", images: [{ url: "https://kurumsalsinav.com/opengraph-image", width: 1200, height: 630, type: "image/png" }] },
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false, noarchive: true },
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
