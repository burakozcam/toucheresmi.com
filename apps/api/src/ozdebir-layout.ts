import type {OpticalLayout} from "./optical-core";
/** BLDM field order checked against the supplied 171-character single-session TXT.
 * 9 is the session discriminator, never the grade. Split 1/2 records have other widths.
 */
export const layoutOzdebirSingle:OpticalLayout={
 lineLength:171,
 fields:{schoolCode:{start:2,length:8},id:{start:10,length:5},identity:{start:15,length:11},grade:{start:26,length:1},branch:{start:27,length:1},booklet:{start:28,length:1},gender:{start:29,length:1},name:{start:30,length:22}},
 lessons:["TÜRKÇE","MATEMATİK","FEN","SOSYAL","İNGİLİZCE","DİN"].map((name,i)=>({name,start:52+i*20,length:20})),
 literals:[{start:1,text:"9"}],
};
/** Supplied SEKONIC files share a 51-character header. FMT output labels FEN/SOSYAL
 * are legacy labels: physical columns and the real 1/2 TXT establish the LGS order.
 * These are publisher-specific record variants, not global 1/2/9 semantics. */
export const layoutOzdebirVerbal:OpticalLayout={...layoutOzdebirSingle,lineLength:131,
 lessons:["TÜRKÇE","SOSYAL","İNGİLİZCE","DİN"].map((name,i)=>({name,start:52+i*20,length:20})),literals:[{start:1,text:"1"}]};
export const layoutOzdebirNumeric:OpticalLayout={...layoutOzdebirSingle,lineLength:91,
 lessons:["MATEMATİK","FEN"].map((name,i)=>({name,start:52+i*20,length:20})),literals:[{start:1,text:"2"}]};
