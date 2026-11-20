import type {SheetJs} from './sheetjs';
let pending:Promise<SheetJs>|undefined;
/** Local vendor script is requested only by an Excel action. Failed loads can retry. */
export function loadSheetJs():Promise<SheetJs>{
 if(window.XLSX)return Promise.resolve(window.XLSX);
 return pending??=new Promise<SheetJs>((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/xlsx.full.min.js';script.onload=()=>{if(window.XLSX)resolve(window.XLSX);else{pending=undefined;reject(Error('Excel okuyucu hazır değil.'));}};script.onerror=()=>{script.remove();pending=undefined;reject(Error('Excel okuyucu yüklenemedi.'));};document.head.append(script);});
}
