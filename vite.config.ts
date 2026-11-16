import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const RAW_SPREADSHEET_ID = '1fGXGUmm5Ask-Iw9tQRUmqKIp8Z6dNvS3-9e8SxVR1LE';
const ALLOWED_SHEETS = new Set(['ADS Tiktok', 'Shopee JAN 26', 'Ads Shopee']);

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'wacommerce-proxy',
      configureServer(server) {
        server.middlewares.use('/api/wacommerce', async (req, res) => {
          try {
            const subPath = (req.url || '/').replace(/^\//, '');
            const apiKey = process.env.VITE_CRM_API_KEY || '';
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ ok: false, error: 'VITE_CRM_API_KEY not configured' }));
              return;
            }
            const targetUrl = `https://dashboard.wacommerce.id/api/public/v1/${subPath}`;
            const fetchRes = await fetch(targetUrl, {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
              },
            });
            res.statusCode = fetchRes.status;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            const data = await fetchRes.text();
            res.end(data);
          } catch (err: unknown) {
            res.statusCode = 502;
            const message = err instanceof Error ? err.message : 'Failed to fetch from WACOMMERCE';
            res.end(JSON.stringify({ ok: false, error: message }));
          }
        });
      },
    },
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
            const targetUrl = `https://docs.google.com/spreadsheets/d/${RAW_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&_t=${Date.now()}`;
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
