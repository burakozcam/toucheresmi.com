"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import CreateUser from "./create-user";
import { API_URL } from "../../lib/api";

type Registration = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
};

type MemberRow = {
  id: string;
  kind: "request" | "user";
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "INACTIVE";
  createdAt: string;
};

export default function RegistrationRequests({ token }: { token: string }) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState("");
  const [resetId, setResetId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [requestsResponse, usersResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/registration-requests`, { headers }),
        fetch(`${API_URL}/api/admin/users`, { headers }),
      ]);
      const [requestsResult, usersResult] = await Promise.all([
        requestsResponse.json() as Promise<Registration[] | { error?: string }>,
        usersResponse.json() as Promise<User[] | { error?: string }>,
      ]);

      if (!requestsResponse.ok || !Array.isArray(requestsResult)) {
        setError(!Array.isArray(requestsResult) ? requestsResult.error ?? "Üyelik talepleri yüklenemedi." : "Üyelik talepleri yüklenemedi.");
        return;
      }
      if (!usersResponse.ok || !Array.isArray(usersResult)) {
        setError(!Array.isArray(usersResult) ? usersResult.error ?? "Kullanıcılar yüklenemedi." : "Kullanıcılar yüklenemedi.");
        return;
      }

      setRegistrations(requestsResult);
      setUsers(usersResult);
    } catch {
      setError("Sunucuya bağlanılamadı. API hizmetinin çalıştığını kontrol edin.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    setPendingId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/admin/registration-requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Üyelik talebi güncellenemedi.");
        return;
      }
      setNotice(status === "APPROVED" ? "Üyelik onaylandı; kullanıcı artık giriş yapabilir." : "Üyelik talebi reddedildi.");
      await loadMembers();
    } catch {
      setError("Sunucuya bağlanılamadı. Karar kaydedilemedi.");
    } finally {
      setPendingId("");
    }
  }

  async function setUserActive(user: User, active: boolean) {
    if (!active && !window.confirm("Bu kullanıcı hesabının erişimi kapatılacak. Hesap verileri ilişkili kayıtlar için korunacak. Devam edilsin mi?")) return;
    setPendingId(user.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(user.id)}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Kullanıcı durumu güncellenemedi.");
        return;
      }
      setNotice(active ? "Kullanıcı hesabı onaylandı ve etkinleştirildi." : "Kullanıcı erişimi kapatıldı; kayıtları korundu.");
      await loadMembers();
    } catch {
      setError("Sunucuya bağlanılamadı. Kullanıcı durumu güncellenemedi.");
    } finally {
      setPendingId("");
    }
  }

  async function deleteUser(user: User) {
    if (!window.confirm(`"${user.firstName} ${user.lastName}" hesabı ve üyelik kaydı kalıcı olarak silinecek. Devam edilsin mi?`)) return;
    setPendingId(user.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        setError(result.error ?? "Kullanıcı silinemedi.");
        return;
      }
      setNotice("Kullanıcı ve üyelik kaydı silindi.");
      await loadMembers();
    } catch {
      setError("Sunucuya bağlanılamadı. Kullanıcı silinemedi.");
    } finally {
      setPendingId("");
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    setPendingId(userId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(userId)}/password`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error ?? "Şifre güncellenemedi.");
        return;
      }
      setNotice(result.message ?? "Yeni şifre kaydedildi.");
      setNewPassword("");
      setResetId("");
    } catch {
      setError("Sunucuya bağlanılamadı. Yeni şifre kaydedilemedi.");
    } finally {
      setPendingId("");
    }
  }

  const rows: MemberRow[] = [
    ...registrations
      .filter((registration) => registration.status !== "APPROVED")
      .map((registration): MemberRow => ({ ...registration, kind: "request" })),
    ...users.map((user): MemberRow => ({
      ...user,
      kind: "user",
      status: user.active ? "APPROVED" : "INACTIVE",
    })),
  ].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
  const pendingCount = registrations.filter((registration) => registration.status === "PENDING").length;
  const statusLabels = { PENDING: "Onay bekliyor", APPROVED: "Onaylandı", REJECTED: "Reddedildi", INACTIVE: "Erişimi kapalı" };

  return (
    <section className="registration-card">
      <header className="registration-header">
        <div>
          <p className="hero-tag">SİSTEM KULLANICILARI</p>

          <p>Üyeleri onaylayın, erişimlerini yönetin veya güvenli biçimde yeni şifre belirleyin.</p>
        </div>
        <div className="registration-header-actions">
          <span>{pendingCount} bekleyen talep</span>
          <button className="button button-quiet" onClick={() => void loadMembers()} disabled={loading}>Yenile</button>
        </div>
      </header>
      {error && <p className="registration-notice registration-error" role="alert">{error}</p>}
      <CreateUser token={token} onCreated={() => void loadMembers()} />
      {notice && <p className="registration-notice registration-success" role="status">{notice}</p>}
      {loading ? <p className="registration-empty">Üye kayıtları yükleniyor...</p> : rows.length === 0 ? (
        <p className="registration-empty">Henüz kullanıcı veya üyelik talebi bulunmuyor.</p>
      ) : (
        <div className="member-table-wrap">
          <table className="member-table">
            <thead>
              <tr><th>Ad Soyad</th><th>E-posta</th><th>Kayıt Tarihi</th><th>Onay Durumu</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const user = row.kind === "user" ? users.find((item) => item.id === row.id) : undefined;
                return (
                  <tr key={`${row.kind}-${row.id}`}>
                    <td data-label="Ad Soyad"><strong>{row.firstName} {row.lastName}</strong>{row.phone && <small>{row.phone}</small>}</td>
                    <td data-label="E-posta">{row.email}</td>
                    <td data-label="Kayıt Tarihi"><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString("tr-TR")}</time></td>
                    <td data-label="Onay Durumu"><span className={`registration-status status-${row.status.toLowerCase()}`}>{statusLabels[row.status]}</span></td>
                    <td data-label="İşlemler">
                      <div className="member-actions">
                        {row.kind === "request" && row.status === "PENDING" && <>
                          <button className="button button-navy" onClick={() => void decide(row.id, "APPROVED")} disabled={pendingId === row.id}>Onayla</button>
                          <button className="button button-danger" onClick={() => void decide(row.id, "REJECTED")} disabled={pendingId === row.id}>Reddet</button>
                        </>}
                        {user && <>
                          {user.active ? <>
                            <button className="button button-danger" onClick={() => void deleteUser(user)} disabled={pendingId === user.id}>Reddet / Sil</button>
                            <button className="button button-quiet" onClick={() => void setUserActive(user, false)} disabled={pendingId === user.id}>Erişimi Kapat</button>
                          </> : <>
                            <button className="button button-navy" onClick={() => void setUserActive(user, true)} disabled={pendingId === user.id}>Onayla</button>
                            <button className="button button-danger" onClick={() => void deleteUser(user)} disabled={pendingId === user.id}>Sil</button>
                          </>}
                          {resetId === user.id ? (
                            <form className="password-reset-form" onSubmit={(event) => void resetPassword(event, user.id)}>
                              <input aria-label={`${user.email} için yeni şifre`} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} maxLength={72} placeholder="Yeni şifre (12+ karakter)" required />
                              <button className="button button-navy" type="submit" disabled={pendingId === user.id || newPassword.length < 12}>Kaydet</button>
                              <button className="button button-quiet" type="button" onClick={() => { setResetId(""); setNewPassword(""); }}>İptal</button>
                            </form>
                          ) : <button className="button button-quiet" onClick={() => { setResetId(user.id); setNewPassword(""); }} disabled={pendingId === user.id}>Şifre Sıfırla</button>}
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="registration-security-note">Mevcut şifreler yöneticiye gösterilmez. İlişkili kayıtlar kalıcı silmeyi engellerse kullanıcı erişimini kapatabilirsiniz.</p>
    </section>
  );
}
