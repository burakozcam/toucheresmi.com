import {z} from 'zod';
export const examStructure=z.object({optionCount:z.union([z.literal(3),z.literal(4),z.literal(5)]),booklets:z.array(z.enum(['A','B','C','D'])).min(1).max(4),lessons:z.array(z.object({name:z.string().trim().min(1).max(80),count:z.number().int().min(1).max(300)})).min(1).max(20)}).superRefine((s,c)=>{
 if(!s.booklets.includes('A')||new Set(s.booklets).size!==s.booklets.length)c.addIssue({code:'custom',message:'A kitapçığı zorunlu; kitapçıklar benzersiz olmalı.'});
 if(s.lessons.reduce((n,l)=>n+l.count,0)>300||new Set(s.lessons.map(l=>l.name.toLocaleUpperCase('tr'))).size!==s.lessons.length)c.addIssue({code:'custom',message:'Dersler benzersiz ve toplam en fazla 300 soru olmalı.'});
});
/** The user supplied this structure; no question answers or FMT layout is inferred. */
export const builtinExamTemplates=[{id:'builtin-lgs',name:'LGS · 90 soru',structure:{optionCount:4,booklets:['A'],lessons:[{name:'TÜRKÇE',count:20},{name:'SOSYAL',count:10},{name:'DİN',count:10},{name:'İNGİLİZCE',count:10},{name:'MATEMATİK',count:20},{name:'FEN',count:20}]}}];
