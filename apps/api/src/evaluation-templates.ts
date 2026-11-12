import {layoutOzdebirSingle} from "./ozdebir-layout";
import crypto from "node:crypto";
import { canonicalJson } from "./canonical-json";
import { decodeOptical, layout7108, layout8050, opticalLayoutSchema } from "./optical-core";
import { libraryFmtBytes } from "./fmt-library";

// Executable system definitions are code-owned. A saved row is not a new reader specification.
export function systemEvaluationTemplates() {
  return ([["7108", layout7108], ["8050", layout8050], ["ozdebir-ortaokul-tek-oturum",layoutOzdebirSingle]] as const).map(([code, layout]) => ({
    id: `system-fmt-${code}`, name: code==="ozdebir-ortaokul-tek-oturum"?"Özdebir 5/6/7/8 Ortaokul Tek Oturum":`Sistem FMT ${code}`, active: true,
    layout: structuredClone(layout), originalFmt: decodeOptical(libraryFmtBytes(code)),
    grade: null, publisherId: null,
  }));
}
export function systemStorageId(template: ReturnType<typeof systemEvaluationTemplates>[number]) {
  const digest=crypto.createHash("sha256").update(canonicalJson(opticalLayoutSchema.parse(template.layout))).digest("hex").slice(0,16);
  return `${template.id}-layout-${digest}`;
}
export const systemEvaluationTemplate=(id:string)=>systemEvaluationTemplates().find(t=>t.id===id||systemStorageId(t)===id);
export function sameExecutableLayout(a:unknown,b:unknown){const x=opticalLayoutSchema.safeParse(a),y=opticalLayoutSchema.safeParse(b);return x.success&&y.success&&canonicalJson(x.data)===canonicalJson(y.data);}
export function evaluationTemplateChoices<T extends {id:string;active:boolean;layout:unknown}>(saved:T[]){
  const system=systemEvaluationTemplates();
  return [...saved.filter(t=>t.active&&!/^system-fmt-/.test(t.id)),...system.filter(t=>!saved.some(s=>(s.id===t.id||s.id===systemStorageId(t))&&!s.active))];
}
