export const SCHEDULE_LEVELS = [...Array.from({ length: 12 }, (_, i) => String(i + 1)), "TYT", "AYT"];
export type ScheduleEntry = { id: string; publisherId: string; level: string; sequence: number; examDate: string; scope: string; published: boolean; series?: string | null; sourcePublisher?: string | null; answerKeyId: string | null; publisher: { id: string; name: string }; answerKey?: { id: string; examName: string; grade: number; publisher: { name: string } } | null };
export type ScheduleInput = { publisherId: string; level: string; sequence: number; examDate: string; scope: string; answerKeyId: string | null; published: boolean; series?: string | null };
export const scheduleTitle = (item: Pick<ScheduleEntry, "publisher" | "level" | "sequence">) => `${item.publisher.name} ${/^\d+$/.test(item.level) ? `${item.level}. Sınıf` : item.level} ${item.sequence}. Deneme`;
export const scheduleHeaders = ["Yayınevi", "Sınıf", "Deneme No", "Uygulama Tarihi", "Kapsam", "Cevap Anahtarı ID"];
const normalize = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
export function parseScheduleDate(value: unknown, date1904 = false): string {
  let year: number, month: number, day: number;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 1 || (!date1904 && value >= 60 && value < 61)) throw new Error("Geçersiz Excel tarihi.");
    const serial = Math.floor(value);
    const date = new Date(Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 31) + (serial - (!date1904 && serial > 60 ? 1 : 0)) * 86400000);
    year = date.getUTCFullYear(); month = date.getUTCMonth() + 1; day = date.getUTCDate();
  } else if (value instanceof Date) {
    year = value.getUTCFullYear(); month = value.getUTCMonth() + 1; day = value.getUTCDate();
  } else {
    const text = String(value ?? "").trim();
    let match = /^(\d{4})([-/])(\d{2})\2(\d{2})$/.exec(text);
    if (match) { year = +match[1]; month = +match[3]; day = +match[4]; }
    else { match = /^(\d{2})([./-])(\d{2})\2(\d{4})$/.exec(text); if (!match) throw new Error("tarihi GG.AA.YYYY veya YYYY-AA-GG biçiminde yazın."); day = +match[1]; month = +match[3]; year = +match[4]; }
  }
  const result = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (year < 1900 || year > 9999 || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new Error("Geçersiz tarihi düzeltin.");
  return result;
}
export function parseScheduleRows(rows: unknown[][], publishers: { id: string; name: string }[]): ScheduleInput[] {
  if (!rows.length || scheduleHeaders.some((h, i) => String(rows[0][i] ?? "").trim() !== h)) throw new Error("Takvim sayfasının sütun başlıklarını değiştirmeyin.");
  const identities = new Set<string>();
  const items = rows.slice(1).filter((row) => row.some((v) => String(v ?? "").trim())).map((row, index) => {
    const [name, level, number, , scope, answerId] = row.map((v) => String(v ?? "").trim());
    const publisher = publishers.find((p) => normalize(p.name) === normalize(name));
    if (!publisher) throw new Error(`Satır ${index + 2}: ${name || "boş"} yayınevi sistemde bulunamadı.`);
    if (!SCHEDULE_LEVELS.includes(level) || !Number.isInteger(Number(number)) || Number(number) < 1 || Number(number) > 999) throw new Error(`Satır ${index + 2}: sınıf ve deneme numarası geçersiz.`);
    const date = parseScheduleDate(row[3]);
    if (!scope || scope.length > 6000) throw new Error(`Satır ${index + 2}: kapsam 1–6000 karakter olmalıdır.`);
    const identity = JSON.stringify([publisher.id, level, Number(number), date]);
    if (identities.has(identity)) throw new Error(`Satır ${index + 2}: aynı sınav dosyada yineleniyor.`);
    identities.add(identity);
    return { publisherId: publisher.id, level, sequence: Number(number), examDate: date, scope, answerKeyId: answerId || null, published: true };
  });
  if (!items.length || items.length > 2500) throw new Error("Bir Excel dosyası 1–2500 sınav içermelidir.");
  return items;
}
export const normalizePublisher = normalize;
export function publisherSuggestions(name: string, publishers: { id: string; name: string }[]) {
  const words = (s: string) => normalize(s).replace(/yayınları|yayıncılık|yayın/g, "").trim().split(/\s+/).filter(Boolean);
  const input = words(name);
  return publishers.filter((p) => words(p.name).some((w) => input.includes(w))).slice(0, 8);
}
