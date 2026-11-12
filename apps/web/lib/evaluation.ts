export type Lesson = { name: string; count: number; weight: number|null };
export type Question = { lesson: string; number: number; answer: string; weight: number | null; column: string; outcomeCode?: string; outcomeName?: string };
export type Candidate = {studentNo?:string; id: string; name: string; school: string; branch: string; answers: string[] };
export type EvaluationData = { questions: Question[]; students: Candidate[] };
export type CohortContext = Map<string, { members: Candidate[]; scores: (number|null)[]; rates: (number | null)[] }>;
export type QuestionState = "correct" | "wrong" | "blank" | "cancelled";
export type LessonResult = { lesson: string; correct: number; wrong: number; blank: number; cancelled: number; net: number; weighted: number | null };
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
  const weights = new Map<string, number|null>();
  const hasOutcomes = text(keyRows[0][4]) === "Kazanım Kodu" && text(keyRows[0][5]) === "Kazanım Adı";
  if ((text(keyRows[0][4]) || text(keyRows[0][5])) && !hasOutcomes) throw new Error("Kazanım sütunları Kazanım Kodu ve Kazanım Adı olarak birlikte bulunmalıdır.");
  keyRows.slice(1).forEach((row, index) => {
    if (row.every((cell) => !text(cell))) return;
    const lesson = text(row[0]);
    const number = positive(row[1]);
    const answer = choice(row[2]);
    const weight = text(row[3]) ? positive(row[3]) : null;
    const label = `Cevap Anahtarı, satır ${index + 2}`;
    if (!lesson || lesson.length > 80 || !Number.isInteger(number) || number < 1 || number > 300) throw new Error(`${label}: ders ve soru numarasını kontrol edin.`);
    if (!/^[ABCDEX]$/.test(answer)) throw new Error(`${label}: doğru cevap A–E, iptal için X olmalıdır.`);
    if (weight!==null && (!Number.isFinite(weight) || weight <= 0 || weight > 100)) throw new Error(`${label}: katsayı 0'dan büyük, en fazla 100 olmalıdır.`);
    const column = questionColumn(lesson, number);
    if (seen.has(column)) throw new Error(`${label}: ${column} birden fazla kez tanımlanmış.`);
    if (weights.has(lesson) && weights.get(lesson) !== weight) throw new Error(`${label}: aynı dersin katsayıları tutarlı olmalıdır.`);
    weights.set(lesson, weight);
    seen.add(column);
    const outcomeCode = hasOutcomes ? text(row[4]) : "", outcomeName = hasOutcomes ? text(row[5]) : "";
    if (Boolean(outcomeCode) !== Boolean(outcomeName) || outcomeCode.length > 80 || outcomeName.length > 500) throw new Error(`${label}: kazanım kodu ve adı birlikte yazılmalıdır (en fazla 80 / 500 karakter).`);
    questions.push({ lesson, number, answer, weight, column, ...(outcomeCode ? { outcomeCode, outcomeName } : {}) });
  });
  if (!questions.length || questions.length > 300) throw new Error("Şablonda 1–300 soru bulunmalıdır.");
  for (const lesson of new Set(questions.map((q) => q.lesson))) {
    const nums = questions.filter((q) => q.lesson === lesson).map((q) => q.number).sort((a, b) => a - b);
    if (nums.some((n, i) => n !== i + 1)) throw new Error(`${lesson}: soru numaraları 1'den başlayıp kesintisiz ilerlemelidir.`);
  }
  const headers = studentRows[0].map(text);
  if (["Öğrenci No", "Ad Soyad", "Okul", "Şube"].some((name, i) => headers[i] !== name)) throw new Error("Öğrenci Cevapları başlıkları değiştirilmiş. Yeni bir şablon indirin.");
  if (new Set(headers).size !== headers.length) throw new Error("Öğrenci Cevapları sayfasında yinelenen sütun başlığı var.");
  const lessonNames = [...new Set(questions.map((q) => q.lesson))];
  const compact = lessonNames.some((lesson) => headers.includes(`${lesson} Cevapları`));
  const validHeaders = compact ? new Set(lessonNames.map((lesson) => `${lesson} Cevapları`)) : seen;
  const columns = questions.map((q) => headers.indexOf(compact ? `${q.lesson} Cevapları` : q.column));
  if (columns.some((index) => index < 4)) throw new Error("Öğrenci cevaplarında bazı ders/soru sütunları eksik. Şablonla cevap anahtarı eşleşmiyor.");
  if (headers.slice(4).some((header) => !validHeaders.has(header))) throw new Error("Cevap anahtarında bulunmayan öğrenci cevap sütunları var.");
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
    const chains = new Map<string, string>();
    if (compact) for (const lesson of lessonNames) {
      const column = headers.indexOf(`${lesson} Cevapları`), count = questions.filter((q) => q.lesson === lesson).length;
      const chain = String(row[column] ?? "").toLocaleUpperCase("tr-TR").replace(/[ .]/g, "-");
      if (chain && (chain.length !== count || !/^[ABCDE-]+$/.test(chain))) throw new Error(`${label}: ${lesson} hücresi tam ${count} cevap içermelidir. A–E kullanın, boş soru için - yazın; araya ayırıcı koymayın.`);
      chains.set(lesson, chain || "-".repeat(count));
    }
    const answers = columns.map((column, index) => {
      const answer = compact ? chains.get(questions[index].lesson)![questions[index].number - 1] : choice(row[column]);
      if (answer && !/^[ABCDE\-]$/.test(answer)) throw new Error(`${label}: ${headers[column]} cevabı A–E ya da boş olmalıdır.`);
      return answer === "-" ? "" : answer;
    });
    students.push({ id, name, school: school || "Belirtilmedi", branch: branch || "Belirtilmedi", answers });
  });
  if (!students.length || students.length > 500) throw new Error("Bir dosyada 1–500 öğrenci bulunmalıdır.");
  return { questions, students };
}

/** A transparent scale for local practice exams, not the official standardized score. */
export function scaledScore(questions: Question[], student: Candidate, penalty: number, weights: Record<string, number|null>, scale: 100 | 500) {
  if(questions.some(q=>q.answer!=="X"&&(Object.hasOwn(weights,q.lesson)?weights[q.lesson]:q.weight)===null))return null;
  const maximum = questions.reduce((total, q) => total + (q.answer === "X" ? 0 : ((Object.hasOwn(weights,q.lesson)?weights[q.lesson]:q.weight)??0)), 0);
  const total = evaluate(questions, student, penalty, weights).reduce((n, r) => n + (r.weighted??0), 0);
  return maximum > 0 ? Math.min(scale, Math.max(0, total / maximum * scale)) : null;
}
export function buildCohortContext(data: EvaluationData, penalty: number, weights: Record<string, number|null>, scale: 100 | 500): CohortContext {
  const groups: CohortContext = new Map();
  for (const student of data.students) {
    const group = groups.get(student.school) ?? { members: [], scores: [], rates: data.questions.map(() => 0) };
    group.members.push(student); group.scores.push(scaledScore(data.questions, student, penalty, weights, scale));
    data.questions.forEach((q, i) => { if (questionState(q, student.answers[i]) === "correct") group.rates[i] = (group.rates[i] ?? 0) + 1; });
    groups.set(student.school, group);
  }
  for (const group of groups.values()) group.rates = group.rates.map((correct, i) => data.questions[i].answer === "X" ? null : (correct ?? 0) / group.members.length * 100);
  return groups;
}
export function questionCohort(data: EvaluationData, student: Candidate, context?: CohortContext) {
  const school = data.students.filter((s) => s.school === student.school);
  const cohort = school.filter((s) => s.id !== student.id || s.branch !== student.branch);
  return data.questions.map((q, index) => {
    const cached = context?.get(student.school);
    const own = questionState(q, student.answers[index]) === "correct" ? 1 : 0;
    const correct = cached ? Math.max(0, Math.round((cached.rates[index] ?? 0) / 100 * school.length) - own) : cohort.filter((s) => questionState(q, s.answers[index]) === "correct").length;
    const rate = q.answer === "X" || !cohort.length ? null : correct / cohort.length * 100;
    return { count: cohort.length, correct, rate, difference: rate === null ? null : (questionState(q, student.answers[index]) === "correct" ? 100 : 0) - rate };
  });
}

export function questionState(question: Question, answer: string): QuestionState {
  return question.answer === "X" ? "cancelled" : question.answer === "H" ? "correct" : !answer ? "blank" : answer === question.answer ? "correct" : "wrong";
}

export function evaluate(questions: Question[], student: Candidate, penalty: number, overrides: Record<string, number|null> = {}): LessonResult[] {
  const results = new Map<string, LessonResult>();
  questions.forEach((q, i) => {
    let result = results.get(q.lesson);
    if (!result) { result = { lesson: q.lesson, correct: 0, wrong: 0, blank: 0, cancelled: 0, net: 0, weighted: 0 }; results.set(q.lesson, result); }
    result[questionState(q, student.answers[i])] += 1;
  });
  for (const result of results.values()) {
    result.net = result.correct - (penalty > 0 ? result.wrong / penalty : 0);
    const weight=Object.hasOwn(overrides,result.lesson)?overrides[result.lesson]:questions.find((q) => q.lesson === result.lesson)!.weight;
    result.weighted = weight===null?null:result.net * weight;
  }
  return [...results.values()];
}
