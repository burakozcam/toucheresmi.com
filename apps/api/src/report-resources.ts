import fs from 'node:fs';
import path from 'node:path';
import {reportBenchmarks} from './report-benchmarks';
let fonts:{regular:Buffer;bold:Buffer}|undefined;
/** Immutable font bytes only. PDFKit font/document objects are never shared. */
export function reportFonts(){return fonts??=( {regular:fs.readFileSync(path.join(__dirname,'../assets/fonts/LiberationSans-Regular.ttf')),bold:fs.readFileSync(path.join(__dirname,'../assets/fonts/LiberationSans-Bold.ttf'))} );}
/** Request-scoped data: no tenant, score, logo or ranking cache across requests. */
export function prepareReportResources(view:any){return {...view,reportResources:{schoolBenchmarks:reportBenchmarks([{data:view.data,summary:view.summary}]),summaries:new Map(view.summary.map((s:any)=>[s.id,s])),students:new Map(view.data.students.map((s:any)=>[s.id,s]))}};}
