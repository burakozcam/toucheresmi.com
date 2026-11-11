import { z } from "zod";
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
  lesson: z.string().trim().min(1).max(80), number: z.number().int().min(1).max(300), answer: z.string().regex(/^[ABCDEHX]$/),
  weight: z.number().positive().max(100), positions: z.record(z.string().regex(/^[A-D]$/), z.number().int().min(1).max(300)),
  outcomeCode: z.string().max(80).optional(), outcomeName: z.string().max(1000).optional(),
});
export const opticalQuestionsSchema = z.array(opticalQuestionSchema).min(1).max(300).superRefine((qs, ctx) => {
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
export type OpticalStudent = { id: string; name: string; school: string; branch: string; answers: string[]; booklets: Record<string,string>; sourceLines: number[]; recordBooklets?:string[]; studentNo?:string;identityHash?:string;identityEncrypted?:string; separateSession?:boolean };
export type OpticalData = { questions: Array<OpticalQuestion & { column: string }>; students: OpticalStudent[]; warnings: string[]; lineCount: number };

export function decodeOptical(buffer: Uint8Array, encoding: "auto" | "utf-8" | "windows-1254" = "auto") {
  if (encoding !== "auto") return new TextDecoder(encoding, { fatal: true }).decode(buffer);
  if(buffer[0]===0xff&&buffer[1]===0xfe)return new TextDecoder("utf-16le",{fatal:true}).decode(buffer);
  if(buffer[0]===0xfe&&buffer[1]===0xff)return new TextDecoder("utf-16be",{fatal:true}).decode(buffer);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { return new TextDecoder("windows-1254", { fatal: true }).decode(buffer); }
}

/** Canonical A-question order; no identity numbers are returned or stored. */
export function parseOptical(txt: string, inputLayout: OpticalLayout, inputQuestions: OpticalQuestion[], school: string, options:{mergeSessions?:boolean;hashIdentity?:(v:string)=>string;encryptIdentity?:(v:string)=>string}={}): OpticalData {
  const questions = opticalQuestionsSchema.parse(inputQuestions);
  const sourceLayout = opticalLayoutSchema.parse(inputLayout);
  const questionLessons = [...new Set(questions.map(q => q.lesson))];
  if (new Set(questionLessons.map(lessonIdentity)).size !== questionLessons.length) throw new Error("Cevap anahtarında aynı derse ait birden fazla ad var. Ders adlarını düzeltin.");
  // Keep the key's lesson labels in the saved snapshot and report; only map TXT fields.
  const layout = opticalLayoutSchema.parse({...sourceLayout, lessons: sourceLayout.lessons.map(l => ({...l,
    name: questionLessons.find(name => lessonIdentity(name) === lessonIdentity(l.name)) ?? l.name,
  }))});
  if (questions.some(q => !layout.lessons.some(l => l.name === q.lesson))) throw new Error("Cevap anahtarındaki dersler seçilen FMT ile eşleşmiyor.");
  for (const l of layout.lessons) {
    const count = questions.filter(q=>q.lesson===l.name).length;
    if (!count || count > l.length) throw new Error(`${l.name}: soru sayısı FMT alanıyla uyumsuz.`);
  }
  const lines = txt.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  while (lines.at(-1) === "") lines.pop();
  if (!lines.length || lines.length > 2000) throw new Error("TXT 1–2000 kayıt satırı içermelidir.");
  type Entry = { id: string; name: string; branch: string; grade: string; chains: Map<string,string>; booklets: Record<string,string>; sourceLines: number[];recordBooklets:Set<string>;identity?:string };
  const identities=new Map<string,Entry>(),numbers=new Map<string,Entry>();
  const entries = new Map<string,Entry>(), seenLines = new Set<string>();
  const slice = (line: string, f?: {start:number;length:number}) => f ? line.slice(f.start-1, f.start-1+f.length).trim() : "";
  lines.forEach((line, index) => {
    const label = `TXT satır ${index+1}`;
    if (seenLines.has(line)) throw new Error(`${label}: yinelenen TXT satırı. Tekrarı kaldırın.`);
    seenLines.add(line);
    if (line.length !== layout.lineLength) throw new Error(`${label}: ${layout.lineLength} karakter bekleniyor, ${line.length} bulundu. Boşlukları koruyun ve FMT/kodlamayı kontrol edin.`);
    for(const literal of layout.literals??[])if(line.slice(literal.start-1,literal.start-1+literal.text.length)!==literal.text)throw new Error(`${label}: FMT sabit alanı eşleşmiyor. Kaynak formatı kontrol edin.`);
    const f = layout.fields, id = slice(line, f.id), identity = slice(line, f.identity), name = [slice(line,f.name),slice(line,f.surname)].filter(Boolean).join(" ").replace(/\s+/g," ");
    const grade = slice(line,f.grade), branch = slice(line,f.branch), book = slice(line,f.booklet).toUpperCase();
    if (/[\x00-\x1f\x7f\ufffd]/.test(line)) throw new Error(`${label}: kontrol karakteri veya çözümlenemeyen karakter var. Kaynak kodlamasını kontrol edin.`);
    const position=(field:{start:number;length:number})=>`${field.start}-${field.start+field.length-1} (1 tabanlı)`;
    if (!name) throw new Error(`${label}: ad soyad alanı boş. Ad konumu: ${position(f.name)}; FMT eşleştirmesini kontrol edin.`);
    if (!id && !identity) throw new Error(`${label}: öğrenci no ve eşleştirme kimliği boş. Öğrenci no konumu: ${position(f.id)}.`);
    if (!/^[A-D]$/.test(book)) throw new Error(`${label}: kitapçık türü eksik/geçersiz. Beklenen A/B/C/D; konum: ${position(f.booklet)}. FMT/kodlamayı kontrol edin.`);
    if (!questions.every(q=>q.positions[book])) throw new Error(`${label}: ${book} kitapçığı anahtarda tanımlı değil.`);
    const numberKey=`${grade}:${id.replace(/^0+(?=\d)/,"")}`;
    const existing=options.mergeSessions===false?undefined:(identity?identities.get(identity):undefined)??(id?numbers.get(numberKey):undefined);
    if(existing?.identity&&identity&&existing.identity!==identity)throw new Error(`${label}: aynı numara farklı kimliklerde kullanılmış.`);
    const entry:Entry=existing??{id,name,branch,grade,chains:new Map(),booklets:{},sourceLines:[],recordBooklets:new Set<string>(),identity};
    const key=existing?[...entries].find(([,value])=>value===existing)![0]:`row:${index}`;
    if (entry.name !== name || entry.grade !== grade || (entry.branch && branch && entry.branch !== branch)) throw new Error(`${label}: aynı öğrenciye ait oturumların kimlik bilgileri çelişiyor.`);
    entry.id ||= id; entry.branch ||= branch; entry.sourceLines.push(index+1); entry.recordBooklets.add(book);
    for (const lesson of layout.lessons) {
      const count = questions.filter(q=>q.lesson===lesson.name).length;
      const raw = line.slice(lesson.start-1, lesson.start-1+lesson.length).toUpperCase();
      if (/[^ABCDE* .-]/.test(raw)) throw new Error(`${label} / ${lesson.name}: cevap alanında geçersiz karakter var.`);
      if (raw.slice(count).trim().replace(/[-.]/g,"")) throw new Error(`${label} / ${lesson.name}: cevap anahtarındaki soru sayısından sonra işaretleme var.`);
      const chain = raw.slice(0,count).replace(/[ .-]/g," ");
      if (!chain.trim()) continue;
      if (!questions.filter(q=>q.lesson===lesson.name).every(q=>q.positions[book])) throw new Error(`${label}: ${book} kitapçığı anahtarda tanımlı değil.`);
      if (entry.chains.has(lesson.name)) throw new Error(`${label}: ${lesson.name} için aynı öğrenciye ikinci kayıt var. Yinelenen satırı kaldırın.`);
      entry.chains.set(lesson.name,chain); entry.booklets[lesson.name]=book;
    }
    entries.set(key,entry);if(identity){entry.identity=identity;identities.set(identity,entry);}if(id)numbers.set(numberKey,entry);
  });
  const warnings: string[] = [], seen = new Set<string>();
  const students = [...entries.values()].map(entry => {
    if(options.hashIdentity&&/^\d{11}$/.test(entry.id)){entry.identity??=entry.id;if(entry.identity===entry.id)entry.id=`tc-${options.hashIdentity(entry.identity).slice(0,16)}`;}
    if(!entry.id&&entry.identity&&options.hashIdentity)entry.id=`tc-${options.hashIdentity(entry.identity).slice(0,16)}`;
    if (!entry.id) throw new Error(`TXT satır ${entry.sourceLines.join(", ")}: birleştirilen oturumlarda öğrenci numarası bulunamadı.`);
    const identifier = `${entry.grade}:${entry.id}`;
    if (options.mergeSessions!==false&&seen.has(identifier)) throw new Error(`Öğrenci numarası ${entry.id} için farklı kimlikler var; yanlış kurum veya tekrar kaydı kontrol edin.`);
    seen.add(identifier);
    const missing = layout.lessons.filter(l=>!entry.chains.has(l.name)).map(l=>l.name);
    if (missing.length) warnings.push(`${entry.id}: ${missing.join(", ")} alanları tamamen boş; bu dersler boş cevap olarak değerlendirilecek.`);
    const repeated=options.mergeSessions===false&&[...entries.values()].filter(other=>other.grade===entry.grade&&other.id===entry.id).length>1;
    return {id:repeated?`${entry.id}-O${entry.sourceLines[0]}`:entry.id,...(options.mergeSessions===false?{studentNo:entry.id,separateSession:true}:{}),
      ...(entry.identity&&options.hashIdentity?{identityHash:options.hashIdentity(entry.identity)}:{}),...(entry.identity&&options.encryptIdentity?{identityEncrypted:options.encryptIdentity(entry.identity)}:{}),name:entry.name, school, branch:[entry.grade,entry.branch].filter(Boolean).join("-") || "Belirtilmedi", booklets:entry.booklets, recordBooklets:[...entry.recordBooklets], sourceLines:entry.sourceLines,
      answers:questions.map(q=>{ const chain=entry.chains.get(q.lesson); return chain ? chain[q.positions[entry.booklets[q.lesson]]-1]?.trim() ?? "" : ""; })};
  });
  if (students.length > 500) throw new Error("Bir değerlendirmede en fazla 500 öğrenci desteklenir.");
  return {questions:questions.map(q=>({...q,column:`${q.lesson} | ${q.number}`})),students,warnings,lineCount:lines.length};
}

export function opticalSummary(data: OpticalData, penalty: number) {
  return data.students.map(student => {
    const lessons = [...new Set(data.questions.map(q=>q.lesson))].map(lesson=> {
      let correct=0,wrong=0,blank=0,cancelled=0;
      data.questions.forEach((q,i)=>{if(q.lesson!==lesson)return; if(q.answer==="X")cancelled++;else if(q.answer==="H" || student.answers[i]===q.answer)correct++;else if(!student.answers[i])blank++;else wrong++;});
      const net=correct-(penalty ? wrong/penalty : 0), weight=data.questions.find(q=>q.lesson===lesson)!.weight;
      return {lesson,correct,wrong,blank,cancelled,net,weighted:net*weight};
    });
    const maximum=data.questions.reduce((s,q)=>s+(q.answer==="X"?0:q.weight),0), weighted=lessons.reduce((s,l)=>s+l.weighted,0);
    return {id:student.id,lessons,net:lessons.reduce((s,l)=>s+l.net,0),score:maximum?Math.max(0,Math.min(500,weighted/maximum*500)):0};
  });
}
