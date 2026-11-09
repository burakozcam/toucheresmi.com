// PostgreSQL jsonb may reorder object keys; key order must not bypass duplicate warnings.
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,canonical(value[key])]));
 return value;
}
function fmtContentIdentity(template){return template.originalFmt.replace(/\r\n|\r/g,'\n').trim()+'\n'+JSON.stringify(canonical(template.layout));}
module.exports={fmtContentIdentity};
