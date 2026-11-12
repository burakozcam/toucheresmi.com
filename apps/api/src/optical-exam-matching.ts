import { opticalQuestionsSchema, type OpticalLayout, type OpticalQuestion } from "./optical-core";
import { lessonIdentity } from "../lib/evaluation-compatibility";

export function bestAnswerPatternMatch(
  questions: readonly { answer: string }[],
  students: readonly { answers: readonly string[] }[],
) {
  const minimumCompared = Math.min(10, questions.filter(question => /^[ABCDE]$/.test(question.answer)).length);
  let best: { matchPercent: number; matched: number; compared: number } | null = null;
  for (const student of students) {
    let matched = 0;
    let compared = 0;
    for (const [index, question] of questions.entries()) {
      if (!/^[ABCDE]$/.test(question.answer)) continue;
      const answer = student.answers[index];
      if (!/^[ABCDE]$/.test(answer ?? "")) continue;
      compared++;
      if (answer === question.answer) matched++;
    }
    if (!compared || compared < minimumCompared) continue;
    const candidate = { matchPercent: Math.round(matched / compared * 100), matched, compared };
    if (!best || candidate.matchPercent > best.matchPercent || (candidate.matchPercent === best.matchPercent && candidate.compared > best.compared)) best = candidate;
  }
  return best;
}

/** Suggestions inspect answer fields only: identity/duplicate/session errors must not hide a candidate. */
export function matchExamAnswers(txt: string, layout: OpticalLayout, inputQuestions: OpticalQuestion[]) {
  const questions = opticalQuestionsSchema.parse(inputQuestions);
  const fields = new Map(layout.lessons.map(lesson => [lessonIdentity(lesson.name), lesson]));
  const students = txt.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/).flatMap(line => {
    if (!line.trim() || (layout.literals ?? []).some(literal => line.slice(literal.start - 1, literal.start - 1 + literal.text.length) !== literal.text)) return [];
    const booklet = line.slice(layout.fields.booklet.start - 1, layout.fields.booklet.start - 1 + layout.fields.booklet.length).trim().toUpperCase();
    if (!/^[A-D]$/.test(booklet)) return [];
    return [{ answers: questions.map(question => {
      const field = fields.get(lessonIdentity(question.lesson)), position = question.positions[booklet];
      if (!field || !position || position > field.length) return "";
      return line[field.start + position - 2]?.toUpperCase() ?? "";
    }) }];
  });
  return bestAnswerPatternMatch(questions, students);
}
