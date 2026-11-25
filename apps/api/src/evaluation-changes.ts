import {canonicalJson} from './canonical-json';
import {studentMatcher} from './result-data';
import type {OpticalData,OpticalStudent} from './optical-core';
// Source line numbers and randomized identity ciphertext are not answer changes.
const content=(s:OpticalStudent)=>canonicalJson({answers:s.answers,booklets:s.booklets,missingLessons:s.missingLessons??[],name:s.name,branch:s.branch});
export function evaluationChanges(previous:OpticalData|undefined,current:OpticalData){
 const matcher=studentMatcher(previous?.students??[]);let added=0,updated=0,unchanged=0;
 for(const student of current.students){const matches=matcher.matches(student);if(matches.length!==1)added++;else if(content(matches[0])===content(student))unchanged++;else updated++;}
 return {added,updated,unchanged};
}
