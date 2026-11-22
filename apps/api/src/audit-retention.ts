import {Prisma} from '@prisma/client';
const configured=(key:string,minimum:number)=>{const value=Number(process.env[key]);return Number.isInteger(value)&&value>=minimum&&value<=36500?value:minimum;};
export const auditPolicy={navigation:configured('AUDIT_RETENTION_NAV_DAYS',7),technical:configured('AUDIT_RETENTION_ERROR_DAYS',30),normal:configured('AUDIT_RETENTION_NORMAL_DAYS',90),login:configured('AUDIT_RETENTION_LOGIN_DAYS',180),fmt:configured('AUDIT_RETENTION_FMT_DAYS',365),critical:configured('AUDIT_RETENTION_CRITICAL_DAYS',730)};
export function retentionDays(action:string,targetType?:string|null):number|null{
 if(['ANSWER_KEY_REVISION','AUDIT_CLEANUP','EXAM_QUESTION_REVIEW'].includes(action))return null; // revisions are business history, not disposable telemetry
 if(/AUTH_|LOGIN|MFA_|PASSWORD|LOGOUT/.test(action))return auditPolicy.login;
 if(/FMT|templates/.test(action))return auditPolicy.fmt;
 if(/RESULT|ANSWER_KEY|DELETE|IMPERSONATION|PERMISSION|ROLE|DEALER/.test(action))return auditPolicy.critical;
 if(action==='CLIENT_NAVIGATION')return auditPolicy.navigation;
 if(targetType==='SERVER_FAILURE')return auditPolicy.technical;
 return auditPolicy.normal;
}
export function expiredAudit(row:{action:string;targetType?:string|null;createdAt:Date},now=new Date()){const days=retentionDays(row.action,row.targetType);return days!==null&&+row.createdAt<+now-days*86400_000;}
export function expiredAuditSql(){return Prisma.sql`"createdAt" < NOW() - (CASE
 WHEN "action" IN ('ANSWER_KEY_REVISION','AUDIT_CLEANUP','EXAM_QUESTION_REVIEW') THEN NULL
 WHEN "action" ~ 'AUTH_|LOGIN|MFA_|PASSWORD|LOGOUT' THEN ${auditPolicy.login}
 WHEN "action" ~ 'FMT|templates' THEN ${auditPolicy.fmt}
 WHEN "action" ~ 'RESULT|ANSWER_KEY|DELETE|IMPERSONATION|PERMISSION|ROLE|DEALER' THEN ${auditPolicy.critical}
 WHEN "action" = 'CLIENT_NAVIGATION' THEN ${auditPolicy.navigation}
 WHEN "targetType" = 'SERVER_FAILURE' THEN ${auditPolicy.technical}
 ELSE ${auditPolicy.normal} END) * INTERVAL '1 day'`;}
