"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../../lib/api";

type Publisher = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type PublisherRequest = {
  id: string;
  publisherName: string;
  description: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedByUserId: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  requestedBy?: { id: string; firstName: string; lastName: string; email: string };
  reviewedBy?: { id: string; firstName: string; lastName: string } | null;
};

export default function PublisherManagement({ token, role }: { token: string; role: "SUPER_ADMIN" | "DEALER" | "SCHOOL_ADMIN" | "STUDENT" | "PARENT" }) {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [requests, setRequests] = useState<PublisherRequest[]>([]);
  const [query, setQuery] = useState("");
  const [publisherName, setPublisherName] = useState("");
  const [description, setDescription] = useState("");
  const [editingPublisherId, setEditingPublisherId] = useState("");
  const [editingPublisherName, setEditingPublisherName] = useState("");
  const [deletingPublisherId, setDeletingPublisherId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredPublishers = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("tr-TR");
    return [...publishers].filter((publisher) =>
      !value || publisher.name.toLocaleLowerCase("tr-TR").includes(value),
    ).sort((left, right) => left.name.localeCompare(right.name, "tr-TR"));
  }, [publishers, query]);

  const loadData = async () => {
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [publisherResponse, requestResponse] = await Promise.all([
        role === "SUPER_ADMIN"
          ? fetch(`${API_URL}/api/admin/publishers`, { headers })
          : fetch(`${API_URL}/api/publishers`, { headers }),
        role === "SUPER_ADMIN"
          ? fetch(`${API_URL}/api/admin/publisher-requests`, { headers })
          : fetch(`${API_URL}/api/publisher-requests`, { headers }),
      ]);

      const [publisherData, requestData] = await Promise.all([
        publisherResponse.json() as Promise<Publisher[] | { error?: string }>,
        requestResponse.json() as Promise<PublisherRequest[] | { error?: string }>,
      ]);

      if (!publisherResponse.ok || !Array.isArray(publisherData)) {
        throw new Error((publisherData as { error?: string })?.error ?? "Yayınevleri yüklenemedi.");
      }

      if (!requestResponse.ok || !Array.isArray(requestData)) {
        throw new Error((requestData as { error?: string })?.error ?? "Talep listesi yüklenemedi.");
      }

      setPublishers(publisherData);
      setRequests(requestData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Yayınevi verisi yüklenemedi.");
    }
  };

  useEffect(() => {
    void loadData();
  }, [token]);

  async function submitPublisherRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/publisher-requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publisherName, description }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error ?? "Yayınevi talebi oluşturulamadı.");
        return;
      }
      setNotice(result.message ?? "Yayınevi talebi gönderildi.");
      setPublisherName("");
      setDescription("");
      await loadData();
    } catch {
      setError("Sunucuya bağlanılamadı. Talep gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateRequestStatus(requestId: string, nextStatus: "APPROVED" | "REJECTED") {
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/api/admin/publisher-requests/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json() as { error?: string; message?: string; status?: string };

      if (!response.ok) {
        setError(result.error ?? "Talep güncellenemedi.");
        return;
      }

      setNotice(nextStatus === "APPROVED" ? "Yayınevi talebi onaylandı." : "Yayınevi talebi reddedildi.");
      await loadData();
    } catch {
      setError("İşlem sırasında sunucuya ulaşılamadı.");
    }
  }

  async function updatePublisher(publisher: Publisher, changes: { name?: string; active?: boolean }) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/admin/publishers/${encodeURIComponent(publisher.id)}`, {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changes),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Yayınevi güncellenemedi.");
        return;
      }
      setEditingPublisherId("");
      setNotice("Yayınevi bilgileri güncellendi.");
      await loadData();
    } catch {
      setError("Yayınevi güncellenirken sunucuya ulaşılamadı.");
    }
  }

  async function deletePublisher(publisher: Publisher) {
    if (!window.confirm(`“${publisher.name}” yayınevi silinsin mi? İlişkili kayıtlar varsa silme engellenecektir.`)) return;
    setError("");
    setNotice("");
    setDeletingPublisherId(publisher.id);
    try {
      const response = await fetch(`${API_URL}/api/admin/publishers/${encodeURIComponent(publisher.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        setError(result.error ?? "Yayınevi silinemedi.");
        return;
      }
      setNotice("Yayınevi silindi.");
      await loadData();
    } catch {
      setError("Yayınevi silinirken sunucuya ulaşılamadı.");
    } finally {
      setDeletingPublisherId("");
    }
  }

  const pendingRequests = requests.filter((request) => request.status === "PENDING");

  return (
    <section className="management-panel">
      <header className="panel-header">
        <div>
          <p className="hero-tag">YAYINEVLERİ</p>
          <h2>Yayınevi yönetimi</h2>
        </div>
      </header>

      {notice && <p className="notice success" role="status">{notice}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}

      <div className="publisher-controls">
        <label className="search-field">
          <span>Arama</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Yayınevi ara..." />
        </label>
        {role !== "SUPER_ADMIN" && (
          <button type="button" className="button button-navy" onClick={() => document.getElementById("publisher-request-form")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Yayınevi ekleme talebi gönder
          </button>
        )}
      </div>

      <div className="publisher-grid">
        <div className="publisher-list-panel">
          <h3>Kayıtlı yayınevleri</h3>
          {filteredPublishers.length === 0 ? (
            <p className="empty-state">Arama kriterine uyan yayınevi bulunamadı.</p>
          ) : (
            <div className="publisher-list">
              {filteredPublishers.map((publisher) => (
                <div className="publisher-item" key={publisher.id}>
                  {role === "SUPER_ADMIN" && editingPublisherId === publisher.id ? (
                    <form className="publisher-inline-edit" onSubmit={(event) => {
                      event.preventDefault();
                      void updatePublisher(publisher, { name: editingPublisherName });
                    }}>
                      <input aria-label="Yayınevi adı" value={editingPublisherName} onChange={(event) => setEditingPublisherName(event.target.value)} maxLength={180} required />
                      <button className="button button-navy" type="submit">Kaydet</button>
                      <button className="button button-quiet" type="button" onClick={() => setEditingPublisherId("")}>Vazgeç</button>
                    </form>
                  ) : <strong>{publisher.name}</strong>}
                  <small>{publisher.active ? "Aktif" : "Pasif"}</small>
                  {role === "SUPER_ADMIN" && editingPublisherId !== publisher.id && (
                    <div className="publisher-admin-actions">
                      <button type="button" className="button button-quiet" onClick={() => { setEditingPublisherId(publisher.id); setEditingPublisherName(publisher.name); }}>Düzenle</button>
                      <button type="button" className="button button-quiet" onClick={() => void updatePublisher(publisher, { active: !publisher.active })}>
                        {publisher.active ? "Pasife al" : "Yeniden aktifleştir"}
                      </button>
                      <button type="button" className="button button-quiet" onClick={() => void deletePublisher(publisher)} disabled={deletingPublisherId === publisher.id}>
                        {deletingPublisherId === publisher.id ? "Siliniyor..." : "Sil"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {role !== "SUPER_ADMIN" && (
          <form id="publisher-request-form" className="publisher-form" onSubmit={submitPublisherRequest}>
            <h3>Yayınevi ekleme talebi</h3>
            <label>
              Yayınevi adı
              <input value={publisherName} onChange={(event) => setPublisherName(event.target.value)} maxLength={180} placeholder="Örn. A Plus" required />
            </label>
            <label>
              Açıklama
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={1000} placeholder="İsteğe bağlı açıklama" />
            </label>
            <button className="button button-navy" type="submit" disabled={submitting}>{submitting ? "Gönderiliyor..." : "Talebi gönder"}</button>
          </form>
        )}
      </div>

      {role !== "SUPER_ADMIN" && (
        <div className="admin-review-panel">
          <h3>Talep durumu</h3>
          {requests.length === 0 ? (
            <p className="empty-state">Henüz yayınevi talebi oluşturmamışsınız.</p>
          ) : (
            <div className="request-list">
              {requests.map((request) => (
                <article className="request-card" key={request.id}>
                  <div className="request-meta">
                    <strong>{request.publisherName}</strong>
                    <span>{request.status}</span>
                  </div>
                  <dl>
                    <div><dt>İşlem tarihi</dt><dd>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(request.createdAt))}</dd></div>
                    <div><dt>Durum</dt><dd>{request.status === "PENDING" ? "Onay bekliyor" : request.status === "APPROVED" ? "Onaylandı" : "Reddedildi"}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {role === "SUPER_ADMIN" && (
        <div className="admin-review-panel">
          <h3>Onay bekleyen yayınevleri</h3>
          {pendingRequests.length === 0 ? (
            <p className="empty-state">Bekleyen yayınevi talebi bulunmuyor.</p>
          ) : (
            <div className="request-list">
              {pendingRequests.map((request) => (
                <article className="request-card" key={request.id}>
                  <div className="request-meta">
                    <strong>{request.publisherName}</strong>
                    <span>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(request.createdAt))}</span>
                  </div>
                  <dl>
                    <div><dt>Talebi gönderen</dt><dd>{request.requestedBy ? `${request.requestedBy.firstName} ${request.requestedBy.lastName}` : "Bilinmeyen kullanıcı"}</dd></div>
                    <div><dt>Açıklama</dt><dd>{request.description || "Açıklama yok"}</dd></div>
                    <div><dt>Durum</dt><dd>{request.status}</dd></div>
                  </dl>
                  <div className="request-actions">
                    <button type="button" className="button button-navy" onClick={() => void updateRequestStatus(request.id, "APPROVED")}>Onayla</button>
                    <button type="button" className="button button-quiet" onClick={() => void updateRequestStatus(request.id, "REJECTED")}>Reddet</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
