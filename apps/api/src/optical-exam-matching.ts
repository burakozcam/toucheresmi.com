export function bestAnswerPatternMatch(
  questions: readonly { answer: string }[],
  students: readonly { answers: readonly string[] }[],
) {
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
    if (compared < 10) continue;
    const candidate = { matchPercent: Math.round(matched / compared * 100), matched, compared };
    if (!best || candidate.matchPercent > best.matchPercent || (candidate.matchPercent === best.matchPercent && candidate.compared > best.compared)) best = candidate;
  }
  return best;
}
