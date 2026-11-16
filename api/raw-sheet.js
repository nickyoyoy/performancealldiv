const RAW_SPREADSHEET_ID = '1fGXGUmm5Ask-Iw9tQRUmqKIp8Z6dNvS3-9e8SxVR1LE';
const ALLOWED_SHEETS = new Set(['ADS Tiktok', 'Shopee JAN 26', 'Ads Shopee']);

export default async function handler(req, res) {
  try {
    const { sheet } = req.query || {};

    if (!sheet || !ALLOWED_SHEETS.has(sheet)) {
      res.statusCode = 400;
      return res.end('Sheet not allowed');
    }

    const targetUrl = `https://docs.google.com/spreadsheets/d/${RAW_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
      sheet
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
