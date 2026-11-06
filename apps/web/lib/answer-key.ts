export function answerKeySlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function answerKeyPath(item: { id: string; publisher: { name: string }; examName: string; grade: number }) {
  return `/cevap-anahtarlari/${answerKeySlug(`${item.grade}-sinif-${item.publisher.name}-${item.examName}`)}-${item.id}`;
}
