/** Legacy audit descriptions are plain text; structured summaries use a distinct shape.
 * Keep history presentation independent of editable result data. Never execute markup. */
export function auditSummaryText(value:unknown):string{
 if(value==null)return 'İşlem açıklaması bulunmuyor.';
 if(typeof value==='object')return JSON.stringify(value,null,2);
 const text=String(value).trim();
 if(!text)return 'İşlem açıklaması bulunmuyor.';
 if(text.startsWith('{')||text.startsWith('[')){
  try{return JSON.stringify(JSON.parse(text),null,2);}catch{return text;}
 }
 return text;
}
