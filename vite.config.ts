import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const NEW_SPREADSHEET_ID = '18djB-SiIrUL2HhXcC35HTmc9oCKkLoWPqe2kklf8S2M';
const LEGACY_SPREADSHEET_ID = '1fGXGUmm5Ask-Iw9tQRUmqKIp8Z6dNvS3-9e8SxVR1LE';

const SHEET_ROUTES: Record<string, { id: string; gid?: string; sheet?: string }> = {
  '03_DATABASE_LIVE': { id: NEW_SPREADSHEET_ID, gid: '57956472' },
  '09_ADS_TIKTOK': { id: NEW_SPREADSHEET_ID, gid: '1140318085' },
  '10_ADS_SHOPEE': { id: NEW_SPREADSHEET_ID, gid: '272235882' },
  'RAW ADS TT': { id: NEW_SPREADSHEET_ID, gid: '1416190141' },
  '04_MASTER_TARGET': { id: NEW_SPREADSHEET_ID, gid: '1495963472' },
  'ADS Tiktok': { id: NEW_SPREADSHEET_ID, gid: '1416190141' },
  'Ads Shopee': { id: LEGACY_SPREADSHEET_ID, sheet: 'Ads Shopee' },
  'Shopee JAN 26': { id: LEGACY_SPREADSHEET_ID, sheet: 'Shopee JAN 26' },
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'google-sheets-proxy',
      configureServer(server) {
        server.middlewares.use('/api/raw-sheet', async (req, res) => {
          try {
            const url = new URL(req.url || '/', 'http://localhost');
            const sheet = url.searchParams.get('sheet') || '';
            const route = SHEET_ROUTES[sheet];
            if (!route) {
              res.statusCode = 400;
              res.end('Sheet not allowed');
              return;
            }
            const targetUrl = route.gid
              ? `https://docs.google.com/spreadsheets/d/${route.id}/export?format=csv&gid=${route.gid}`
              : `https://docs.google.com/spreadsheets/d/${route.id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
                  route.sheet || sheet
                )}&_t=${Date.now()}`;
            const fetchRes = await fetch(targetUrl, {
              redirect: 'follow',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                Pragma: 'no-cache',
              },
            });
            if (!fetchRes.ok) {
              res.statusCode = fetchRes.status;
              res.end(`Google Sheets fetch failed with status ${fetchRes.status}`);
              return;
            }
            const csv = await fetchRes.text();
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.end(csv);
          } catch (err: unknown) {
            res.statusCode = 502;
            const message = err instanceof Error ? err.message : 'Failed to fetch spreadsheet';
            res.end(`Proxy error: ${message}`);
          }
        });
      },
    },
  ],
  server: {
    port: 3000,
    host: true,
  },
});
