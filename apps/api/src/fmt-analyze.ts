import {verifiedFmtLayout} from "./verified-fmt";
import type { OpticalLayout } from "./optical-core";
import { inspectFmtCoordinates } from "./fmt-verification";
const norm=(s:string)=>s.toLocaleUpperCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]/g,"");
const fields:Record<string,string>={OGRENCINO:"id",OGRENCINUMARASI:"id",NUMARA:"id",ADI:"name",AD:"name",ADISOYADI:"name",ADSOYAD:"name",SOYAD:"surname",SOYADI:"surname",SINIF:"grade",SUBE:"branch",KITAPCIK:"booklet",KITAPCIKTURU:"booklet",TC:"identity",TCTEL:"identity",TCNO:"identity",TCKIMLIKNO:"identity",KURUMKODU:"schoolCode",OKULKODU:"schoolCode",CINSIYET:"gender",OTURUM:"session",SINAVNUMARASI:"examNumber"};
const courses:Record<string,string>={TURKCE:"TÜRKÇE",SOSYAL:"SOSYAL",SOSYALBILGILER:"SOSYAL",TARIH:"SOSYAL",INKILAPTARIHI:"SOSYAL",DINKULTURU:"DİN",DIN:"DİN",INGILIZCE:"İNGİLİZCE",MATEMATIK:"MATEMATİK",FEN:"FEN",FENBILIMLERI:"FEN"};
export function analyzeFmt(text:string){
 const lines=text.replace(/^\uFEFF/,"").split(/\r\n|\r|\n/).filter(l=>l.trim()),header=lines.shift()?.split("=")??[];
 if(header.length<6||!header.slice(0,3).every(v=>/^\d+$/.test(v)))throw new Error("FMT yapısı desteklenen koordinat sözdiziminde değil. Özgün FMT dosyasını kontrol edin; dosya adına göre alan üretilmedi.");
 let layout={lineLength:0,fields:{},lessons:[],literals:[]} as unknown as OpticalLayout;
 const mappings:Array<{sourceName:string;target:string;start:number;length:number;status:string;reason:string}>=[];let offset=1;
 for(const [i,line]of lines.entries()){
  const p=line.split("="),[r1,r2,c1,c2]=p.slice(0,4).map(Number),name=p[8]?.trim(),mode=p[5];
  if(p.length<10||!name||![r1,r2,c1,c2].every(Number.isInteger)||r1<1||c1<1||r2<r1||c2<c1||!["D","Y"].includes(mode))throw new Error(`FMT satır ${i+2}: koordinatlar, alan adı veya yön okunamadı.`);
  const key=fields[norm(name)],isCourse=mode==="Y"&&r2-r1+1>1&&/^[ABCDE* .-]+$/.test(p[6]),literal=/^KOD[- ]?\d+$/i.test(name)&&p[6].length===1;
  const length=literal?1:isCourse?r2-r1+1:mode==="D"?c2-c1+1:1;
  let target="ignore",status="Kontrol gerekli";
  if(literal){layout.literals!.push({start:offset,text:p[6]});target="literal";status="Eşleşti";}
  else if(key&&!layout.fields[key as keyof typeof layout.fields]){(layout.fields as Record<string,unknown>)[key]={start:offset,length};target=`field:${key}`;status="Eşleşti";}
  else if(isCourse){const lesson=courses[norm(name)]??name.toLocaleUpperCase("tr-TR");layout.lessons.push({name:lesson,start:offset,length});target=`lesson:${lesson}`;status=courses[norm(name)]?"Eşleşti":"Ders adı kontrol edilmeli";}
  mappings.push({sourceName:name,target,start:offset,length,status,reason:"TXT konumu FMT tanım sırasından önerildi; okuyucu çıktısı ile doğrulanmalıdır."});offset+=length;
 }
 layout.lineLength=offset-1;
 const verified=verifiedFmtLayout(text);
 if(verified){layout=structuredClone(verified);for(const m of mappings){
  const literal=layout.literals?.find(l=>l.start===m.start),field=Object.entries(layout.fields).find(([,f])=>f?.start===m.start),lesson=layout.lessons.find(l=>l.start===m.start);
  m.target=literal?"literal":field?`field:${field[0]}`:lesson?`lesson:${lesson.name}`:"ignore";
  m.status="Doğrulandı";m.reason="Sağlanan Özdebir FMT içeriği ve gerçek TXT alan konumlarıyla eşleşen kayıt düzeni.";
 }}
 const issues:string[]=[];for(const key of ["id","name","booklet"]){if(!layout.fields[key as keyof typeof layout.fields]){issues.push(`${key==="id"?"Öğrenci numarası":key==="name"?"Ad soyad":"Kitapçık"} eşleştirmesi gerekli.`);(layout.fields as Record<string,unknown>)[key]={start:0,length:1};}}
 if(!layout.lessons.length)issues.push("En az bir ders cevap alanını eşleştirin.");
 const coordinates=inspectFmtCoordinates(text,layout);issues.push(...coordinates.errors);
 return {layout,mappings,issues:[...new Set(issues)],warnings:[...(verified?["Bu Özdebir düzeninde 1/2/9 kayıt türüdür. Eski FMT ders etiketleri doğrulanmış oturum derslerine eşlendi; başka yayınevlerine uygulanmaz."]:[]),"Optik form koordinatları ile TXT karakter konumları farklıdır. Öneriler, dosyanın alan tanım sırası ve kapasitesinden hesaplanır; gerçek TXT testi ve okuyucu kontrolü gereklidir."],coordinates};
}
