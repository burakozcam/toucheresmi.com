import { TXT_MAX_RECORDS, inspectTxt } from "./txt-limits";
import { z } from "zod";
import {readerFamily,recordLayout} from "./optical-readers";
import { lessonIdentity } from "../lib/evaluation-compatibility";

const field = z.object({ start: z.number().int().min(1).max(4000), length: z.number().int().min(1).max(300), align:z.enum(["left","right"]).optional() });
export const opticalLayoutSchema = z.object({
  lineLength: z.number().int().min(20).max(4000),
  fields: z.object({ id: field, name: field, surname: field.optional(), grade: field.optional(), branch: field.optional(), booklet: field, identity: field.optional(), schoolCode: field.optional(), gender:field.optional(),session:field.optional(),examNumber:field.optional() }),
  lessons: z.array(field.extend({ name: z.string().trim().min(1).max(80) })).min(1).max(20),
  literals:z.array(z.object({start:z.number().int().min(1).max(4000),text:z.string().min(1).max(300).regex(/^[^\x00-\x1f\x7f]+$/)})).max(30).optional(),
}).superRefine((v, ctx) => {
  const used = new Set<number>();
  for (const f of [...Object.values(v.fields), ...v.lessons, ...(v.literals??[]).map(l=>({start:l.start,length:l.text.length}))].filter(Boolean) as Array<{ start: number; length: number }>) {
    for (let p = f.start; p < f.start + f.length; p++) {
      if (p > v.lineLength || used.has(p)) { ctx.addIssue({ code: "custom", message: "TXT alanları çakışıyor veya satır uzunluğunu aşıyor." }); return; }
      used.add(p);
    }
  }
  if (new Set(v.lessons.map(l => l.name)).size !== v.lessons.length) ctx.addIssue({ code: "custom", message: "Ders adları benzersiz olmalıdır." });
});
export type OpticalLayout = z.infer<typeof opticalLayoutSchema>;
export const layout7108: OpticalLayout = {
  lineLength: 171,
  fields: { schoolCode: { start: 5, length: 6 }, id: { start: 11, length: 5 }, name: { start: 16, length: 10 }, surname: { start: 26, length: 10 }, grade: { start: 36, length: 1 }, branch: { start: 37, length: 1 }, identity: { start: 38, length: 11 },gender:{start:49,length:1},session:{start:50,length:1}, booklet: { start: 51, length: 1 } },
  lessons: ["TÜRKÇE", "SOSYAL", "DİN", "İNGİLİZCE", "MATEMATİK", "FEN"].map((name, i) => ({ name, start: 52 + i * 20, length: 20 })),
  literals:[{start:1,text:"7108"}],
};
/** Verified with PALME ORTAOKUL OPTİK 8050.fmt and the supplied 171-character TXT. */
export const layout8050:OpticalLayout={
  lineLength:171,
  fields:{schoolCode:{start:1,length:8},id:{start:9,length:6},grade:{start:15,length:1},branch:{start:16,length:1},name:{start:17,length:20},booklet:{start:37,length:1},identity:{start:38,length:11},examNumber:{start:169,length:1},gender:{start:170,length:1},session:{start:171,length:1}},
  lessons:["TÜRKÇE","SOSYAL","DİN","İNGİLİZCE","MATEMATİK","FEN"].map((name,i)=>({name,start:49+i*20,length:20})),
  literals:[],
};
export const opticalQuestionSchema = z.object({
  source:z.object({system:z.enum(["f","o","general"]),sheet:z.string().max(100),row:z.number().int().positive(),columns:z.array(z.string()).max(50),values:z.array(z.union([z.string(),z.number(),z.boolean(),z.null()])).max(50)}).optional(),
  lesson: z.string().trim().min(1).max(80), number: z.number().int().min(1).max(300), answer: z.string().regex(/^[ABCDEHXT]$/).transform(v=>v==="T"?"H":v),
  multipleMark:z.enum(["wrong","blank"]).optional(),
  scoreBase:z.number().finite().min(0).max(500).optional(),
  weight: z.number().positive().max(100).nullable().default(null), positions: z.record(z.string().regex(/^[A-D]$/), z.number().int().min(1).max(300)),
  outcomeCode: z.string().max(80).optional(), outcomeName: z.string().max(1000).optional(),
});
export const opticalQuestionsSchema = z.array(opticalQuestionSchema).min(1).max(300).superRefine((qs, ctx) => {
  if(qs.some(q=>q.scoreBase!==qs[0].scoreBase))ctx.addIssue({code:"custom",message:"Başlangıç puanı tüm sorularda tutarlı olmalıdır."});
  const lessons = [...new Set(qs.map(q => q.lesson))];
  const books = Object.keys(qs[0]?.positions ?? {}).sort().join("");
  if (!books.includes("A")) ctx.addIssue({ code: "custom", message: "A kitapçığı soru eşleştirmeleri gereklidir." });
  for (const lesson of lessons) {
    const rows = qs.filter(q => q.lesson === lesson).sort((a,b) => a.number-b.number);
    if (rows.some((q,i) => q.number !== i+1 || q.positions.A !== q.number || Object.keys(q.positions).sort().join("") !== books || q.weight !== rows[0].weight)) ctx.addIssue({ code: "custom", message: `${lesson}: soru sırası, kitapçıklar veya katsayılar tutarsız.` });
    for (const book of books) {
      const positions = rows.map(q => q.positions[book]).sort((a,b)=>a-b);
      if (positions.some((p,i)=>p !== i+1)) ctx.addIssue({ code: "custom", message: `${lesson} / ${book}: soru eşleştirmesi eksik veya yinelenmiş.` });
    }
  }
});
export type OpticalQuestion = z.infer<typeof opticalQuestionSchema>;
export type OpticalStudent = { id: string; name: string; school: string; branch: string; answers: string[]; booklets: Record<string,string>; sourceLines: number[]; recordBooklets?:string[]; studentNo?:string;identityHash?:string;identityEncrypted?:string; separateSession?:boolean; identityMarks?:number; schoolCode?:string; provisionalSession?:"verbal"|"numeric"; missingLessons?:string[]; sessions?:Record<string,{lessons:string[];marks:number;sourceLine:number}> };
export type OpticalData = { questions: Array<OpticalQuestion & { column: string }>; students: OpticalStudent[]; warnings: string[]; lineCount: number; diagnostics?:{rejectedLines:Array<{line:number;reason:string}>;duplicateRecords:number;missingVerbal:number;missingNumeric:number}; status?:"completed"|"completed_with_warnings"|"failed" };

export function decodeOptical(buffer: Uint8Array, encoding: "auto" | "utf-8" | "windows-1254" = "auto") {
  if (encoding !== "auto") return new TextDecoder(encoding, { fatal: true }).decode(buffer);
  if(buffer[0]===0xff&&buffer[1]===0xfe)return new TextDecoder("utf-16le",{fatal:true}).decode(buffer);
  if(buffer[0]===0xfe&&buffer[1]===0xff)return new TextDecoder("utf-16be",{fatal:true}).decode(buffer);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { return new TextDecoder("windows-1254", { fatal: true }).decode(buffer); }
}

/** Canonical A-question order; no identity numbers are returned or stored. */
export function parseOptical(txt: string, inputLayout: OpticalLayout, inputQuestions: OpticalQuestion[], school: string, options:{missingBooklet?:"A"|"B"|"C"|"D";allowMismatch?:boolean;mergeSessions?:boolean;hashIdentity?:(v:string)=>string;encryptIdentity?:(v:string)=>string}={}): OpticalData {
  inspectTxt(txt);
  const questions = opticalQuestionsSchema.parse(inputQuestions);
  const warnings: string[] = [];
  const mismatch = (message: string) => { if (!options.allowMismatch) throw new Error(message); warnings.push(message); };
  const sourceLayout = opticalLayoutSchema.parse(inputLayout);
  const questionLessons = [...new Set(questions.map(q => q.lesson))];
  if (new Set(questionLessons.map(lessonIdentity)).size !== questionLessons.length) throw new Error("Cevap anahtarında aynı derse ait birden fazla ad var. Ders adlarını düzeltin.");
  // Keep the key's lesson labels in the saved snapshot and report; only map TXT fields.
  const layout = opticalLayoutSchema.parse({...sourceLayout, lessons: sourceLayout.lessons.map(l => ({...l,
    name: questionLessons.find(name => lessonIdentity(name) === lessonIdentity(l.name)) ?? l.name,
  }))});
  if (!readerFamily(sourceLayout)&&questions.some(q => !layout.lessons.some(l => l.name === q.lesson))) mismatch("Cevap anahtarındaki bazı dersler FMT ile eşleşmiyor; okunamayan sorular boş değerlendirilecek.");
  for (const l of layout.lessons) {
    const count = questions.filter(q=>q.lesson===l.name).length;
    if (!count) continue;
    if (count > l.length) mismatch(`${l.name}: soru sayısı FMT alanıyla uyumsuz; alan dışındaki sorular boş, fazla işaretlemeler değerlendirme dışı bırakılacak.`);
  }
  const lines = txt.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  while (lines.at(-1) === "") lines.pop();
  if (!lines.length || lines.length > TXT_MAX_RECORDS) throw new Error("TXT 1–5.000 kayıt satırı içermelidir.");
  type RecordEntry={lessons:string[];chains:Map<string,string>;book:string;marks:number;sourceLine:number};
  type Entry={id:string;name:string;branch:string;grade:string;identity:string;schoolCode:string;sourceLines:number[];records:Map<string,RecordEntry>};
  const entries:Entry[]=[],seenLines=new Set<string>();
  // Candidate indexes narrow the search only; the identity/session predicate below is unchanged.
  const numberKey=(id:string)=>id.replace(/^0+(?=\d)/,"");
  const byNumber=new Map<string,Set<Entry>>(),byIdentity=new Map<string,Set<Entry>>(),order=new Map<Entry,number>();
  const indexEntry=(entry:Entry)=>{for(const [map,value]of [[byNumber,numberKey(entry.id)],[byIdentity,entry.identity]] as const){if(!value)continue;let bucket=map.get(value);if(!bucket){bucket=new Set();map.set(value,bucket);}bucket.add(entry);}};
  const diagnostics={rejectedLines:[] as Array<{line:number;reason:string}>,duplicateRecords:0,missingVerbal:0,missingNumeric:0};
  const slice=(line:string,f?:{start:number;length:number})=>f?line.slice(f.start-1,f.start-1+f.length).trim():"";
  const normalized=(v:string)=>v.trim().toLocaleUpperCase("tr-TR").replace(/\s+/g," ");
  const family=readerFamily(sourceLayout);
  const universal7108=sourceLayout.lineLength===171&&sourceLayout.fields.booklet.start===51&&(sourceLayout.literals??[]).sort((a,b)=>a.start-b.start).map(l=>l.text).join("")==="7108";
  const reject=(index:number,reason:string)=>{const message=`TXT satır ${index+1}: ${reason}`;if(!options.allowMismatch)throw Error(message);warnings.push(message);diagnostics.rejectedLines.push({line:index+1,reason});};
  lines.forEach((line,index)=>{
    const label=`TXT satır ${index+1}`;
    if(!line.trim()){reject(index,"boş satır atlandı.");return;}
    if(seenLines.has(line)){diagnostics.duplicateRecords++;warnings.push(`${label}: yinelenen TXT satırı atlandı; öğrenci ikinci kez sayılmadı.`);return;}seenLines.add(line);
    const variant=recordLayout(sourceLayout,line,family??null);
    if(family&&!variant){reject(index,"doğrulanmış kayıt türü bulunamadı; satır atlandı.");return;}
    if(variant&&"warning" in variant)warnings.push(`${label}: ${variant.warning}`);
    const rowLayout=variant?.layout??sourceLayout;
    const lessons=rowLayout.lessons.map(l=>({...l,name:questionLessons.find(name=>lessonIdentity(name)===lessonIdentity(l.name))??l.name}));
    if(line.length!==rowLayout.lineLength)mismatch(`${label}: ${rowLayout.lineLength} karakter bekleniyor, ${line.length} bulundu. Mevcut konumlar korundu; yalnız tamamı mevcut cevap alanları okundu. Eksik alanlar değerlendirilmedi; yanlış konumdan okuma yapılmadı.`);
    if((rowLayout.literals??[]).some(l=>line.slice(l.start-1,l.start-1+l.text.length)!==l.text)){reject(index,"FMT sabit alanı eşleşmiyor; satır atlandı.");return;}
    const f=rowLayout.fields;
    if([f.name,f.surname,f.booklet].some(v=>v&&v.start+v.length-1>line.length)){reject(index,"kimlik / kitapçık alanları eksik; satır atlandı.");return;}
    if(/[\x00-\x1f\x7f\ufffd]/.test(line)){reject(index,"kontrol karakteri veya çözümlenemeyen karakter var; kodlamayı kontrol edin.");return;}
    let id=slice(line,f.id),identity=slice(line,f.identity);
    // Empty/placeholder identity fields cannot establish a match.
    if(/^(0+|\*+|-+)$/.test(identity))identity="";
    if(family&&identity&&!/^\d{11}$/.test(identity)){warnings.push(`${label}: kimlik alanı geçersiz; eşleştirmede öğrenci no, ad ve kurum bilgileri kullanılacak.`);identity="";}
    const name=[slice(line,f.name),slice(line,f.surname)].filter(Boolean).join(" ").replace(/\s+/g," "),grade=slice(line,f.grade),branch=slice(line,f.branch),schoolCode=slice(line,f.schoolCode);
    if(!id&&!identity&&!name){reject(index,"öğrenci no, kimlik ve ad boş; kayıt tanımlanamıyor.");return;}
    if(!id&&!identity)warnings.push(`${label}: öğrenci numarası ve kimlik boş; kayıt ayrı tutuldu, numara üretilmedi.`);
    if(f.grade&&grade&&!/^\d{1,2}$/.test(grade)){reject(index,"sınıf alanı geçersiz; FMT konumlarını kontrol edin.");return;}
    let book=slice(line,f.booklet).toUpperCase();
    if(!book){book="A";warnings.push(`${label}: boş kitapçık için varsayılan A kitapçığı kabul edildi; sonucu etkileyebilir.`);}
    if(!/^[A-D]$/.test(book)||questions.some(q=>lessons.some(l=>l.name===q.lesson)&&!q.positions[book])){reject(index,`kitapçık türü eksik/geçersiz veya anahtarda tanımlı değil; konum: ${f.booklet.start}-${f.booklet.start+f.booklet.length-1}.`);return;}
    const chains=new Map<string,string>();
    for(const l of lessons){
      const count=questions.filter(q=>q.lesson===l.name).length;if(!count)continue;
      if(line.length<l.start+l.length-1){warnings.push(`${label} / ${l.name}: cevap alanı eksik; ders değerlendirilmedi.`);continue;}
      let raw=line.slice(l.start-1,l.start-1+l.length).toUpperCase();
      if(/[^ABCDE* .-]/.test(raw)){mismatch(`${label} / ${l.name}: cevap alanında geçersiz karakterler boş sayıldı.`);raw=raw.replace(/[^ABCDE* .-]/g," ");}
      if(raw.slice(count).replace(/[ .-]/g,"").length)mismatch(`${label} / ${l.name}: cevap anahtarındaki soru sayısından sonraki işaretlemeler değerlendirme dışı bırakıldı.`);
      chains.set(l.name,raw.slice(0,count).replace(/[.-]/g," "));
    }
    if(!chains.size){reject(index,"güvenilir biçimde okunabilen ders alanı yok.");return;}
    // Explicit family sessions retain blank-but-present fields. Legacy layouts without a
    // session marker keep complementary marked lesson groups for backwards compatibility.
    let universalSession="single";
    if(universal7108){const marker=slice(line,f.session),numeric=(l:string)=>["MATEMATIK","FEN"].includes(lessonIdentity(l)),marked=(wantNumeric:boolean)=>[...chains].some(([l,a])=>numeric(l)===wantNumeric&&a.trim());
      const complementary=marker===""&&marked(true)!==marked(false)&&lines.some(other=>{if(other===line||other.length!==line.length)return false;const otherName=[slice(other,f.name),slice(other,f.surname)].filter(Boolean).join(" ");if(!name||normalized(otherName)!==normalized(name))return false;const samePerson=(!!id&&slice(other,f.id)===id)||(!!identity&&slice(other,f.identity)===identity);if(!samePerson||(schoolCode&&slice(other,f.schoolCode)&&slice(other,f.schoolCode)!==schoolCode)||(grade&&slice(other,f.grade)&&slice(other,f.grade)!==grade)||(branch&&slice(other,f.branch)&&slice(other,f.branch)!==branch))return false;const otherMarked=(want:boolean)=>lessons.some(l=>numeric(l.name)===want&&other.slice(l.start-1,l.start-1+l.length).trim());return marked(true)&&!marked(false)&&otherMarked(false)&&!otherMarked(true)||marked(false)&&!marked(true)&&otherMarked(true)&&!otherMarked(false);});
      if((marker==="1"||complementary)&&!marked(true)){universalSession="verbal";for(const l of chains.keys())if(numeric(l))chains.delete(l);}
      else if((marker==="2"||complementary)&&!marked(false)){universalSession="numeric";for(const l of chains.keys())if(!numeric(l))chains.delete(l);}
    }else if(!variant)for(const [lesson,chain]of chains)if(!chain.trim())chains.delete(lesson);
    if(!chains.size&&!variant){for(const l of lessons)if(questions.some(q=>q.lesson===l.name)&&line.length>=l.start+l.length-1)chains.set(l.name,"");}
    const marks=[...chains.values()].reduce((n,v)=>n+(v.match(/[ABCDE]/g)?.length??0),0);
    const session=(universal7108?universalSession:variant?.session)||(slice(line,f.session)?`session:${slice(line,f.session)}`:[...chains.keys()].sort().join("|"));
    const pool=new Set([...(byNumber.get(numberKey(id))??[]),...(identity?byIdentity.get(identity)??[]:[])]);
    const candidates=options.mergeSessions===false?[]:[...pool].sort((a,b)=>order.get(a)!-order.get(b)!).filter(e=>{
      if(e.schoolCode&&schoolCode&&e.schoolCode!==schoolCode)return false;
      if(e.identity&&identity&&e.identity!==identity){
        const sameHeader=!!id&&e.id.replace(/^0+(?=\d)/,"")===id.replace(/^0+(?=\d)/,"")&&!!name&&!!e.name&&normalized(e.name)===normalized(name)&&!!schoolCode&&schoolCode===e.schoolCode&&!!branch&&branch===e.branch&&!!grade&&grade===e.grade;
        const differs=Array.from(identity).filter((c,i)=>c!==e.identity[i]).length;
        if(!sameHeader||differs!==1||validNationalIdentity(identity)&&validNationalIdentity(e.identity))return false;
        return true;
      }
      if(e.grade&&grade&&e.grade!==grade)return false;
      if(e.identity&&identity&&e.identity===identity)return true;
      return !!id&&e.id.replace(/^0+(?=\d)/,"")===id.replace(/^0+(?=\d)/,"")&&
       (!!e.name&&!!name&&normalized(e.name)===normalized(name))&&(!e.branch||!branch||e.branch===branch);
    });
    let entry=candidates.length===1?candidates[0]:undefined;
    if(!entry&&id&&byNumber.has(numberKey(id)))warnings.push(`${label}: aynı numarada kimlik bilgileri çelişiyor veya eşleştirme belirsiz; kayıtlar ayrı tutuldu.`);
    if(!entry){entry={id,name,branch,grade,identity,schoolCode,sourceLines:[],records:new Map()};order.set(entry,entries.length);entries.push(entry);}
    if(entry.identity&&identity&&entry.identity!==identity)warnings.push(`${label}: kimlikte tek karakterlik olası okuma hatası; kurum, numara, sınıf/şube ve ad eşleşmesiyle oturumlar birleştirildi. Kontrol edin.`);
    if(entry.name&&name&&normalized(entry.name)!==normalized(name))warnings.push(`${label}: güvenilir kimlik eşleşti ancak ad bilgileri çelişiyor; ilk ad korundu.`);
    if(identity&&validNationalIdentity(identity)&&!validNationalIdentity(entry.identity))entry.identity=identity;
    entry.name||=name;entry.grade||=grade;entry.branch||=branch;entry.identity||=identity;entry.id||=id;entry.schoolCode||=schoolCode;entry.sourceLines.push(index+1);indexEntry(entry);
    const old=entry.records.get(session);
    if(old){diagnostics.duplicateRecords++;warnings.push(`${label}: aynı oturum tekrar okundu; en fazla geçerli işaretlemesi bulunan kayıt bütünüyle seçildi, eşitlikte ilk kayıt korundu.`);if(marks<=old.marks)return;}
    entry.records.set(session,{lessons:[...chains.keys()],chains,book,marks,sourceLine:index+1});
  });
  const repeatedHeaders=new Map<string,number>();
  for(const entry of entries){const key=JSON.stringify([entry.grade,entry.id]);repeatedHeaders.set(key,(repeatedHeaders.get(key)??0)+1);}
  const students:OpticalStudent[]=entries.flatMap((entry,index)=>{
    if(!entry.name)warnings.push(`TXT satır ${entry.sourceLines[0]}: ad soyad boş; kaynak bilgi uydurulmadı.`);
    const chains=new Map<string,string>(),booklets:Record<string,string>={},sessions:NonNullable<OpticalStudent["sessions"]>={};
    // A full single-optic record is a whole-record alternative to a split pair.
    let records=[...entry.records.entries()];
    if(entry.records.has("single")&&(entry.records.has("verbal")||entry.records.has("numeric"))){
      const split=records.filter(([k])=>k!=="single"),single=entry.records.get("single")!;
      records=single.marks>=split.reduce((n,[,r])=>n+r.marks,0)?[["single",single]]:split;
      warnings.push(`${entry.id}: tek optik ve ayrı oturumlar birlikte bulundu; en dolu bütün okuma seçildi.`);
    }
    for(const [session,r]of records){sessions[session]={lessons:r.lessons,marks:r.marks,sourceLine:r.sourceLine};for(const [lesson,chain]of r.chains){chains.set(lesson,chain);booklets[lesson]=r.book;}}
    const missingLessons=questionLessons.filter(l=>!chains.has(l));
    if(missingLessons.length)warnings.push(`${entry.id}: eksik oturum / okunamayan dersler: ${missingLessons.join(", ")}; net ve puan hesaplanmadı.`);
    if(family||universal7108){if(!records.some(([k])=>k==="single"||k==="verbal"))diagnostics.missingVerbal++;if(!records.some(([k])=>k==="single"||k==="numeric"))diagnostics.missingNumeric++;}
    let id=entry.id;if(!id&&entry.identity&&options.hashIdentity)id=`tc-${options.hashIdentity(entry.identity).slice(0,16)}`;
    const noStudentNumber=!entry.id;
    if(!id)id=`row-${entry.sourceLines[0]}`;
    if(options.hashIdentity&&/^\d{11}$/.test(id)){entry.identity||=id;id=`tc-${options.hashIdentity(entry.identity).slice(0,16)}`;}
    const allChains=[...chains];const markedNumeric=allChains.some(([l,a])=>["MATEMATIK","FEN"].includes(lessonIdentity(l))&&a.trim()),markedVerbal=allChains.some(([l,a])=>!["MATEMATIK","FEN"].includes(lessonIdentity(l))&&a.trim());
    const provisionalSession=universal7108&&sessions.single&&markedNumeric!==markedVerbal?(markedNumeric?"numeric":"verbal"):undefined;
    const repeated=(repeatedHeaders.get(JSON.stringify([entry.grade,entry.id]))??0)>1;
    return [{id:repeated?`${id}-O${entry.sourceLines[0]}`:id,...(repeated||options.mergeSessions===false||noStudentNumber?{studentNo:entry.id}:{}),...(options.mergeSessions===false?{separateSession:true}:{}),
      ...(entry.identity&&options.hashIdentity?{identityHash:options.hashIdentity(entry.identity)}:{}),...(entry.identity&&options.encryptIdentity?{identityEncrypted:options.encryptIdentity(entry.identity)}:{}),
      name:entry.name,school,schoolCode:entry.schoolCode,branch:[entry.grade,entry.branch].filter(Boolean).join("-")||"Belirtilmedi",booklets,recordBooklets:[...new Set(records.map(([,r])=>r.book))],sourceLines:entry.sourceLines,
      ...(provisionalSession?{provisionalSession}:{}),sessions,missingLessons,identityMarks:records.reduce((n,[,r])=>n+r.marks,0),answers:questions.map(q=>chains.get(q.lesson)?.[q.positions[booklets[q.lesson]]-1]?.trim()??"")}];
  });
  if(students.length>TXT_MAX_RECORDS)throw Error("Bir değerlendirmede en fazla 5.000 öğrenci desteklenir.");
  return {questions:questions.map(q=>({...q,column:`${q.lesson} | ${q.number}`})),students,warnings,lineCount:lines.length,diagnostics,status:!students.length?"failed":warnings.length?"completed_with_warnings":"completed"};
}

export function opticalSummary(data: OpticalData, penalty: number) {
  return data.students.map(student => {
    const lessons = [...new Set(data.questions.map(q=>q.lesson))].map(lesson=> {
      const missing=student.missingLessons?.includes(lesson)??false;
      let correct=0,wrong=0,blank=0,cancelled=0;
      data.questions.forEach((q,i)=>{if(q.lesson!==lesson||missing)return; if(q.answer==="X")cancelled++;else if(q.answer==="H" || student.answers[i]===q.answer)correct++;else if(!student.answers[i]||student.answers[i]==="*"&&q.multipleMark==="blank")blank++;else wrong++;});
      const net=correct-(penalty ? wrong/penalty : 0), weight=data.questions.find(q=>q.lesson===lesson)!.weight;
      return {lesson,correct,wrong,blank,cancelled,net:missing?null:net,weighted:missing||weight===null?null:net*weight,...(missing?{missing:true}:{})};
    });
    const maximum=data.questions.reduce((s,q)=>s+(q.answer==="X"?0:q.weight??0),0), weighted=lessons.reduce((s,l)=>s+(l.weighted??0),0);
    return {id:student.id,lessons,net:lessons.reduce((s,l)=>s+(l.net??0),0),score:student.missingLessons?.length?null:data.questions.some(q=>q.answer!=="X"&&q.weight===null)?null:data.questions[0]?.scoreBase!==undefined?data.questions[0].scoreBase+weighted:maximum?Math.max(0,Math.min(500,weighted/maximum*500)):null};
  });
}

export function validNationalIdentity(value:string){if(!/^[1-9]\d{10}$/.test(value))return false;const d=[...value].map(Number);return ((d[0]+d[2]+d[4]+d[6]+d[8])*7-(d[1]+d[3]+d[5]+d[7]))%10===d[9]&&d.slice(0,10).reduce((a,b)=>a+b,0)%10===d[10];}
