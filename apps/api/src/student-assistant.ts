import type {Insights,StudentExam} from './student-insights';
export const normalizeTurkish=(s:string)=>s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
export const intentPhrases={
 latest:['son sinavim','en son deneme','sonucum ne','son sinavim hangisi','hangi sinava girdim','en yeni sonuc','son denemem hangisi'],
 score:['kac aldim','puanim kac','kac puan','notum ne','sinav puani','puanimi soyle','son sinavdan kac aldim'],
 highest:['en yuksek puan','puan rekorum','en iyi puanim','rekorum kac','en basarili sinavim','tavan puanim','maksimum puan'],
 lowest:['en dusuk puan','en kotu puanim','minimum puan','taban puanim','en zayif sinavim','dusuk notum','en az kac aldim'],
 net:['netim kac','kac net','net sayisi','toplam net','netlerim nasil','netimi goster','net sonucum'],
 wrong:['kac yanlis','yanlisim kac','yanlis sayisi','hata sayim','yanlislarim ne','hatam kac','yanlisimi goster'],
 blank:['kac bos','bos sayisi','bosum kac','bos biraktim','isaretlemedim','bos sorularim','boslarimi goster'],
 correct:['kac dogru','dogrum kac','dogru sayisi','dogru cevaplarim','dogrularimi goster','dogru sonucum','dogru isaretim'],
 compare:['karsilastir','ikisi arasinda','oncekiyle fark','ne kadar degisti','iki sinavi kiyasla','son iki sinav','ikisini kiyasla'],
 bestLesson:['en basarili ders','en iyi dersim','hangi derste iyiyim','guclu dersim','en yuksek ders','ders basarim','iyi oldugum ders'],
 decline:['hangi derste geriledim','dususten bahset','net dususu','gerileme var mi','kotu gidiyor mu','hangi ders dustu','dusuk performans'],
 outcomes:['kazanimlar','hangi kazanim','konularda zorlaniyorum','konu eksigim','tekrar alanlari','hangi konuda zor','ogrenme acigim'],
 analysis:['analizim','gelisimim','gelisim grafigi','erken uyari','nasil gidiyorum','calisma onerisi','performans analizi'],
 results:['sonuclarim nerede','sinav sonuclarimi goster','tum sonuclar','karnelerim nerede','sinav listem','sonuclarimi ac','denemelerim'],
 report:['karnemi goster','karneyi ac','karnemi indir','pdf indir','o sinavin karnesi','karne baglantisi','raporumu goster'],
 announcements:['duyurular','yeni duyuru','haber var mi','duyuru merkezi','guncel duyuru','duyurulari goster','ne duyuruldu'],
 help:['yardim','neler sorabilirim','ne yapabilirsin','nasil kullanirim','ornek soru','komutlar','sana ne sorayim'],
 greeting:['merhaba','selam','gunaydin','iyi aksamlar','iyi gunler','selamlar','merhabalar']
} as const;
export type Intent=keyof typeof intentPhrases;
export type AssistantContext={intent?:Intent;examId?:string;lesson?:string};
const typo:Record<string,string>={matamatik:'matematik',matematikte:'matematik',turkceye:'turkce',turkcede:'turkce',yanlislar:'yanlis',yanls:'yanlis',sinaw:'sinav',karsilastirma:'karsilastir',karsilastirirmisin:'karsilastir',kazanmlar:'kazanimlar',puanm:'puanim',mat:'matematik',tr:'turkce',fkb:'fen'};
const aliases:Record<string,string[]>={turkce:['turkce','turk','edebiyat'],matematik:['matematik','mat'],fen:['fen','fizik','kimya','biyoloji'],sosyal:['sosyal','inkilap','tarih','cografya'],din:['din','dkab'],ingilizce:['ingilizce','ing','yabanci dil']};
export function recognize(message:string,lessons:string[],context:AssistantContext={}){
 const raw=normalizeTurkish(message),text=raw.split(' ').map(w=>typo[w]??w).join(' ');
 const requested=Object.entries(aliases).find(([,words])=>words.some(w=>new RegExp(`\\b${w}(?:de|da|te|ta|ten|den|im|um)?\\b`).test(text)))?.[0];
 const lesson=lessons.find(l=>{const n=normalizeTurkish(l);return text.includes(n)||Object.entries(aliases).some(([key,words])=>n.includes(key)&&words.some(w=>new RegExp(`\\b${w}(?:de|da|te|ta|ten|den|im|um)?\\b`).test(text)));})??(requested?requested.toLocaleUpperCase('tr-TR'):undefined);
 let intent:Intent|undefined;let best=0;
 for(const [key,phrases]of Object.entries(intentPhrases))for(const phrase of phrases){const tokens=phrase.split(' '),score=text.includes(phrase)?100+tokens.length:tokens.length>1&&tokens.every(w=>text.split(' ').some(t=>t===w||w.length>3&&t.startsWith(w)))?tokens.length:0;if(score>best){best=score;intent=key as Intent;}}
 // Productive grammar complements the curated examples, including Turkish suffixes.
 if(best<100){if(/\b(yanlis|hata)/.test(text))intent='wrong';else if(/\bbos/.test(text))intent='blank';else if(/\bdogru/.test(text))intent='correct';else if(/\bnet/.test(text))intent='net';
 else if(/karsilastir|kiyasla/.test(text))intent='compare';else if(/karne|\bpdf\b/.test(text))intent='report';else if(/kazanim|zorlan|konu eksig/.test(text))intent='outcomes';
 else if(/en yuksek|rekor/.test(text))intent='highest';else if(/en dusuk/.test(text))intent='lowest';else if(/puan|kac aldim/.test(text))intent='score';
 }
 const previous=/gecen|onceki/.test(text),follow=!!lesson||previous||/^(peki|o sinav|ikisi)/.test(text);
 return{intent:intent??(follow?context.intent??'net':undefined),lesson:lesson??(follow||intent&&['net','wrong','blank','correct','score','report','compare'].includes(intent)?context.lesson:undefined),previous};
}
export function assistantReply(message:string,insights:Insights,context:AssistantContext={},announcements:{id:string;title:string;summary:string}[]=[]){
 const lessons=[...new Set(insights.exams.flatMap(e=>e.lessons.map(l=>l.lesson)))],parsed=recognize(message,lessons,context),intent=parsed.intent;
 let exam=parsed.previous?insights.exams[1]:insights.exams.find(e=>e.id===context.examId)??insights.exams[0];if(intent==='latest'&&!parsed.previous)exam=insights.exams[0];
 const next:AssistantContext={intent,examId:exam?.id,lesson:parsed.lesson};
 const actions:{kind:'report'|'results'|'analysis';id?:string;label:string}[]=[],table:{label:string;value:string}[]=[];let text='';
 const f=(v:number)=>v.toLocaleString('tr-TR',{maximumFractionDigits:2});
 if(!intent||intent==='help'||intent==='greeting')text=intent==='greeting'?'Merhaba! Yayımlanmış sonuçlarını birlikte inceleyebiliriz. “Son sınavdan kaç aldım?” veya “Analizim” diye sorabilirsin.':'Son sınavını, netlerini, doğru/yanlış/boş sayılarını, kazanımlarını ve duyuruları sorabilirsin. “Peki Türkçe?” gibi takip soruları da kullanabilirsin.';
 else if(intent==='announcements')text=announcements.length?announcements.map(a=>`${a.title}: ${a.summary}`).join('\n'):'Şu anda sana açık güncel duyuru yok.';
 else if(intent==='results'){text='Yayımlanmış ve sana bağlanmış sonuçlar aşağıdaki listede.';actions.push({kind:'results',label:'Sonuçlarıma git'});}
 else if(!exam)text='Bu soru için erişime açık yayımlanmış sınav verisi yok.';
 else if(parsed.lesson&&!exam.lessons.some(l=>l.lesson===parsed.lesson))text='Bu derse ait yayımlanmış sonuç verisi bulunmuyor.';
 else if(intent==='analysis'||intent==='outcomes'||intent==='decline'){text=intent==='outcomes'?insights.outcomes.length?insights.outcomes.filter(o=>o.status==='repeat'||o.status==='practice').map(o=>`${o.lesson} / ${o.name}: ${o.evidence}`).join('\n')||'Yeterli kanıtla belirlenmiş tekrar alanı yok.':'Kazanım bilgisi bulunmuyor.':insights.warnings.join('\n')||`${insights.evidence.examCount} sınavdaki ${insights.evidence.questionCount} soruyu Analizim alanında inceleyebilirsin.`;actions.push({kind:'analysis',label:'Analizimi aç'});}
 else if(intent==='compare'){const pair=insights.exams.slice(0,2);if(pair.length<2)text='Karşılaştırma için iki yayımlanmış sınav gerekir.';else if(pair[0].scale!==pair[1].scale)text=insights.comparisonNote;else{text='Aynı ölçme içeriği ve kuralları olan son iki sonuç. Çalışma koşulları da sonucu etkileyebilir.';for(const e of pair)table.push({label:e.name,value:`${f(e.net)} net · ${e.score===null?'Puan hesaplanmadı':f(e.score)+' puan'}`});}}
 else if(intent==='highest'||intent==='lowest'){const comparable=insights.exams.filter(e=>e.scale===exam!.scale&&e.score!==null).sort((a,b)=>intent==='highest'?b.score!-a.score!:a.score!-b.score!);if(!comparable.length)text='Bu ölçekte hesaplanmış puan yok.';else{exam=comparable[0];text=`Son beş uygun sonuç içinde aynı içerik ve kurallardaki ${intent==='highest'?'en yüksek':'en düşük'} puanın ${f(exam.score!)} (${exam.name}). Farklı ölçekler bu sıralamaya alınmadı.`;}}
 else if(intent==='report'){text=`${exam.name} karneni güvenli bağlantıyla açabilirsin.`;actions.push({kind:'report',id:exam.id,label:'Bu sınavın karnesini aç'});}
 else if(intent==='latest')text=`Son yayımlanmış sonuç kaydın: ${exam.name}. Kayıt tarihi: ${new Date(exam.date).toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'})}.`;
 else if(intent==='bestLesson'){const ranked=exam.lessons.filter(l=>!l.missing&&l.net!==null&&l.correct+l.wrong+l.blank>=5).sort((a,b)=>b.net!/(b.correct+b.wrong+b.blank)-a.net!/(a.correct+a.wrong+a.blank));text=ranked.length?`${exam.name}: soru sayısına göre net oranı en yüksek dersin ${ranked[0].lesson}. Bu yalnız bu sınavın betimsel sonucudur.`:'Ders karşılaştırması için yeterli soru yok.';}
 else {const row=parsed.lesson?exam.lessons.find(l=>l.lesson===parsed.lesson):exam;if(!row||'missing'in row&&row.missing)text='Bu derste değerlendirilebilir oturum bulunmuyor.';else{const key=intent==='net'?'net':intent==='score'?'score':intent==='correct'?'correct':intent==='wrong'?'wrong':'blank';const value=key==='score'?parsed.lesson?null:exam.score:(row as any)[key];text=`${exam.name}${parsed.lesson?' · '+parsed.lesson:''}: ${value===null?'Bu ölçü hesaplanmadı.':f(value)+' '+({net:'net',score:'puan',correct:'doğru',wrong:'yanlış',blank:'boş'}[key])}`;}}
 return{text,table,actions,context:{...next,examId:exam?.id},scope:'Yalnız hesabına bağlı yayımlanmış son beş uygun sınav.'};
}
