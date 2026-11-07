"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../../lib/api";

export default function PasswordSetup({ token, onComplete }: { token: string; onComplete: (token: string, user: any) => void }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget);
    if (values.get("newPassword") !== values.get("repeatPassword")) { setError("Yeni şifreler eşleşmiyor."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/account/password`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: values.get("currentPassword"), newPassword: values.get("newPassword") }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Şifre belirlenemedi.");
      sessionStorage.setItem("kurumsal-auth-token", data.token); sessionStorage.setItem("kurumsal-auth-user", JSON.stringify(data.user)); onComplete(data.token, data.user);
    } catch (error) { setError(error instanceof Error ? error.message : "Sunucuya ulaşılamadı."); } finally { setBusy(false); }
  }
  return <main className="password-setup-page"><section className="studio-card password-setup-card"><span className="brand-mark">K</span><p className="hero-tag">İLK GİRİŞ · HESABINI TAMAMLA</p><h1>Kendi şifreni belirle.</h1><p>Hesabınız yönetici tarafından oluşturulduğu için devam etmeden önce size özel bir şifre belirlemeniz gerekmektedir.</p><form onSubmit={submit}><label>Yöneticinin verdiği geçici şifre<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></label><label>Yeni şifre<input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label><label>Yeni şifreyi tekrar girin<input name="repeatPassword" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label><p className="field-help">En az 12 karakter. Geçici şifrenizden farklı bir şifre seçin.</p>{error && <p className="notice error" role="alert">{error}</p>}<button className="button button-navy" disabled={busy}>{busy ? "Kaydediliyor..." : "Şifremi belirle ve devam et"}</button><button className="button button-quiet" type="button" onClick={() => { sessionStorage.removeItem("kurumsal-auth-token"); sessionStorage.removeItem("kurumsal-auth-user"); location.assign("/login"); }}>Çıkış yap</button></form></section></main>;
}
