import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const RAW_SPREADSHEET_ID = '1fGXGUmm5Ask-Iw9tQRUmqKIp8Z6dNvS3-9e8SxVR1LE';
const ALLOWED_SHEETS = new Set(['ADS Tiktok', 'Shopee JAN 26', 'Ads Shopee']);

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
            if (!ALLOWED_SHEETS.has(sheet)) {
              res.statusCode = 400;
              res.end('Sheet not allowed');
              return;
            }
            const SHEET_GIDS: Record<string, string> = {
              'ADS Tiktok': '906647422',
            };
            const targetUrl = SHEET_GIDS[sheet]
              ? `https://docs.google.com/spreadsheets/d/${RAW_SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GIDS[sheet]}`
              : `https://docs.google.com/spreadsheets/d/${RAW_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&_t=${Date.now()}`;
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
