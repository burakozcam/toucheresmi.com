"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { whatsappLink } from "../../lib/whatsapp";
import { API_URL } from "../../lib/api";
export default function CreateUser({ token, onCreated }: { token: string; onCreated: () => void }) {
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [created, setCreated] = useState<{ email: string; setupUrl: string; phone: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); setError(""); setBusy(true); setCreated(null);
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(values.entries())) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Hesap oluşturulamadı.");
      setCreated({ email: data.user.email, setupUrl: data.setupUrl, phone: data.user.phone || "" }); setMessage(`Merhaba, Kurumsal Sınav hesabınız oluşturulmuştur.\n\nGiriş adresi: https://kurumsalsinav.com/login\nKullanıcı adınız: ${data.user.email}\n\nŞifrenizi belirlemek için 30 dakika geçerli, tek kullanımlık bağlantınız:\n${data.setupUrl}\n\nBu bağlantıyı kimseyle paylaşmayın.`); form.reset(); onCreated();
    } catch (error) { setError(error instanceof Error ? error.message : "Sunucuya ulaşılamadı."); } finally { setBusy(false); }
  }
  return <section className="create-user-section"><button type="button" className="button button-navy" onClick={() => { setOpen(!open); setCreated(null); }}>＋ Kullanıcı ekle</button>{open && <div className="studio-card"><h3>Yönetici tarafından yeni hesap</h3><p className="field-help">Bayi hesabı doğrudan oluşturulur. Kullanıcı 30 dakika geçerli, tek kullanımlık bağlantıdan kendi şifresini belirler.</p><form onSubmit={submit} className="admin-create-user-form">{[["firstName", "Ad", "text"], ["lastName", "Soyad", "text"], ["email", "E-posta", "email"], ["phone", "Telefon (isteğe bağlı)", "tel"]].map(([name, label, type]) => <label key={name}>{label}<input name={name} type={type} required={name !== "phone"} minLength={name === "firstName" || name === "lastName" ? 2 : undefined} maxLength={name === "email" ? 254 : name === "phone" ? 30 : 80} /></label>)}<button className="button button-navy" disabled={busy}>{busy ? "Oluşturuluyor..." : "Hesabı oluştur"}</button></form>{error && <p className="notice error" role="alert">{error}</p>}{created && <div className="temporary-credentials" role="status"><strong>Hesap oluşturuldu: {created.email}</strong><p><a href={created.setupUrl}>Şifre belirleme bağlantısı</a> · 30 dakika geçerli</p><label>WhatsApp mesajını kontrol edin<textarea rows={9} value={message} onChange={(e) => setMessage(e.target.value)} /></label><a className="button button-navy" target="_blank" rel="noopener noreferrer" href={whatsappLink(created.phone, message)}>WhatsApp’tan Gönder ↗</a><small>WhatsApp açılır; gönderimi siz onaylarsınız. Alıcı numarası yoksa WhatsApp içinde seçilir.</small><button className="button button-quiet" onClick={() => setCreated(null)}>Bağlantıyı gizle</button></div>}</div>}</section>;
}
