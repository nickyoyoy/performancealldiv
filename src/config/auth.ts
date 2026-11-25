import type { AppSession } from '../services/auth';

/**
 * Saklar login aplikasi.
 * false = login DIMATIKAN SEMENTARA: semua orang masuk sebagai Owner dan API data tidak butuh token.
 * true  = login aktif lagi (halaman login + pengecekan token di API).
 * Harus diubah juga di api/raw-sheet.js dan api/snapshot.js.
 */
export const AUTH_ENABLED = false;

export const GUEST_SESSION: AppSession = {
  accessToken: '',
  refreshToken: '',
  expiresAt: Number.MAX_SAFE_INTEGER,
  email: 'akses-sementara',
  role: 'owner',
};
