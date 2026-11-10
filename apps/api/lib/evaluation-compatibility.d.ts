export function lessonIdentity(name: string): string;
export function compatibleEvaluation(template: {grade?: number | null; layout: {fields: {booklet: unknown}; lessons: Array<{name: string; length: number}>}}, key: {grade?: number | null; lessonCounts: Record<string, number>; booklets: string[]}): boolean;
