import type {Insights,StudentExam} from './student-insights';
export const normalizeTurkish=(s:string)=>s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
export const intentPhrases={
 assignment:['bana sinav atanmis mi','hangi sinavim kaldi','sinav kac dakika','suresiz girebilir miyim','sinavlarim'],
 status:['sinavim teslim edildi mi','sonucum aciklandi mi','sinav teslim durumu','sonuc yayimlandi mi'],
 files:['bana pdf atilmis mi','dosyalarimi goster','pdf dosyalarim'],
 study:['bugun ne calisayim','nereden baslamaliyim','hangi konuyu unutuyorum','nerede ilerledim','matematik nasil gidiyor'],
 thanks:['tesekkurler','sag ol','tesekkur ederim'],
 farewell:['gorusuruz','hosca kal','iyi geceler'],
 wellbeing:['nasilsin','naber','ne haber'],
 totals:['kac dogru yanlis ve bosum var','tum derslerin netini goster'],
 latest:['en son neye girdim','bir onceki denemem hangisiydi','son sinavim','en son deneme','sonucum ne','son sinavim hangisi','hangi sinava girdim','en yeni sonuc','son denemem hangisi'],
 score:['son notum ne','son sinav notum ne','son denemede kac puan yaptim','kac aldim','puanim kac','kac puan','notum ne','sinav puani','puanimi soyle','son sinavdan kac aldim'],
 highest:['en yuksek notum kac','en yuksek puan','puan rekorum','en iyi puanim','rekorum kac','en basarili sinavim','tavan puanim','maksimum puan'],
 lowest:['en az hangi sinavda puan aldim','en dusuk puan','en kotu puanim','minimum puan','taban puanim','en zayif sinavim','dusuk notum','en az kac aldim'],
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
 report:['son karnemi ac','gecen sinavin karnesini indir','karnemi goster','karneyi ac','karnemi indir','pdf indir','o sinavin karnesi','karne baglantisi','raporumu goster'],
 announcements:['duyurular','yeni duyuru','haber var mi','duyuru merkezi','guncel duyuru','duyurulari goster','ne duyuruldu'],
 help:['sana ne sorabilirim','yardim','neler sorabilirim','ne yapabilirsin','nasil kullanirim','ornek soru','komutlar','sana ne sorayim'],
 greeting:['merhaba','selam','gunaydin','iyi aksamlar','iyi gunler','selamlar','merhabalar']
} as const;
export type Intent=keyof typeof intentPhrases;
export type AssistantContext={intent?:Intent;examId?:string;lesson?:string};
const typo:Record<string,string>={matamatik:'matematik',matematikte:'matematik',turkceye:'turkce',turkcede:'turkce',yanlislar:'yanlis',yanls:'yanlis',yanlsim:'yanlisim',matamatikte:'matematik',matamatikten:'matematik',sinaw:'sinav',karsilastirma:'karsilastir',karsilastirirmisin:'karsilastir',kazanmlar:'kazanimlar',puanm:'puanim',mat:'matematik',tr:'turkce',fkb:'fen'};
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
 if(/kac dogru.*yanlis.*bos|tum ders.*net/.test(text))intent='totals';
 if(/en cok.*konu|konuda.*yanlis/.test(text))intent='outcomes';
 if(/en az hangi sinav.*puan/.test(text))intent='lowest';
 if(/son iki|gecen sinava gore|ne kadar degisti/.test(text))intent='compare';
 if(/bana.*pdf|dosyalar/.test(text))intent='files';
 if(/teslim.*mi|sonucum aciklandi/.test(text))intent='status';
 if(/atanmis|sinavim kaldi|kac dakika|suresiz/.test(text))intent='assignment';
 if(/bugun ne calis|nereden basla|unutuyor|nerede ilerle|nasil gidiyor\b/.test(text))intent='study';
 const previous=/gecen|onceki/.test(text),follow=!!lesson||previous||/^(peki|o sinav|ikisi)/.test(text);
 return{explicitLesson:!!lesson,intent:intent??(follow?context.intent??'net':undefined),lesson:lesson??(follow||intent&&['net','wrong','blank','correct','score','report','compare'].includes(intent)?context.lesson:undefined),previous};
}
export function assistantReply(message:string,insights:Insights,context:AssistantContext={},announcements:{id:string;title:string;summary:string}[]=[],activity:{exams?:any[];files?:any[]}={}){
 const lessons=[...new Set(insights.exams.flatMap(e=>e.lessons.map(l=>l.lesson)))],parsed=recognize(message,lessons,context),intent=parsed.intent;
 const explicitLatest=/\bson\b|en son|en yeni/.test(normalizeTurkish(message))&&!/onceki|gecen/.test(normalizeTurkish(message));
 if((explicitLatest||['report','latest','highest','lowest','bestLesson'].includes(intent??''))&&!parsed.explicitLesson)parsed.lesson=undefined;
 let exam=parsed.previous?insights.exams[1]:insights.exams.find(e=>e.id===context.examId)??insights.exams[0];if((intent==='latest'||explicitLatest)&&!parsed.previous)exam=insights.exams[0];
 const named=insights.exams.filter(e=>normalizeTurkish(message).includes(normalizeTurkish(e.name)));if(named.length===1)exam=named[0];
 const next:AssistantContext={intent,examId:exam?.id,lesson:parsed.lesson};
 const actions:{kind:'report'|'results'|'analysis'|'exams'|'files';id?:string;label:string}[]=[],table:{label:string;value:string}[]=[];let text='';
 const f=(v:number)=>v.toLocaleString('tr-TR',{maximumFractionDigits:2});
 const raw=normalizeTurkish(message),suggestions:string[]=[];
 const outcomeSource=(explicitLatest||parsed.previous||named.length||/o sinav/.test(raw))&&exam?exam.outcomes.map(o=>({...o,evidence:`${exam!.name} sınavındaki ${o.questions} ilgili soru`})):insights.outcomes;
 const topic=outcomeSource.filter(o=>{const n=normalizeTurkish(o.name);return n.length>3&&(raw.includes(n)||n.split(' ').every(w=>w.length<3||raw.split(' ').some(v=>v.startsWith(w))));});
 if(/\bnutum\b/.test(raw)){text='Şunu mu demek istedin?';suggestions.push('Son notum ne?','Son sınavım hangisi?');}
 else if(intent==='wellbeing')text='İyiyim, teşekkür ederim! Sonuçlarını incelemeye hazırım. Sen nasılsın?';
 else if(intent==='thanks')text='Rica ederim! Çalışmalarında kolay gelsin.';
 else if(intent==='farewell')text='Görüşürüz! İyi çalışmalar.';
 else if(intent==='assignment'||intent==='status'){
  const rows=(activity.exams??[]).filter(a=>intent==='status'||!a.submittedAt),named=rows.filter(a=>raw.includes(normalizeTurkish(a.exam.name))),chosen=named.length?named:rows;
  if(chosen.length>1&&/bu sinav|kac dakika|suresiz|teslim|aciklandi/.test(raw)){text='Hangi sınavı kastediyorsun?';suggestions.push(...chosen.slice(0,3).map(a=>`${a.exam.name} ${intent==='status'?'sonucu açıklandı mı?':'kaç dakika?'}`));}
  else text=chosen.length?chosen.map(a=>`${a.exam.name}: ${a.result?.studentPublished?'Sonucun yayımlandı.':a.submittedAt?'Teslim edildi, değerlendiriliyor.':a.endsAt&&+new Date(a.endsAt)<=Date.now()?'Süren doldu; son kaydedilen cevapların değerlendirmeyi bekliyor.':a.startedAt?'Başladın, devam ediyor.':'Sana atandı.'} ${a.exam.allowTimed?a.exam.durationMinutes+' dakika. ':''}${a.exam.allowUntimed?'Süresiz girişe izin var.':'Süresiz girişe izin yok.'}`).join('\n'):'Sana açık eşleşen sınav ataması bulunmuyor.';
  actions.push({kind:intent==='status'?'results':'exams',label:intent==='status'?'Sonuçlarım':'Sınavlarım'});
 }
 else if(intent==='files'){text=(activity.files??[]).length?`${activity.files!.length} PDF sana açık: ${activity.files!.map(f=>f.file.name).join(', ')}.`:'Şu anda sana açılmış PDF bulunmuyor.';actions.push({kind:'files',label:'Dosyalarım'});}
 else if(topic.length&&intent!=='compare'&&intent!=='report'){text=topic.slice(0,2).map(o=>`${o.lesson} / ${o.name}: ${o.questions} ilgili soru, ${o.wrong} yanlış, ${o.blank} boş. ${o.evidence}.`).join('\n');}
 else if(intent==='study'){const supported=insights.outcomes.filter(o=>(!parsed.lesson||o.lesson===parsed.lesson)&&(o.status==='repeat'||o.status==='practice')).sort((a,b)=>b.wrong-a.wrong).slice(0,2);text=supported.length?supported.map(o=>`${o.name}: ${o.evidence}, ${o.wrong} yanlış. Kısa konu tekrarı ve bu konudan birkaç alıştırmayla başlayabilirsin.`).join('\n'):insights.exams.length?`Özel konu önerisi için yeterli kazanım kanıtı yok. ${insights.warnings.slice(0,1).join(' ')}`:'Öneri verebilmem için sana bağlı yayımlanmış sonuç gerekli.';if(/unut/.test(raw))text+=' Bu verilerden öğrenme veya unutma teşhisi çıkaramam.';actions.push({kind:'analysis',label:'Analizim'});}
 else if(!intent||intent==='help'||intent==='greeting')text=intent==='greeting'?'Merhaba! Yayımlanmış sonuçlarını birlikte inceleyebiliriz. “Son sınavdan kaç aldım?” veya “Analizim” diye sorabilirsin.':'Son sınavını, netlerini, doğru/yanlış/boş sayılarını, kazanımlarını ve duyuruları sorabilirsin. “Peki Türkçe?” gibi takip soruları da kullanabilirsin.';
 else if(intent==='announcements')text=announcements.length?announcements.map(a=>`${a.title}: ${a.summary}`).join('\n'):'Şu anda sana açık güncel duyuru yok.';
 else if(intent==='results'){text='Yayımlanmış ve sana bağlanmış sonuçlar aşağıdaki listede.';actions.push({kind:'results',label:'Sonuçlarıma git'});}
 else if(!exam)text='Bu soru için erişime açık yayımlanmış sınav verisi yok.';
 else if(parsed.lesson&&!exam.lessons.some(l=>l.lesson===parsed.lesson))text='Bu derse ait yayımlanmış sonuç verisi bulunmuyor.';
 else if(intent==='analysis'||intent==='outcomes'||intent==='decline'){text=intent==='outcomes'?outcomeSource.length?outcomeSource.filter(o=>!parsed.lesson||o.lesson===parsed.lesson).sort((a,b)=>b.wrong-a.wrong).slice(0,2).map(o=>`${o.lesson} / ${o.name}: ${o.evidence}, ${o.wrong} yanlış, ${o.blank} boş`).join('\n')||'Yeterli kanıtla belirlenmiş tekrar alanı yok.':'Kazanım bilgisi bulunmuyor.':insights.warnings.join('\n')||`${insights.evidence.examCount} sınavdaki ${insights.evidence.questionCount} soruyu Analizim alanında inceleyebilirsin.`;actions.push({kind:'analysis',label:'Analizimi aç'});}
 else if(intent==='totals'){text=exam.name;const rows= /tum ders/.test(raw)?exam.lessons:parsed.lesson?exam.lessons.filter(l=>l.lesson===parsed.lesson):[exam];for(const row of rows)table.push({label:'lesson' in row?row.lesson:'Toplam',value:`${f(row.correct)} doğru · ${f(row.wrong)} yanlış · ${f(row.blank)} boş · ${row.net===null?'—':f(row.net)} net`});}
 else if(intent==='compare'){const pair=insights.exams.slice(0,2);if(pair.length<2)text='Karşılaştırma için iki yayımlanmış sınav gerekir.';else if(pair[0].scale!==pair[1].scale)text=insights.comparisonNote;else{const values=pair.map(e=>parsed.lesson?e.lessons.find(l=>l.lesson===parsed.lesson):e);if(values.some(v=>!v||'missing'in v&&v.missing||v.net===null))text='Karşılaştırılabilir ders verisi eksik.';else{text='Aynı ölçme içeriği ve kuralları olan son iki sonuç; çalışma koşulları da sonucu etkileyebilir.';for(const [i,e]of pair.entries())table.push({label:e.name,value:`${f(values[i]!.net!)} net`});table.push({label:'Fark (yeni − önceki)',value:f(values[0]!.net!-values[1]!.net!)+' net'});}}}
 else if(intent==='highest'||intent==='lowest'){const comparable=insights.exams.filter(e=>e.scale===exam!.scale&&e.score!==null).sort((a,b)=>intent==='highest'?b.score!-a.score!:a.score!-b.score!);if(!comparable.length)text='Bu ölçekte hesaplanmış puan yok.';else{exam=comparable[0];text=`Son beş uygun sonuç içinde aynı içerik ve kurallardaki ${intent==='highest'?'en yüksek':'en düşük'} puanın ${f(exam.score!)} (${exam.name}). Farklı ölçekler bu sıralamaya alınmadı.`;}}
 else if(intent==='report'){text=`${exam.name} karneni güvenli bağlantıyla açabilirsin.`;actions.push({kind:'report',id:exam.id,label:'Bu sınavın karnesini aç'});}
 else if(intent==='latest')text=`Son yayımlanmış sonuç kaydın: ${exam.name}. Kayıt tarihi: ${new Date(exam.date).toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'})}.`;
 else if(intent==='bestLesson'){const ranked=exam.lessons.filter(l=>!l.missing&&l.net!==null&&l.correct+l.wrong+l.blank>=5).sort((a,b)=>b.net!/(b.correct+b.wrong+b.blank)-a.net!/(a.correct+a.wrong+a.blank));text=ranked.length?`${exam.name}: soru sayısına göre net oranı en yüksek dersin ${ranked[0].lesson}. Bu yalnız bu sınavın betimsel sonucudur.`:'Ders karşılaştırması için yeterli soru yok.';}
 else {const row=parsed.lesson?exam.lessons.find(l=>l.lesson===parsed.lesson):exam;if(!row||'missing'in row&&row.missing)text='Bu derste değerlendirilebilir oturum bulunmuyor.';else{const key=intent==='net'?'net':intent==='score'?'score':intent==='correct'?'correct':intent==='wrong'?'wrong':'blank';const value=key==='score'?parsed.lesson?null:exam.score:(row as any)[key];text=`${exam.name}${parsed.lesson?' · '+parsed.lesson:''}: ${value===null?'Bu ölçü hesaplanmadı.':f(value)+' '+({net:'net',score:'puan',correct:'doğru',wrong:'yanlış',blank:'boş'}[key])}`;}}
 if(!intent&&!topic.length&&!suggestions.length){text='Şunu mu demek istedin?';suggestions.push('Son notum ne?','Bugün ne çalışayım?','Sana ne sorabilirim?');}
 return{text,table,actions,suggestions,context:{...next,examId:exam?.id},scope:'Yalnız hesabına bağlı yayımlanmış son beş uygun sınav.'};
}
