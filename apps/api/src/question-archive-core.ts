/** Disabled foundation: no student route, upload editor or PDF cutter is enabled. */
export const zeroErrorBookletEnabled=false;
export type ArchivedQuestion={id:string;examId:string;publisherId:string;examVersion:string;grade:number;lesson:string;session:string;booklet:string;originalNumber:number;canonicalNumber:number;correctAnswer:string;storageKey:string;rightsStatus:string;rightsExpiresAt?:Date|null};
export type WrongQuestionSource={examId:string;publisherId:string;examVersion:string;publisherName:string;examName:string;grade:number};
export type BookletQuestion={number:number;lesson:string;originalNumber:number;answer:string;archiveId:string;storageKey:string;source:WrongQuestionSource};
/** Caller must first authorize the result + student grant. No guess or fallback
 * to a different source, version, booklet, answer or question is permitted. */
export function planWrongQuestions(source:WrongQuestionSource,questions:Array<{lesson:string;number:number;answer:string;session?:string;positions:Record<string,number>}>,student:{answers:string[];booklets:Record<string,string>;missingLessons?:string[]},archive:ArchivedQuestion[],now=new Date()){
 const selected:Array<Omit<BookletQuestion,'number'>>=[],missing:Array<{lesson:string;originalNumber:number;reason:string}>=[];
 questions.forEach((q,i)=>{
  const answer=student.answers[i];if(!answer||answer===q.answer||['H','X','T'].includes(q.answer)||student.missingLessons?.includes(q.lesson))return;
  const booklet=student.booklets[q.lesson],originalNumber=q.positions[booklet];
  const matches=archive.filter(a=>a.examId===source.examId&&a.publisherId===source.publisherId&&a.examVersion===source.examVersion&&a.grade===source.grade&&a.lesson===q.lesson&&a.session===(q.session??'single')&&a.booklet===booklet&&a.originalNumber===originalNumber&&a.canonicalNumber===q.number&&a.correctAnswer===q.answer&&['LICENSED','OWNED'].includes(a.rightsStatus)&&(!a.rightsExpiresAt||+a.rightsExpiresAt>+now));
  if(matches.length!==1){missing.push({lesson:q.lesson,originalNumber,reason:matches.length?'Belirsiz soru eşleştirmesi':'İzinli ve tam eşleşen soru içeriği bulunamadı'});return;}
  const a=matches[0];selected.push({lesson:q.lesson,originalNumber,answer:q.answer,archiveId:a.id,storageKey:a.storageKey,source});
 });
 const lessons=[...new Set(selected.map(q=>q.lesson))],items=lessons.flatMap(lesson=>selected.filter(q=>q.lesson===lesson)).map((q,i)=>({...q,number:i+1}));
 return {items,missing,answerKey:items.map(q=>({number:q.number,answer:q.answer})),blankPolicy:'UNDECIDED' as const};
}
