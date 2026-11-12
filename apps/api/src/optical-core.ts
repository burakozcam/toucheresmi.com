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
  weight: z.number().positive().max(100).nullable().default(null), positions: z.record(z.string().regex(/^[A-D]$/), z.number().int().min(1).max(300)),
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
export function parseOptical(txt: string, inputLayout: OpticalLayout, inputQuestions: OpticalQuestion[], school: string, options:{allowMismatch?:boolean;mergeSessions?:boolean;hashIdentity?:(v:string)=>string;encryptIdentity?:(v:string)=>string}={}): OpticalData {
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
  if (questions.some(q => !layout.lessons.some(l => l.name === q.lesson))) mismatch("Cevap anahtarındaki bazı dersler FMT ile eşleşmiyor; okunamayan sorular boş değerlendirilecek.");
  for (const l of layout.lessons) {
    const count = questions.filter(q=>q.lesson===l.name).length;
    if (!count || count > l.length) mismatch(`${l.name}: soru sayısı FMT alanıyla uyumsuz; alan dışındaki sorular boş, fazla işaretlemeler değerlendirme dışı bırakılacak.`);
  }
  const lines = txt.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  while (lines.at(-1) === "") lines.pop();
  if (!lines.length || lines.length > 2000) throw new Error("TXT 1–2000 kayıt satırı içermelidir.");
  type Entry = { id: string; name: string; branch: string; grade: string; chains: Map<string,string>; booklets: Record<string,string>; sourceLines: number[];recordBooklets:Set<string>;identity?:string; marks:number };
  const identities=new Map<string,Entry>(),numbers=new Map<string,Entry>();
  const entries = new Map<string,Entry>(), seenLines = new Set<string>();
  const slice = (line: string, f?: {start:number;length:number}) => f ? line.slice(f.start-1, f.start-1+f.length).trim() : "";
  lines.forEach((line, index) => {
    const label = `TXT satır ${index+1}`;
    if (seenLines.has(line)) { mismatch(`${label}: yinelenen TXT satırı atlandı; öğrenci ikinci kez sayılmadı.`); return; }
    seenLines.add(line);
    if (!line.trim()) { mismatch(`${label}: boş satır atlandı.`); return; }
    if (line.length !== layout.lineLength) mismatch(`${label}: ${layout.lineLength} karakter bekleniyor, ${line.length} bulundu. Mevcut konumlar korundu; eksik alanlar boş değerlendirildi, satır sonundaki fazla alanlar kullanılmadı. FMT farklıysa cevaplar yanlış konumdan okunmuş olabilir.`);
    for(const literal of layout.literals??[])if(line.slice(literal.start-1,literal.start-1+literal.text.length)!==literal.text)mismatch(`${label}: FMT sabit alanı eşleşmiyor; seçili alan konumlarıyla okundu. Yanlış FMT cevapları kaydırabilir.`);
    const f = layout.fields; let id = slice(line, f.id), identity = slice(line, f.identity), name = [slice(line,f.name),slice(line,f.surname)].filter(Boolean).join(" ").replace(/\s+/g," ");
    const grade = slice(line,f.grade), branch = slice(line,f.branch); let book = slice(line,f.booklet).toUpperCase();
    if (/[\x00-\x1f\x7f\ufffd]/.test(line)) mismatch(`${label}: kontrol karakteri veya çözümlenemeyen karakter var; okunamayan cevaplar boş sayıldı. Kodlama ad ve cevapları etkilemiş olabilir.`);
    const position=(field:{start:number;length:number})=>`${field.start}-${field.start+field.length-1} (1 tabanlı)`;
    if (!name) mismatch(`${label}: ad soyad alanı boş. Ad konumu: ${position(f.name)}; FMT eşleştirmesini kontrol edin.`);
    if (!id && !identity) { mismatch(`${label}: öğrenci no ve kimlik boş; satıra özel numara verildi, diğer oturumlarla birleştirilemedi.`); id=`satir-${index+1}`; }
    if (!/^[A-D]$/.test(book)) { if(!options.allowMismatch)throw new Error(`${label}: kitapçık türü eksik/geçersiz. Beklenen A/B/C/D; konum: ${position(f.booklet)}.`); mismatch(`${label}: kitapçık eksik/geçersiz; A kitapçığı varsayıldı. Gerçek kitapçık farklıysa sonuçlar hatalı olabilir.`); book="A"; }
    if (!questions.every(q=>q.positions[book])) mismatch(`${label}: ${book} kitapçığı anahtarda tanımlı değil; eşleştirilemeyen cevaplar boş değerlendirilecek.`);
    const numberKey=`${grade}:${id.replace(/^0+(?=\d)/,"")}`;
    const existing=options.mergeSessions===false?undefined:(identity?identities.get(identity):undefined)??(id?numbers.get(numberKey):undefined);
    if(existing?.identity&&identity&&existing.identity!==identity)mismatch(`${label}: aynı numara farklı kimliklerde kullanılmış; numaraya göre birleştirildi. Farklı öğrenciler birleşmiş olabilir.`);
    const entry:Entry=existing??{id,name,branch,grade,chains:new Map(),booklets:{},sourceLines:[],recordBooklets:new Set<string>(),identity,marks:0};
    const key=existing?[...entries].find(([,value])=>value===existing)![0]:`row:${index}`;
    const marks=layout.lessons.reduce((n,l)=>n+(line.slice(l.start-1,l.start-1+l.length).match(/[ABCDE*]/gi)?.length??0),0);
    if (entry.name !== name || entry.grade !== grade || (entry.branch && branch && entry.branch !== branch)) { mismatch(`${label}: aynı öğrenciye ait oturumların kimlik bilgileri çelişiyor; daha çok işaretlemeli kaydın ad/sınıf bilgileri kullanıldı. Yanlış öğrenci eşleşmesi olabilir.`); if(marks>entry.marks){entry.name=name;entry.grade=grade;entry.branch=branch;} }
    entry.marks=Math.max(entry.marks,marks);
    entry.id ||= id; entry.branch ||= branch; entry.sourceLines.push(index+1); entry.recordBooklets.add(book);
    for (const lesson of layout.lessons) {
      const count = questions.filter(q=>q.lesson===lesson.name).length;
      let raw = line.slice(lesson.start-1, lesson.start-1+lesson.length).toUpperCase();
      if (/[^ABCDE* .-]/.test(raw)) { mismatch(`${label} / ${lesson.name}: cevap alanında geçersiz karakterler boş sayıldı; doğru/yanlış/net değişebilir.`); raw=raw.replace(/[^ABCDE* .-]/g," "); }
      if (raw.slice(count).trim().replace(/[-.]/g,"")) mismatch(`${label} / ${lesson.name}: cevap anahtarındaki soru sayısından sonraki işaretlemeler değerlendirme dışı bırakıldı.`);
      const chain = raw.slice(0,count).replace(/[ .-]/g," ");
      if (!chain.trim()) continue;
      if (!questions.filter(q=>q.lesson===lesson.name).every(q=>q.positions[book])) mismatch(`${label}: ${book} kitapçığı anahtarda tanımlı değil; eşleştirilemeyen cevaplar boş değerlendirilecek.`);
      if (entry.chains.has(lesson.name)) { mismatch(`${label}: ${lesson.name} için ikinci kayıt birleştirildi; daha çok işaretlemeli ders kaydı kullanıldı, eşitlikte ilk kayıt korundu. Çelişen cevaplar neti etkileyebilir.`); if(chain.replace(/ /g,"").length <= entry.chains.get(lesson.name)!.replace(/ /g,"").length) continue; }
      entry.chains.set(lesson.name,chain); entry.booklets[lesson.name]=book;
    }
    entries.set(key,entry);if(identity){entry.identity??=identity;identities.set(identity,entry);}if(id)numbers.set(numberKey,entry);
  });
  const seen = new Set<string>();
  const students = [...entries.values()].map(entry => {
    if(options.hashIdentity&&/^\d{11}$/.test(entry.id)){entry.identity??=entry.id;if(entry.identity===entry.id)entry.id=`tc-${options.hashIdentity(entry.identity).slice(0,16)}`;}
    if(!entry.id&&entry.identity&&options.hashIdentity)entry.id=`tc-${options.hashIdentity(entry.identity).slice(0,16)}`;
    if (!entry.id) throw new Error(`TXT satır ${entry.sourceLines.join(", ")}: birleştirilen oturumlarda öğrenci numarası bulunamadı.`);
    const identifier = `${entry.grade}:${entry.id}`;
    if (options.mergeSessions!==false&&seen.has(identifier)) throw new Error(`Öğrenci numarası ${entry.id} için farklı kimlikler var; yanlış kurum veya tekrar kaydı kontrol edin.`);
    seen.add(identifier);
    const missing = questionLessons.filter(name=>!entry.chains.has(name));
    if (missing.length) warnings.push(`${entry.id}: ${missing.join(", ")} alanları tamamen boş; bu dersler boş cevap olarak değerlendirilecek.`);
    const repeated=options.mergeSessions===false&&[...entries.values()].filter(other=>other.grade===entry.grade&&other.id===entry.id).length>1;
    return {id:repeated?`${entry.id}-O${entry.sourceLines[0]}`:entry.id,...(options.mergeSessions===false?{studentNo:entry.id,separateSession:true}:{}),
      ...(entry.identity&&options.hashIdentity?{identityHash:options.hashIdentity(entry.identity)}:{}),...(entry.identity&&options.encryptIdentity?{identityEncrypted:options.encryptIdentity(entry.identity)}:{}),name:entry.name||`Öğrenci ${entry.id}`, school, branch:[entry.grade,entry.branch].filter(Boolean).join("-") || "Belirtilmedi", booklets:entry.booklets, recordBooklets:[...entry.recordBooklets], sourceLines:entry.sourceLines,
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
      return {lesson,correct,wrong,blank,cancelled,net,weighted:weight===null?null:net*weight};
    });
    const maximum=data.questions.reduce((s,q)=>s+(q.answer==="X"?0:q.weight??0),0), weighted=lessons.reduce((s,l)=>s+(l.weighted??0),0);
    return {id:student.id,lessons,net:lessons.reduce((s,l)=>s+l.net,0),score:data.questions.some(q=>q.answer!=="X"&&q.weight===null)?null:maximum?Math.max(0,Math.min(500,weighted/maximum*500)):null};
  });
}
