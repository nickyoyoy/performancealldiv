import React, { useState } from 'react';
import { LogOut, KeyRound, UserRound } from 'lucide-react';
import { AppSession, changePassword, logout } from '../services/auth';
import { ROLE_LABEL } from '../utils/permissions';
import { AUTH_ENABLED } from '../config/auth';
import '../styles/dashboard-live.css';

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
    <div className="dl-stack" style={{ maxWidth: 680 }}>
      <section className="dl-card">
        <div className="dl-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="dl-ico" style={{ width: 44, height: 44, borderRadius: 14 }}>
            <UserRound className="w-5 h-5" aria-hidden="true" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 className="dl-h" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.email}</h3>
            <p className="dl-sub">
              Role: <b style={{ color: '#fff' }}>{ROLE_LABEL[session.role]}</b>
            </p>
          </div>
        </div>
      </section>

      <section className="dl-card">
        <div className="dl-head">
          <div>
            <h3 className="dl-h flex items-center gap-2">
              <KeyRound className="w-4 h-4" aria-hidden="true" />
              Ganti Password
            </h3>
            <p className="dl-sub">Minimal 8 karakter. Berlaku untuk login berikutnya.</p>
          </div>
        </div>

        <form onSubmit={submit} className="dl-body dl-stack-tight">
          <label>
            <span className="dl-lbl" style={{ display: 'block', marginBottom: 6 }}>Password baru</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="dl-field"
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <span className="dl-lbl" style={{ display: 'block', marginBottom: 6 }}>Ulangi password baru</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="dl-field"
              style={{ width: '100%' }}
            />
          </label>

          {msg && (
            <div role="alert" className={`dl-tag ${msg.type === 'ok' ? 'good' : 'bad'}`} style={{ borderRadius: 10, padding: '8px 12px' }}>
              {msg.text}
            </div>
          )}

          <div>
            <button type="submit" disabled={busy} className="sh-btn sh-btn-solid">
              {busy ? 'Menyimpan...' : 'Simpan password'}
            </button>
          </div>
        </form>
      </section>

      {AUTH_ENABLED && (
      <section className="dl-card">
        <div className="dl-body dl-label-row">
          <div>
            <h3 className="dl-h">Keluar</h3>
            <p className="dl-sub">Keluar dari akun ini di browser ini.</p>
          </div>
          <button type="button" onClick={signOut} className="sh-btn sh-btn-outline">
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Keluar
          </button>
        </div>
      </section>
      )}
    </div>
  );
};
