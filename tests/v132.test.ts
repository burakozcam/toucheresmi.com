import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {deflateRawSync} from "node:zlib";
import {base32,unbase32,totp,matchingCounter,encryptMfa,decryptMfa,recoveryCodes} from "../apps/api/src/mfa-core";
import {regionAllowed,turkeyDay} from "../apps/api/src/dealer-policy";
import {inspectWorkbookBytes,safeWorkbookRead,privateStoragePath} from "../apps/api/src/upload-security";
import {env} from "../apps/api/src/config";
import {trustedCookieOptions} from "../apps/api/src/security-routes";

test("v132 TOTP: bağımsız RFC 6238 SHA1 test vektörleri, base32 ve tekrar sayacı",()=>{
 const secret="GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
 for(const [time,expected]of [[59,"94287082"],[1111111109,"07081804"],[1111111111,"14050471"],[1234567890,"89005924"],[2000000000,"69279037"],[20000000000,"65353130"]]as const)assert.equal(totp(secret,Math.floor(time/30),8),expected);
 assert.equal(unbase32(base32(Buffer.from('12345678901234567890'))).toString(),'12345678901234567890');
 const now=Date.now(),step=Math.floor(now/30000),code=totp(secret,step);assert.equal(matchingCounter(secret,code,-1,now),step);assert.equal(matchingCounter(secret,code,step,now),null);assert.equal(matchingCounter(secret,'abc123',-1,now),null);
});
test("v132 MFA anahtarı AEAD ile mühürlenir; değiştirilen şifreli veri reddedilir; kurtarma kodları benzersiz ve hashlenir",()=>{
 const saved=env.MFA_ENCRYPTION_KEY;(env as any).MFA_ENCRYPTION_KEY='ab'.repeat(32);
 try{const secret=base32(crypto.randomBytes(20)),sealed=encryptMfa(secret);assert.notEqual(sealed,secret);assert.equal(decryptMfa(sealed),secret);const bad=Buffer.from(sealed,'base64url');bad[14]^=1;assert.throws(()=>decryptMfa(bad.toString('base64url')));const recovery=recoveryCodes();assert.equal(recovery.codes.length,10);assert.equal(new Set(recovery.codes).size,10);assert.ok(recovery.codes.every(code=>!recovery.hashes.includes(code)));}finally{(env as any).MFA_ENCRYPTION_KEY=saved;}
});
test("v132 bölge kuralları: bayi/yayınevi/il/ilçe birlikte; serbest erişim, tüm yayınevleri ve il genelinde izin",()=>{
 const d={restrictedRegions:true,regions:[{publisherId:'x',city:'İstanbul',district:'Kadıköy'},{publisherId:'y',city:'İstanbul',district:null},{publisherId:'z',city:null,district:null}]};
 assert.equal(regionAllowed(d,'x','İstanbul','Maltepe'),false);assert.equal(regionAllowed(d,'x','İSTANBUL','KADIKÖY'),true);assert.equal(regionAllowed(d,'y','İstanbul','Maltepe'),true);assert.equal(regionAllowed(d,'y','Ankara','Çankaya'),false);assert.equal(regionAllowed(d,'z','Ankara','Çankaya'),true);assert.equal(regionAllowed({restrictedRegions:true,regions:[]},'x','İstanbul','Kadıköy'),false);assert.equal(regionAllowed({...d,restrictedRegions:false},'other','İzmir','Konak'),true);
 assert.equal(regionAllowed({restrictedRegions:true,regions:[{publisherId:null,city:null,district:null}]},'other',null,null),true);
 assert.equal(turkeyDay(new Date('2026-11-16T20:59:59Z')),'2026-11-16');assert.equal(turkeyDay(new Date('2026-11-16T21:00:00Z')),'2026-11-17');
});
test("v132 Excel güvenliği: gerçek XLSX açılır; sahte ZIP boyutu, ZIP traversal ve büyük dosya reddedilir",()=>{
 const x=require('xlsx'),book=x.utils.book_new();x.utils.book_append_sheet(book,x.utils.aoa_to_sheet([['Ad','Cevap'],['=2+2','ABCD']]),'Sınav');const good=x.write(book,{type:'buffer',bookType:'xlsx',compression:true});assert.ok(safeWorkbookRead(good,{type:'buffer'}).SheetNames.includes('Sınav'));
 const local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22),name=Buffer.from('sheet.xml'),content=deflateRawSync(Buffer.alloc(1024*1024,65));local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt16LE(name.length,26);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(8,10);central.writeUInt32LE(content.length,20);central.writeUInt32LE(10,24);central.writeUInt16LE(name.length,28);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+content.length,16);assert.throws(()=>inspectWorkbookBytes(Buffer.concat([local,name,content,central,name,end])));
 assert.throws(()=>safeWorkbookRead(Buffer.alloc(11*1024*1024)));assert.throws(()=>privateStoragePath('/safe/storage','/safe/storage/../../etc/passwd'));
 // AOA user strings are strings, never executable Excel formulas.
 const sheet=x.utils.aoa_to_sheet([['=cmd|evil','+1','@SUM(A1)']]);assert.equal(sheet.A1.t,'s');assert.equal(sheet.A1.f,undefined);
});
test("v132 güvenilir cihaz çerezi: canlıda Secure, HttpOnly, SameSite Strict ve 30 gün",()=>{const cookie=trustedCookieOptions(true);assert.equal(cookie.secure,true);assert.equal(cookie.httpOnly,true);assert.equal(cookie.sameSite,'strict');assert.equal(cookie.maxAge,30*86400_000);assert.equal(cookie.path,'/api');});
