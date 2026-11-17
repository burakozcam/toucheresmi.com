import {Prisma} from '@prisma/client';
/** Transfer large JSON as a single text parameter instead of a native object tree.
 * Caller must supply its existing transaction; metadata and snapshot commit together.
 */
export async function writeResultSnapshot(tx:Prisma.TransactionClient,id:string,json:string){
 const changed=await tx.$executeRaw`UPDATE "OpticalResult" SET "snapshot" = ${json}::jsonb WHERE "id" = ${id}`;
 if(changed!==1)throw new Error('Sonuç kaydı değişti. Önizlemeyi yenileyin.');
}
/** IDs must come from a scoped ORM query. Text transport avoids native JSON expansion. */
export async function withResultSnapshots<T extends {id:string}>(db:Pick<Prisma.TransactionClient,'$queryRaw'>,rows:T[]):Promise<Array<T&{snapshot:any}>>{
 const missing=rows.filter(row=>!('snapshot' in row));if(!missing.length)return rows as Array<T&{snapshot:any}>;
 const snapshots=await db.$queryRaw<Array<{id:string;json:string}>>(Prisma.sql`SELECT "id", "snapshot"::text AS "json" FROM "OpticalResult" WHERE "id" IN (${Prisma.join(missing.map(row=>row.id))})`);
 const byId=new Map(snapshots.map(row=>[row.id,JSON.parse(row.json)]));
 return rows.map(row=>{if('snapshot' in row)return row as T&{snapshot:any};if(!byId.has(row.id))throw new Error('Sonuç kaydı değişti. Önizlemeyi yenileyin.');return {...row,snapshot:byId.get(row.id)};});
}
