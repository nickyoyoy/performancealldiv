/**
 * Manajemen akun khusus Owner.
 * Service role key HANYA dibaca dari env server (SUPABASE_SERVICE_ROLE_KEY) dan tidak pernah dikirim ke browser.
 *
 * GET    -> daftar akun
 * POST   -> buat akun { email, password, role }
 * PATCH  -> ubah role / password { id, role?, password? }
 * DELETE -> hapus akun { id }   (atau ?id=...)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pkcjdhxwyjgldkciplvs.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LWWe_L1vDv-DCAL-NeYmcQ_nz0chcUE';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ROLES = ['owner', 'admin', 'finance', 'live_team'];

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function getCaller(req) {
  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return { id: u.id, email: u.email, role: u.app_metadata?.role ?? null };
}

async function admin(path, { method = 'GET', body } = {}) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: r.ok, status: r.status, data };
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      return {};
    }
  }
  return {};
}

const toRow = (u) => ({
  id: u.id,
  email: u.email,
  role: u.app_metadata?.role ?? null,
  created_at: u.created_at,
  last_sign_in_at: u.last_sign_in_at ?? null,
  banned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
});

export default async function handler(req, res) {
  try {
    if (!SERVICE_KEY) return send(res, 500, { error: 'Server belum punya SUPABASE_SERVICE_ROLE_KEY.' });

    const caller = await getCaller(req);
    if (!caller) return send(res, 401, { error: 'Sesi tidak valid. Silakan masuk lagi.' });
    if (caller.role !== 'owner') return send(res, 403, { error: 'Hanya Owner yang boleh mengelola akun.' });

    const body = readBody(req);
    const url = new URL(req.url || '/', 'http://local');
    const queryId = url.searchParams.get('id');

    if (req.method === 'GET') {
      const r = await admin('/admin/users?per_page=200');
      if (!r.ok) return send(res, 502, { error: 'Gagal memuat daftar akun.' });
      const users = (r.data?.users ?? []).map(toRow).sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      return send(res, 200, { users, self: caller.id });
    }

    if (req.method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const role = String(body.role || '');
      if (!email.includes('@')) return send(res, 400, { error: 'Email tidak valid.' });
      if (password.length < 8) return send(res, 400, { error: 'Password minimal 8 karakter.' });
      if (!ROLES.includes(role)) return send(res, 400, { error: 'Role tidak dikenal.' });

      const r = await admin('/admin/users', {
        method: 'POST',
        body: { email, password, email_confirm: true, app_metadata: { role } },
      });
      if (!r.ok) {
        const msg = JSON.stringify(r.data || '');
        return send(res, 400, { error: msg.includes('already') ? 'Email sudah terdaftar.' : 'Gagal membuat akun.' });
      }
      return send(res, 201, { user: toRow(r.data) });
    }

    if (req.method === 'PATCH') {
      const id = String(body.id || queryId || '');
      if (!id) return send(res, 400, { error: 'ID akun wajib diisi.' });

      const current = await admin(`/admin/users/${encodeURIComponent(id)}`);
      if (!current.ok) return send(res, 404, { error: 'Akun tidak ditemukan.' });

      const payload = {};
      if (body.role !== undefined) {
        const role = String(body.role);
        if (!ROLES.includes(role)) return send(res, 400, { error: 'Role tidak dikenal.' });
        if (id === caller.id && role !== 'owner') {
          return send(res, 400, { error: 'Tidak bisa menurunkan role akun sendiri.' });
        }
        // Gabungkan dengan app_metadata yang ada agar metadata lain tidak hilang.
        payload.app_metadata = { ...(current.data?.app_metadata || {}), role };
      }
      if (body.password !== undefined && body.password !== '') {
        const password = String(body.password);
        if (password.length < 8) return send(res, 400, { error: 'Password minimal 8 karakter.' });
        payload.password = password;
      }
      if (Object.keys(payload).length === 0) return send(res, 400, { error: 'Tidak ada perubahan.' });

      const r = await admin(`/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });
      if (!r.ok) return send(res, 400, { error: 'Gagal menyimpan perubahan.' });
      return send(res, 200, { user: toRow(r.data) });
    }

    if (req.method === 'DELETE') {
      const id = String(body.id || queryId || '');
      if (!id) return send(res, 400, { error: 'ID akun wajib diisi.' });
      if (id === caller.id) return send(res, 400, { error: 'Tidak bisa menghapus akun sendiri.' });

      const r = await admin(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!r.ok) return send(res, 400, { error: 'Gagal menghapus akun.' });
      return send(res, 200, { ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return send(res, 405, { error: 'Method tidak diizinkan.' });
  } catch {
    return send(res, 500, { error: 'Terjadi kesalahan di server.' });
  }
}
