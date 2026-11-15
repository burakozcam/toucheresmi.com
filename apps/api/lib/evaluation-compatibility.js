// Shared by the upload selector and the TXT parser. Unknown names stay distinct.
const normalized = value => value.toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
const aliases = {
  TURKCE: 'TURKCE', SOSYAL: 'SOSYAL', SOSYALBILGILER: 'SOSYAL', TARIH: 'SOSYAL',
  TCINK: 'SOSYAL', INKILAP: 'SOSYAL', INKILAPTARIHI: 'SOSYAL', TCINKILAPTARIHIVEATATURKCULUK: 'SOSYAL',
  DINKVEAB: 'DIN', DINKAB: 'DIN', DIN: 'DIN', DINKULTURU: 'DIN', DINKULTURUVEAHLAKBILGISI: 'DIN',
  INGILIZCE: 'INGILIZCE', YABANCIDIL: 'INGILIZCE', ING: 'INGILIZCE', INGILIZ: 'INGILIZCE', ENGLISH: 'INGILIZCE',
  MATEMATIK: 'MATEMATIK', FEN: 'FEN', FENBIL: 'FEN', FENBILIMLERI: 'FEN', FENVETEKNOLOJI: 'FEN',
};
function lessonIdentity(name) { const key = normalized(name); return aliases[key] || key; }
function compatibleEvaluation(template, key) {
  // Reader capacity is independent of publisher and grade.
  const counts = new Map();
  for (const [name, count] of Object.entries(key.lessonCounts || {})) {
    const id = lessonIdentity(name);
    if (counts.has(id)) return false;
    counts.set(id, count);
  }
  const lessons = template.layout.lessons;
  return [...counts].every(([name,count])=>lessons.some(l=>lessonIdentity(l.name)===name&&count>0&&count<=l.length)) && new Set(lessons.map(l => lessonIdentity(l.name))).size === lessons.length &&

    !!template.layout.fields.booklet && key.booklets.length > 0;
}
module.exports = { lessonIdentity, compatibleEvaluation };
