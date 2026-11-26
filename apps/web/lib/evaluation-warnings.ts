type Diagnostics={missingVerbal?:number;missingNumeric?:number;duplicateRecords?:number;rejectedLines?:unknown[]};
/** Status strings and zero-valued diagnostic summaries are not warning records. */
export function evaluationWarnings(data:{warnings?:unknown[];diagnostics?:Diagnostics}|undefined,checks?:{warnings?:unknown[]}){
 const diagnostics=data?.diagnostics;
 const counters=[
  [diagnostics?.missingVerbal,'öğrencinin sözel oturumu eksik.'],
  [diagnostics?.missingNumeric,'öğrencinin sayısal oturumu eksik.'],
  [diagnostics?.duplicateRecords,'tekrar kayıt / oturum eşleşmesi incelendi.'],
  [diagnostics?.rejectedLines?.length,'satır güvenilir okunamadığı için değerlendirilmedi.'],
 ] as const;
 const records=[...(data?.warnings??[]),...(checks?.warnings??[])].filter((w):w is string=>typeof w==='string'&&!!w.trim()).map(w=>w.trim()).filter(w=>{
  // Some older readers emit a sentence for every counter, including zero.
  return !/^0\s+(?:öğrenci[\p{L}]*|sözel|sayısal|tekrar|satır|uyarı|kayıt|soruda)(?:\s|[.,;:]|$)/iu.test(w);
 });
 return [...new Set([...records,...counters.filter(([count])=>typeof count==='number'&&count>0).map(([count,label])=>`${count} ${label}`)])];
}
