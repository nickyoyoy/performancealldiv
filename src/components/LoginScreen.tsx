import React, { useState } from 'react';
import { login, AppSession } from '../services/auth';

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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200/80 shadow-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#127a60] text-white font-bold flex items-center justify-center">S+</div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm">Scentplus Live Host</h1>
            <p className="text-2xs text-slate-500">Masuk dengan akun yang sudah diberi role</p>
          </div>
        </div>

        <label className="block">
          <span className="block text-2xs font-semibold text-slate-600 mb-1">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200/90 text-sm focus:outline-none focus:ring-2 focus:ring-[#127a60]"
          />
        </label>

        <label className="block">
          <span className="block text-2xs font-semibold text-slate-600 mb-1">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200/90 text-sm focus:outline-none focus:ring-2 focus:ring-[#127a60]"
          />
        </label>

        {error && (
          <div role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-xl bg-[#127a60] hover:bg-[#0e634e] text-white font-semibold text-sm disabled:opacity-60"
        >
          {busy ? 'Memeriksa...' : 'Masuk'}
        </button>
      </form>
    </div>
  );
};
