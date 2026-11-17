import {readerFamily,recordLayout} from "./optical-readers";
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
  const questions = opticalQuestionsSchema.parse(inputQuestions),family=readerFamily(layout);
  // Field/position plans depend on layout and booklet, never on a student's answers.
  const lessonIds=questions.map(q=>lessonIdentity(q.lesson));
  const plans=new Map<OpticalLayout["lessons"],Map<string,number[]>>();
  const students = txt.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/).flatMap(line => {
    const variant=recordLayout(layout,line,family??null);if(family&&!variant)return [];
    const rowLayout=variant?.layout??layout;
    if (!line.trim() || (rowLayout.literals ?? []).some(literal => line.slice(literal.start - 1, literal.start - 1 + literal.text.length) !== literal.text)) return [];
    const booklet = line.slice(rowLayout.fields.booklet.start - 1, rowLayout.fields.booklet.start - 1 + rowLayout.fields.booklet.length).trim().toUpperCase() || "A";
    if (!/^[A-D]$/.test(booklet)) return [];
    let books=plans.get(rowLayout.lessons);if(!books){books=new Map();plans.set(rowLayout.lessons,books);}
    let positions=books.get(booklet);
    if(!positions){const fields=new Map(rowLayout.lessons.map(lesson=>[lessonIdentity(lesson.name),lesson]));positions=questions.map((question,i)=>{const field=fields.get(lessonIds[i]),position=question.positions[booklet];return !field||!position||position>field.length?-1:field.start+position-2;});books.set(booklet,positions);}
    return [{ answers:positions.map(position=>position<0?"":line[position]?.toUpperCase()??"") }];
  });
  return bestAnswerPatternMatch(questions, students);
}
