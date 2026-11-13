import crypto from "node:crypto";
import {layoutOzdebirSingle,layoutOzdebirVerbal,layoutOzdebirNumeric} from "./ozdebir-layout";
/** Exact contents, not filename/publisher guesswork. EOL/BOM normalization only. */
export function verifiedFmtLayout(text:string){
 const normalized=text.replace(/^\uFEFF/,"").split(/\r\n|\r|\n/).map(l=>l.trimEnd()).filter(l=>l.trim()).join("\n");
 const digest=crypto.createHash("sha256").update(normalized).digest("hex");
 const layouts={"75b321480ff8db922666538433666c287b32902264d119926cffec3379a63c4e":layoutOzdebirSingle,"744a723ca38406f2f62851922808f11dabe94d8f6a652c03def7b62ec618c958":layoutOzdebirVerbal,"6e14414c1a35ef72f2732e9d60fdd59c903cf8a1c9aee1e4de4a71f15abe40da":layoutOzdebirNumeric};
 return layouts[digest as keyof typeof layouts];
}
