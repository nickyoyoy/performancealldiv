import { readFileSync } from 'node:fs';

/**
 * Fallback snapshot CSV, hanya untuk user yang sudah login dengan role valid.
 * File disimpan di folder snapshot/ (bukan public/), sehingga tidak bisa diunduh langsung.
 */
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pkcjdhxwyjgldkciplvs.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LWWe_L1vDv-DCAL-NeYmcQ_nz0chcUE';
const ALLOWED_ROLES = ['owner', 'admin', 'finance', 'live_team'];
const ALLOWED_FILES = new Set([
  '03_DATABASE_LIVE.csv',
  '04_MASTER_TARGET.csv',
  '09_ADS_TIKTOK.csv',
  '10_ADS_SHOPEE.csv',
  'RAW_ADS_TT.csv',
  'Shopee_JAN_26.csv',
]);

async function hasRole(req) {
  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return false;
    const user = await r.json();
    return ALLOWED_ROLES.includes(user?.app_metadata?.role);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  try {
    if (!(await hasRole(req))) {
      res.statusCode = 401;
      return res.end('Unauthorized');
    }
    const url = new URL(req.url || '/', 'http://local');
    const file = url.searchParams.get('file') || '';
    if (!ALLOWED_FILES.has(file)) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    const text = readFileSync(new URL(`../snapshot/${file}`, import.meta.url), 'utf8');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.end(text);
  } catch {
    res.statusCode = 500;
    return res.end('Gagal memuat snapshot.');
  }
}
