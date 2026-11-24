import { DAYS, ICONS, exportRange, timeLabel, timeSlots, type StudyPlan } from './study-plan';

type Sheet = Record<string, unknown>;
type Workbook = { SheetNames: string[]; Sheets: Record<string, Sheet> };
type SheetJS = { utils: { book_new(): Workbook; aoa_to_sheet(rows: unknown[][]): Sheet; book_append_sheet(book: Workbook, sheet: Sheet, name: string): void }; write(book: Workbook, options: { type: 'array'; bookType: 'xlsx' }): ArrayBuffer };
interface Zip {
  file(name: string): { async(type: 'string'): Promise<string> } | null;
  file(name: string, content: string): Zip;
  generateAsync(options: { type: 'blob'; compression: 'DEFLATE' }): Promise<Blob>;
}
type PDF = { addImage(data: string, type: string, x: number, y: number, w: number, h: number): void; save(file: string): void };
type ExportWindow = Window & { XLSX?: SheetJS; JSZip?: { loadAsync(data: ArrayBuffer): Promise<Zip> }; jspdf?: { jsPDF: new (options: Record<string, unknown>) => PDF } };
const loads = new Map<string, Promise<void>>();
function loadScript(source: string) {
  let promise = loads.get(source);
  if (!promise) {
    promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.onload = () => resolve();
      script.onerror = () => { loads.delete(source); script.remove(); reject(Error('İndirme aracı yüklenemedi. Tekrar deneyin.')); };
      document.head.append(script);
    });
    loads.set(source, promise);
  }
  return promise;
}
export function workbookRows(plan: StudyPlan) {
  const range = exportRange(plan);
  const week: unknown[][] = [[plan.name], ['Saat', ...DAYS]];
  for (const start of timeSlots(range.start, range.end)) {
    week.push([`${timeLabel(start)}–${timeLabel(start + 30)}`, ...DAYS.map((_, day) => plan.events.find(e => e.day === day && e.start <= start && e.start + e.duration > start)?.name || '')]);
  }
  const detail: unknown[][] = [['Etkinlik', 'Gün', 'Başlangıç', 'Bitiş', 'Süre (dakika)', 'Renk', 'Simge']];
  for (const e of [...plan.events].sort((a, b) => a.day - b.day || a.start - b.start)) detail.push([e.name, DAYS[e.day], e.start / 1440, (e.start + e.duration) / 1440, e.duration, e.color, e.icon]);
  return { week, detail };
}
function fileName(plan: StudyPlan) { return (plan.name.trim() || 'Çalışma Planım').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 90); }
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
// SheetJS CE writes values and number formats. Add native OOXML wrapping with
// the existing local ZIP library so long names remain readable in Excel.
async function wrapWorkbook(data: ArrayBuffer, zipTool: NonNullable<ExportWindow['JSZip']>) {
  const zip = await zipTool.loadAsync(data), parser = new DOMParser(), serializer = new XMLSerializer();
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const styles = parser.parseFromString(await zip.file('xl/styles.xml')!.async('string'), 'application/xml');
  const xfs = styles.getElementsByTagNameNS(ns, 'cellXfs')[0], originals = [...xfs.children];
  const wrapped = originals.map(original => {
    const xf = original.cloneNode(true) as Element;
    for (const a of [...xf.getElementsByTagNameNS(ns, 'alignment')]) a.remove();
    const alignment = styles.createElementNS(ns, 'alignment');
    alignment.setAttribute('wrapText', '1'); alignment.setAttribute('vertical', 'top');
    xf.setAttribute('applyAlignment', '1'); xf.append(alignment);
    const index = xfs.children.length; xfs.append(xf); return index;
  });
  xfs.setAttribute('count', String(xfs.children.length));
  zip.file('xl/styles.xml', serializer.serializeToString(styles));
  for (const name of ['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']) {
    const sheet = parser.parseFromString(await zip.file(name)!.async('string'), 'application/xml');
    for (const cell of sheet.getElementsByTagNameNS(ns, 'c')) cell.setAttribute('s', String(wrapped[Number(cell.getAttribute('s') || 0)]));
    zip.file(name, serializer.serializeToString(sheet));
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
function wrapped(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = []; let line = '';
  for (const char of text) {
    if (line && ctx.measureText(line + char).width > width) { lines.push(line.trim()); line = ''; }
    line += char;
  }
  if (line) lines.push(line.trim());
  return lines;
}
export async function planCanvas(plan: StudyPlan) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 2970; canvas.height = 2100; // Landscape A4, approximately 254 dpi.
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Tarayıcı görsel çıktıyı desteklemiyor.');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#15243b'; ctx.font = 'bold 46px Arial, sans-serif';
  const title = wrapped(ctx, plan.name || 'Haftalık Çalışma Planım', 2800);
  title.slice(0, 2).forEach((line, i) => ctx.fillText(line, 70, 75 + i * 49));
  ctx.font = '24px Arial, sans-serif'; ctx.fillStyle = '#53637b';
  ctx.fillText('KurumsalSınav · Haftalık çalışma planı', 70, 185);
  const { start, end } = exportRange(plan);
  const slots = timeSlots(start, end), left = 190, top = 280, bottom = 1990;
  const width = (canvas.width - left - 65) / 7, rowHeight = (bottom - top) / slots.length;
  ctx.textAlign = 'center'; ctx.font = 'bold 28px Arial, sans-serif'; ctx.fillStyle = '#1c3559';
  DAYS.forEach((day, i) => ctx.fillText(day, left + (i + 0.5) * width, top - 28));
  ctx.lineWidth = 1; ctx.strokeStyle = '#dce3ed'; ctx.font = '22px Arial, sans-serif';
  slots.forEach((minute, i) => {
    const y = top + i * rowHeight;
    ctx.fillStyle = '#53637b'; ctx.textAlign = 'right'; ctx.fillText(timeLabel(minute), left - 20, y + Math.min(rowHeight - 6, 26));
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + 7 * width, y); ctx.stroke();
  });
  for (let i = 0; i <= 7; i++) { ctx.beginPath(); ctx.moveTo(left + i * width, top); ctx.lineTo(left + i * width, bottom); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(left + 7 * width, bottom); ctx.stroke();
  for (const e of plan.events) {
    const x = left + e.day * width + 4, y = top + (e.start - start) / 30 * rowHeight + 2;
    const w = width - 8, h = e.duration / 30 * rowHeight - 4;
    ctx.fillStyle = e.color; ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 1, w - 4, h - 2); ctx.clip();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8;
    ctx.save(); ctx.translate(x + 8, y + 6); ctx.scale(0.85, 0.85); ctx.stroke(new Path2D(ICONS[e.icon])); ctx.restore();
    // Fit all characters, even a 100-character name in a single half-hour slot.
    let font = 26, lines: string[] = [];
    do { ctx.font = `bold ${font}px Arial, sans-serif`; lines = wrapped(ctx, e.name, w - 48); if (lines.length * (font + 2) <= h - 9) break; font--; } while (font > 6);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
    lines.forEach((line, i) => ctx.fillText(line, x + 38, y + font + 3 + i * (font + 2)));
    if (h > lines.length * (font + 2) + 36) { ctx.font = '20px Arial, sans-serif'; ctx.fillText(`${timeLabel(e.start)}–${timeLabel(e.start + e.duration)}`, x + 12, y + h - 12); }
    ctx.restore();
  }
  ctx.textAlign = 'left'; ctx.fillStyle = '#53637b'; ctx.font = '22px Arial, sans-serif';
  ctx.fillText('Kendine zaman ayır. Küçük adımlarla ilerle.', 70, 2050);
  return canvas;
}
export async function downloadPlan(plan: StudyPlan, format: 'pdf' | 'jpg' | 'xlsx') {
  const target = window as ExportWindow;
  if (format === 'xlsx') {
    if (!target.XLSX) await loadScript('/vendor/xlsx.full.min.js');
    if (!target.JSZip) await loadScript('/vendor/jszip.min.js');
    if (!target.XLSX || !target.JSZip) throw Error('Excel aracı başlatılamadı.');
    const x = target.XLSX, book = x.utils.book_new(), rows = workbookRows(plan);
    const week = x.utils.aoa_to_sheet(rows.week), detail = x.utils.aoa_to_sheet(rows.detail);
    week['!cols'] = [{ wch: 16 }, ...DAYS.map(() => ({ wch: 28 }))];
    week['!rows'] = rows.week.map((row, i) => ({ hpt: i < 2 ? 32 : Math.max(30, ...row.map(value => Math.ceil(String(value).length / 24) * 15 + 10)) }));
    detail['!cols'] = [{ wch: 55 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 17 }, { wch: 12 }, { wch: 14 }];
    detail['!rows'] = rows.detail.map(row => ({ hpt: Math.max(30, Math.ceil(String(row[0]).length / 50) * 15 + 10) }));
    for (let row = 2; row <= rows.detail.length; row++) for (const col of ['C', 'D']) (detail[`${col}${row}`] as { z: string }).z = '[h]:mm';
    x.utils.book_append_sheet(book, week, 'Haftalık Plan');
    x.utils.book_append_sheet(book, detail, 'Etkinlikler');
    saveBlob(await wrapWorkbook(x.write(book, { type: 'array', bookType: 'xlsx' }), target.JSZip), `${fileName(plan)}.xlsx`);
    return;
  }
  const canvas = await planCanvas(plan);
  if (format === 'pdf') {
    if (!target.jspdf) await loadScript('/vendor/jspdf.umd.min.js');
    if (!target.jspdf) throw Error('PDF aracı başlatılamadı.');
    const pdf = new target.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, 297, 210);
    pdf.save(`${fileName(plan)}.pdf`);
  } else {
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error('JPG oluşturulamadı.')), 'image/jpeg', 0.97));
    saveBlob(blob, `${fileName(plan)}.jpg`);
  }
}
