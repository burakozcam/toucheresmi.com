"use client";
import ReleaseMark from "../release-mark";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "../../lib/api";
export default function AccountSetup() {
  const [token, setToken] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  useEffect(() => { setToken(location.hash.slice(1)); history.replaceState(null, "", location.pathname); }, []);
  return <main className="auth-page"><section className="studio-card"><h1>Hesabınızın şifresini belirleyin</h1><p>Bağlantı 30 dakika geçerlidir ve bir kez kullanılabilir.</p><form onSubmit={async (e) => { e.preventDefault(); const form = new FormData(e.currentTarget); if (form.get("password") !== form.get("repeat")) { setMessage("Şifreler eşleşmiyor."); return; } setBusy(true); try { const r = await fetch(`${API_URL}/api/auth/setup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: form.get("password") }) }); const d = await r.json(); setMessage(d.message || d.error); if (r.ok) { setToken(""); setDone(true); } } catch { setMessage("Sunucuya ulaşılamadı."); } finally { setBusy(false); } }}><label>Yeni şifre<input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label><label>Şifreyi tekrar yazın<input name="repeat" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label><button className="button button-navy" disabled={!token || busy || done}>Şifremi belirle</button></form><p role="status">{message}</p><Link href="/login">Giriş yap</Link></section><footer className="compact-release"><ReleaseMark/></footer></main>;
}
