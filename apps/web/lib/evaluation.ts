export type Lesson = { name: string; count: number; weight: number };
export type Question = { lesson: string; number: number; answer: string; weight: number; column: string };
export type Candidate = { id: string; name: string; school: string; branch: string; answers: string[] };
export type EvaluationData = { questions: Question[]; students: Candidate[] };
export type QuestionState = "correct" | "wrong" | "blank" | "cancelled";
export type LessonResult = { lesson: string; correct: number; wrong: number; blank: number; cancelled: number; net: number; weighted: number };
export const text = (value: unknown) => String(value ?? "").trim();
const choice = (value: unknown) => text(value).toLocaleUpperCase("tr-TR");
const positive = (value: unknown) => Number(text(value).replace(",", "."));
export const questionColumn = (lesson: string, number: number) => `${lesson} | ${number}`;

/** Validate the entire upload before exposing any scores. No silent skipped rows. */
export function parseEvaluation(keyRows: unknown[][], studentRows: unknown[][]): EvaluationData {
  if (!keyRows.length || !studentRows.length) throw new Error("Cevap Anahtarı ve Öğrenci Cevapları sayfaları gereklidir.");
  const requiredKey = ["Ders", "Soru", "Doğru Cevap", "Katsayı"];
  if (requiredKey.some((name, i) => text(keyRows[0]?.[i]) !== name)) throw new Error("Cevap Anahtarı başlıkları değiştirilmiş. Yeni bir şablon indirin.");
  const questions: Question[] = [];
  const seen = new Set<string>();
  const weights = new Map<string, number>();
  keyRows.slice(1).forEach((row, index) => {
    if (row.every((cell) => !text(cell))) return;
    const lesson = text(row[0]);
    const number = positive(row[1]);
    const answer = choice(row[2]);
    const weight = positive(row[3]);
    const label = `Cevap Anahtarı, satır ${index + 2}`;
    if (!lesson || lesson.length > 80 || !Number.isInteger(number) || number < 1 || number > 300) throw new Error(`${label}: ders ve soru numarasını kontrol edin.`);
    if (!/^[ABCDEX]$/.test(answer)) throw new Error(`${label}: doğru cevap A–E, iptal için X olmalıdır.`);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error(`${label}: katsayı 0'dan büyük, en fazla 100 olmalıdır.`);
    const column = questionColumn(lesson, number);
    if (seen.has(column)) throw new Error(`${label}: ${column} birden fazla kez tanımlanmış.`);
    if (weights.has(lesson) && weights.get(lesson) !== weight) throw new Error(`${label}: aynı dersin katsayıları tutarlı olmalıdır.`);
    weights.set(lesson, weight);
    seen.add(column);
    questions.push({ lesson, number, answer, weight, column });
  });
  if (!questions.length || questions.length > 300) throw new Error("Şablonda 1–300 soru bulunmalıdır.");
  for (const lesson of new Set(questions.map((q) => q.lesson))) {
    const nums = questions.filter((q) => q.lesson === lesson).map((q) => q.number).sort((a, b) => a - b);
    if (nums.some((n, i) => n !== i + 1)) throw new Error(`${lesson}: soru numaraları 1'den başlayıp kesintisiz ilerlemelidir.`);
  }
  const headers = studentRows[0].map(text);
  if (["Öğrenci No", "Ad Soyad", "Okul", "Şube"].some((name, i) => headers[i] !== name)) throw new Error("Öğrenci Cevapları başlıkları değiştirilmiş. Yeni bir şablon indirin.");
  if (new Set(headers).size !== headers.length) throw new Error("Öğrenci Cevapları sayfasında yinelenen sütun başlığı var.");
  const columns = questions.map((q) => headers.indexOf(q.column));
  if (columns.some((index) => index < 4)) throw new Error("Öğrenci cevaplarında bazı ders/soru sütunları eksik. Şablonla cevap anahtarı eşleşmiyor.");
  if (headers.slice(4).some((header) => !seen.has(header))) throw new Error("Cevap anahtarında bulunmayan öğrenci cevap sütunları var.");
  const students: Candidate[] = [];
  const ids = new Set<string>();
  studentRows.slice(1).forEach((row, index) => {
    if (row.every((cell) => !text(cell))) return;
    const [id, name, school, branch] = row.slice(0, 4).map(text);
    const label = `Öğrenci Cevapları, satır ${index + 2}`;
    if (!id || !name) throw new Error(`${label}: öğrenci numarası ve ad soyad gereklidir.`);
    if ([id, name, school, branch].some((value) => value.length > 180)) throw new Error(`${label}: kimlik alanları çok uzun.`);
    const identity = `${school}\u0000${branch}\u0000${id}`;
    if (ids.has(identity)) throw new Error(`${label}: aynı okul ve şubede ${id} numaralı öğrenci yinelenmiş.`);
    ids.add(identity);
    const answers = columns.map((column) => {
      const answer = choice(row[column]);
      if (answer && !/^[ABCDE\-]$/.test(answer)) throw new Error(`${label}: ${headers[column]} cevabı A–E ya da boş olmalıdır.`);
      return answer === "-" ? "" : answer;
    });
    students.push({ id, name, school: school || "Belirtilmedi", branch: branch || "Belirtilmedi", answers });
  });
  if (!students.length || students.length > 500) throw new Error("Bir dosyada 1–500 öğrenci bulunmalıdır.");
  return { questions, students };
}

export function questionState(question: Question, answer: string): QuestionState {
  return question.answer === "X" ? "cancelled" : !answer ? "blank" : answer === question.answer ? "correct" : "wrong";
}

export function evaluate(questions: Question[], student: Candidate, penalty: number, overrides: Record<string, number> = {}): LessonResult[] {
  const results = new Map<string, LessonResult>();
  questions.forEach((q, i) => {
    let result = results.get(q.lesson);
    if (!result) { result = { lesson: q.lesson, correct: 0, wrong: 0, blank: 0, cancelled: 0, net: 0, weighted: 0 }; results.set(q.lesson, result); }
    result[questionState(q, student.answers[i])] += 1;
  });
  for (const result of results.values()) {
    result.net = result.correct - (penalty > 0 ? result.wrong / penalty : 0);
    result.weighted = result.net * (overrides[result.lesson] ?? questions.find((q) => q.lesson === result.lesson)!.weight);
  }
  return [...results.values()];
}
