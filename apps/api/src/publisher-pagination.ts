import {z} from 'zod';
import type {Prisma} from '@prisma/client';
export function publisherPage(query:unknown,admin:boolean,normalize:(v:string)=>string){
 const input=z.object({page:z.coerce.number().int().min(1).max(100000),pageSize:z.coerce.number().int().min(1).max(100).default(25),search:z.string().trim().max(100).default(''),status:z.enum(['','active','inactive']).default('')}).parse(query);
 const where:Prisma.PublisherWhereInput={...(!admin||input.status==='active'?{active:true}:input.status==='inactive'?{active:false}:{}),...(input.search?{OR:[{name:{contains:input.search,mode:'insensitive'}},{normalizedName:{contains:normalize(input.search),mode:'insensitive'}}]}:{})};
 return {...input,where,take:input.pageSize,skip:(input.page-1)*input.pageSize};
}
