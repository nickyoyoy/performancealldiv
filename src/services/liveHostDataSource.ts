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
const SUPABASE_TIKTOK_TABLE =
  import.meta.env.VITE_SUPABASE_TIKTOK_TABLE || 'tiktok_live';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function reportMonthToName(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return MONTH_NAMES[d.getUTCMonth()] || '';
}

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

/**
 * Fetch live TikTok rows directly from Supabase `tiktok_live` table.
 * Automatically paginates through PostgREST 1000-row limit.
 */
export async function fetchTiktokRowsFromSupabase(): Promise<TikTokRow[] | null> {
  try {
    const pageSize = 1000;
    let offset = 0;
    interface SupabaseTiktokRow {
      nama_host?: string;
      report_month?: string;
      gross_revenue?: number | null;
      gmv_attributed?: number | null;
      gmv_direct?: number | null;
      ad_spend_reported?: number | null;
    }
    const allBatches: SupabaseTiktokRow[] = [];

    while (true) {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);

      const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_TIKTOK_TABLE}?select=nama_host,report_month,gross_revenue,gmv_attributed,gmv_direct,ad_spend_reported&order=id.asc&offset=${offset}&limit=${pageSize}`;
      const res = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      clearTimeout(tid);

      if (!res.ok) {
        console.warn(`Supabase tiktok_live query returned status ${res.status}`);
        return null;
      }

      const batch = (await res.json()) as SupabaseTiktokRow[];
      if (!Array.isArray(batch) || batch.length === 0) break;
      allBatches.push(...batch);

      if (batch.length < pageSize) break;
      offset += pageSize;
    }

    if (allBatches.length === 0) return null;

    return allBatches.map((r) => {
      const month = reportMonthToName(r.report_month);
      const omzet = Number(r.gross_revenue ?? r.gmv_attributed ?? r.gmv_direct ?? 0);
      const biaya = Number(r.ad_spend_reported ?? 0);
      return {
        host: (r.nama_host || '').trim(),
        month,
        omzet,
        biaya,
      };
    });
  } catch (err) {
    console.warn('Gagal memuat TikTok live dari Supabase, fallback ke file lokal:', err);
    return null;
  }
}

export interface LiveHostFetchResult {
  rawData: RawData;
  sourceMode: 'live' | 'snapshot';
  fetchedAt: string;
}

export async function fetchLiveHostRawData(preferLive = false): Promise<LiveHostFetchResult> {
  const [ttRes, adsRes, supabaseShopeeRows, supabaseTiktokRows] = await Promise.all([
    fetchSheetText('ADS Tiktok', '/data/ADS_Tiktok.csv', preferLive),
    fetchSheetText('Ads Shopee', '/data/Ads_Shopee.csv', preferLive),
    fetchShopeeRowsFromSupabase(),
    fetchTiktokRowsFromSupabase(),
  ]);

  // 1. Process Shopee Rows
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

  // 2. Process TikTok Rows
  const csvTiktokRows = parseCsvRows(ttRes.text);
  const adsBiayaMap = new Map<string, number>(); // key: `${host}|${month}` => biaya
  for (const r of csvTiktokRows) {
    const host = (r['Nama Host'] || '').trim().toUpperCase();
    const month = (r['Bulan'] || '').trim();
    const biaya = parseNum(r['Biaya']);
    if (host && month && biaya > 0) {
      const key = `${host}|${month}`;
      adsBiayaMap.set(key, (adsBiayaMap.get(key) || 0) + biaya);
    }
  }

  let tiktok: TikTokRow[] = [];
  let tiktokSource: 'live' | 'snapshot' = 'snapshot';

  if (supabaseTiktokRows && supabaseTiktokRows.length > 0) {
    tiktok = supabaseTiktokRows.map((r) => {
      let finalBiaya = r.biaya;
      // Supplement ad spend from ADS_Tiktok if available and reported is 0
      if (finalBiaya === 0) {
        const key = `${r.host.toUpperCase()}|${r.month}`;
        finalBiaya = adsBiayaMap.get(key) || 0;
      }
      return {
        ...r,
        biaya: finalBiaya,
      };
    });
    tiktokSource = 'live';
  } else {
    tiktok = csvTiktokRows.map((r) => ({
      host: (r['Nama Host'] || '').trim(),
      month: (r['Bulan'] || '').trim(),
      omzet: parseNum(r['Pendapatan kotor']),
      biaya: parseNum(r['Biaya']),
    }));
    tiktokSource = ttRes.source;
  }

  // 3. Process Ads Rows
  const adsRows = parseCsvRows(adsRes.text);
  const ads: AdsRow[] = adsRows.map((r) => ({
    marketplace: (r['Marketplace'] || '').trim(),
    month: (r['Bulan'] || '').trim(),
    nominal: parseNum(r['Nominal']),
  }));

  const rawData: RawData = { tiktok, shopee, ads };
  const isAllLive = shopeeSource === 'live' && tiktokSource === 'live';

  return {
    rawData,
    sourceMode: isAllLive ? 'live' : 'snapshot',
    fetchedAt: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}
