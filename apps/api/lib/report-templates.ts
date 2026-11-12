export const reportTemplates=[
 {id:"summary-card",family:"cards",name:"1 Sayfalık Karne · özet"},
 {id:"two-page-card",family:"cards",name:"2 Sayfalık Karne · cevap ve kazanım analizi"},
 {id:"detailed-card",family:"cards",name:"Kazanımlı Karne · tam ayrıntı, gerektiğinde çok sayfa"},
 {id:"school-table",family:"lists",name:"Profesyonel okul sonuç tablosu"},
 {id:"classic-card",family:"cards",name:"Mevcut kazanımlı karne"},
 {id:"analysis-card",family:"cards",name:"Ders ve kazanım analizi · iki sütun"},
 {id:"table-card",family:"cards",name:"Tablolu sonuç belgesi · pastel"},
 {id:"classic-list",family:"lists",name:"Mevcut sonuç listesi"},
 {id:"net-list",family:"lists",name:"Okul net listesi · karşılaştırmalı"},
] as const;
export function reportTemplate(kind:string,id?:string){const family=kind==="cards"?"cards":"lists",selected=reportTemplates.find(t=>t.id===(id??(family==="cards"?"detailed-card":"school-table")));if(!selected||selected.family!==family)throw Error("Belge türü için geçerli bir çıktı şablonu seçin.");return selected;}
