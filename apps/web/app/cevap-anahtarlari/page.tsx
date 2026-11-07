import PublicAnswerKeysPage from "./library";
import type { AnswerKeyRecord, Publisher } from "./library";
import { API_URL } from "../../lib/api";
import { SITE_URL } from "../../config/site";
import { answerKeyPath } from "../../lib/answer-key";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
type Params = Promise<Record<string, string | string[] | undefined>>;
export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const filtered = Boolean(params.search || params.grade || params.publisherId);
  return { title: `${page > 1 ? `Sayfa ${page} · ` : ""}Deneme Sınavı Cevap Anahtarları`, alternates: { canonical: page > 1 && !filtered ? `/cevap-anahtarlari?page=${page}` : "/cevap-anahtarlari" }, ...(filtered ? { robots: { index: false, follow: true } } : {}) };
}
export default async function AnswerKeys({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const requestedPage = Number(value("page") || 1);
  const filters = { page: Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage < 100000 ? requestedPage : 1, publisherId: value("publisherId"), grade: value("grade"), search: value("search").slice(0, 200) };
  const query = new URLSearchParams({ page: String(filters.page), limit: "30", ...(filters.publisherId ? { publisherId: filters.publisherId } : {}), ...(filters.grade ? { grade: filters.grade } : {}), ...(filters.search ? { search: filters.search } : {}) });
  const [keys, publishers] = await Promise.allSettled([
    fetch(`${API_URL}/api/answer-keys?${query}`, { cache: "no-store", signal: AbortSignal.timeout(8000) }).then(async (r) => { if (!r.ok) throw new Error("Cevap anahtarları şu anda yüklenemiyor. Lütfen tekrar deneyin."); return r.json() as Promise<{ items: AnswerKeyRecord[]; totalPages: number }>; }),
    fetch(`${API_URL}/api/publishers`, { cache: "no-store", signal: AbortSignal.timeout(8000) }).then(async (r) => r.ok ? r.json() as Promise<Publisher[]> : []),
  ]);
  const items = keys.status === "fulfilled" && Array.isArray(keys.value.items) ? keys.value.items : [];
  const list = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Deneme Sınavı Cevap Anahtarları", url: `${SITE_URL}/cevap-anahtarlari`, mainEntity: { "@type": "ItemList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: (filters.page - 1) * 30 + index + 1, name: `${item.publisher.name} ${item.grade}. Sınıf ${item.examName} Cevap Anahtarı`, url: `${SITE_URL}${answerKeyPath(item)}` })) } };
  return <><PublicAnswerKeysPage key={JSON.stringify(filters)} initialItems={items} initialPublishers={publishers.status === "fulfilled" && Array.isArray(publishers.value) ? publishers.value : []} initialPages={keys.status === "fulfilled" ? keys.value.totalPages : 1} initialError={keys.status === "rejected" ? "Cevap anahtarları şu anda yüklenemiyor. Lütfen tekrar deneyin." : ""} filters={filters} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(list).replace(/</g, "\\u003c") }} /></>;
}
