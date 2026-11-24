import React, { useState } from 'react';
import { LogOut, KeyRound, UserRound } from 'lucide-react';
import { AppSession, changePassword, logout } from '../services/auth';
import { ROLE_LABEL } from '../utils/permissions';

interface AccountSettingsProps {
  session: AppSession;
  onLogout: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ session, onLogout }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) {
      setMsg({ type: 'err', text: 'Password minimal 8 karakter.' });
      return;
    }
    if (password !== confirm) {
      setMsg({ type: 'err', text: 'Konfirmasi password tidak sama.' });
      return;
    }
    setBusy(true);
    try {
      await changePassword(password);
      setPassword('');
      setConfirm('');
      setMsg({ type: 'ok', text: 'Password berhasil diganti.' });
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Gagal mengganti password.' });
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    logout();
    onLogout();
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#127a60] border border-emerald-100 flex items-center justify-center">
            <UserRound className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-slate-900 truncate">{session.email}</h3>
            <p className="text-xs text-slate-500">Role: <b className="text-slate-800">{ROLE_LABEL[session.role]}</b></p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
        <div className="mb-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#127a60]" aria-hidden="true" />
            Ganti Password
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Minimal 8 karakter. Berlaku untuk login berikutnya.</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="block text-2xs font-semibold text-slate-600 mb-1">Password baru</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/90 text-sm focus:outline-none focus:ring-2 focus:ring-[#127a60]"
            />
          </label>
          <label className="block">
            <span className="block text-2xs font-semibold text-slate-600 mb-1">Ulangi password baru</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200/90 text-sm focus:outline-none focus:ring-2 focus:ring-[#127a60]"
            />
          </label>

          {msg && (
            <div
              role="alert"
              className={`text-xs rounded-lg px-3 py-2 border ${
                msg.type === 'ok'
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                  : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}
            >
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#127a60] hover:bg-[#0e634e] text-white font-semibold text-xs disabled:opacity-60"
          >
            {busy ? 'Menyimpan...' : 'Simpan password'}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Keluar</h3>
          <p className="text-xs text-slate-500 mt-0.5">Keluar dari akun ini di browser ini.</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          Keluar
        </button>
      </section>
    </div>
  );
};
