import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, UserPlus, Trash2, KeyRound } from 'lucide-react';
import { APP_ROLES, AppRole, getAccessToken } from '../services/auth';
import { ROLE_LABEL } from '../utils/permissions';

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
    <div className="space-y-4">
      {notice && (
        <div
          role="alert"
          className={`text-xs rounded-lg px-3 py-2 border ${
            notice.type === 'ok'
              ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
              : 'text-rose-700 bg-rose-50 border-rose-200'
          }`}
        >
          {notice.text}
        </div>
      )}

      <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Akun Pengguna</h3>
            <p className="text-xs text-slate-500 mt-0.5">{users.length} akun terdaftar. Hanya Owner yang bisa melihat halaman ini.</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Muat ulang
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200/70 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-slate-500 text-2xs uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Login terakhir</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSelf = u.id === selfId;
                return (
                  <tr key={u.id}>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {u.email}
                      {isSelf && <span className="ml-2 text-2xs text-emerald-700 font-semibold">(Anda)</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        aria-label={`Role ${u.email}`}
                        value={u.role ?? ''}
                        disabled={isSelf}
                        onChange={(e) => changeRole(u, e.target.value as AppRole)}
                        className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold disabled:opacity-60"
                      >
                        {u.role === null && <option value="">— belum ada role —</option>}
                        {APP_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 tabular-nums text-slate-600">{fmtDate(u.last_sign_in_at)}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => resetPassword(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold"
                        >
                          <KeyRound className="w-3 h-3" aria-hidden="true" />
                          Reset password
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(u)}
                          disabled={isSelf}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold disabled:opacity-40"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    Belum ada akun.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-[#127a60]" aria-hidden="true" />
          Tambah Akun
        </h3>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="block md:col-span-1">
            <span className="block text-2xs font-semibold text-slate-600 mb-1">Email</span>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/90 text-sm focus:outline-none focus:ring-2 focus:ring-[#127a60]"
            />
          </label>
          <label className="block">
            <span className="block text-2xs font-semibold text-slate-600 mb-1">Password awal</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/90 text-sm focus:outline-none focus:ring-2 focus:ring-[#127a60]"
            />
          </label>
          <label className="block">
            <span className="block text-2xs font-semibold text-slate-600 mb-1">Role</span>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AppRole)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/90 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#127a60]"
            >
              {APP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#127a60] hover:bg-[#0e634e] text-white font-semibold text-xs"
          >
            Buat akun
          </button>
        </form>
      </section>
    </div>
  );
};
