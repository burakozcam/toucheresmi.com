"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../../lib/api";

type School = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  code: string | null;
  active: boolean;
  dealer: { id: string; name: string } | null;
  createdBy: { id: string; firstName: string; lastName: string; email: string } | null;
};
type Dealer = { id: string; name: string };
type DuplicateAttempt = {
  id: string;
  submittedName: string;
  submittedCity: string | null;
  submittedDistrict: string | null;
  createdAt: string;
  submittedBy: { firstName: string; lastName: string; email: string } | null;
  matchedSchool: { name: string; city: string | null; district: string | null };
};
type SchoolForm = { name: string; city: string; district: string; code: string; dealerId: string };

const emptyForm: SchoolForm = { name: "", city: "", district: "", code: "", dealerId: "" };

export default function SchoolManagement({ token, role }: { token: string; role: "SUPER_ADMIN" | "DEALER" }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [duplicateAttempts, setDuplicateAttempts] = useState<DuplicateAttempt[]>([]);
  const [form, setForm] = useState<SchoolForm>(emptyForm);
  const [editing, setEditing] = useState<School | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const visibleSchools = useMemo(() => schools.filter((school) => {
    const text = `${school.name} ${school.city ?? ""} ${school.district ?? ""} ${school.dealer?.name ?? ""}`.toLocaleLowerCase("tr-TR");
    return (!search.trim() || text.includes(search.trim().toLocaleLowerCase("tr-TR")))
      && (status === "all" || (status === "active" ? school.active : !school.active));
  }), [schools, search, status]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: "Bearer " + token };
      const responses = await Promise.all([
        fetch(`${API_URL}/api/schools`, { headers }),
        role === "SUPER_ADMIN" ? fetch(`${API_URL}/api/admin/dealers`, { headers }) : Promise.resolve(null),
        role === "SUPER_ADMIN" ? fetch(`${API_URL}/api/admin/school-duplicate-attempts?reviewed=false`, { headers }) : Promise.resolve(null),
      ]);
      const schoolData = await responses[0].json() as School[] | { error?: string };
      if (!responses[0].ok || !Array.isArray(schoolData)) {
        throw new Error((schoolData as { error?: string }).error ?? "Kurum listesi yüklenemedi.");
      }
      setSchools(schoolData);
      if (responses[1]) {
        const dealerData = await responses[1].json() as Dealer[] | { error?: string };
        if (!responses[1].ok || !Array.isArray(dealerData)) {
          throw new Error((dealerData as { error?: string }).error ?? "Bayi listesi yüklenemedi.");
        }
        setDealers(dealerData);
      }
      if (responses[2]) {
        const attemptData = await responses[2].json() as DuplicateAttempt[] | { error?: string };
        if (!responses[2].ok || !Array.isArray(attemptData)) {
          throw new Error((attemptData as { error?: string }).error ?? "Mükerrer kurum inceleme kayıtları yüklenemedi.");
        }
        setDuplicateAttempts(attemptData);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kurum verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, [token, role]);

  async function submitSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/schools`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          city: form.city || null,
          district: form.district || null,
          code: form.code || null,
          ...(role === "SUPER_ADMIN" ? { dealerId: form.dealerId || null } : {}),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Kurum eklenemedi.");
        return;
      }
      setNotice("Kurum başarıyla eklendi.");
      setForm(emptyForm);
      await loadData();
    } catch {
      setError("Kurum eklenirken sunucuya ulaşılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateSchool(schoolId: string, changes: Partial<SchoolForm> & { active?: boolean }) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/admin/schools/${encodeURIComponent(schoolId)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Kurum güncellenemedi.");
        return;
      }
      setEditing(null);
      setNotice("Kurum bilgileri güncellendi.");
      await loadData();
    } catch {
      setError("Kurum güncellenirken sunucuya ulaşılamadı.");
    }
  }

  async function markDuplicateAttemptReviewed(attemptId: string) {
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/school-duplicate-attempts/${encodeURIComponent(attemptId)}`, {
        method: "PATCH",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "İnceleme durumu kaydedilemedi.");
        return;
      }
      setNotice("Mükerrer kurum girişimi incelendi olarak işaretlendi.");
      await loadData();
    } catch {
      setError("İnceleme durumu kaydedilirken sunucuya ulaşılamadı.");
    }
  }

  return (
    <section className="management-panel school-management">
      <header className="panel-header">
        <div><p className="hero-tag">KURUM YÖNETİMİ</p><h2>{role === "SUPER_ADMIN" ? "Kurumlar" : "Kurum ekleme"}</h2></div>
      </header>
      {notice && <p className="notice success" role="status">{notice}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}

      <form className="school-form" onSubmit={submitSchool}>
        <h3>Yeni kurum ekle</h3>
        {role === "DEALER" && <div className="school-duplicate-warning">
          <strong>Mevcut olan bir kurumu tekrar eklemeniz durumunda hesabınız askıya alınacaktır.</strong>
          <small>Sistem hesabınızı otomatik olarak askıya almaz; şüpheli tekrar girişimleri yönetici incelemesi için kaydedilir.</small>
        </div>}
        <div className="two-column-fields">
          <label>Kurum adı<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={180} required /></label>
          <label>İl<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} maxLength={100} /></label>
          <label>İlçe<input value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })} maxLength={100} /></label>
          <label>Kurum kodu (isteğe bağlı)<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} maxLength={80} /></label>
          {role === "SUPER_ADMIN" && <label>Bayi (isteğe bağlı)<select value={form.dealerId} onChange={(event) => setForm({ ...form, dealerId: event.target.value })}><option value="">Bayi seçilmedi</option>{dealers.map((dealer) => <option key={dealer.id} value={dealer.id}>{dealer.name}</option>)}</select></label>}
        </div>
        <p className="school-duplicate-help">Aynı adlı kurumlar farklı il veya ilçelerde ayrı kayıt olarak eklenebilir.</p>
        <button className="button button-navy" type="submit" disabled={submitting}>{submitting ? "Kaydediliyor..." : "Kurumu ekle"}</button>
      </form>

      <div className="school-list-panel">
        <div className="list-header-row">
          <h3>{role === "SUPER_ADMIN" ? "Tüm kurumlar" : "Eklediğiniz kurumlar"}</h3>
          <label className="search-field compact-search"><span>Kurum ara</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, il, ilçe veya bayi..." /></label>
          <label className="school-status-filter"><span>Durum</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tümü</option><option value="active">Aktif</option><option value="inactive">Pasif</option></select></label>
        </div>
        {loading ? <p className="empty-state">Kurumlar yükleniyor...</p> : visibleSchools.length === 0 ? <p className="empty-state">Arama kriterlerine uygun kurum bulunamadı.</p> : (
          <div className="school-list">
            {visibleSchools.map((school) => (
              <article className="school-item" key={school.id}>
                {editing?.id === school.id ? (
                  <form className="school-edit-form" onSubmit={(event) => {
                    event.preventDefault();
                    void updateSchool(school.id, {
                      name: editing.name,
                      city: editing.city ?? "",
                      district: editing.district ?? "",
                      code: editing.code ?? "",
                    });
                  }}>
                    <label>Kurum adı<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required /></label>
                    <label>İl<input value={editing.city ?? ""} onChange={(event) => setEditing({ ...editing, city: event.target.value })} /></label>
                    <label>İlçe<input value={editing.district ?? ""} onChange={(event) => setEditing({ ...editing, district: event.target.value })} /></label>
                    <label>Kurum kodu<input value={editing.code ?? ""} onChange={(event) => setEditing({ ...editing, code: event.target.value })} /></label>
                    <button className="button button-navy" type="submit">Kaydet</button>
                    <button className="button button-quiet" type="button" onClick={() => setEditing(null)}>Vazgeç</button>
                  </form>
                ) : (
                  <>
                    <div className="school-item-main">
                      <strong>{school.name}</strong>
                      <span>{[school.district, school.city].filter(Boolean).join(" / ") || "Konum belirtilmemiş"}</span>
                      <small>{school.code ? `Kod: ${school.code} · ` : ""}{school.active ? "Aktif" : "Pasif"}</small>
                      {role === "SUPER_ADMIN" && <small>Ekleyen: {school.createdBy ? `${school.createdBy.firstName} ${school.createdBy.lastName}` : school.dealer?.name ?? "Bilinmiyor"}{school.dealer ? ` · ${school.dealer.name}` : ""}</small>}
                    </div>
                    {role === "SUPER_ADMIN" && <div className="school-admin-actions">
                      <button type="button" className="button button-quiet" onClick={() => setEditing(school)}>Düzenle</button>
                      <button type="button" className="button button-quiet" onClick={() => void updateSchool(school.id, { active: !school.active })}>{school.active ? "Pasife al" : "Yeniden aktifleştir"}</button>
                    </div>}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
      {role === "SUPER_ADMIN" && <div className="school-list-panel">
        <h3>İncelenmesi gereken mükerrer kurum girişimleri</h3>
        {duplicateAttempts.length === 0 ? <p className="empty-state">Bekleyen inceleme kaydı bulunmuyor.</p> : (
          <div className="school-list">
            {duplicateAttempts.map((attempt) => <article className="school-item" key={attempt.id}>
              <div className="school-item-main">
                <strong>Girilen: {attempt.submittedName} — {[attempt.submittedDistrict, attempt.submittedCity].filter(Boolean).join(" / ") || "Konum belirtilmemiş"}</strong>
                <span>Mevcut: {attempt.matchedSchool.name} — {[attempt.matchedSchool.district, attempt.matchedSchool.city].filter(Boolean).join(" / ") || "Konum belirtilmemiş"}</span>
                <small>Gönderen: {attempt.submittedBy ? `${attempt.submittedBy.firstName} ${attempt.submittedBy.lastName} · ${attempt.submittedBy.email}` : "Hesap artık mevcut değil"}</small>
                <small>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(attempt.createdAt))}</small>
              </div>
              <button type="button" className="button button-quiet" onClick={() => void markDuplicateAttemptReviewed(attempt.id)}>İncelendi olarak işaretle</button>
            </article>)}
          </div>
        )}
      </div>}
    </section>
  );
}
