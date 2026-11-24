export const ROLE_LABELS:Record<string,string>={SUPER_ADMIN:'Süper Admin',DEALER:'Bayi',SCHOOL_ADMIN:'Kurum',STUDENT:'Öğrenci',PARENT:'Veli',TEMPORARY:'Geçici Erişim'};
export const SUPPORT_STATUSES:Record<string,string>={SENT:'Gönderildi',RECEIVED:'İşleme Alındı',IN_PROGRESS:'İşlem Devam Ediyor',RESOLVED:'Çözüldü'};
export const SUPPORT_CATEGORIES=['Sınav Değerlendirme','FMT Yönetimi','Sonuçlar ve Raporlar','Hesap ve Giriş','Teknik Sorun','Genel'];
export const TEMP_SCOPE_LABELS:Record<string,string>={FMT_DEMO:'FMT Yönetimi · Deneme Alanı',PDF_TOOLS:'PDF ve Belge Araçları'};
export const DURATION_OPTIONS:Record<string,number[]>={minute:[5,10,15,30],hour:[1,2,3,5,10,12,24],day:[2,3,5,10,15,30],month:[1,3,5,6,10,12],year:[2]};
export const DURATION_LABELS:Record<string,string>={minute:'Dakika',hour:'Saat',day:'Gün',month:'Ay',year:'Yıl'};
export const turkeyDate=(value:string|number)=>new Date(value).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'short',timeStyle:'short'});
export function notificationCounts(items:Array<{id:string;section:string}>,allowed:(section:string)=>boolean){const seen=new Set<string>(),counts:Record<string,number>={};for(const item of items){if(seen.has(item.id)||!allowed(item.section))continue;seen.add(item.id);counts[item.section]=(counts[item.section]||0)+1;}return counts;}
