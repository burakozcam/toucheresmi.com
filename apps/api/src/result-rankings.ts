import { resultGrade } from "../lib/result-grade";

type Person = { id: string; branch: string };
type Cohort = { schoolId: string; data: { students: Person[] }; summary: { id: string; score: number | null }[] };
type Location = { id: string; city: string | null; district: string | null };
type Group = { count: number; scores: number[] };
/** Same competition ranks and 1e-8 tolerance, with one index per cohort rather than scans per student. */
export function resultRankings(view: Cohort, cohorts: Cohort[], locations: Location[]) {
  const places = new Map(locations.map(place => [place.id, place]));
  const groups = new Map<string, Group>();
  const key = (...parts: unknown[]) => JSON.stringify(parts);
  const keysFor = (schoolId: string, person: Person) => {
    const grade = resultGrade(person.branch), place = places.get(schoolId);
    return [key("all", grade), key("school", grade, schoolId), key("class", grade, schoolId, person.branch),
      ...(place?.city ? [key("city", grade, place.city)] : []),
      ...(place?.city && place.district ? [key("district", grade, place.city, place.district)] : [])];
  };
  let generalCount = 0;
  for (const cohort of cohorts) {
    const scores = new Map(cohort.summary.map(row => [row.id, row.score]));
    for (const person of cohort.data.students) {
      generalCount++;
      const score = scores.get(person.id) ?? null;
      for (const id of keysFor(cohort.schoolId, person)) {
        const group = groups.get(id) ?? { count: 0, scores: [] };
        group.count++;
        if (score !== null) group.scores.push(score);
        groups.set(id, group);
      }
    }
  }
  for (const group of groups.values()) group.scores.sort((a, b) => b - a);
  const rank = (score: number | null, group?: Group) => {
    if (score === null) return null;
    const scores = group?.scores ?? [];
    let low = 0, high = scores.length;
    while (low < high) { const mid = (low + high) >>> 1; if (scores[mid] > score + 1e-8) low = mid + 1; else high = mid; }
    return low + 1;
  };
  const ownScores = new Map(view.summary.map(row => [row.id, row.score]));
  const rankings = Object.fromEntries(view.data.students.map(person => {
    const score = ownScores.get(person.id) ?? null;
    const [general, school, branch, city, district] = keysFor(view.schoolId, person).map(id => groups.get(id));
    return [person.id, { generalRank: rank(score, general), generalCount: general?.count ?? 0,
      cityRank: city ? rank(score, city) : null, cityCount: city?.count ?? null,
      districtRank: district ? rank(score, district) : null, districtCount: district?.count ?? null,
      schoolRank: rank(score, school), schoolCount: school?.count ?? 0,
      classRank: rank(score, branch), classCount: branch?.count ?? 0 }];
  }));
  return { rankings, generalCount };
}
