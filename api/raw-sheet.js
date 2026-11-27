const NEW_SPREADSHEET_ID = '18djB-SiIrUL2HhXcC35HTmc9oCKkLoWPqe2kklf8S2M';

const SHEET_ROUTES = {
  '03_DATABASE_LIVE': { id: NEW_SPREADSHEET_ID, gid: '57956472' },
  '09_ADS_TIKTOK': { id: NEW_SPREADSHEET_ID, gid: '1140318085' },
  '10_ADS_SHOPEE': { id: NEW_SPREADSHEET_ID, gid: '272235882' },
  'RAW ADS TT': { id: NEW_SPREADSHEET_ID, gid: '1416190141' },
  '04_MASTER_TARGET': { id: NEW_SPREADSHEET_ID, gid: '1495963472' },
  '11_CAMPAIGN_CALENDAR': { id: NEW_SPREADSHEET_ID, gid: '127184724' },
};

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pkcjdhxwyjgldkciplvs.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LWWe_L1vDv-DCAL-NeYmcQ_nz0chcUE';
const ALLOWED_ROLES = ['owner', 'admin', 'finance', 'live_team'];
// Harus sama dengan AUTH_ENABLED di src/config/auth.ts. false = login dimatikan sementara.
const AUTH_ENABLED = false;

/** Verifikasi token Supabase dan pastikan user punya role aplikasi. */
async function requireRole(req) {
  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const user = await r.json();
    const role = user?.app_metadata?.role;
    return ALLOWED_ROLES.includes(role) ? role : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const role = AUTH_ENABLED ? await requireRole(req) : 'owner';
    if (!role) {
      res.statusCode = 401;
      return res.end('Unauthorized');
    }

    const { sheet } = req.query || {};
    const route = sheet ? SHEET_ROUTES[sheet] : null;

    if (!route) {
      res.statusCode = 400;
      return res.end('Sheet not allowed');
    }

    const targetUrl = route.gid
      ? `https://docs.google.com/spreadsheets/d/${route.id}/export?format=csv&gid=${route.gid}`
      : `https://docs.google.com/spreadsheets/d/${route.id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
          route.sheet
        )}&_t=${Date.now()}`;

    const fetchRes = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!fetchRes.ok) {
      res.statusCode = fetchRes.status;
      return res.end(`Google Sheets responded with status ${fetchRes.status}`);
    }

    const text = await fetchRes.text();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.end(text);
  } catch (err) {
    res.statusCode = 502;
    return res.end(err && err.message ? err.message : 'Failed to fetch spreadsheet');
  }
}
