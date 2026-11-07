export const SCHEDULE_LEVELS = [...Array.from({ length: 12 }, (_, i) => String(i + 1)), "TYT", "AYT"];
export type ScheduleEntry = { id: string; publisherId: string; level: string; sequence: number; examDate: string; scope: string; published: boolean; answerKeyId: string | null; publisher: { id: string; name: string }; answerKey?: { id: string; examName: string; grade: number; publisher: { name: string } } | null };
export type ScheduleInput = { publisherId: string; level: string; sequence: number; examDate: string; scope: string; answerKeyId: string | null; published: boolean };
export const scheduleTitle = (item: Pick<ScheduleEntry, "publisher" | "level" | "sequence">) => `${item.publisher.name} ${/^\d+$/.test(item.level) ? `${item.level}. Sınıf` : item.level} ${item.sequence}. Deneme`;
export const scheduleHeaders = ["Yayınevi", "Sınıf", "Deneme No", "Uygulama Tarihi", "Kapsam", "Cevap Anahtarı ID"];
const normalize = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
export function parseScheduleRows(rows: unknown[][], publishers: { id: string; name: string }[]): ScheduleInput[] {
  if (!rows.length || scheduleHeaders.some((h, i) => String(rows[0][i] ?? "").trim() !== h)) throw new Error("Takvim sayfasının sütun başlıklarını değiştirmeyin.");
  const identities = new Set<string>();
  const items = rows.slice(1).filter((row) => row.some((v) => String(v ?? "").trim())).map((row, index) => {
    const [name, level, number, date, scope, answerId] = row.map((v) => String(v ?? "").trim());
    const publisher = publishers.find((p) => normalize(p.name) === normalize(name));
    if (!publisher) throw new Error(`Satır ${index + 2}: ${name || "boş"} yayınevi sistemde bulunamadı. Önce yayınevini ekleyin.`);
    if (!SCHEDULE_LEVELS.includes(level) || !Number.isInteger(Number(number)) || Number(number) < 1 || Number(number) > 999) throw new Error(`Satır ${index + 2}: sınıf ve deneme numarası geçersiz.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error(`Satır ${index + 2}: tarihi YYYY-AA-GG biçiminde yazın (örn. 2027-03-15).`);
    if (!scope || scope.length > 6000) throw new Error(`Satır ${index + 2}: kapsam 1–6000 karakter olmalıdır.`);
    const identity = JSON.stringify([publisher.id, level, Number(number), date]);
    if (identities.has(identity)) throw new Error(`Satır ${index + 2}: aynı sınav dosyada yineleniyor.`);
    identities.add(identity);
    return { publisherId: publisher.id, level, sequence: Number(number), examDate: date, scope, answerKeyId: answerId || null, published: true };
  });
  if (!items.length || items.length > 500) throw new Error("Bir Excel dosyası 1–500 sınav içermelidir.");
  return items;
}
