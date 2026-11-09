import fs from "node:fs";
import path from "node:path";
import catalog from "../assets/templates/catalog.json";
/** Download/share library only. Adding an original file never activates an unverified TXT layout. */
export const fmtLibrary = catalog;
export const fmtLibraryCodes = catalog.map(entry => entry.code);
export const findLibraryFmt = (code:string) => fmtLibrary.find(entry => entry.code === code);
export function libraryFmtBytes(code:string){
 const entry=findLibraryFmt(code);
 if(!entry)throw new Error("Sistem FMT dosyası bulunamadı.");
 return fs.readFileSync(path.join(__dirname,"../assets/templates",entry.file));
}
