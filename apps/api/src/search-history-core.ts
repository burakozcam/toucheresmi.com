/** Conservative minimization: suspicious submissions are searched normally but not logged. */
export function safeSearchTerm(input:unknown):string|null{
 if(typeof input!=='string')return null;
 const term=input.normalize('NFKC').replace(/\s+/g,' ').trim();
 if(term.length<2||term.length>120||/[\x00-\x1f\x7f<>@]|https?:|www\.|bearer|password|parola|şifre|token|secret|eyJ[a-zA-Z0-9_-]{10}/i.test(term)||/\d(?:[\s().+-]*\d){6,}/.test(term)||/[a-zA-Z0-9_-]{40,}/.test(term))return null;
 return term.toLocaleLowerCase('tr-TR');
}
export const searchCutoff=()=>new Date(Date.now()-30*86400_000);
