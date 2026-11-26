import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluationWarnings} from '../apps/web/lib/evaluation-warnings';
test('completion ignores empty/zero diagnostics; keeps real warning records and nonzero counters',()=>{
 assert.deepEqual(evaluationWarnings({warnings:['','  ','0 öğrencinin sözel oturumu eksik.','0 satır güvenilir okunamadı.'],diagnostics:{missingVerbal:0,missingNumeric:0,duplicateRecords:0,rejectedLines:[]}},{warnings:[]}),[]);
 assert.deepEqual(evaluationWarnings({warnings:['Kitapçık bilgisi eksik.','Kitapçık bilgisi eksik.'],diagnostics:{missingVerbal:2,missingNumeric:0,rejectedLines:[{}]}},{warnings:['Katsayı tanımlanmamış.']}),['Kitapçık bilgisi eksik.','Katsayı tanımlanmamış.','2 öğrencinin sözel oturumu eksik.','1 satır güvenilir okunamadığı için değerlendirilmedi.']);
});
