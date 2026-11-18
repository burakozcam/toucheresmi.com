import UiIcon from "../../ui-icon";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { API_URL } from "../../../lib/api";
export const alt = "Kurumsal Sınav cevap anahtarı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = slug.slice(slug.lastIndexOf("-") + 1);
  let exam: { examName: string; grade: number; publisher: { name: string } } | null = null;
  try {
    const response = await fetch(`${API_URL}/api/answer-keys/${encodeURIComponent(id)}`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (response.ok) exam = await response.json();
  } catch { /* Generic branded image when the public API is unavailable. */ }
  const fonts = await Promise.all(["LiberationSans-Regular.ttf", "LiberationSans-Bold.ttf"].map(name => readFile(join(process.cwd(), "public/fonts", name))));
  return new ImageResponse(<div style={{ width: "100%", height: "100%", background: "#172b4d", color: "white", padding: 70, display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: "Liberation Sans" }}><div style={{ display: "flex", fontSize: 25, color: "#b3c9eb" }}>K / KURUMSAL SINAV</div><div style={{ display: "flex", flexDirection: "column", gap: 20 }}><div style={{ display: "flex", color: "#a6c5f5", fontSize: 25 }}>{exam ? `${exam.publisher.name} · ${exam.grade}. Sınıf` : "Dijital Sınav Kütüphanesi"}</div><div style={{ display: "flex", fontSize: 58, fontWeight: 700, lineHeight: 1.15 }}>{exam ? exam.examName.slice(0, 110) : "Cevaplarını keşfet."}</div></div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 24 }}><span>Cevap Anahtarı</span><span>kurumsalsinav.com <UiIcon name="arrow"/></span></div></div>, { ...size, fonts: [{ name: "Liberation Sans", data: fonts[0], weight: 400 }, { name: "Liberation Sans", data: fonts[1], weight: 700 }] });
}
