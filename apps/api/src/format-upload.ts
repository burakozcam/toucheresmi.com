import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
/** The source workbook contains both answers and outcomes; keep separate physical archive copies. */
export function completeFormatUploads(files:Express.Multer.File[],format:string){
  if(format!=="f"&&format!=="o")return;
  const source=files.find(f=>f.fieldname==="learningOutcomesFile");if(!source)return;
  if(!/\.xlsx?$/i.test(source.originalname))throw new Error("F / O formatı için kazanım dosyası XLS veya XLSX olmalı.");
  if(files.some(f=>f.fieldname==="answerKeyFile"))return;
  const copyPath=path.join(path.dirname(source.path),`${crypto.randomUUID()}-answers${path.extname(source.originalname)}`);
  fs.copyFileSync(source.path,copyPath);files.push({...source,fieldname:"answerKeyFile",path:copyPath,filename:path.basename(copyPath)});
}
