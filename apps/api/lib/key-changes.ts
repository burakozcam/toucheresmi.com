type Question={lesson:string;number:number;answer:string;weight:number|null;positions:Record<string,number>;outcomeCode?:string;outcomeName?:string;scoreBase?:number;multipleMark?:string;optionCount?:number};
export function describeKeyChanges(before:Question[],after:Question[],oldPenalty:number,newPenalty:number){
 const changes:string[]=[];let scoring=false;
 if(oldPenalty!==newPenalty){changes.push(`Yanlış götürme: ${oldPenalty} → ${newPenalty}`);scoring=true;}
 const old=new Map(before.map(q=>[`${q.lesson}\0${q.number}`,q]));
 for(const q of after){const key=`${q.lesson}\0${q.number}`,p=old.get(key),label=`${q.lesson} ${q.number}. soru`;old.delete(key);
  if(!p){changes.push(`${label}: soru eklendi`);scoring=true;continue;}
  for(const [field,name]of [['answer','Cevap'],['weight','Katsayı'],['scoreBase','Başlangıç puanı'],['multipleMark','Çoklu işaret kuralı'],['optionCount','Seçenek sayısı'],['outcomeCode','Kazanım kodu'],['outcomeName','Kazanım açıklaması']] as const){if((p[field]??'')!==(q[field]??'')){changes.push(`${label} · ${name}: ${p[field]??'boş'} → ${q[field]??'boş'}`);if(!field.startsWith('outcome')&&field!=='optionCount')scoring=true;}}
  for(const book of new Set([...Object.keys(p.positions),...Object.keys(q.positions)])){if(p.positions[book]!==q.positions[book]){changes.push(`${label} · ${book} kitapçığı çaprazı: ${p.positions[book]??'yok'} → ${q.positions[book]??'yok'}`);scoring=true;}}
 }
 for(const q of old.values()){changes.push(`${q.lesson} ${q.number}. soru: soru kaldırıldı`);scoring=true;}
 return {changes,affectsScoring:scoring,impact:scoring?'Doğru/yanlış, net, puan, sıralama, kazanım analizi ve karneler etkilenebilir. Sonuçlar ayrıca yeniden değerlendirilmelidir.':'Kazanım analizi, karnelerin açıklama alanları ve editörün soru görünümü etkilenebilir. Cevap ve puan kuralları değişmedi.'};
}
