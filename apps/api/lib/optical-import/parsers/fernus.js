const {norm,answer,lessonName,weightFor,outcome,locate,basic,validateMapping,sourceRow}=require("./common");
// Schema verified against the user-provided real export; never infer column meaning from file names.
module.exports=function parse(sheets){
 const found=locate(sheets,"f");if(!found)throw new Error("F Excel başlıkları tanınmadı. Doğru formatı seçin.");
 const {sheet,index,head}=found,questions=[],warnings=[],issues=[];
 for(let i=index+1;i<sheet.rows.length;i++){
  const row=sheet.rows[i];if(row.every(v=>!String(v??"").trim()))continue;
  const label=`${sheet.name} satır ${i+1}`;let q;

      const number=Number(row[1]),lesson=lessonName(row[0]),o=outcome(row[head.indexOf("KAZANIM")]);
      q={lesson,number,answer:answer(row[2]),weight:weightFor(lesson),positions:{A:number},...o};
      for(const book of ["B","C","D"]){const col=head.findIndex(h=>h.startsWith(book)&&h.includes("ÇAPRAZ"));if(col>=0)q.positions[book]=Number(row[col]);}

  q.source=sourceRow("f",sheet,i);try{basic(q,label);}catch(e){issues.push(e.message);}questions.push(q);
  if(questions.length>300)throw new Error("Cevap anahtarı en fazla 300 soru içerebilir.");
 }
 try{validateMapping(questions);}catch(e){issues.push(e.message);}

 const internal=questions.filter(q=>q.outcomeCode.startsWith("METİN-")).length;if(internal)warnings.push(`${internal} soruda resmî kazanım kodu yok; metinden türetilmiş METİN- iç kodu kullanıldı.`);
      // Cross-check all supplied B/C/D answer sheets; never infer mappings from repeated outcomes.
      for(const book of ["B","C","D"]){if(!questions.some(q=>q.positions[book]))continue;const other=sheets.find(s=>s.rows.slice(0,20).some(r=>norm(r[0])==="DERS"&&norm(r[1])==="SORU NO"&&norm(r[2]).startsWith(`${book} KİTAPÇIK`)));
        if(!other){issues.push(`${book} kitapçık sekmesi yok; çapraz cevap doğrulanamadı.`);continue;}
        const h=other.rows.findIndex(r=>norm(r[0])==="DERS"&&norm(r[1])==="SORU NO");const rows=other.rows.slice(h+1).filter(r=>r.some(v=>String(v??"").trim()));const lookup=new Map();
        for(const r of rows){const key=`${lessonName(r[0])}:${Number(r[1])}`;if(lookup.has(key))issues.push(`${book} kitapçığında yinelenen soru: ${key}`);lookup.set(key,norm(r[2]));}
        if(lookup.size!==questions.length)issues.push(`${book} kitapçığındaki soru sayısı A kitapçığıyla eşleşmiyor.`);
        for(const q of questions)if(!/[HX]/.test(q.answer)&&lookup.get(`${q.lesson}:${q.positions[book]}`)!==q.answer)issues.push(`${q.lesson} / A ${q.number}: ${book} çaprazı ile ${book} kitapçığı cevabı çelişiyor.`);
      }
 return {format:"f",questions,warnings,issues,examName:String(sheet.rows[0]?.[1]??"").trim(),publisher:"",grade:undefined};
};
