/** Standard nine template columns stay first. Optional columns preserve editor metadata. */
export const answerKeyHeaders=['Ders','A Soru No','B Soru No','Doğru Cevap','Katsayı','Kazanım Kodu','Kazanım Metni','C Soru No','D Soru No','Başlangıç Puanı','Çoklu İşaret','Seçenek Sayısı','KurumsalSınav Ders Adı','Kaynak Satır (JSON)'];
export function answerKeyRows(questions:Array<{lesson:string;number:number;positions:Record<string,number>;answer:string;weight:number|null;outcomeCode?:string;outcomeName?:string;scoreBase?:number;multipleMark?:string;optionCount?:number;source?:unknown}>){
 return [answerKeyHeaders,...questions.map(q=>[q.lesson,q.number,q.positions.B??'',q.answer,q.weight??'',q.outcomeCode??'',q.outcomeName??'',q.positions.C??'',q.positions.D??'',q.scoreBase??'',q.multipleMark??'',q.optionCount??'',q.lesson,q.source?JSON.stringify(q.source):''])];
}
