import Papa from 'papaparse';
import { AdsRow, RawData, ShopeeRow, TikTokRow } from '../utils/liveHostEngine';

const RAW_SPREADSHEET_ID = '1fGXGUmm5Ask-Iw9tQRUmqKIp8Z6dNvS3-9e8SxVR1LE';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://pkcjdhxwyjgldkciplvs.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_LWWe_L1vDv-DCAL-NeYmcQ_nz0chcUE';
const SUPABASE_SHOPEE_TABLE =
  import.meta.env.VITE_SUPABASE_SHOPEE_TABLE || 'shopee_live';

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

/**
 * Fetch live Shopee rows directly from Supabase `shopee_live` table.
 * Automatically paginates through PostgREST 1000-row limit.
 */
export async function fetchShopeeRowsFromSupabase(): Promise<ShopeeRow[] | null> {
  try {
    const pageSize = 1000;
    let offset = 0;
    interface SupabaseShopeeRow {
      nama_host?: string;
      bulan?: string;
      penjualan_pesanan_siap_dikirim?: number | string | null;
    }
    const allBatches: SupabaseShopeeRow[] = [];

    while (true) {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);

      const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_SHOPEE_TABLE}?select=nama_host,bulan,penjualan_pesanan_siap_dikirim&order=id.asc&offset=${offset}&limit=${pageSize}`;
      const res = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      clearTimeout(tid);

      if (!res.ok) {
        console.warn(`Supabase shopee_live query returned status ${res.status}`);
        return null;
      }

      const batch = (await res.json()) as SupabaseShopeeRow[];
      if (!Array.isArray(batch) || batch.length === 0) break;
      allBatches.push(...batch);

      if (batch.length < pageSize) break;
      offset += pageSize;
    }

    if (allBatches.length === 0) return null;

    return allBatches.map((r) => ({
      host: (r.nama_host || '').trim(),
      month: (r.bulan || '').trim(),
      omzet: Number(r.penjualan_pesanan_siap_dikirim) || 0,
    }));
  } catch (err) {
    console.warn('Gagal memuat Shopee live dari Supabase, fallback ke file lokal:', err);
    return null;
  }
}

export interface LiveHostFetchResult {
  rawData: RawData;
  sourceMode: 'live' | 'snapshot';
  fetchedAt: string;
}

export async function fetchLiveHostRawData(preferLive = false): Promise<LiveHostFetchResult> {
  const [ttRes, adsRes, supabaseShopeeRows] = await Promise.all([
    fetchSheetText('ADS Tiktok', '/data/ADS_Tiktok.csv', preferLive),
    fetchSheetText('Ads Shopee', '/data/Ads_Shopee.csv', preferLive),
    fetchShopeeRowsFromSupabase(),
  ]);

  let shopee: ShopeeRow[] = [];
  let shopeeSource: 'live' | 'snapshot' = 'snapshot';

  if (supabaseShopeeRows && supabaseShopeeRows.length > 0) {
    shopee = supabaseShopeeRows;
    shopeeSource = 'live';
  } else {
    // Fallback to local CSV snapshot
    const spRes = await fetchSheetText('Shopee JAN 26', '/data/Shopee_JAN_26.csv', preferLive);
    shopee = parseCsvRows(spRes.text).map((r) => ({
      host: (r['Nama Host'] || '').trim(),
      month: (r['Bulan'] || '').trim(),
      omzet: parseNum(r['Penjualan(Pesanan Siap Dikirim)']),
    }));
    shopeeSource = spRes.source;
  }

  const tiktokRows = parseCsvRows(ttRes.text);
  const adsRows = parseCsvRows(adsRes.text);

  const tiktok: TikTokRow[] = tiktokRows.map((r) => ({
    host: (r['Nama Host'] || '').trim(),
    month: (r['Bulan'] || '').trim(),
    omzet: parseNum(r['Pendapatan kotor']),
    biaya: parseNum(r['Biaya']),
  }));

  const ads: AdsRow[] = adsRows.map((r) => ({
    marketplace: (r['Marketplace'] || '').trim(),
    month: (r['Bulan'] || '').trim(),
    nominal: parseNum(r['Nominal']),
  }));

  const rawData: RawData = { tiktok, shopee, ads };

  return {
    rawData,
    sourceMode: shopeeSource === 'live' ? 'live' : 'snapshot',
    fetchedAt: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}
