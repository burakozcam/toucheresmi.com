const {locate,norm,lessonName,weightFor,basic}=require("./optical-parsers/common");
const fernus=require("./optical-parsers/fernus"),okulizyon=require("./optical-parsers/okulizyon");
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
        const nartest=head[0]==="TEST KODU",lesson=lessonName(row[nartest?1:0]),number=Number(row[nartest?2:1]);
      q={lesson,number,answer:norm(row[nartest?4:3]),weight:nartest?weightFor(lesson):Number(row[4]),positions:{A:number},outcomeCode:String(row[5]??"").trim(),outcomeName:String(row[nartest?7:6]??"").trim()};
      if(String(row[nartest?3:2]??"").trim())q.positions.B=Number(row[nartest?3:2]);
      if(!nartest)for(const b of ["C","D"]){const c=head.indexOf(`${b} SORU NO`);if(c>=0&&String(row[c]??"").trim())q.positions[b]=Number(row[c]);}
  try{basic(q,label);}catch(e){issues.push(e.message);}questions.push(q);if(questions.length>300)throw new Error("Cevap anahtarı en fazla 300 soru içerebilir.");
  }
  result={format:kind,questions,issues,warnings:[],examName:"",publisher:""};
 }
 if(!result.questions.length)throw new Error("Cevap anahtarı 1–300 soru içermeli.");
 if(result.issues.length&&!options.allowInvalid)throw new Error(result.issues[0]);
 return result;
}
module.exports={parseWorkbook,lessonName};
