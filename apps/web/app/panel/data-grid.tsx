"use client";
import {useEffect,useRef,useState,type ClipboardEvent,type KeyboardEvent} from "react";
import {parseClipboard,clipboardChanges,clipboardTable,type GridChange} from "../../lib/grid-clipboard";
export {parseClipboard} from "../../lib/grid-clipboard";
export type GridColumn={key:string;label:string;readOnly?:boolean;validate?:(value:string,row?:number,rows?:string[][])=>boolean};
type Revision={before:string[][];after:string[][]};
export default function DataGrid({columns,rows,onChange,onReplace,changed=new Set<string>(),offset=0,maxRows,onOverflow}:{columns:GridColumn[];rows:string[][];onChange:(changes:GridChange[])=>void;onReplace?:(rows:string[][])=>void;changed?:Set<string>;offset?:number;maxRows?:number;onOverflow?:(message:string)=>void}){
 const [message,setMessage]=useState('');
 const root=useRef<HTMLDivElement>(null),undo=useRef<Revision[]>([]),redo=useRef<Revision[]>([]),expected=useRef(JSON.stringify(rows));
 const signature=JSON.stringify(rows);
 useEffect(()=>{if(signature!==expected.current){undo.current=[];redo.current=[];}expected.current=signature;},[signature]);
 function commit(changes:GridChange[]){
  const after=rows.map(r=>[...r]);for(const c of changes){const r=c.row-offset;while(after.length<=r)after.push(Array(columns.length).fill(''));after[r][c.column]=c.value;}
  if(JSON.stringify(after)===signature)return;
  undo.current=[...undo.current.slice(-49),{before:rows.map(r=>[...r]),after}];redo.current=[];expected.current=JSON.stringify(after);onChange(changes);
 }
 function restore(value:string[][]){expected.current=JSON.stringify(value);if(onReplace){onReplace(value.map(r=>[...r]));return;}const changes:GridChange[]=[];value.forEach((r,i)=>r.forEach((v,j)=>{if(v!==(rows[i]?.[j]??''))changes.push({row:i+offset,column:j,value:v});}));onChange(changes);}
 function keys(e:KeyboardEvent<HTMLDivElement>){
  if((e.ctrlKey||e.metaKey)&&!e.altKey){const key=e.key.toLowerCase();if(key==='z'||key==='y'){e.preventDefault();const forward=key==='y'||e.shiftKey,from=forward?redo:undo,to=forward?undo:redo,revision=from.current.pop();if(revision){to.current.push(revision);restore(forward?revision.after:revision.before);}return;}}
  const target=e.target as HTMLTextAreaElement;if(target.dataset.row===undefined)return;
  let rr=Number(target.dataset.row),cc=Number(target.dataset.column);
  if(e.key==='Enter'&&!e.shiftKey||e.key==='ArrowDown')rr++;else if(e.key==='ArrowUp')rr--;else if(e.key==='ArrowLeft'&&target.selectionStart===0)cc--;else if(e.key==='ArrowRight'&&target.selectionStart===target.value.length)cc++;else return;
  const next=root.current?.querySelector<HTMLTextAreaElement>(`textarea[data-row="${rr}"][data-column="${cc}"]`);if(next){e.preventDefault();next.focus();next.select();}
 }
 function paste(e:ClipboardEvent<HTMLDivElement>){
  const target=e.target as HTMLTextAreaElement;if(target.dataset.row===undefined)return;
  e.preventDefault();const text=e.clipboardData.getData('text/plain');
  try{const html=e.clipboardData.getData('text/html'),table=html?clipboardTable(new DOMParser().parseFromString(html,'text/html')):null;
   if(!table&&!e.clipboardData.types.includes('text/plain')){onOverflow?.('Panoda hücre verisi bulunamadı. Excel veya Calc hücrelerini yeniden kopyalayın.');return;}
   const matrix=table??parseClipboard(text);
   const changes=clipboardChanges(matrix,Number(target.dataset.row),Number(target.dataset.column),columns.length,maxRows??rows.length);
   if(changes.some(c=>columns[c.column].readOnly))throw Error('Yapıştırılan alan salt okunur hücre içeriyor. Veriler değiştirilmedi.');
   commit(changes.map(c=>({...c,row:c.row+offset})));onOverflow?.('');setMessage(`${matrix.length} satır · ${changes.length} hücre yapıştırıldı. Ctrl+Z / ⌘Z ile geri alabilirsiniz.`);
  }catch(error){onOverflow?.((error as Error).message);}
 }
 return <div ref={root} className="editable-grid" role="region" aria-label="Düzenlenebilir sınav tablosu" tabIndex={0} onPaste={paste} onKeyDown={keys}>{message&&<p className="field-help" role="status">{message}</p>}<table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((row,r)=><tr key={r+offset}>{columns.map((c,i)=>{const value=row[i]??'',valid=!c.validate||c.validate(value,r,rows);return <td key={c.key} className={`${changed.has(`${r+offset}:${c.key}`)?'cell-changed ':''}${valid?'':'cell-invalid'}`}><textarea rows={1} spellCheck={false} aria-label={`${r+offset+1}. satır ${c.label}`} aria-invalid={!valid} data-row={r} data-column={i} readOnly={c.readOnly} value={value} onChange={e=>commit([{row:r+offset,column:i,value:e.target.value}])}/></td>;})}</tr>)}</tbody></table></div>;
}
