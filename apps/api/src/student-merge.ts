/** Prefer more marked answers, then more complete identity fields; keep the first on a tie. */
export function preferFilledRecord(previous:string[],incoming:string[],previousMarks:number,incomingMarks:number){
  if(previousMarks!==incomingMarks)return incomingMarks>previousMarks;
  const filled=(values:string[])=>values.filter(v=>v.trim()).length;
  if(filled(previous)!==filled(incoming))return filled(incoming)>filled(previous);
  const length=(values:string[])=>values.reduce((n,v)=>n+v.replace(/\s/g,"").length,0);
  return length(incoming)>length(previous);
}
