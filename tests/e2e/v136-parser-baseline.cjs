// CPU-only baseline. Uses synthetic data, no HTTP or database.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),ts=require('typescript');
const previous={};new Function('exports','require',ts.transpileModule(fs.readFileSync('tests/fixtures/v135-optical-core.txt','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(previous,createRequire(path.resolve('apps/api/src/optical-core.ts')));
const txt=fs.readFileSync('test-results/v136/4995-synthetic.txt','utf8'),questions=JSON.parse(fs.readFileSync('tests/fixtures/7108-v128/ankara-key.json','utf8'));
const parser=process.env.QA_READER==='current'?require('../../apps/api/src/optical-core.ts'):previous;
const cpu=process.cpuUsage(),start=performance.now(),data=parser.parseOptical(txt,parser.layout7108,questions,'Synthetic QA',{allowMismatch:true});
const report={students:data.students.length,bytes:Buffer.byteLength(txt),parserMs:performance.now()-start,cpuMicros:process.cpuUsage(cpu),memory:process.memoryUsage(),node:process.version};fs.writeFileSync('test-results/v136/parser-'+(process.env.QA_READER||'baseline')+'.json',JSON.stringify(report,null,2));console.log(report);
