import React, { useState } from 'react';
import { login, AppSession } from '../services/auth';
import '../styles/shell.css';
import '../styles/dashboard-live.css';

interface LoginScreenProps {
  onLogin: (s: AppSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onLogin(await login(email.trim(), password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sh-root" style={{ alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={submit} className="dl-card" style={{ width: '100%', maxWidth: 380 }}>
        <div className="dl-body dl-stack-tight" style={{ padding: 24, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo-scentplus.jpg" alt="Logo Scentplus" className="sh-logo sh-logo-img" />
            <div>
              <h1 className="dl-h">Scentplus Live Host</h1>
              <p className="dl-sub">Masuk dengan akun yang sudah diberi role</p>
            </div>
          </div>

          <label>
            <span className="dl-lbl" style={{ display: 'block', marginBottom: 6 }}>Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="dl-field"
              style={{ width: '100%' }}
            />
          </label>

          <label>
            <span className="dl-lbl" style={{ display: 'block', marginBottom: 6 }}>Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="dl-field"
              style={{ width: '100%' }}
            />
          </label>

          {error && (
            <div role="alert" className="dl-tag bad" style={{ borderRadius: 10, padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy} className="sh-btn sh-btn-solid" style={{ justifyContent: 'center' }}>
            {busy ? 'Memeriksa...' : 'Masuk'}
          </button>
        </div>
      </form>
    </div>
  );
};
