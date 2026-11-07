import { ImageResponse } from "next/og";
export const alt = "Kurumsal Sınav · Cevap anahtarları ve Excel ile sınav değerlendirme";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "70px", color: "white", background: "linear-gradient(125deg, #11223f, #233f68)", fontFamily: "sans-serif" }}><div style={{ display: "flex", gap: 18, alignItems: "center", fontSize: 28 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "18px 18px 18px 4px", background: "#4169a9", fontWeight: 800, fontSize: 40 }}>K</div>kurumsalsinav.com</div><div style={{ display: "flex", flexDirection: "column", gap: 20 }}><div style={{ display: "flex", fontSize: 68, fontWeight: 800, letterSpacing: -2 }}>Öğrenmeyi görünür kıl.</div><div style={{ display: "flex", fontSize: 28, color: "#b8cff0" }}>Cevap anahtarları · Sınav değerlendirme · Öğrenci karneleri</div></div><div style={{ display: "flex", fontSize: 19, color: "#8bb2ff" }}>KURUMSAL SINAV · v1.0.3</div></div>, size);
}
