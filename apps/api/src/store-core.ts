import { z } from "zod";
import crypto from "node:crypto";
import { safeWorkbookRead } from "./upload-security";
import { SecurityError } from "./security-errors";
const x=require("xlsx");
export const storeImage=z.string().max(2000).url().refine(v=>{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password;},"Görseller HTTPS adresi olmalıdır.");
export const productInput=z.object({name:z.string().trim().min(1).max(250),barcode:z.string().trim().regex(/^\d{8,14}$/).nullable().default(null),description:z.string().max(10000).default(""),price:z.coerce.number().finite().min(0).max(9999999999.99).refine(n=>Math.abs(n*100-Math.round(n*100))<.001,"Fiyat en fazla iki ondalıklı olmalı."),discount:z.coerce.number().int().min(0).max(100).default(0),stock:z.coerce.number().int().min(0).max(2147483647).default(0),categoryId:z.string().min(1).max(100),brandId:z.string().min(1).max(100),grade:z.coerce.number().int().min(1).max(12).nullable().default(null),lesson:z.string().max(100).nullable().default(null),images:z.array(storeImage).max(8).default([]),active:z.boolean().default(false)});
export const storeHeaders=["urun_id","barkod","urun_adi","aciklama","fiyat","yuzde_indirim_yap","stok","kategori_idler","marka_id","sinif","ders","gorseller","durum"];
export function storeWorkbook(products:any[]){const rows=[storeHeaders,...products.map(p=>[p.id,p.barcode??"",p.name,p.description,String(p.price),p.discount,p.stock,p.categoryId,p.brandId,p.grade??"",p.lesson??"",p.images.join("\n"),p.active?"1":"0"])];const book=x.utils.book_new(),sheet=x.utils.aoa_to_sheet(rows);x.utils.book_append_sheet(book,sheet,"Urunler");return x.write(book,{type:"buffer",bookType:"xlsx"});}
export type ProductChange={id?:string;data:z.infer<typeof productInput>;row:number};
export function parseStoreWorkbook(bytes:Buffer,name:string){
 if(!/\.xlsx$/i.test(name)||bytes.length<4||bytes.readUInt32LE(0)!==0x04034b50)throw new SecurityError(400,"Yalnız gerçek XLSX ürün şablonu kabul edilir.");
 const book=safeWorkbookRead(bytes,{type:"buffer",raw:true,cellFormula:true});if(book.SheetNames.length!==1)throw new SecurityError(400,"Ürün dosyası tek çalışma sayfası içermelidir.");
 const sheet=book.Sheets[book.SheetNames[0]];for(const cell of Object.values(sheet) as any[])if(cell&&typeof cell==="object"&&cell.f)throw new SecurityError(400,"Formüllü hücreleri değer olarak yapıştırın.");
 const rows:any[][]=x.utils.sheet_to_json(sheet,{header:1,defval:"",raw:true});
 const header=(rows.shift()??[]).map(v=>String(v).trim());
 if(new Set(header).size!==header.length||!storeHeaders.filter(h=>h!=="urun_id").every(h=>header.includes(h))||header.some(h=>![...storeHeaders,"token","varyant_id","filtre_idler","varyant_adi","SIL"].includes(h)))throw new SecurityError(400,"Desteklenmeyen ürün sütunları. Mağazanın Excel şablonunu kullanın.");
 const errors:Array<{row:number;message:string}>=[],changes:ProductChange[]=[],ids=new Set<string>(),barcodes=new Set<string>();
 rows.forEach((values,i)=>{const row=i+2;if(values.every(v=>v===""))return;const v=Object.fromEntries(header.map((h,j)=>[h,values[j]]));try{
  if(v.SIL&&String(v.SIL)!=="0")throw Error("SIL otomatik silme için kullanılamaz; hiçbir ürün silinmedi.");
  if(v.varyant_id||v.varyant_adi||v.filtre_idler)throw Error("Varyant ve kaynak filtre alanları desteklenmiyor; mağaza şablonuna aktarın.");
  const id=String(v.urun_id??"").trim();if(id&&ids.has(id))throw Error("Tekrarlanan ürün ID.");if(id)ids.add(id);
  if(v.barkod!==""&&typeof v.barkod!=="string")throw Error("Barkod metin hücresi olmalı; baştaki sıfırları koruyun.");
  if(v.urun_id!==""&&v.urun_id!==undefined&&typeof v.urun_id!=="string")throw Error("Ürün ID metin hücresi olmalı.");
  for(const key of ["urun_adi","fiyat","stok","kategori_idler","marka_id","durum"])if(v[key]===""||v[key]===undefined)throw Error(`${key} zorunlu.`);
  if(!["0","1"].includes(String(v.durum)))throw Error("durum yalnız 0 veya 1 olabilir.");
  const barcode=String(v.barkod||"")||null;if(barcode&&barcodes.has(barcode))throw Error("Tekrarlanan barkod.");if(barcode)barcodes.add(barcode);
  const data=productInput.parse({name:String(v.urun_adi),barcode,description:String(v.aciklama),price:v.fiyat,discount:v.yuzde_indirim_yap||0,stock:v.stok,categoryId:String(v.kategori_idler),brandId:String(v.marka_id),grade:v.sinif===""?null:v.sinif,lesson:String(v.ders)||null,images:String(v.gorseller).split(/\r?\n/).filter(Boolean),active:String(v.durum)==="1"});changes.push({id:id||undefined,data,row});
 }catch(e){errors.push({row,message:e instanceof z.ZodError?e.issues.map(i=>`${i.path.join(".")}: ${i.message}`).join("; "):(e as Error).message});}});
 if(!rows.length||!changes.length&&!errors.length)errors.push({row:2,message:"En az bir ürün satırı gerekli."});
 return {changes,errors};
}
export async function validateStoreChanges(db:any,changes:ProductChange[]){
 const [categories,brands,products]=await Promise.all([db.storeCategory.findMany({select:{id:true}}),db.storeBrand.findMany({select:{id:true}}),db.storeProduct.findMany({orderBy:{id:"asc"}})]);
 const cat=new Set(categories.map((v:any)=>v.id)),brand=new Set(brands.map((v:any)=>v.id)),existing=new Map(products.map((p:any)=>[p.id,p]));const errors:Array<{row:number;message:string}>=[];
 for(const c of changes){if(!cat.has(c.data.categoryId))errors.push({row:c.row,message:"Geçersiz kategori."});if(!brand.has(c.data.brandId))errors.push({row:c.row,message:"Geçersiz marka."});if(c.id&&!existing.has(c.id))errors.push({row:c.row,message:"Ürün ID bulunamadı; yanlış eşleşme engellendi."});const collision=products.find((p:any)=>c.data.barcode&&p.barcode===c.data.barcode&&p.id!==c.id);if(collision)errors.push({row:c.row,message:"Barkod başka bir ürüne ait."});}
 return {errors,products,digest:crypto.createHash("sha256").update(JSON.stringify({products,categories:categories.map((v:any)=>v.id).sort(),brands:brands.map((v:any)=>v.id).sort()})).digest("hex")};
}
export async function applyStoreChanges(db:any,changes:ProductChange[],expectedDigest:string){
 const checked=await validateStoreChanges(db,changes);if(checked.errors.length||checked.digest!==expectedDigest)throw new SecurityError(409,"Ürünler veya ilişkiler değişti. İşlem iptal edildi. 0 ürün güncellendi; yeniden önizleyin.");
 for(const c of changes)if(c.id)await db.storeProduct.update({where:{id:c.id},data:c.data});else await db.storeProduct.create({data:c.data});
 return {updated:changes.filter(c=>c.id).length,created:changes.filter(c=>!c.id).length};
}
export function adjustedPrice(price:number,percent:number){return Math.round(price*(100+percent))/100;}
export const changeHash=(changes:ProductChange[])=>crypto.createHash("sha256").update(JSON.stringify(changes)).digest("hex");
