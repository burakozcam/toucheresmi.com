# SheetJS CE

- Version: 0.20.3
- Source: https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
- Project: https://sheetjs.com/
- License: Apache-2.0 (see LICENSE.txt)

Stored locally so spreadsheet import/export does not depend on a third-party CDN at runtime.

## Other browser libraries

- JSZip 3.10.1: https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js (MIT or GPLv3; see JSZIP-LICENSE.txt).
- pdf-lib 1.17.1: https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js (MIT; see PDF-LIB-LICENSE.txt).

- PDF.js 4.10.38: `pdfjs/pdf.min.mjs` and `pdfjs/pdf.worker.min.mjs`, copied from the existing `pdfjs-dist` API dependency; Apache-2.0, license in `pdfjs/LICENSE`. The page editor loads these locally without an external CDN.
