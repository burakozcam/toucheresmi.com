import provinces from "./turkey-locations.json";
export const turkeyProvinces=provinces;
export const locationKey=(value?:string|null)=>String(value??"").trim().replace(/ı/g,"i").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/\s+/g," ");
export function findProvince(value?:string|null){return provinces.find(p=>locationKey(p.name)===locationKey(value));}
export function resolveLocation(city?:string|null,district?:string|null){const province=findProvince(city);const matches=province?.districts.filter(d=>locationKey(d.name)===locationKey(district))??[];return province&&matches.length===1?{city:province.name,district:matches[0].name,provinceId:province.id,districtId:matches[0].id}:null;}
/** Existing ambiguous rows are left untouched. All new writes must resolve within one province. */
export function requireLocation(city?:string|null,district?:string|null){const found=resolveLocation(city,district);if(!found)throw Error("Listeden geçerli bir il ve bu ile ait ilçe seçin.");return found;}
export function schoolLocationIdentity(name:string,city?:string|null,district?:string|null){const geo=resolveLocation(city,district);return [name,geo?.city??city,geo?.district??district].map(v=>locationKey(v).replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim()).join("|");}
