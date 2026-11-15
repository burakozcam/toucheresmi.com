"use client";
import PasswordField from "../password-field";
import HumanVerification from "../human-verification";
import {getHumanToken} from "../../lib/human-token";
import ReleaseMark from "../release-mark";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "../../lib/api";
export default function AccountSetup() {
  const [humanToken,setHumanToken]=useState("");const [attempt,setAttempt]=useState(0);
  const [token, setToken] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState(false),[visible,setVisible]=useState(false),[password,setPassword]=useState("");
  useEffect(() => { setToken(location.hash.slice(1)); history.replaceState(null, "", location.pathname); }, []);
  return <main className="auth-page"><section className="studio-card"><h1>Hesabınızın şifresini belirleyin</h1><p>Bağlantı 30 dakika geçerlidir ve bir kez kullanılabilir.</p><form onSubmit={async (e) => { e.preventDefault(); const form = new FormData(e.currentTarget); if (form.get("password") !== form.get("repeat")) { setMessage("Şifreler eşleşmiyor."); return; } setBusy(true); try { const r = await fetch(`${API_URL}/api/auth/setup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: form.get("password"),humanToken:await getHumanToken("setup",humanToken) }) }); const d = await r.json(); setMessage(d.message || d.error); if (r.ok&&d.token&&d.user) { sessionStorage.setItem("kurumsal-auth-token",d.token);sessionStorage.setItem("kurumsal-auth-user",JSON.stringify(d.user));setToken("");setDone(true);location.assign(d.user.role==="STUDENT"||d.user.role==="PARENT"?"/sonuclarim":"/panel"); } } catch (error) { setMessage(error instanceof Error?error.message:"Sunucuya ulaşılamadı."); } finally { setBusy(false);setHumanToken("");setAttempt(n=>n+1); } }}><label>Yeni şifre<PasswordField name="password" newPassword/></label><label>Şifreyi tekrar yazın<PasswordField name="repeat" newPassword/></label><HumanVerification key={attempt} action="setup" onToken={setHumanToken}/><button className="button button-navy" disabled={!token || busy || done}>Şifremi belirle</button></form><p role="status">{message}</p><Link href="/login">Giriş yap</Link></section><footer className="compact-release"><ReleaseMark/></footer></main>;
}
