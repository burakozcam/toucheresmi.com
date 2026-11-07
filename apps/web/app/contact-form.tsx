"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../lib/api";

type ContactFormProps = { showBrand?: boolean; purpose?: "support" | "answer-key" };

export default function ContactForm({ showBrand = false, purpose = "support" }: ContactFormProps) {
  const [values, setValues] = useState({ firstName: "", lastName: "", phone: "", email: "", message: "" });
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(window.sessionStorage.getItem("kurumsal-auth-user") ?? "null") as
        | { firstName?: string; lastName?: string; email?: string }
        | null;
      if (user) {
        setValues((current) => ({
          ...current,
          firstName: user.firstName ?? current.firstName,
          lastName: user.lastName ?? current.lastName,
          email: user.email ?? current.email,
        }));
      }
    } catch {
      setNotice("");
    }
  }, []);

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");
    setWarning(false);
    const token = window.sessionStorage.getItem("kurumsal-auth-token");
    try {
      const send = (withToken: boolean) => fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(withToken && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...values, message: purpose === "answer-key" ? `[Cevap anahtarı ekleme talebi]\n${values.message}` : values.message }),
      });
      let response = await send(Boolean(token));
      if (response.status === 401 && token) response = await send(false);
      const result = await response.json() as { error?: string; message?: string; warning?: string };
      if (!response.ok) {
        setNotice(result.error ?? "Mesaj gönderilemedi. Bilgilerinizi kontrol edip tekrar deneyin.");
        setWarning(true);
        return;
      }
      setNotice([result.message ?? "Mesajınız iletildi.", result.warning].filter(Boolean).join(" "));
      setWarning(Boolean(result.warning));
      setValues((current) => ({ ...current, phone: "", message: "" }));
    } catch {
      setNotice("Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.");
      setWarning(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`contact-form-layout ${showBrand ? "contact-form-layout-branded" : ""}`}>
      <form id={purpose === "answer-key" ? "answer-key-request-form" : "contact-form"} className="contact-form" onSubmit={submitContact}>
        <h2>{purpose === "answer-key" ? "Cevap anahtarı ekleme talebi" : "Mesaj gönderin"}</h2>
        <div className="contact-name-fields">
          <label>Ad<input autoComplete="given-name" name="firstName" value={values.firstName} onChange={(event) => setValues({ ...values, firstName: event.target.value })} minLength={1} maxLength={80} required /></label>
          <label>Soyad<input autoComplete="family-name" name="lastName" value={values.lastName} onChange={(event) => setValues({ ...values, lastName: event.target.value })} minLength={1} maxLength={80} required /></label>
        </div>
        <div className="contact-name-fields">
          <label>Telefon <span>(isteğe bağlı)</span><input autoComplete="tel" name="phone" type="tel" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} minLength={7} maxLength={30} pattern="[+0-9 ()().-]{7,30}" title="Geçerli bir telefon numarası girin." /></label>
          <label>E-posta<input autoComplete="email" name="email" type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} maxLength={254} required /></label>
        </div>
        <label>{purpose === "answer-key" ? "Yayınevi, sınav adı, sınıf ve talebiniz" : "Mesajınız"}<textarea name="message" rows={5} placeholder={purpose === "answer-key" ? "Örn. yayınevi adı, 8. sınıf, deneme numarası / tarihi..." : undefined} value={values.message} onChange={(event) => setValues({ ...values, message: event.target.value.slice(0, purpose === "answer-key" ? 1900 : 2000) })} minLength={5} maxLength={purpose === "answer-key" ? 1900 : 2000} required /></label>
        <div className="contact-form-footer">
          <small>{values.message.length}/{purpose === "answer-key" ? 1900 : 2000} karakter</small>
          <button className="button button-navy" type="submit" disabled={submitting}>{submitting ? "Gönderiliyor..." : "Mesajı gönder"} <span>→</span></button>
        </div>
        {notice && <p className={`contact-notice ${warning ? "contact-notice-warning" : ""}`} role={warning ? "alert" : "status"}>{notice}</p>}
      </form>
      {showBrand && (
        <aside className="contact-brand-card" aria-label="Kurumsal Sınav">
          <span className="contact-brand-mark">K</span>
          <strong>Kurumsal Sınav</strong>
          <p>İletişim ve destek talepleriniz için formu doldurmanız yeterli.</p>
        </aside>
      )}
    </div>
  );
}
