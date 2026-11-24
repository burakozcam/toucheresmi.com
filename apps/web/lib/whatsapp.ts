export function whatsappPhone(value: string): string {
  if (!value.trim()) return "";
  if (!/^[+\d\s().-]+$/.test(value)) throw new Error("Telefon numarası geçersiz.");
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^05\d{9}$/.test(digits)) digits = `9${digits}`;
  else if (/^5\d{9}$/.test(digits)) digits = `90${digits}`;
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw new Error("Telefon numarasını ülke koduyla girin.");
  return digits;
}
export const whatsappLink = (phone: string, message: string) => `https://wa.me/${whatsappPhone(phone)}?text=${encodeURIComponent(message)}`;

export function temporaryAccessMessage(access: {code:string;link:string;expiresAt:string}) {
  const expiry = new Date(access.expiresAt).toLocaleString('tr-TR', {timeZone:'Europe/Istanbul',dateStyle:'short',timeStyle:'short'});
  return `KurumsalSınav · Geçici Erişim\nErişim kodu: ${access.code}\nGeçerlilik: ${expiry} (Türkiye saati)\nPanele Giriş: ${access.link}\nBağlantı kullanılamazsa Geçici Giriş ekranından kodla giriş yapabilirsiniz.`;
}
