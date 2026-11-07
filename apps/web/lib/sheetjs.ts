export type Sheet = Record<string, unknown>;
export type Workbook = { SheetNames: string[]; Sheets: Record<string, Sheet> };
export type SheetJs = {
  read(data: ArrayBuffer, options: Record<string, unknown>): Workbook;
  writeFile(book: Workbook, filename: string): void;
  utils: {
    book_new(): Workbook;
    book_append_sheet(book: Workbook, sheet: Sheet, name: string): void;
    aoa_to_sheet(rows: unknown[][]): Sheet;
    sheet_to_json(sheet: Sheet, options: Record<string, unknown>): unknown[][];
    decode_range(ref: string): { s: { r: number; c: number }; e: { r: number; c: number } };
  };
};
declare global { interface Window { XLSX?: SheetJs } }
