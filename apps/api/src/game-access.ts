import type {AuthenticatedRequest} from './auth';
/** Explicitly designated owner; SUPER_ADMIN alone never grants access. */
export function ownerGameAccess(user:{id:string;email:string;role:string;active?:boolean}|null|undefined,actorAdminId?:string){
 return !!user&&user.active!==false&&user.role==='SUPER_ADMIN'&&!actorAdminId&&user.email.toLowerCase()==='admin@kurumsalsinav.com';
}
