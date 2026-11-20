import {releaseHistory} from './announcement-history';
/** Each event is atomic; a failed event does not hide successful imports. */
export async function importReleaseHistory(create:(record:typeof releaseHistory[number])=>Promise<boolean>){
 const result={imported:0,existing:0,skipped:0,failed:0,errors:[] as string[]};
 for(const record of releaseHistory){try{if(await create(record))result.imported++;else result.existing++;}catch{result.failed++;result.errors.push(`v${record.version}: kayıt aktarılamadı; yeniden deneyebilirsiniz.`);}}
 return result;
}
