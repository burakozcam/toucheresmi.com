import test from 'node:test';
import assert from 'node:assert/strict';
import {parseClipboard,clipboardChanges} from '../apps/web/lib/grid-clipboard';
test('v129 Excel/Calc: CRLF, CR, LF, quoted tabs/newlines, doubled quotes, Turkish and empty cells survive',()=>{
 assert.deepEqual(parseClipboard('Türkçe\t1,25\t\t"İki satır\nve ""alıntı"""\r\nFen\t2.5\t\t"a\tb"\r\n'),[['Türkçe','1,25','','İki satır\nve "alıntı"'],['Fen','2.5','','a\tb']]);
 assert.deepEqual(parseClipboard('A\rB\r'),[['A'],['B']]);assert.deepEqual(parseClipboard('A\t\t\n\n'),[['A','',''],['']]);assert.deepEqual(parseClipboard(''),[['']]);
 assert.throws(()=>parseClipboard('"tamamlanmamış'),/tamamlanmamış/);
});
test('v129 paste: 5×5, 90×1 and 90×8 start at selected cell, grow rows and never truncate',()=>{
 for(const [height,width] of [[5,5],[90,1],[90,8]]){const values=Array.from({length:height},(_,r)=>Array.from({length:width},(_,c)=>`${r}-${c}`)),matrix=parseClipboard(values.map(r=>r.join('\t')).join('\r\n'));
  const changes=clipboardChanges(matrix,2,1,9,300);assert.equal(changes.length,height*width);assert.deepEqual(changes[0],{row:2,column:1,value:'0-0'});assert.equal(changes.at(-1)!.row,height+1);assert.equal(changes.at(-1)!.column,width);
 }
 assert.throws(()=>clipboardChanges([['a','b']],0,8,9,300),/Veriler değiştirilmedi/);
 assert.throws(()=>clipboardChanges(Array.from({length:90},()=>['A']),250,0,9,300),/Veriler değiştirilmedi/);
});
