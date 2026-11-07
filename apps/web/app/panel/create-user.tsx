"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../../lib/api";
export default function CreateUser({ token, onCreated }: { token: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); setError(""); setBusy(true); setCreated(null);
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(values.entries())) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Hesap oluşturulamadı.");
      setCreated({ email: data.user.email, password: data.temporaryPassword }); form.reset(); onCreated();
    } catch (error) { setError(error instanceof Error ? error.message : "Sunucuya ulaşılamadı."); } finally { setBusy(false); }
  }
  return <section className="create-user-section"><button type="button" className="button button-navy" onClick={() => { setOpen(!open); setCreated(null); }}>＋ Kullanıcı ekle</button>{open && <div className="studio-card"><h3>Yönetici tarafından yeni hesap</h3><p className="field-help">Bayi hesabı doğrudan oluşturulur. Kullanıcı geçici şifreyle ilk girişini yaptıktan sonra kendi şifresini belirler.</p><form onSubmit={submit} className="admin-create-user-form">{[["firstName", "Ad", "text"], ["lastName", "Soyad", "text"], ["email", "E-posta", "email"], ["phone", "Telefon (isteğe bağlı)", "tel"]].map(([name, label, type]) => <label key={name}>{label}<input name={name} type={type} required={name !== "phone"} minLength={name === "firstName" || name === "lastName" ? 2 : undefined} maxLength={name === "email" ? 254 : name === "phone" ? 30 : 80} /></label>)}<button className="button button-navy" disabled={busy}>{busy ? "Oluşturuluyor..." : "Hesabı oluştur"}</button></form>{error && <p className="notice error" role="alert">{error}</p>}{created && <div className="temporary-credentials" role="status"><strong>Hesap oluşturuldu: {created.email}</strong><p>Geçici şifre: <code>{created.password}</code></p><small>Bu şifre yalnızca şimdi gösterilir. Kullanıcıyla güvenli biçimde paylaşın; yeni şifre belirlendikten sonra geçersizleşir.</small><button className="button button-quiet" onClick={() => setCreated(null)}>Şifreyi gizle</button></div>}</div>}</section>;
}
