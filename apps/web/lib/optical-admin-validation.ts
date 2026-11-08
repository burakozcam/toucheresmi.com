import type { OpticalLayout, OpticalQuestion } from "./optical";
export const fieldLabels:Record<string,string>={id:"Öğrenci no",name:"Ad / tam ad",surname:"Soyad",grade:"Sınıf",branch:"Şube",booklet:"Kitapçık",identity:"TC/Tel eşleştirme",schoolCode:"Kurum kodu",gender:"Cinsiyet",session:"Oturum",examNumber:"Sınav numarası"};
export function layoutProblems(layout:OpticalLayout):string[]{
  const errors:string[]=[],used=new Map<number,string>();
  if(!Number.isInteger(layout.lineLength)||layout.lineLength<20||layout.lineLength>4000)errors.push("Satır uzunluğu 20–4000 arasında tam sayı olmalı.");
  const entries=[...Object.entries(layout.fields).filter(([,v])=>v).map(([k,v])=>({name:fieldLabels[k],...v!})),...layout.lessons.map(l=>({...l,name:`Ders: ${l.name}`})),...(layout.literals??[]).map((l,i)=>({name:`Sabit ${i+1}`,start:l.start,length:l.text.length}))];
  for(const f of entries){
    if(!Number.isInteger(f.start)||f.start<1||!Number.isInteger(f.length)||f.length<1||f.length>300){errors.push(`${f.name}: başlangıç pozitif tam sayı, uzunluk 1–300 olmalı.`);continue;}
    const end=f.start+f.length-1;if(end>layout.lineLength)errors.push(`${f.name}: ${f.start}–${end} aralığı satır uzunluğunu aşıyor.`);
    for(let p=f.start;p<=Math.min(end,4000);p++){const other=used.get(p);if(other){errors.push(`${f.name} ile ${other} ${p}. karakterde çakışıyor.`);break;}}
    for(let p=f.start;p<=Math.min(end,4000);p++)used.set(p,f.name);
  }
  if(layout.lessons.length<1||layout.lessons.length>20)errors.push("1–20 ders tanımlayın.");
  const names=layout.lessons.map(l=>l.name.trim());if(names.some(n=>!n||n.length>80)||new Set(names).size!==names.length)errors.push("Ders adları dolu, benzersiz ve en fazla 80 karakter olmalı.");
  if((layout.literals??[]).some(l=>!l.text||/[\x00-\x1f\x7f]/.test(l.text)))errors.push("Sabit metinler boş veya kontrol karakteri içeremez.");
  return [...new Set(errors)];
}
export function questionProblems(questions:OpticalQuestion[],requireOutcomes=true):string[]{
  const errors:string[]=[];if(!questions.length||questions.length>300)return["Cevap anahtarı 1–300 soru içermeli."];
  for(const q of questions){const label=`${q.lesson||"Ders yok"} / A ${q.number}`;
    if(!q.lesson.trim()||q.lesson.length>80)errors.push(`${label}: ders adı gerekli (en fazla 80 karakter).`);
    if(!Number.isInteger(q.number)||q.number<1||q.positions.A!==q.number)errors.push(`${label}: A soru numarası pozitif tam sayı olmalı.`);
    if(!/^[ABCDEHX]$/.test(q.answer))errors.push(`${label}: cevap A–E, H veya X olmalı.`);
    if(!Number.isFinite(q.weight)||q.weight<=0||q.weight>100)errors.push(`${label}: katsayı 0’dan büyük, en fazla 100 olmalı.`);
    if((q.outcomeCode?.length??0)>80||(q.outcomeName?.length??0)>1000)errors.push(`${label}: kazanım kodu en fazla 80, metni 1000 karakter olabilir.`);
    if(requireOutcomes&&(!q.outcomeCode?.trim()||!q.outcomeName?.trim()))errors.push(`${label}: kazanım kodu ve metni gerekli.`);
  }
  const allBooks=Object.keys(questions[0].positions).sort();
  for(const lesson of [...new Set(questions.map(q=>q.lesson))]){
    const qs=questions.filter(q=>q.lesson===lesson),count=qs.length,books=Object.keys(qs[0].positions).sort();
    if(new Set(qs.map(q=>q.weight)).size!==1)errors.push(`${lesson}: tüm soruların katsayısı aynı olmalı.`);
    if(books.join()!==allBooks.join()||!books.includes("A")||books.some(b=>! /^[A-D]$/.test(b))||qs.some(q=>Object.keys(q.positions).sort().join()!==books.join()))errors.push(`${lesson}: tüm sorularda aynı A/B/C/D kitapçıkları tanımlı olmalı.`);
    for(const b of books){const positions=qs.map(q=>q.positions[b]);if(new Set(positions).size!==count||positions.some(p=>!Number.isInteger(p)||p<1||p>count))errors.push(`${lesson} / ${b}: 1–${count} soru numaraları eksiksiz ve tekrarsız olmalı.`);}
  }
  return [...new Set(errors)];
}
export const keyTemplateRows:unknown[][]=[
  ["Ders","A Soru No","B Soru No","Doğru Cevap","Katsayı","Kazanım Kodu","Kazanım Metni","C Soru No","D Soru No"],
  ["TÜRKÇE",1,2,"A",4,"T.8.1","Sözcüklerin anlamını belirler.","",""],
  ["TÜRKÇE",2,1,"B",4,"T.8.2","Metnin ana fikrini belirler.","",""],
];
export function downloadKeyTemplate(){if(!window.XLSX)return;const x=window.XLSX,w=x.utils.book_new();x.utils.book_append_sheet(w,x.utils.aoa_to_sheet(keyTemplateRows),"Cevap Anahtarı");x.writeFile(w,"degerlendirme-anahtari-sablonu.xlsx");}
