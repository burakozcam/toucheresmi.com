import type { MetadataRoute } from "next";
import { API_URL } from "../lib/api";
import { answerKeyPath } from "../lib/answer-key";
import { SITE_URL } from "../config/site";

type SitemapAnswerKey = { id: string; publisher: { name: string }; examName: string; grade: number; publishedAt: string };
type SitemapResponse = { items: SitemapAnswerKey[]; totalPages: number };

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/cevap-anahtarlari`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/sinav-degerlendir`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
  ];
  try {
  const firstResponse = await fetch(`${API_URL}/api/answer-keys?limit=50&page=1`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!firstResponse.ok) throw new Error(`Cevap anahtarı site haritası yüklenemedi (${firstResponse.status}).`);
  const firstPage = await firstResponse.json() as SitemapResponse;
  const pages = [firstPage];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const response = await fetch(`${API_URL}/api/answer-keys?limit=50&page=${page}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Cevap anahtarı site haritası yüklenemedi (${response.status}, sayfa ${page}).`);
    pages.push(await response.json() as SitemapResponse);
  }
  const entries = pages.flatMap((page) => page.items).map((item) => {
    return {
      url: `${SITE_URL}${answerKeyPath(item)}`,
      lastModified: new Date(item.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    };
  });
  return [...staticPages, ...entries];
  } catch (error) {
    console.error("Dinamik site haritası alınamadı", error instanceof Error ? error.message : "Bağlantı hatası");
    return staticPages;
  }
}
