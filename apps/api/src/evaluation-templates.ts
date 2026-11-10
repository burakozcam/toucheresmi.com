import { layout7108, layout8050 } from "./optical-core";
import { libraryFmtBytes } from "./fmt-library";

// Only the two layouts checked against real reader TXT output are executable.
// The remaining downloadable originals still require their TXT mapping test.
export function systemEvaluationTemplates() {
  return ([["7108", layout7108], ["8050", layout8050]] as const).map(([code, layout]) => ({
    id: `system-fmt-${code}`, name: `Sistem FMT ${code}`, active: true,
    layout, originalFmt: libraryFmtBytes(code).toString("utf8"),
    grade: null, publisherId: null,
  }));
}
export const systemEvaluationTemplate = (id: string) => systemEvaluationTemplates().find(t => t.id === id);
