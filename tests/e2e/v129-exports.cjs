const fs=require('node:fs'),assert=require('node:assert/strict'),x=require('xlsx');
const results={};
for(const label of ['7108','ozdebir']){
 const snapshot=JSON.parse(fs.readFileSync(`/tmp/v129-evidence/${label}-snapshot.json`)),book=x.readFile(`/tmp/v129-evidence/${label}-results.xlsx`),rows=x.utils.sheet_to_json(book.Sheets['Sonuçlar']);assert.equal(rows.length,snapshot.data.students.length);
 for(const student of snapshot.data.students){const summary=snapshot.summary.find(s=>s.id===student.id),row=rows.find(r=>r['Ad Soyad']===student.name&&String(r['Öğrenci No']??'')===String(student.studentNo??student.id));assert.ok(row,'Student missing from XLSX');assert.equal(row.Net,summary.net);assert.equal(row.Puan??null,summary.score);for(const lesson of summary.lessons){if(lesson.missing){for(const suffix of [' D',' Y',' B',' Net'])assert.equal(row[lesson.lesson+suffix],undefined);continue;}assert.equal(row[lesson.lesson+' D'],lesson.correct);assert.equal(row[lesson.lesson+' Y'],lesson.wrong);assert.equal(row[lesson.lesson+' B'],lesson.blank);assert.equal(row[lesson.lesson+' Net'],lesson.net);}}
 const outcomes=x.utils.sheet_to_json(book.Sheets['Kazanımlar']);assert.ok(outcomes.length>0);results[label]={matchedStudents:rows.length,matchedLessons:rows.length*6,pdfHeader:fs.readFileSync(`/tmp/v129-evidence/${label}-card.pdf`).subarray(0,5).toString()==='%PDF-',outcomeRows:outcomes.length};assert.ok(results[label].pdfHeader);
}
fs.writeFileSync('/tmp/v129-evidence/exports.json',JSON.stringify(results,null,2));console.log(results);
