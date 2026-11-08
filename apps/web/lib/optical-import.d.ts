import type { OpticalQuestion } from "./optical";
export type ImportFormat="auto"|"f"|"o"|"standard";
export type ImportResult={format:Exclude<ImportFormat,"auto">;questions:OpticalQuestion[];warnings:string[];issues:string[];examName:string;publisher:string;grade?:number};
export function parseWorkbook(sheets:Array<{name:string;rows:unknown[][]}>,format?:ImportFormat,options?:{allowInvalid?:boolean}):ImportResult;
export function lessonName(value:unknown):string;
