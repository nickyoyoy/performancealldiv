/**
 * Login memakai Supabase Auth (email + password).
 * Role diambil dari `app_metadata.role` di user Supabase dan hanya bisa diubah lewat dashboard/service role.
 */

export type AppRole = 'owner' | 'admin' | 'finance' | 'live_team';

export const APP_ROLES: AppRole[] = ['owner', 'admin', 'finance', 'live_team'];

export interface AppSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  email: string;
  role: AppRole;
}

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://pkcjdhxwyjgldkciplvs.supabase.co';
export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'sb_publishable_LWWe_L1vDv-DCAL-NeYmcQ_nz0chcUE';

const STORAGE_KEY = 'scentplus_app_session_v1';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { email?: string; app_metadata?: { role?: string } };
}

export function toRole(raw: unknown): AppRole | null {
  return typeof raw === 'string' && (APP_ROLES as string[]).includes(raw) ? (raw as AppRole) : null;
}

function toSession(data: TokenResponse): AppSession | null {
  const role = toRole(data.user?.app_metadata?.role);
  if (!role) return null; // akun tanpa role tidak boleh masuk
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    email: data.user.email ?? '',
    role,
  };
}

function saveSession(s: AppSession | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export async function login(email: string, password: string): Promise<AppSession> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Email atau password salah.');
  const session = toSession((await res.json()) as TokenResponse);
  if (!session) throw new Error('Akun ini belum punya role. Hubungi Owner.');
  saveSession(session);
  return session;
}

async function refresh(s: AppSession): Promise<AppSession | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: s.refreshToken }),
  });
  if (!res.ok) return null;
  const next = toSession((await res.json()) as TokenResponse);
  saveSession(next);
  return next;
}

/** Session aktif; memperbarui token bila hampir kedaluwarsa. */
export async function getSession(): Promise<AppSession | null> {
  let s: AppSession | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) s = JSON.parse(raw) as AppSession;
  } catch {
    s = null;
  }
  if (!s) return null;
  if (s.expiresAt - Date.now() < 60_000) return refresh(s);
  return s;
}

/** Versi sinkron untuk render awal. Token tetap diverifikasi server saat data diambil. */
export function readSessionSync(): AppSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppSession) : null;
  } catch {
    return null;
  }
}

export function logout() {
  saveSession(null);
}

/** Ganti password akun yang sedang login. */
export async function changePassword(newPassword: string): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error('Sesi tidak ditemukan. Silakan masuk lagi.');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: newPassword }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail.includes('weak') ? 'Password terlalu lemah.' : 'Gagal mengganti password. Coba masuk ulang.');
  }
}

export function getAccessToken(): string | null {
  return readSessionSync()?.accessToken ?? null;
}
