import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Yönetim Paneli",
  alternates: { canonical: "/panel" },
  robots: { index: false, follow: false, noarchive: true },
};

export default function PanelLayout({ children }: { children: ReactNode }) {
  return children;
}
