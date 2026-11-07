"use client";

import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";

type ContactMessage = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  message: string;
  readAt: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string; role: string } | null;
};

type InboxResponse = { items: ContactMessage[]; total: number; unreadCount: number; page: number; pageSize: number };

export default function ContactInbox({ token }: { token: string }) {
  const [data, setData] = useState<InboxResponse | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadMessages() {
      setError("");
      try {
        const response = await fetch(`${API_URL}/api/admin/contact-messages?page=${page}&pageSize=25`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json() as InboxResponse | { error?: string };
        if (!response.ok || !("items" in result)) throw new Error("error" in result ? result.error : "Mesajlar yüklenemedi.");
        if (active) setData(result);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Mesajlar yüklenemedi.");
      }
    }
    void loadMessages();
    return () => { active = false; };
  }, [token, page, revision]);

  async function setRead(message: ContactMessage, read: boolean) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/admin/contact-messages/${encodeURIComponent(message.id)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Mesaj durumu güncellenemedi.");
      setNotice(read ? "Mesaj okundu olarak işaretlendi." : "Mesaj okunmadı olarak işaretlendi.");
      setRevision((value) => value + 1);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Mesaj durumu güncellenemedi.");
    }
  }

  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 25)));
  return (
    <section className="management-panel">
      <header className="panel-header">
        <div><p className="hero-tag">İLETİŞİM</p><h2>Yönetici gelen kutusu</h2></div>
        <span className="inbox-unread-count">{data?.unreadCount ?? 0} okunmamış</span>
      </header>
      {error && <p className="notice error" role="alert">{error}</p>}
      {notice && <p className="notice success" role="status">{notice}</p>}
      {!data ? <p className="empty-state">Mesajlar yükleniyor...</p> : data.items.length === 0 ? (
        <p className="empty-state">Henüz iletişim mesajı yok.</p>
      ) : (
        <div className="contact-inbox-list">
          {data.items.map((message) => (
            <article className={`contact-message-card ${message.readAt ? "" : "contact-message-unread"}`} key={message.id}>
              <div className="contact-message-heading">
                <div><strong>{message.firstName} {message.lastName}</strong><span>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.createdAt))}</span></div>
                <span className="contact-message-status">{message.readAt ? "Okundu" : "Okunmadı"}</span>
              </div>
              <div className="contact-message-meta">
                <span>{message.email}</span>
                {message.phone && <a href={`tel:${encodeURIComponent(message.phone)}`}>{message.phone}</a>}
                {message.user && <span>Hesap: {message.user.firstName} {message.user.lastName} ({message.user.role})</span>}
              </div>
              <p className="contact-message-body">{message.message}</p>
              <button type="button" className="button button-quiet" onClick={() => void setRead(message, !message.readAt)}>
                {message.readAt ? "Okunmadı olarak işaretle" : "Okundu olarak işaretle"}
              </button>
            </article>
          ))}
        </div>
      )}
      <div className="management-pagination">
        <button type="button" className="button button-quiet" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Önceki</button>
        <span>Sayfa {page} / {pageCount} · {data?.total ?? 0} mesaj</span>
        <button type="button" className="button button-quiet" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount}>Sonraki</button>
      </div>
    </section>
  );
}
