"use client";
import UiIcon from "../ui-icon";

import ActionButton from "./action-button";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../../lib/api";

type Publisher = {
  id: string;
  name: string;
  description?:string|null; email?:string|null; phone?:string|null;
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
  const [creating,setCreating]=useState(false),[contact,setContact]=useState({email:"",phone:"",active:true});
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
    return publishers;
  }, [publishers]);
  const [page,setPage]=useState(1),[total,setTotal]=useState(0),[applied,setApplied]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{const timer=setTimeout(()=>{setApplied(query.trim());setPage(1);},250);return()=>clearTimeout(timer);},[query]);

  const loadData = async (signal?:AbortSignal) => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [publisherResponse, requestResponse] = await Promise.all([
        role === "SUPER_ADMIN"
          ? fetch(`${API_URL}/api/admin/publishers?${new URLSearchParams({page:String(page),pageSize:"25",search:applied})}`, { headers,signal })
          : fetch(`${API_URL}/api/publishers?${new URLSearchParams({page:String(page),pageSize:"25",search:applied})}`, { headers,signal }),
        role === "SUPER_ADMIN"
          ? fetch(`${API_URL}/api/admin/publisher-requests`, { headers })
          : fetch(`${API_URL}/api/publisher-requests`, { headers }),
      ]);

      const [publisherData, requestData] = await Promise.all([
        publisherResponse.json() as Promise<Publisher[] | { error?: string }>,
        requestResponse.json() as Promise<PublisherRequest[] | { error?: string }>,
      ]);

      if (!publisherResponse.ok || !Array.isArray((publisherData as any).rows)) {
        throw new Error((publisherData as { error?: string })?.error ?? "Yayınevleri yüklenemedi.");
      }

      if (!requestResponse.ok || !Array.isArray(requestData)) {
        throw new Error((requestData as { error?: string })?.error ?? "Talep listesi yüklenemedi.");
      }

      if(signal?.aborted)return;
      setPublishers((publisherData as any).rows);setTotal((publisherData as any).total);
      setRequests(requestData);
    } catch (loadError) {
      if(signal?.aborted)return;
      setError(loadError instanceof Error ? loadError.message : "Yayınevi verisi yüklenemedi.");
    }finally{if(!signal?.aborted)setLoading(false);}
  };

  useEffect(() => {
    const c=new AbortController();void loadData(c.signal);return()=>c.abort();
  }, [token,role,page,applied]);

  async function submitPublisherRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/${role==="SUPER_ADMIN"?"admin/publishers":"publisher-requests"}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publisherName, description, ...contact }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error ?? "Yayınevi talebi oluşturulamadı.");
        return;
      }
      setNotice(result.message ?? (role==="SUPER_ADMIN"?"Yayınevi oluşturuldu. Kullanıcı hesabı veya yetki verilmedi.":"Yayınevi talebi gönderildi."));
      setCreating(false);
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

  async function updatePublisher(publisher: Publisher, changes: { name?: string; active?: boolean; description?:string; email?:string; phone?:string }) {
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

        </div>
      </header>

      {notice && <p className="notice success" role="status">{notice}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}

      <div className="publisher-controls">{role==="SUPER_ADMIN"&&<ActionButton data-help-id="panel-publisher-management-1" intent="manage" className="button button-navy" onClick={()=>setCreating(v=>!v)}><UiIcon name="add"/> Yayınevi Ekle</ActionButton>}
        <label className="search-field">
          <span>Arama</span>
          <input data-help-id="panel-publisher-management-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Yayınevi ara..." />
        </label>
        {role !== "SUPER_ADMIN" && (
          <ActionButton data-help-id="panel-publisher-management-3" intent="manage" type="button" className="button button-navy" onClick={() => document.getElementById("publisher-request-form")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Yayınevi ekleme talebi gönder
          </ActionButton>
        )}
      </div>

      <div className="publisher-grid">
        <div className="publisher-list-panel">
          <h3>Kayıtlı yayınevleri</h3><nav className="studio-actions" aria-label="Yayınevi sayfaları"><button data-help-id="panel-publisher-management-4x" disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}>Önceki</button><span>{total} kayıt · {page} / {Math.max(1,Math.ceil(total/25))} · bu sayfada {publishers.length}</span><button data-help-id="panel-publisher-management-5x" disabled={loading||page*25>=total} onClick={()=>setPage(p=>p+1)}>Sonraki</button></nav>
          {loading?<p role="status">Yayınevleri yükleniyor…</p>:filteredPublishers.length === 0 ? (
            <p className="empty-state">{applied?"Arama kriterine uyan yayınevi bulunamadı.":"Henüz kayıtlı yayınevi yok."}</p>
          ) : (
            <div className="publisher-list">
              {filteredPublishers.map((publisher) => (
                <div className="publisher-item" key={publisher.id}>
                  {role === "SUPER_ADMIN" && editingPublisherId === publisher.id ? (
                    <form className="publisher-inline-edit" onSubmit={(event) => {
                      event.preventDefault();
                      const data=new FormData(event.currentTarget);
                      void updatePublisher(publisher, { name: editingPublisherName,description:String(data.get("description")??""),email:String(data.get("email")??""),phone:String(data.get("phone")??"") });
                    }}>
                      <input data-help-id="panel-publisher-management-4" aria-label="Yayınevi adı" value={editingPublisherName} onChange={(event) => setEditingPublisherName(event.target.value)} maxLength={180} required />
                      <label>Açıklama<textarea data-help-id="panel-publisher-management-5" name="description" defaultValue={publisher.description??""} maxLength={1000}/></label><label>E-posta<input data-help-id="panel-publisher-management-6" name="email" type="email" defaultValue={publisher.email??""} maxLength={254}/></label><label>Telefon<input data-help-id="panel-publisher-management-7" name="phone" defaultValue={publisher.phone??""} maxLength={40}/></label><ActionButton data-help-id="panel-publisher-management-8" intent="save" className="button button-navy" type="submit">Kaydet</ActionButton>
                      <ActionButton data-help-id="panel-publisher-management-9" intent="manage" className="button button-quiet" type="button" onClick={() => setEditingPublisherId("")}>Vazgeç</ActionButton>
                    </form>
                  ) : <strong>{publisher.name}</strong>}
                  <small>{publisher.active ? "Aktif" : "Pasif"}</small>
                  {role === "SUPER_ADMIN" && editingPublisherId !== publisher.id && (
                    <div className="publisher-admin-actions">
                      <ActionButton data-help-id="panel-publisher-management-10" intent="manage" type="button" className="button button-quiet" onClick={() => { setEditingPublisherId(publisher.id); setEditingPublisherName(publisher.name); }}>Düzenle</ActionButton>
                      <ActionButton data-help-id="panel-publisher-management-11" intent={publisher.active?'danger':'save'} type="button" className="button button-quiet" onClick={() => void updatePublisher(publisher, { active: !publisher.active })}>
                        {publisher.active ? "Pasife al" : "Yeniden aktifleştir"}
                      </ActionButton>
                      <ActionButton data-help-id="panel-publisher-management-12" intent="danger" type="button" className="button button-quiet" onClick={() => void deletePublisher(publisher)} disabled={deletingPublisherId === publisher.id}>
                        {deletingPublisherId === publisher.id ? "Siliniyor..." : "Sil"}
                      </ActionButton>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {(role !== "SUPER_ADMIN" || creating) && (
          <form id="publisher-request-form" className="publisher-form" onSubmit={submitPublisherRequest}>
            <h3>{role==="SUPER_ADMIN"?"Yeni yayınevi":"Yayınevi ekleme talebi"}</h3>
            <label>
              Yayınevi adı
              <input data-help-id="panel-publisher-management-13" value={publisherName} onChange={(event) => setPublisherName(event.target.value)} maxLength={180} placeholder="Örn. A Plus" required />
            </label>
            <label>
              Açıklama
              <textarea data-help-id="panel-publisher-management-14" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={1000} placeholder="İsteğe bağlı açıklama" />
            </label>
            {role==="SUPER_ADMIN"&&<><label>E-posta<input data-help-id="panel-publisher-management-15" type="email" maxLength={254} value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})}/></label><label>Telefon<input data-help-id="panel-publisher-management-16" maxLength={40} value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})}/></label><label className="checkbox-row"><input data-help-id="panel-publisher-management-17" type="checkbox" checked={contact.active} onChange={e=>setContact({...contact,active:e.target.checked})}/>Aktif</label><p>Logoyu oluşturduktan sonra Yayınevi Logoları bölümünden ekleyebilirsiniz.</p></>}<ActionButton data-help-id="panel-publisher-management-18" intent="save" loading={submitting} className="button button-navy" type="submit" disabled={submitting}>{submitting ? "Gönderiliyor..." : role==="SUPER_ADMIN"?"Yayınevini kaydet":"Talebi gönder"}</ActionButton>
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
                    <ActionButton data-help-id="panel-publisher-management-19" intent="save" type="button" className="button button-navy" onClick={() => void updateRequestStatus(request.id, "APPROVED")}>Onayla</ActionButton>
                    <ActionButton data-help-id="panel-publisher-management-20" intent="danger" type="button" className="button button-quiet" onClick={() => void updateRequestStatus(request.id, "REJECTED")}>Reddet</ActionButton>
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
