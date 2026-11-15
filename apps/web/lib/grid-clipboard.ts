/** Excel/Calc TSV: quoted cells can contain tabs, newlines and doubled quotes. */
export function parseClipboard(text:string):string[][]{
 const rows:string[][]=[],row:string[]=[];let value='',quoted=false,start=true;
 const cell=()=>{row.push(value);value='';start=true;};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else quoted=false;}else if(c==='\r'){value+='\n';if(text[i+1]==='\n')i++;}else value+=c;continue;}
  if(c==='"'&&start){quoted=true;start=false;continue;}
  if(c==='\t'){cell();continue;}
  if(c==='\r'||c==='\n'){cell();rows.push(row.splice(0));if(c==='\r'&&text[i+1]==='\n')i++;continue;}
  value+=c;start=false;
 }
 if(quoted)throw Error('Panodaki tırnaklı hücre tamamlanmamış. Hücreleri yeniden kopyalayın.');
 if(value||row.length||!rows.length){cell();rows.push(row);}
 return rows;
}
export type GridChange={row:number;column:number;value:string};
export function clipboardChanges(matrix:string[][],row:number,column:number,columns:number,capacity:number):GridChange[]{
 if(row+matrix.length>capacity||matrix.some(cells=>column+cells.length>columns))throw Error(`Yapıştırılan alan tablo sınırını aşıyor (en fazla ${capacity} satır, ${columns} sütun). Veriler değiştirilmedi; başlangıç hücresini kontrol edin.`);
 return matrix.flatMap((cells,i)=>cells.map((value,j)=>({row:row+i,column:column+j,value})));
}
/** Calc's plain-text flavor flattens in-cell newlines and omits trailing empty columns.
 * Prefer its table flavor, without inserting any pasted HTML into the live document. */
export function clipboardTable(document:Document):string[][]|null{
 const table=document.querySelector('table');if(!table)return null;
 return Array.from(table.rows,row=>Array.from(row.cells,cell=>{
  if(cell.colSpan!==1||cell.rowSpan!==1)throw Error('Birleştirilmiş hücreleri önce ayırın. Veriler değiştirilmedi.');
  try{const value=JSON.parse(cell.getAttribute('data-sheets-value')??'null');if(value?.['1']===2&&typeof value['2']==='string')return value['2'] as string;}catch{/* Read visible text if optional clipboard metadata is absent or invalid. */}
  const copy=cell.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('script,style').forEach(n=>n.remove());
  if(!copy.textContent&&copy.querySelectorAll('br').length<=1)return '';
  copy.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));return copy.textContent??'';
 }));
}
