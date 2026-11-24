import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, UserPlus, Trash2, KeyRound } from 'lucide-react';
import { APP_ROLES, AppRole, getAccessToken } from '../services/auth';
import { ROLE_LABEL } from '../utils/permissions';
import '../styles/dashboard-live.css';

interface AdminUser {
  id: string;
  email: string;
  role: AppRole | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
}

const API = '/api/admin/users';

async function callApi(method: string, body?: unknown): Promise<any> {
  const token = getAccessToken();
  const res = await fetch(API, {
    method,
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Gagal (${res.status})`);
  return data;
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum pernah';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('live_team');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callApi('GET');
      if (!Array.isArray(data?.users)) throw new Error('Respons server tidak valid. Fitur ini butuh server API yang aktif.');
      setUsers(data.users);
      setSelfId(data.self ?? null);
    } catch (err) {
      setNotice({ type: 'err', text: err instanceof Error ? err.message : 'Gagal memuat akun.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setNotice(null);
    try {
      await fn();
      setNotice({ type: 'ok', text: ok });
      await load();
    } catch (err) {
      setNotice({ type: 'err', text: err instanceof Error ? err.message : 'Terjadi kesalahan.' });
    }
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await callApi('POST', { email: newEmail, password: newPassword, role: newRole });
      setNewEmail('');
      setNewPassword('');
    }, 'Akun berhasil dibuat.');
  };

  const changeRole = (u: AdminUser, role: AppRole) =>
    run(() => callApi('PATCH', { id: u.id, role }).then(() => undefined), `Role ${u.email} diubah ke ${ROLE_LABEL[role]}.`);

  const resetPassword = (u: AdminUser) => {
    const pw = window.prompt(`Password baru untuk ${u.email} (minimal 8 karakter):`);
    if (!pw) return;
    run(() => callApi('PATCH', { id: u.id, password: pw }).then(() => undefined), `Password ${u.email} sudah diganti.`);
  };

  const remove = (u: AdminUser) => {
    if (!window.confirm(`Hapus akun ${u.email}? Tindakan ini tidak bisa dibatalkan.`)) return;
    run(() => callApi('DELETE', { id: u.id }).then(() => undefined), `Akun ${u.email} dihapus.`);
  };

  return (
    <div className="dl-stack">
      {notice && (
        <div role="alert" className={`dl-tag ${notice.type === 'ok' ? 'good' : 'bad'}`} style={{ borderRadius: 10, padding: '8px 12px' }}>
          {notice.text}
        </div>
      )}

      <section className="dl-card">
        <div className="dl-head" style={{ justifyContent: 'space-between' }}>
          <div>
            <h3 className="dl-h">Akun Pengguna</h3>
            <p className="dl-sub">{users.length} akun terdaftar. Hanya Owner yang bisa melihat halaman ini.</p>
          </div>
          <button type="button" onClick={load} disabled={loading} className="sh-btn sh-btn-outline">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Muat ulang
          </button>
        </div>

        <div className="dl-table-wrap">
          <table className="dl-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Login terakhir</th>
                <th className="r">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === selfId;
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 800, color: '#fff' }}>
                      {u.email}
                      {isSelf && <span className="dl-tag good" style={{ marginLeft: 8, padding: '1px 8px' }}>Anda</span>}
                    </td>
                    <td>
                      <select
                        className="dl-field"
                        aria-label={`Role ${u.email}`}
                        value={u.role ?? ''}
                        disabled={isSelf}
                        onChange={(e) => changeRole(u, e.target.value as AppRole)}
                        style={{ padding: '6px 10px', minHeight: 0, fontWeight: 700 }}
                      >
                        {u.role === null && <option value="">— belum ada role —</option>}
                        {APP_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="dl-muted">{fmtDate(u.last_sign_in_at)}</td>
                    <td className="r">
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button type="button" onClick={() => resetPassword(u)} className="dl-btn">
                          <KeyRound className="w-3 h-3" style={{ display: 'inline', marginRight: 4 }} aria-hidden="true" />
                          Reset password
                        </button>
                        <button type="button" onClick={() => remove(u)} disabled={isSelf} className="dl-btn" style={{ borderColor: '#ef4444', color: '#f87171' }}>
                          <Trash2 className="w-3 h-3" style={{ display: 'inline', marginRight: 4 }} aria-hidden="true" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#737373', padding: 24 }}>
                    Belum ada akun.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dl-card">
        <div className="dl-head">
          <h3 className="dl-h flex items-center gap-2">
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            Tambah Akun
          </h3>
        </div>
        <form onSubmit={create} className="dl-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label>
            <span className="dl-lbl" style={{ display: 'block', marginBottom: 6 }}>Email</span>
            <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="dl-field" style={{ width: '100%' }} />
          </label>
          <label>
            <span className="dl-lbl" style={{ display: 'block', marginBottom: 6 }}>Password awal</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="dl-field"
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <span className="dl-lbl" style={{ display: 'block', marginBottom: 6 }}>Role</span>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as AppRole)} className="dl-field" style={{ width: '100%' }}>
              {APP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <div>
            <button type="submit" className="sh-btn sh-btn-solid">
              Buat akun
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
