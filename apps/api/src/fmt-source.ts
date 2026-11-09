/** F/O refers to source metadata, not a layout guessed from the filename or question counts. */
export function detectFmtSource(text:string):"f"|"o"|null{
 const markers=text.replace(/^\uFEFF/,"").split(/\r\n|\r|\n/)[0].split("=").slice(6).map(v=>v.trim().toLocaleUpperCase("tr-TR"));
 const f=markers.includes("FERNUS"),o=markers.some(v=>["OKULİZYON","OKULIZYON"].includes(v));
 return f!==o?(f?"f":"o"):null;
}
