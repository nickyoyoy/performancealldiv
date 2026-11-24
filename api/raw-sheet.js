const NEW_SPREADSHEET_ID = '18djB-SiIrUL2HhXcC35HTmc9oCKkLoWPqe2kklf8S2M';
const LEGACY_SPREADSHEET_ID = '1fGXGUmm5Ask-Iw9tQRUmqKIp8Z6dNvS3-9e8SxVR1LE';

const SHEET_ROUTES = {
  '03_DATABASE_LIVE': { id: NEW_SPREADSHEET_ID, gid: '57956472' },
  '09_ADS_TIKTOK': { id: NEW_SPREADSHEET_ID, gid: '1140318085' },
  '10_ADS_SHOPEE': { id: NEW_SPREADSHEET_ID, gid: '272235882' },
  'RAW ADS TT': { id: NEW_SPREADSHEET_ID, gid: '1416190141' },
  '04_MASTER_TARGET': { id: NEW_SPREADSHEET_ID, gid: '1495963472' },
  // Legacy routes kept for Jan-Sep historical fallback
  'ADS Tiktok': { id: NEW_SPREADSHEET_ID, gid: '1416190141' },
  'Ads Shopee': { id: LEGACY_SPREADSHEET_ID, sheet: 'Ads Shopee' },
  'Shopee JAN 26': { id: LEGACY_SPREADSHEET_ID, sheet: 'Shopee JAN 26' },
};

export default async function handler(req, res) {
  try {
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
