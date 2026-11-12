const {locate,norm,answer,lessonName,weightFor,basic,sourceRow}=require("./parsers/common");
const fernus=require("./parsers/fernus"),okulizyon=require("./parsers/okulizyon");
function parseWorkbook(sheets,format="auto",options={}){
 if(!Array.isArray(sheets)||!sheets.length||sheets.length>50)throw new Error("Excel sekmeleri okunamadı veya sekme sayısı 50’yi aşıyor.");
 if(!["auto","f","o","standard"].includes(format))throw new Error("Dosya formatı geçersiz.");
 const kind=format==="auto"?(locate(sheets,"f")?"f":locate(sheets,"o")?"o":"standard"):format;
 let result;
 if(kind==="f"||kind==="o")result=(kind==="f"?fernus:okulizyon)(sheets);
 else{
  const found=locate(sheets,"standard");if(!found)throw new Error("Değerlendirme Excel başlıkları tanınmadı. Doğru formatı seçin.");
  const {sheet,index,head}=found,questions=[],issues=[];
  for(let i=index+1;i<sheet.rows.length;i++){const row=sheet.rows[i];if(row.every(v=>!String(v??"").trim())||/^H Bütün cevaplar doğru kabul edildi\./i.test(String(row[0]??"")))continue;const label=`${sheet.name} satır ${i+1}`;let q;
        const nartest=head[0]==="TEST KODU";
      if(nartest){const lesson=lessonName(row[1]),number=Number(row[2]);q={lesson,number,answer:answer(row[4]),weight:weightFor(lesson),positions:{A:number},outcomeCode:String(row[5]??"").trim(),outcomeName:String(row[7]??"").trim()};if(String(row[3]??"").trim())q.positions.B=Number(row[3]);}
      else{const at=(...names)=>{const c=head.findIndex(h=>names.includes(h));return c<0?undefined:row[c];},lesson=lessonName(at("DERS")),number=Number(at("A SORU NO","A SORU","SORU NO"));q={lesson,number,answer:answer(at("DOĞRU CEVAP","CEVAP")),weight:String(at("KATSAYI","KATSAYI / AĞIRLIK")??"").trim()?Number(at("KATSAYI","KATSAYI / AĞIRLIK")):null,positions:{A:number},outcomeCode:String(at("KAZANIM KODU")??"").trim(),outcomeName:String(at("KAZANIM METNİ","KAZANIM METNI","KAZANIM AÇIKLAMASI","KAZANIM","KAZANIM-1")??"").trim()};for(const b of ["B","C","D"]){const value=at(`${b} SORU NO`,`${b} SORU`);if(String(value??"").trim())q.positions[b]=Number(value);}q.source=sourceRow("general",sheet,i);}

  try{basic(q,label);}catch(e){issues.push(e.message);}questions.push(q);if(questions.length>300)throw new Error("Cevap anahtarı en fazla 300 soru içerebilir.");
  }
  result={format:kind,questions,issues,warnings:[],examName:"",publisher:""};
 }
 const missing=result.questions.filter(q=>!q.outcomeCode||!q.outcomeName).length;
 if(missing)result.warnings.push(`${missing} sorunun kazanım bilgisi bulunamadı. Cevaplar korunur; kazanım eşleşmesi yapılmadı.`);
 if(!result.questions.length)throw new Error("Cevap anahtarı 1–300 soru içermeli.");
 if(result.issues.length&&!options.allowInvalid)throw new Error(result.issues[0]);
 return result;
}
module.exports={parseWorkbook,lessonName};
