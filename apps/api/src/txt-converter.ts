import { opticalLayoutSchema, type OpticalLayout } from "./optical-core";
export type ConversionIssue={line:number;field:string;kind:"error"|"loss"|"warning";message:string};
export type ConversionOptions={lessonMap?:Record<string,string>;allowLoss?:boolean;lineEnding?:"crlf"|"lf";encoding?:"windows-1254"|"utf-8"};
const labels:Record<string,string>={id:"Öğrenci no",name:"Ad",surname:"Soyad",grade:"Sınıf",branch:"Şube",booklet:"Kitapçık",identity:"TC/Tel",schoolCode:"Kurum kodu",gender:"Cinsiyet",session:"Oturum",examNumber:"Sınav numarası"};
export function normalizeLesson(name:string){const n=name.trim().toLocaleUpperCase("tr-TR");return({"İNKILAP":"SOSYAL","SOSYAL BİLGİLER":"SOSYAL","TARİH":"SOSYAL","DİN KÜLTÜRÜ":"DİN","FEN BİLİMLERİ":"FEN"}as Record<string,string>)[n]??n;}
export function encodeTxt(text:string,encoding:"windows-1254"|"utf-8"):Buffer {
  if(encoding==="utf-8")return Buffer.from(text,"utf8");
  const decoder=new TextDecoder("windows-1254"),map=new Map<string,number>();
  for(let i=0;i<256;i++){const c=decoder.decode(Uint8Array.of(i));if(c!=="\ufffd")map.set(c,i);}
  const bytes:number[]=[];for(const c of text){const b=map.get(c);if(b===undefined)throw new Error("Çıktıda Türkçe Windows kodlamasına sığmayan karakter var. UTF-8 seçin veya kaynak dosyayı düzeltin.");bytes.push(b);}return Buffer.from(bytes);
}
/** Row-for-row translation. No merging, scoring, inferred question order or silent truncation. */
export function convertTxt(text:string,inputSource:OpticalLayout,inputTarget:OpticalLayout,options:ConversionOptions={}){
  const canonical=(l:OpticalLayout)=>JSON.stringify({width:l.lineLength,fields:Object.entries(l.fields).filter(([,v])=>v).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,v!.start,v!.length,v!.align??"left"]),lessons:l.lessons.map(v=>[v.name,v.start,v.length]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),literals:[...(l.literals??[])].sort((a,b)=>a.start-b.start)});
  const source=opticalLayoutSchema.parse(inputSource),target=opticalLayoutSchema.parse(inputTarget),same=canonical(source)===canonical(target);
  const lines=text.replace(/^\uFEFF/,"").split(/\r\n|\n|\r/);while(lines.at(-1)==="")lines.pop();
  if(!lines.length||lines.length>2000)throw new Error("TXT 1–2000 satır içermelidir.");
  const issues:ConversionIssue[]=[];let errorCount=0,lossCount=0,warningCount=0;
  const issue=(line:number,field:string,kind:ConversionIssue["kind"],message:string)=>{if(kind==="error")errorCount++;else if(kind==="loss")lossCount++;else warningCount++;if(issues.length<1000)issues.push({line,field,kind,message});};
  const mapping=new Map<string,string>(),usedLessons=new Set<string>();
  for(const l of target.lessons){
    const explicit=options.lessonMap&&Object.prototype.hasOwnProperty.call(options.lessonMap,l.name),matches=source.lessons.filter(s=>normalizeLesson(s.name)===normalizeLesson(l.name)),chosen=explicit?options.lessonMap![l.name]:matches.length===1?matches[0].name:undefined;
    if(chosen&&!source.lessons.some(s=>s.name===chosen))throw new Error(`${l.name}: seçilen kaynak ders bulunamadı.`);
    if(chosen&&usedLessons.has(chosen))throw new Error("Aynı kaynak ders birden fazla hedefe bağlanamaz.");
    if(chosen){mapping.set(l.name,chosen);usedLessons.add(chosen);if(source.lessons.find(s=>s.name===chosen)!.length>l.length)issue(0,l.name,"warning","Hedef cevap alanı daha kısa. Son kısımda yalnızca boş cevap varsa daraltılır; sınavın soru sayısını kontrol edin.");}else issue(0,l.name,"warning","Hedef ders için tek bir kaynak seçilmedi; alan boş bırakılacak.");
  }
  const unchanged=same&&target.lessons.every(l=>mapping.get(l.name)===l.name);
  const covered=new Set<number>();for(const f of [...Object.values(source.fields),...source.lessons,...(source.literals??[]).map(l=>({start:l.start,length:l.text.length}))].filter(Boolean)as Array<{start:number;length:number}>)for(let i=f.start-1;i<f.start-1+f.length;i++)covered.add(i);
  const output=lines.map((line,index)=>{
    const n=index+1,out=(same?line:" ".repeat(target.lineLength)).split("");
    if(line.length!==source.lineLength){issue(n,"Satır","error",`${source.lineLength} karakter bekleniyor; ${line.length} bulundu.`);return out.join("");}
    if(/[\x00-\x1f\x7f]/.test(line)){issue(n,"Satır","error","Satır içinde kontrol karakteri var.");return out.join("");}
    for(const l of source.literals??[])if(line.slice(l.start-1,l.start-1+l.text.length)!==l.text)issue(n,"Sabit alan","error","Kaynak FMT sabit metniyle eşleşmiyor.");
    const values:Record<string,string>={};for(const[key,f]of Object.entries(source.fields))if(f)values[key]=line.slice(f.start-1,f.start-1+f.length).trim();
    if(!values.name||(!values.id&&!values.identity)||!/^[A-D]$/i.test(values.booklet??""))issue(n,"Kimlik","error","Ad, öğrenci kimliği veya A/B/C/D kitapçık türü eksik/geçersiz.");
    const put=(value:string,f:{start:number;length:number;align?:"left"|"right"},label:string,answer=false)=>{
      if(value.length>f.length){issue(n,label,"error",`${value.length} karakter hedefteki ${f.length} karaktere sığmıyor; kesme yapılmadı.`);return;}
      const padded=!answer&&f.align==="right"?value.padStart(f.length," "):value.padEnd(f.length," ");for(let j=0;j<padded.length;j++)out[f.start-1+j]=padded[j];
    };
    for(const[key,f]of Object.entries(target.fields))if(f){
      let value=values[key]??"";if(key==="name"&&!target.fields.surname&&values.surname)value=[values.name,values.surname].filter(Boolean).join(" ");
      put(value,f,labels[key]??key);
    }
    if(!target.fields.identity&&!values.id)issue(n,"Kimlik","error","Hedefte bu satırın öğrenci numarası ve eşleştirme kimliği birlikte boş kalıyor.");
    for(const[key,value]of Object.entries(values))if(value&&!target.fields[key as keyof typeof target.fields]&&!(key==="surname"&&!target.fields.surname))issue(n,labels[key]??key,"loss","Kaynak bilgisi hedef FMT’de yok; aktarılmayacak.");
    for(const l of source.lessons){const raw=line.slice(l.start-1,l.start-1+l.length);if(/[^ABCDE* .-]/i.test(raw))issue(n,l.name,"error","Cevap alanında geçersiz karakter var.");if(!usedLessons.has(l.name)&&raw.replace(/[ .-]/g,""))issue(n,l.name,"loss","İşaretli kaynak ders hedefe eşlenmemiş; cevapları aktarılmayacak.");}
    for(const l of target.lessons){const src=source.lessons.find(s=>s.name===mapping.get(l.name));let raw=src?line.slice(src.start-1,src.start-1+src.length):"";if(raw.length>l.length&&!/[^ .-]/.test(raw.slice(l.length)))raw=raw.slice(0,l.length);put(raw.replace(/ +$/,""),l,l.name,true);}
    if(!same&&[...line].some((c,i)=>!covered.has(i)&&c!==" "))issue(n,"Tanımsız alan","loss","Kaynak FMT’de tanımlanmamış dolu alanlar var; hedefe taşınmayacak.");
    for(const l of target.literals??[])for(let j=0;j<l.text.length;j++)out[l.start-1+j]=l.text[j];
    return unchanged?line:out.join("");
  });
  const converted=output.join(options.lineEnding==="lf"?"\n":"\r\n")+(options.lineEnding==="lf"?"\n":"\r\n");
  let bytes:Buffer=Buffer.alloc(0);try{bytes=encodeTxt(converted,options.encoding??"windows-1254");}catch(e){issue(0,"Kodlama","error",(e as Error).message);}
  if(bytes.length>10*1024*1024)issue(0,"Dosya","error","Dönüştürülen dosya 10 MB sınırını aşıyor.");
  return{bytes,report:{sourceLines:lines.length,outputLines:output.length,sourceWidth:source.lineLength,targetWidth:target.lineLength,errorCount,lossCount,warningCount,issues,issuesTruncated:errorCount+lossCount+warningCount>issues.length,canDownload:errorCount===0&&(lossCount===0||!!options.allowLoss),sourcePreview:lines.slice(0,3),outputPreview:output.slice(0,3),outputBytes:bytes.length,mapping:Object.fromEntries(mapping)}};
}
