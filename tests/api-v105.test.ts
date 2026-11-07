import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
function handler(router: any, path: string, method: string) {
  const route = (router.stack ?? router.router.stack).find((layer: any) => layer.route?.path === path && layer.route.methods[method]);
  assert.ok(route, `${method} ${path}`); return route.route.stack.at(-1).handle;
}
async function invoke(fn: any, body: any, params: any = {}) {
  let status = 200, data: any;
  const response = { status(n: number) { status = n; return this; }, json(v: any) { data = v; return this; }, setHeader() {} };
  await fn({ body, params, user: { id: "admin" } }, response, (e: any) => { if (e) throw e; });
  return { status, data };
}
test("takvim API 2.500 satırı 100'lü gruplarla kaydeder, geçersiz ve tekrarları izole eder; geri alma kapsamı güvenlidir", async () => {
  const { prisma } = await import("../apps/api/src/db"); const { scheduleRouter } = await import("../apps/api/src/schedule");
  const originals: [any,string,any][] = [];
  const mock = (object: any, method: string, fn: any) => { originals.push([object, method, object[method]]); object[method] = fn; };
  const entries: any[] = [], batches: any[] = []; let largest = 0;
  mock(prisma.publisher,"findMany",async () => [{ id:"p" }]); mock(prisma.publishedAnswerKey,"findMany",async () => []);
  mock(prisma.scheduleImport,"create",async ({data}: any) => { const b = { ...data, id:`batch${batches.length}`, createdAt:new Date(), saved:0 }; batches.push(b); return b; });
  mock(prisma.scheduleImport,"update",async ({where,data}:any) => Object.assign(batches.find((b)=>b.id===where.id),data));
  mock(prisma.scheduleImport,"findUniqueOrThrow",async ({where}:any) => batches.find((b)=>b.id===where.id));
  mock(prisma,"$transaction",async (fn:any) => fn(prisma));
  mock(prisma.examScheduleEntry,"createMany",async ({data,skipDuplicates}:any) => { assert.equal(skipDuplicates,true); largest=Math.max(largest,data.length); let count=0; for(const item of data) { if(entries.some((e)=>e.publisherId===item.publisherId && e.level===item.level && e.sequence===item.sequence && +e.examDate===+item.examDate)) continue; entries.push({...item}); count++; } return {count}; });
  mock(prisma.examScheduleEntry,"count",async ({where}:any) => entries.filter((e)=>e.importId===where.importId).length);
  mock(prisma.examScheduleEntry,"deleteMany",async ({where}:any) => { const ids = entries.filter((e)=>e.importId===where.importId && +e.updatedAt===+where.updatedAt && e.answerKeyId===null); for(const e of ids) entries.splice(entries.indexOf(e),1); return {count:ids.length}; });
  try {
    const upload=handler(scheduleRouter,"/api/admin/exam-schedule","post");
    const input=Array.from({length:2500},(_,i)=>({publisherId:"p",level:String(Math.floor(i/999)+1),sequence:i%999+1,examDate:"2027-02-17",scope:"Kapsam"}));
    const first=await invoke(upload,{items:input}); assert.equal(first.data.count,2500); assert.equal(largest,100);
    const repeated=await invoke(upload,{items:input}); assert.equal(repeated.data.count,0); assert.equal(repeated.data.duplicates,2500); assert.equal(entries.length,2500);
    const partial=await invoke(upload,{items:[input[0],{...input[0],publisherId:"missing"},{...input[0],sequence:0},{...input[0],level:"8"}]});
    assert.equal(partial.data.count,1); assert.equal(partial.data.invalid,2); assert.equal(partial.data.duplicates,1);
    const oversized=await invoke(upload,{items:[...input,input[0]]}); assert.equal(oversized.status,400);
    entries[0].updatedAt=new Date(+entries[0].updatedAt+1000); entries[1].answerKeyId="key";
    const rollback=await invoke(handler(scheduleRouter,"/api/admin/schedule-imports/:id/rollback","post"),{}, {id:first.data.importId});
    assert.equal(rollback.data.count,2498); assert.equal(rollback.data.retained,2); assert.equal(entries.length,3);
    assert.equal(entries.filter((e)=>e.importId===partial.data.importId).length,1);
  } finally { for (const [object,key,fn] of originals.reverse()) object[key]=fn; }
});
test("hesap daveti özeti saklanır, token tek kullanımlıktır ve süresi dolunca reddedilir", async () => {
  process.env.STORAGE_DIR = "/tmp/kurumsal-v105-test-storage";
  const { app } = await import("../apps/api/src/server"); const { prisma } = await import("../apps/api/src/db");
  const create = prisma.user.create, updateMany = prisma.user.updateMany; let account: any;
  prisma.user.create = (async ({data}:any) => { account={id:"new",active:true,...data}; return {id:account.id,email:data.email,phone:data.phone}; }) as any;
  prisma.user.updateMany = (async ({where,data}:any) => { if(account.setupTokenHash!==where.setupTokenHash || !account.setupExpiresAt || account.setupExpiresAt<=where.setupExpiresAt.gt || !account.active || !account.mustChangePassword) return {count:0}; Object.assign(account,data); return {count:1}; }) as any;
  try {
    const created=await invoke(handler(app,"/api/admin/users","post"),{firstName:"Yeni",lastName:"Kullanıcı",email:"new@example.test",phone:"05321234567"});
    assert.equal(created.status,201); assert.equal(created.data.temporaryPassword,undefined);
    const token = created.data.setupUrl.split("#")[1]; assert.equal(account.setupTokenHash,crypto.createHash("sha256").update(token).digest("hex")); assert.ok(!JSON.stringify(account).includes(token));
    const setup=handler(app,"/api/auth/setup","post");
    const password="Strong-new-password-123";
    assert.equal((await invoke(setup,{token,password})).status,200); assert.equal(account.setupTokenHash,null); assert.equal(account.mustChangePassword,false); assert.ok(await bcrypt.compare(password,account.passwordHash));
    assert.equal((await invoke(setup,{token,password})).status,400);
    account.setupTokenHash=crypto.createHash("sha256").update(token).digest("hex"); account.setupExpiresAt=new Date(Date.now()-1000); account.mustChangePassword=true;
    assert.equal((await invoke(setup,{token,password})).status,400);
    assert.equal((await invoke(setup,{token:"bad",password})).status,400);
  } finally { prisma.user.create=create; prisma.user.updateMany=updateMany; }
});
test("takvim ve eşleştirme yönetim uçları kimliksiz ve bayi erişimini reddeder", async () => {
  const { scheduleRouter } = await import("../apps/api/src/schedule");
  const routes = (scheduleRouter as any).stack.filter((r: any) => String(r.route?.path).startsWith("/api/admin/"));
  assert.ok(routes.length >= 10);
  for (const layer of routes) {
    const middleware = layer.route.stack;
    let code = 200, passed = false;
    const response: any = { status(n: number) { code = n; return this; }, json() {} };
    await middleware[0].handle({ header: () => undefined }, response, () => { passed = true; });
    assert.equal(code, 401, layer.route.path); assert.equal(passed, false);
    code = 200;
    middleware[1].handle({ user: { role: "DEALER" } }, response, () => { passed = true; });
    assert.equal(code, 403, layer.route.path); assert.equal(passed, false);
  }
});
