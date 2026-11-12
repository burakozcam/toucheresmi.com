// Shared by the upload selector and the TXT parser. Unknown names stay distinct.
const normalized = value => value.toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
const aliases = {
  TURKCE: 'TURKCE', SOSYAL: 'SOSYAL', SOSYALBILGILER: 'SOSYAL', TARIH: 'SOSYAL',
  INKILAP: 'SOSYAL', INKILAPTARIHI: 'SOSYAL', TCINKILAPTARIHIVEATATURKCULUK: 'SOSYAL',
  DINKVEAB: 'DIN', DINKAB: 'DIN', DIN: 'DIN', DINKULTURU: 'DIN', DINKULTURUVEAHLAKBILGISI: 'DIN',
  INGILIZCE: 'INGILIZCE', YABANCIDIL: 'INGILIZCE',
  MATEMATIK: 'MATEMATIK', FEN: 'FEN', FENBILIMLERI: 'FEN', FENVETEKNOLOJI: 'FEN',
};
function lessonIdentity(name) { const key = normalized(name); return aliases[key] || key; }
function compatibleEvaluation(template, key) {
  if (template.grade && Number(key.grade) !== template.grade) return false;
  const counts = new Map();
  for (const [name, count] of Object.entries(key.lessonCounts || {})) {
    const id = lessonIdentity(name);
    if (counts.has(id)) return false;
    counts.set(id, count);
  }
  const lessons = template.layout.lessons;
  return lessons.length === counts.size && new Set(lessons.map(l => lessonIdentity(l.name))).size === lessons.length &&
    lessons.every(l => counts.get(lessonIdentity(l.name)) > 0 && counts.get(lessonIdentity(l.name)) <= l.length) &&
    !!template.layout.fields.booklet && key.booklets.length > 0;
}
module.exports = { lessonIdentity, compatibleEvaluation };
