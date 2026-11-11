/** Saved branch labels are grade-section; never use substring matching (1 vs 10). */
export function resultGrade(branch:string){return /^(\d{1,2})(?:\s*[-/ ]|$)/.exec(branch.trim())?.[1]??branch.trim();}
