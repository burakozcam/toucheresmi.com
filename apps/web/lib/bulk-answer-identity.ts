const normalized=(s:string)=>s.toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]+/g,' ').trim();
export function inferAnswerFile(name:string,publishers:{id:string;name:string;active:boolean}[]){
 const stem=name.replace(/\.[^.]+$/,''),text=normalized(stem),grade=stem.match(/(?:^|\D)(1[012]|[1-9])\s*[.\-_ ]*\s*s[ıiİI]n[ıiİI]f/i)?.[1]??'';
 const base=(s:string)=>normalized(s).replace(/\b(YAYINLARI|YAYINCILIK|YAYIN|YAYINEVI)\b/g,'').trim();
 const matches=publishers.filter(p=>p.active&&base(p.name)&&new RegExp(`(?:^| )${base(p.name).replace(/ /g,' +')}(?: |$)`).test(text));
 return{publisherId:matches.length===1?matches[0].id:'',grade,name:stem};
}
