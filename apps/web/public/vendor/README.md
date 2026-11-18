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

## v1.3.8 PDF tools

- jsPDF **2.5.1**: `jspdf.umd.min.js`, copied from `https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js`; MIT, `JSPDF-LICENSE.txt`. This is the version already referenced by the tools before it was stored locally.
- jsPDF AutoTable **3.8.4**: `jspdf.plugin.autotable.min.js`, copied from `https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js`; MIT, `JSPDF-AUTOTABLE-LICENSE.txt`.
- `../araclar/pdf-utilities.css`: static utilities generated with **Tailwind CSS 3.4.17**, MIT (`TAILWIND-LICENSE.txt`), from the classes in `pdf-tools.html`, including dynamically inserted markup. Preflight is disabled. The browser no longer compiles Tailwind or loads a Tailwind CDN script. No npm runtime dependency was added.
- The tools now use the existing local **PDF.js 4.10.38** module and worker. The small `renderTextLayer` adapter uses the supported `TextLayer` class, retaining the existing text-selection coordinate flow. No CSP allowlist or `unsafe-eval` exception was added.
