"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { API_URL } from "../../lib/api";

type AuditLog = {
  id: string;
  actorUserId: string | null;
  actorName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string | null;
  createdAt: string;
};
type AdminUser = { id: string; firstName: string; lastName: string; email: string };
type AuditResponse = { items: AuditLog[]; total: number; page: number; pageSize: number };

export default function AuditLogManagement({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [data, setData] = useState<AuditResponse | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ userId: "", from: "", to: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadLogs() {
      setError("");
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (appliedFilters.userId) params.set("userId", appliedFilters.userId);
      if (appliedFilters.from) params.set("from", appliedFilters.from);
      if (appliedFilters.to) params.set("to", appliedFilters.to);
      try {
        const [logResponse, userResponse] = await Promise.all([
          fetch(`${API_URL}/api/admin/audit-logs?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/admin/audit-log-users`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [logResult, userResult] = await Promise.all([
          logResponse.json() as Promise<AuditResponse | { error?: string }>,
          userResponse.json() as Promise<AdminUser[] | { error?: string }>,
        ]);
        if (!logResponse.ok || !("items" in logResult)) throw new Error("error" in logResult ? logResult.error : "İşlem kayıtları yüklenemedi.");
        if (!userResponse.ok || !Array.isArray(userResult)) throw new Error("error" in userResult ? userResult.error : "Kullanıcı listesi yüklenemedi.");
        if (active) {
          setData(logResult);
          setUsers(userResult);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "İşlem kayıtları yüklenemedi.");
      }
    }
    void loadLogs();
    return () => { active = false; };
  }, [token, page, appliedFilters]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) {
      setError("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
      return;
    }
    setPage(1);
    setAppliedFilters(filters);
  }

  const grouped = new Map<string, AuditLog[]>();
  (data?.items ?? []).forEach((item) => {
    if (!grouped.has(item.actorName)) grouped.set(item.actorName, []);
    grouped.get(item.actorName)!.push(item);
  });
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 25)));

  return (
    <section className="management-panel">
      <header className="panel-header"><div><p className="hero-tag">SİSTEM GÜVENLİĞİ</p></div></header>
      {error && <p className="notice error" role="alert">{error}</p>}
      <form className="audit-filter-form" onSubmit={applyFilters}>
        <label>Kullanıcı
          <select value={filters.userId} onChange={(event) => setFilters({ ...filters, userId: event.target.value })}>
            <option value="">Tüm kullanıcılar</option>
            {users.map((user) => <option value={user.id} key={user.id}>{user.firstName} {user.lastName} · {user.email}</option>)}
          </select>
        </label>
        <label>Başlangıç tarihi<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label>Bitiş tarihi<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        <button className="button button-navy" type="submit">Filtrele</button>
      </form>
      {!data ? <p className="empty-state">Kayıtlar yükleniyor...</p> : grouped.size === 0 ? (
        <p className="empty-state">Seçilen ölçütlerde işlem kaydı bulunamadı.</p>
      ) : (
        <div className="audit-user-groups">
          {[...grouped].map(([actorName, logs]) => (
            <details className="audit-user-group" key={actorName}>
              <summary>{actorName} — {logs.length} işlem</summary>
              <div className="audit-log-list">{logs.map((log) => (
                <article className="audit-log-row" key={log.id}>
                  <strong>{log.action}</strong>
                  <span>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}</span>
                  {(log.targetType || log.targetId) && <small>İlgili kayıt: {[log.targetType, log.targetId].filter(Boolean).join(" · ")}</small>}
                  {log.summary && <p>{log.summary}</p>}
                </article>
              ))}</div>
            </details>
          ))}
        </div>
      )}
      <div className="management-pagination">
        <button type="button" className="button button-quiet" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Önceki</button>
        <span>Sayfa {page} / {pageCount} · {data?.total ?? 0} işlem</span>
        <button type="button" className="button button-quiet" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount}>Sonraki</button>
      </div>
    </section>
  );
}
