import Papa from 'papaparse';
import { AdsRow, RawData, ShopeeRow, TikTokRow } from '../utils/liveHostEngine';

const RAW_SPREADSHEET_ID = '1fGXGUmm5Ask-Iw9tQRUmqKIp8Z6dNvS3-9e8SxVR1LE';

function parseNum(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val !== 'string') return 0;
  const cleaned = val.replace(/Rp/gi, '').replace(/,/g, '').replace(/\s+/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseCsvRows(csvText: string): Record<string, string>[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data || [];
}

export function parseRawDataFromCsv(
  tiktokCsv: string,
  shopeeCsv: string,
  adsCsv: string
): RawData {
  const tiktokRows = parseCsvRows(tiktokCsv);
  const shopeeRows = parseCsvRows(shopeeCsv);
  const adsRows = parseCsvRows(adsCsv);

  const tiktok: TikTokRow[] = tiktokRows.map((r) => ({
    host: (r['Nama Host'] || '').trim(),
    month: (r['Bulan'] || '').trim(),
    omzet: parseNum(r['Pendapatan kotor']),
    biaya: parseNum(r['Biaya']),
  }));

  const shopee: ShopeeRow[] = shopeeRows.map((r) => ({
    host: (r['Nama Host'] || '').trim(),
    month: (r['Bulan'] || '').trim(),
    omzet: parseNum(r['Penjualan(Pesanan Siap Dikirim)']),
  }));

  const ads: AdsRow[] = adsRows.map((r) => ({
    marketplace: (r['Marketplace'] || '').trim(),
    month: (r['Bulan'] || '').trim(),
    nominal: parseNum(r['Nominal']),
  }));

  return { tiktok, shopee, ads };
}

async function fetchSheetText(
  sheetName: string,
  localPath: string,
  preferLive: boolean
): Promise<{ text: string; source: 'live' | 'snapshot' }> {
  if (preferLive) {
    const urls = [
      `/api/raw-sheet?sheet=${encodeURIComponent(sheetName)}&_t=${Date.now()}`,
      `https://docs.google.com/spreadsheets/d/${RAW_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&_t=${Date.now()}`,
    ];
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        clearTimeout(tid);
        if (res.ok) {
          const text = await res.text();
          if (text && !text.trim().startsWith('<')) {
            return { text, source: 'live' };
          }
        }
      } catch {
        // try next source
      }
    }
  }

  const res = await fetch(localPath);
  if (!res.ok) {
    throw new Error(`Gagal memuat data ${sheetName} (${res.status})`);
  }
  return { text: await res.text(), source: 'snapshot' };
}

export interface LiveHostFetchResult {
  rawData: RawData;
  sourceMode: 'live' | 'snapshot';
  fetchedAt: string;
}

export async function fetchLiveHostRawData(preferLive = false): Promise<LiveHostFetchResult> {
  const [ttRes, spRes, adsRes] = await Promise.all([
    fetchSheetText('ADS Tiktok', '/data/ADS_Tiktok.csv', preferLive),
    fetchSheetText('Shopee JAN 26', '/data/Shopee_JAN_26.csv', preferLive),
    fetchSheetText('Ads Shopee', '/data/Ads_Shopee.csv', preferLive),
  ]);

  const rawData = parseRawDataFromCsv(ttRes.text, spRes.text, adsRes.text);
  const allLive =
    ttRes.source === 'live' && spRes.source === 'live' && adsRes.source === 'live';

  return {
    rawData,
    sourceMode: allLive ? 'live' : 'snapshot',
    fetchedAt: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}

