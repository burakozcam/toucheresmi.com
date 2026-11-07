import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const alt = "Kurumsal Sınav · Cevap anahtarları ve Excel ile sınav değerlendirme";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const [regular, bold] = await Promise.all(["LiberationSans-Regular.ttf", "LiberationSans-Bold.ttf"].map((name) => readFile(join(process.cwd(), "public/fonts", name))));
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "70px", color: "white", background: "linear-gradient(125deg, #11223f, #233f68)", fontFamily: "Liberation Sans" }}><div style={{ display: "flex", gap: 18, alignItems: "center", fontSize: 28 }}><svg width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#172b4d"/><path d="M17 13h9v17l16-17h12L35 31l19 20H42L29 37l-3 3v11h-9z" fill="#fff"/></svg>kurumsalsinav.com</div><div style={{ display: "flex", flexDirection: "column", gap: 20 }}><div style={{ display: "flex", fontSize: 68, fontWeight: 700, letterSpacing: -2 }}>Öğrenmeyi görünür kıl.</div><div style={{ display: "flex", fontSize: 28, color: "#b8cff0" }}>Cevap anahtarları · Sınav değerlendirme · Öğrenci karneleri</div></div><div style={{ display: "flex", fontSize: 19, color: "#8bb2ff" }}>KURUMSAL SINAV · v1.0.5</div></div>, { ...size, fonts: [{ name: "Liberation Sans", data: regular, weight: 400, style: "normal" }, { name: "Liberation Sans", data: bold, weight: 700, style: "normal" }] });
}
