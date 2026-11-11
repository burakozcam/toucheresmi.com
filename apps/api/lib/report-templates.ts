export const reportTemplates=[
 {id:"classic-card",family:"cards",name:"Mevcut kazanımlı karne"},
 {id:"analysis-card",family:"cards",name:"Ders ve kazanım analizi · iki sütun"},
 {id:"table-card",family:"cards",name:"Tablolu sonuç belgesi · pastel"},
 {id:"classic-list",family:"lists",name:"Mevcut sonuç listesi"},
 {id:"net-list",family:"lists",name:"Okul net listesi · karşılaştırmalı"},
] as const;
export function reportTemplate(kind:string,id?:string){const family=kind==="cards"?"cards":"lists",selected=reportTemplates.find(t=>t.id===(id??(family==="cards"?"classic-card":"classic-list")));if(!selected||selected.family!==family)throw Error("Belge türü için geçerli bir çıktı şablonu seçin.");return selected;}
