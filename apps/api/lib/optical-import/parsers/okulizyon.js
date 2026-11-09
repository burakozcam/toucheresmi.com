const {norm,lessonName,weightFor,outcome,locate,basic,validateMapping,sourceRow}=require("./common");
// Schema verified against the user-provided real export; never infer column meaning from file names.
module.exports=function parse(sheets){
 const found=locate(sheets,"o");if(!found)throw new Error("O Excel başlıkları tanınmadı. Doğru formatı seçin.");
 const {sheet,index,head}=found,questions=[],warnings=[],issues=[];
 for(let i=index+1;i<sheet.rows.length;i++){
  const row=sheet.rows[i];if(row.every(v=>!String(v??"").trim()))continue;
  const label=`${sheet.name} satır ${i+1}`;let q;

      const at=name=>row[head.indexOf(name)],book=norm(at("KİTAPÇIK"));if(book!=="A")issues.push(`${label}: ortak sıra için A kitapçığı kayıtları gerekli.`);
      const number=Number(at("A SORU")),lesson=lessonName(at("DERS")),texts=head.map((h,c)=>/^KAZANIM-\d+$/.test(h)?String(row[c]??"").trim():"").filter(Boolean);
      q={lesson,number,answer:norm(at("CEVAP")),weight:weightFor(lesson),positions:{A:number},outcomeCode:String(at("KAZANIM KODU")??"").trim(),outcomeName:texts.join(" | ")};
      for(const b of ["B","C","D"]){const col=head.indexOf(`${b} SORU`);if(col>=0&&String(row[col]??"").trim())q.positions[b]=Number(row[col]);}

  q.source=sourceRow("o",sheet,i);try{basic(q,label);}catch(e){issues.push(e.message);}questions.push(q);
  if(questions.length>300)throw new Error("Cevap anahtarı en fazla 300 soru içerebilir.");
 }
 try{validateMapping(questions);}catch(e){issues.push(e.message);}


 return {format:"o",questions,warnings,issues,examName:String(sheet.rows[0]?.[2]??"").trim(),publisher:String(sheet.rows[0]?.[0]??"").trim(),grade:Number(String(sheet.rows[1]?.[2]??"").match(/\d+/)?.[0])||undefined};
};
