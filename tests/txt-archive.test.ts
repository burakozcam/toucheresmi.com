import test from "node:test";
import assert from "node:assert/strict";
import {canonicalJson} from "../apps/api/src/canonical-json";
import {layout8050,opticalLayoutSchema} from "../apps/api/src/optical-core";

test("FMT: JSONB key order is irrelevant but coordinate, lesson order and length changes remain meaningful",()=>{
 const jsonb=JSON.parse(canonicalJson(layout8050));assert.notEqual(JSON.stringify(jsonb),JSON.stringify(layout8050));
 assert.equal(canonicalJson(opticalLayoutSchema.parse(jsonb)),canonicalJson(opticalLayoutSchema.parse(layout8050)));
 assert.notEqual(canonicalJson({...jsonb,lineLength:172}),canonicalJson(layout8050));
 assert.notEqual(canonicalJson({...jsonb,lessons:[...jsonb.lessons].reverse()}),canonicalJson(layout8050));
});
test("TXT archive: original bytes round-trip, encrypted data rejects tampering, paths and owner scope are bounded",async()=>{
 const {sealTxt,openTxt,archivePath,archiveScope,archiveName}=await import("../apps/api/src/txt-archive");
 const raw=Buffer.from("11111111110  ÖRNEK ÖĞRENCİ  A  ABCD\r\n","utf8"),sealed=sealTxt(raw);
 assert.deepEqual(openTxt(sealed),raw);assert.ok(!sealed.includes(raw));assert.notDeepEqual(sealTxt(raw),sealed);
 sealed[sealed.length-1]^=1;assert.throws(()=>openTxt(sealed));assert.throws(()=>archivePath("../../.env"));assert.ok(archiveName("x".repeat(300)+".TXT").endsWith(".txt"));assert.equal(archiveName("../../sonuc.txt"),"sonuc.txt");
 assert.deepEqual(archiveScope({id:"owner",role:"DEALER"} as any),{createdById:"owner"});assert.deepEqual(archiveScope({id:"admin",role:"SUPER_ADMIN"} as any),{});
});
