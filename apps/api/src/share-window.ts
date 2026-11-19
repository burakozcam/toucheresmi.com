import {z} from 'zod';
export const shareWindowInput=z.object({startsAt:z.iso.datetime({offset:true}).nullable().optional(),expiresAt:z.iso.datetime({offset:true}).nullable().optional(),unlimited:z.boolean().default(false)});
export function shareWindow(input:{startsAt?:string|null;expiresAt?:string|null;unlimited?:boolean},expiry:(start:Date)=>Date,now=new Date()){
 const startsAt=input.startsAt?new Date(input.startsAt):null,start=startsAt??now,expiresAt=input.unlimited||input.expiresAt===null?null:input.expiresAt?new Date(input.expiresAt):expiry(start);
 if(!Number.isFinite(+start)||expiresAt&&(!Number.isFinite(+expiresAt)||+expiresAt<=Math.max(+start,+now)))throw new Error('Bitiş tarihi başlangıçtan ve şu andan sonra olmalıdır.');
 return {startsAt,expiresAt};
}
