export const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const LEVELS = ['İlkokul', 'Ortaokul', 'Lise', 'Özel'] as const;
export type Level = typeof LEVELS[number];
export const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#c2410c', '#a16207', '#15803d', '#0e7490', '#475569', '#9f1239', '#4338ca'];
export const ICONS: Record<string, string> = {
  book: 'M12 5C8 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-6-1-10 1v15',
  math: 'M4 6h6M7 3v6m7-3h6M4 15l6 6m0-6-6 6m10-5h6m-6 4h6',
  science: 'M9 3h6m-5 0v7l-6 9v2h16v-2l-6-9V3M7 16h10',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18',
  language: 'M3 4h12M9 2v2m-4 3c1 5 4 7 8 9M13 4C12 11 8 15 3 17m12-5 4 9m-8 0 4-9m-2 6h5',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  coffee: 'M4 4h12v10a6 6 0 0 1-12 0V4m12 1h3a3 3 0 0 1 0 6h-3M3 22h15',
  sport: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3v18M6 5c7 4 7 10 0 14M18 5c-7 4-7 10 0 14',
  film: 'M3 3h18v18H3V3M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4',
  music: 'M9 18V5l12-3v13M9 8l12-3M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0m12-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  art: 'M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h5c5 0 3-10-6-10M7 8h.01M12 6h.01M17 8h.01M6 13h.01',
  star: 'm12 2 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-7',
  leaf: 'M20 3C7 1 1 8 5 16s16 5 15-13M3 22 17 7',
};
export const ICON_LABELS = ['Kitap', 'Matematik', 'Deney', 'Dünya', 'Dil', 'Ay', 'Güneş', 'Fincan', 'Top', 'Film', 'Müzik', 'Sanat', 'Yıldız', 'Yaprak'];
export type Activity = { id: string; name: string; color: string; icon: string };
export type PlanEvent = Activity & { day: number; start: number; duration: number };
export type StudyPlan = { schema: 1; name: string; level: Level | null; start: number; end: number; custom: Activity[]; events: PlanEvent[] };
export const STORAGE_KEY = 'kurumsal-study-plan-v1';
export function emptyPlan(): StudyPlan { return { schema: 1, name: 'Haftalık Çalışma Planım', level: null, start: 8 * 60, end: 22 * 60, custom: [], events: [] }; }
const subjects: Record<Level, string[]> = {
  İlkokul: ['Türkçe', 'Matematik', 'Hayat Bilgisi', 'Fen Bilimleri', 'Sosyal Bilgiler', 'Din Kültürü', 'İngilizce'],
  Ortaokul: ['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler', 'Din Kültürü', 'İngilizce'],
  Lise: ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya', 'Din Kültürü', 'İngilizce'],
  Özel: [],
};
export function activities(level: Level): Activity[] {
  const iconFor = (name: string) => /Matematik/.test(name) ? 'math' : /Fen|Fizik|Kimya/.test(name) ? 'science' : /Biyoloji/.test(name) ? 'leaf' : /Sosyal|Tarih|Coğrafya|Hayat/.test(name) ? 'globe' : name === 'İngilizce' ? 'language' : name === 'Din Kültürü' ? 'star' : 'book';
  return [...subjects[level].map((name, i) => ({ id: `subject-${name}`, name, icon: iconFor(name), color: COLORS[i % COLORS.length] })),
    ...['Uyku', 'Serbest Zaman', 'Mola', 'Spor', 'Film İzleme', 'Müzik Çalma', 'Hobi'].map((name, i) => ({ id: `rest-${i}`, name, icon: ['moon', 'sun', 'coffee', 'sport', 'film', 'music', 'art'][i], color: COLORS[(i + 3) % COLORS.length] }))];
}
export function timeLabel(minute: number) { return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`; }
export function timeSlots(start = 0, end = 1440) { return Array.from({ length: Math.max(0, (end - start) / 30) }, (_, i) => start + i * 30); }
export function eventProblem(event: PlanEvent, events: PlanEvent[]): string | null {
  if (!event.name.trim() || event.name.length > 100) return 'Etkinlik adı 1–100 karakter olmalı.';
  if (!/^#[0-9a-f]{6}$/i.test(event.color) || !ICONS[event.icon]) return 'Geçerli bir renk ve simge seçin.';
  if (![event.day, event.start, event.duration].every(Number.isInteger) || event.day < 0 || event.day > 6 || event.start < 0 || event.start % 30 || event.duration < 30 || event.duration % 30 || event.start + event.duration > 1440) return 'Etkinlik aynı gün içinde, 30 dakikalık dilimlerde olmalı.';
  if (events.some(e => e.id !== event.id && e.day === event.day && e.start < event.start + event.duration && event.start < e.start + e.duration)) return 'Bu saatte başka bir etkinlik var. Boş bir dilim seçin; mevcut etkinlik korundu.';
  return null;
}
export function saveEvent(plan: StudyPlan, event: PlanEvent): StudyPlan {
  const problem = eventProblem(event, plan.events);
  if (problem) throw Error(problem);
  return { ...plan, events: [...plan.events.filter(e => e.id !== event.id), { ...event, name: event.name.trim() }] };
}
export function readPlan(raw: string): StudyPlan {
  const plan = JSON.parse(raw) as StudyPlan;
  const activityValid = (a: Activity) => a && typeof a.id === 'string' && a.id.length > 0 && typeof a.name === 'string' && a.name.trim().length > 0 && a.name.length <= 100 && /^#[0-9a-f]{6}$/i.test(a.color) && !!ICONS[a.icon];
  if (!plan || plan.schema !== 1 || typeof plan.name !== 'string' || plan.name.length > 100 || (plan.level !== null && !LEVELS.includes(plan.level)) || !Number.isInteger(plan.start) || !Number.isInteger(plan.end) || plan.start < 0 || plan.end > 1440 || plan.start >= plan.end || plan.start % 30 || plan.end % 30 || !Array.isArray(plan.custom) || !Array.isArray(plan.events) || plan.custom.length > 200 || plan.events.length > 336 || !plan.custom.every(activityValid) || new Set(plan.custom.map(a => a.id)).size !== plan.custom.length) throw Error('Kayıtlı plan okunamadı.');
  const seen: PlanEvent[] = [];
  for (const e of plan.events) {
    if (!activityValid(e) || seen.some(x => x.id === e.id) || eventProblem(e, seen)) throw Error('Kayıtlı etkinlikler okunamadı.');
    seen.push(e);
  }
  return plan;
}
// Include out-of-view cards in downloads as well, without changing the user's viewport.
export function exportRange(plan: StudyPlan) {
  return { start: Math.min(plan.start, ...plan.events.map(e => e.start)), end: Math.max(plan.end, ...plan.events.map(e => e.start + e.duration)) };
}
