import type { Workbook } from "./sheetjs";
export function saveBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
/** Adds native Excel list / number validation to a SheetJS workbook. */
export async function downloadScheduleTemplate(book: Workbook, publishersCount: number) {
  if (!window.XLSX || !window.JSZip) throw new Error("Excel araçları henüz yüklenmedi.");
  const zip = await window.JSZip.loadAsync(window.XLSX.write(book, { type: "array", bookType: "xlsx" }));
  const path = "xl/worksheets/sheet1.xml";
  let sheet = await zip.file(path).async("string");
  const validations = `<dataValidations count="3"><dataValidation type="list" allowBlank="0" showErrorMessage="1" errorTitle="Sınıf seçin" error="Listeden geçerli bir sınıf seçin." sqref="B2:B2501"><formula1>"1,2,3,4,5,6,7,8,9,10,11,12,TYT,AYT"</formula1></dataValidation><dataValidation type="whole" operator="between" allowBlank="0" showErrorMessage="1" sqref="C2:C2501"><formula1>1</formula1><formula2>999</formula2></dataValidation><dataValidation type="list" allowBlank="0" showErrorMessage="1" sqref="A2:A2501"><formula1>YAYINEVLERI</formula1></dataValidation></dataValidations>`;
  const following = /<(?:hyperlinks|printOptions|pageMargins|pageSetup|headerFooter|rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|drawing|legacyDrawing|extLst)\b/;
  const position = sheet.search(following);
  sheet = position >= 0 ? sheet.slice(0, position) + validations + sheet.slice(position) : sheet.replace("</worksheet>", validations + "</worksheet>"); zip.file(path, sheet);
  let workbook = await zip.file("xl/workbook.xml").async("string");
  const defined = `<definedName name="YAYINEVLERI">'Yayınevleri'!$A$2:$A$${Math.max(2, publishersCount + 1)}</definedName>`;
  workbook = workbook.includes("</definedNames>") ? workbook.replace("</definedNames>", defined + "</definedNames>") : workbook.includes("<calcPr") ? workbook.replace("<calcPr", `<definedNames>${defined}</definedNames><calcPr`) : workbook.replace("</workbook>", `<definedNames>${defined}</definedNames></workbook>`);
  zip.file("xl/workbook.xml", workbook);
  saveBlob(await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "sinav-takvimi-sablonu.xlsx");
}
