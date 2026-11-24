import Papa from 'papaparse';
import {
  AdsRow,
  AttendanceInput,
  MONTHS,
  MonthName,
  RawData,
  ShopeeRow,
  TikTokRow,
} from '../utils/liveHostEngine';

export const NEW_SPREADSHEET_ID = '18djB-SiIrUL2HhXcC35HTmc9oCKkLoWPqe2kklf8S2M';

export const NEW_SHEET_GIDS = {
  DATABASE_LIVE: '57956472',
  ADS_TIKTOK: '1140318085',
  ADS_SHOPEE: '272235882',
  RAW_ADS_TT: '1416190141',
  MASTER_TARGET: '1495963472',
} as const;

const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://pkcjdhxwyjgldkciplvs.supabase.co';
const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_LWWe_L1vDv-DCAL-NeYmcQ_nz0chcUE';
const SUPABASE_SHOPEE_TABLE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_SHOPEE_TABLE) ||
  'shopee_live';

const MONTH_TOKEN_MAP: Record<string, MonthName> = {
  jan: 'January',
  january: 'January',
  januari: 'January',
  feb: 'February',
  february: 'February',
  februari: 'February',
  mar: 'March',
  march: 'March',
  maret: 'March',
  apr: 'April',
  april: 'April',
  may: 'May',
  mei: 'May',
  jun: 'June',
  june: 'June',
  juni: 'June',
  jul: 'July',
  july: 'July',
  juli: 'July',
  aug: 'August',
  august: 'August',
  agu: 'August',
  ags: 'August',
  agustus: 'August',
  sep: 'September',
  sept: 'September',
  september: 'September',
  oct: 'October',
  october: 'October',
  okt: 'October',
  oktober: 'October',
  nov: 'November',
  november: 'November',
  dec: 'December',
  december: 'December',
  des: 'December',
  desember: 'December',
};

function monthNumberToName(numVal: string | number): MonthName | '' {
  const n = typeof numVal === 'number' ? numVal : Number(String(numVal).trim());
  if (!Number.isInteger(n) || n < 1 || n > 12) return '';
  return MONTHS[n - 1] || '';
}

function parseMonthFromText(raw: string): MonthName | '' {
  const text = (raw || '').trim();
  if (!text) return '';

  // Direct month name or "November 2026"
  const lower = text.toLowerCase();
  if (MONTH_TOKEN_MAP[lower]) return MONTH_TOKEN_MAP[lower];

  // ISO date: 2026-10-18 ...
  const isoMatch = text.match(/\b20\d{2}-(\d{2})\b/);
  if (isoMatch) {
    const m = monthNumberToName(isoMatch[1]);
    if (m) return m;
  }

  // Date tokens like "01/-Nov-/2026", "01-Oct-2026", "November 2026"
  const wordMatch = lower.match(/(januari|january|februari|february|maret|march|april|mei|may|juni|june|juli|july|agustus|august|september|oktober|october|november|desember|december|jan|feb|mar|apr|jun|jul|aug|agu|ags|sept|sep|oct|okt|nov|dec|des)/);
  if (wordMatch && MONTH_TOKEN_MAP[wordMatch[1]]) {
    return MONTH_TOKEN_MAP[wordMatch[1]];
  }

  return '';
}

function parseNum(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val !== 'string') return 0;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '-') return 0;
  let cleaned = trimmed.replace(/Rp/gi, '').replace(/\s+/g, '');
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/,/g, '');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '');
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseCsvMatrix(csvText: string): string[][] {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: false,
  });
  return (parsed.data || []).map((row) => (Array.isArray(row) ? row : []));
}

function parseCsvRows(csvText: string): Record<string, string>[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data || [];
}

function findHeaderRow(matrix: string[][], expectedHeader: string, fallbackIdx: number): number {
  const needle = expectedHeader.trim().toLowerCase();
  for (let i = 0; i < Math.min(15, matrix.length); i++) {
    if (matrix[i].some((c) => (c || '').trim().toLowerCase() === needle)) {
      return i;
    }
  }
  return fallbackIdx;
}

function findCol(headerRow: string[], name: string, fallbackIdx: number): number {
  const needle = name.trim().toLowerCase();
  const idx = headerRow.findIndex((c) => (c || '').trim().toLowerCase() === needle);
  return idx >= 0 ? idx : fallbackIdx;
}

export interface SheetDivisionTarget {
  divisiTikTok: number;
  divisiShopee: number;
}

interface DatabaseLiveParsed {
  tiktokOmzet: TikTokRow[];
  shopee: ShopeeRow[];
  monthsPresent: Set<MonthName>;
  attendanceByMonth: Partial<Record<MonthName, Record<string, AttendanceInput>>>;
}

function parseDatabaseLiveCsv(csvText: string): DatabaseLiveParsed {
  const matrix = parseCsvMatrix(csvText);
  const headerIdx = findHeaderRow(matrix, 'Tanggal Operasional', 3);
  const header = matrix[headerIdx] || [];

  const idxTgl = findCol(header, 'Tanggal Operasional', 0);
  const idxPlat = findCol(header, 'Platform', 2);
  const idxHost = findCol(header, 'Host', 4);
  const idxGmv = findCol(header, 'Direct GMV (Rp)', 13);
  const idxHostJadwal = findCol(header, 'Host Terjadwal', 27);
  const idxStatusHadir = findCol(header, 'Status Kehadiran Host Terjadwal', 28);
  const idxBackup = findCol(header, 'Indikator Backup', 29);

  const tiktokOmzet: TikTokRow[] = [];
  const shopee: ShopeeRow[] = [];
  const monthsPresent = new Set<MonthName>();

  type RawAttCounter = {
    hadir: number;
    backup: number;
    izin: number;
    sakit: number;
    cuti: number;
    alpa: number;
  };
  const attCounters: Partial<Record<MonthName, Record<string, RawAttCounter>>> = {};

  const ensureAtt = (month: MonthName, host: string): RawAttCounter => {
    if (!attCounters[month]) attCounters[month] = {};
    if (!attCounters[month]![host]) {
      attCounters[month]![host] = { hadir: 0, backup: 0, izin: 0, sakit: 0, cuti: 0, alpa: 0 };
    }
    return attCounters[month]![host];
  };

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length === 0) continue;

    const tgl = (row[idxTgl] || '').trim();
    if (!tgl) continue;
    // Focus on 2026 operational records
    if (/\b20\d{2}\b/.test(tgl) && !tgl.includes('2026')) continue;

    const month = parseMonthFromText(tgl);
    if (!month) continue;

    const plat = (row[idxPlat] || '').trim().toLowerCase();
    const host = (row[idxHost] || '').trim().toUpperCase();
    const gmv = parseNum(row[idxGmv]);

    if (host && (plat === 'tiktok' || plat === 'shopee')) {
      monthsPresent.add(month);
      if (plat === 'tiktok') {
        tiktokOmzet.push({ host, month, omzet: gmv, biaya: 0 });
      } else {
        shopee.push({ host, month, omzet: gmv });
      }
    }

    const hostJadwal = (row[idxHostJadwal] || '').trim().toUpperCase();
    const statusHadir = (row[idxStatusHadir] || '').trim().toLowerCase();
    if (hostJadwal && statusHadir) {
      const c = ensureAtt(month, hostJadwal);
      if (statusHadir === 'hadir') c.hadir++;
      else if (statusHadir === 'izin') c.izin++;
      else if (statusHadir === 'sakit') c.sakit++;
      else if (statusHadir === 'cuti') c.cuti++;
      else if (statusHadir === 'alpa' || statusHadir === 'alpha') c.alpa++;
    }

    const backupFlag = (row[idxBackup] || '').trim().toLowerCase();
    if (host && backupFlag === 'backup') {
      const c = ensureAtt(month, host);
      c.backup++;
    }
  }

  const attendanceByMonth: Partial<Record<MonthName, Record<string, AttendanceInput>>> = {};
  for (const [mKey, hostMap] of Object.entries(attCounters)) {
    const m = mKey as MonthName;
    attendanceByMonth[m] = {};
    for (const [host, c] of Object.entries(hostMap || {})) {
      const notes: string[] = [];
      if (c.izin > 0) notes.push(`Izin ${c.izin} shift`);
      if (c.sakit > 0) notes.push(`Sakit ${c.sakit} shift`);
      if (c.cuti > 0) notes.push(`Cuti ${c.cuti} shift`);
      if (c.alpa > 0) notes.push(`Alpa ${c.alpa} shift`);
      if (c.backup > 0) notes.push(`Backup ${c.backup} shift`);

      attendanceByMonth[m]![host] = {
        hadir: c.hadir,
        backup: c.backup,
        izin: c.izin,
        sakit: c.sakit,
        cuti: c.cuti,
        alpa: c.alpa,
        keterangan: notes.length > 0 ? notes.join(' · ') : undefined,
      };
    }
  }

  return { tiktokOmzet, shopee, monthsPresent, attendanceByMonth };
}

function parseAdsTiktokDailyCsv(csvText: string): {
  rows: TikTokRow[];
  monthsPresent: Set<MonthName>;
} {
  const matrix = parseCsvMatrix(csvText);
  const headerIdx = findHeaderRow(matrix, 'Biaya Ads Aktual (Rp)', 3);
  const header = matrix[headerIdx] || [];

  const idxTgl = findCol(header, 'Tanggal', 0);
  const idxHost = findCol(header, 'Host', 1);
  const idxBiaya = findCol(header, 'Biaya Ads Aktual (Rp)', 2);
  const idxPeriode = findCol(header, 'Periode', 3);

  const rows: TikTokRow[] = [];
  const monthsPresent = new Set<MonthName>();

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length === 0) continue;

    const host = (row[idxHost] || '').trim().toUpperCase();
    const biayaRaw = (row[idxBiaya] || '').trim();
    if (!host || !biayaRaw || biayaRaw === '-') continue;

    const periodeStr = (row[idxPeriode] || '').trim();
    const tglStr = (row[idxTgl] || '').trim();
    if (
      (periodeStr && /\b20\d{2}\b/.test(periodeStr) && !periodeStr.includes('2026')) ||
      (!periodeStr && /\b20\d{2}\b/.test(tglStr) && !tglStr.includes('2026'))
    ) {
      continue;
    }

    const month = parseMonthFromText(periodeStr) || parseMonthFromText(tglStr);
    if (!month) continue;

    const biaya = parseNum(biayaRaw);
    monthsPresent.add(month);
    rows.push({ host, month, omzet: 0, biaya });
  }

  return { rows, monthsPresent };
}

function parseRawAdsTtCsv(csvText: string): TikTokRow[] {
  const matrix = parseCsvMatrix(csvText);
  if (matrix.length < 2) return [];

  const header = matrix[0] || [];
  const idxHost = findCol(header, 'Nama Host', 4);
  const idxWaktu = findCol(header, 'Waktu peluncuran', 6);
  const idxBiaya = findCol(header, 'Biaya', 8);
  const idxOmzet = findCol(header, 'Pendapatan kotor', 12);
  const idxBulan = header.findIndex((c) => (c || '').trim().toLowerCase() === 'bulan');
  const fallbackBulanCol = idxBulan >= 0 ? idxBulan : 19;

  const out: TikTokRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length < 9) continue;

    const omzet = parseNum(row[idxOmzet]);
    const biaya = parseNum(row[idxBiaya]);
    if (omzet === 0 && biaya === 0) continue;

    const waktu = (row[idxWaktu] || '').trim();
    const bulanRaw = (row[fallbackBulanCol] || '').trim();
    const month = parseMonthFromText(waktu) || parseMonthFromText(bulanRaw);
    if (!month) continue;

    out.push({
      host: (row[idxHost] || '').trim(),
      month,
      omzet,
      biaya,
    });
  }
  return out;
}

function parseAdsShopeeNewCsv(csvText: string): Map<MonthName, number> {
  const matrix = parseCsvMatrix(csvText);
  const headerIdx = findHeaderRow(matrix, 'Total Ads Shopee Manual (Rp)', 3);
  const header = matrix[headerIdx] || [];

  const idxTahun = findCol(header, 'Tahun', 0);
  const idxBulanNum = findCol(header, 'Bulan (angka)', 1);
  const idxPeriode = findCol(header, 'Periode', 2);
  const idxAdsManual = findCol(header, 'Total Ads Shopee Manual (Rp)', 4);

  const map = new Map<MonthName, number>();
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length < 5) continue;
    const tahun = (row[idxTahun] || '').trim();
    if (tahun && tahun !== '2026') continue;

    const rawAds = (row[idxAdsManual] || '').trim();
    if (!rawAds || rawAds === '-') continue;

    const month =
      monthNumberToName(row[idxBulanNum] || '') || parseMonthFromText(row[idxPeriode] || '');
    if (!month) continue;

    map.set(month, parseNum(rawAds));
  }
  return map;
}

function parseMasterTargetCsv(
  csvText: string
): Partial<Record<MonthName, SheetDivisionTarget>> {
  const matrix = parseCsvMatrix(csvText);
  const headerIdx = findHeaderRow(matrix, 'Target TikTok Bulanan (Rp)', 3);
  const header = matrix[headerIdx] || [];

  const idxTahun = findCol(header, 'Tahun', 9);
  const idxBulan = findCol(header, 'Bulan', 10);
  const idxPeriode = findCol(header, 'Periode', 11);
  const idxTT = findCol(header, 'Target TikTok Bulanan (Rp)', 12);
  const idxSP = findCol(header, 'Target Shopee Bulanan (Rp)', 13);

  const out: Partial<Record<MonthName, SheetDivisionTarget>> = {};
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length <= idxSP) continue;
    const tahun = (row[idxTahun] || '').trim();
    if (tahun !== '2026') continue;

    const month =
      monthNumberToName(row[idxBulan] || '') || parseMonthFromText(row[idxPeriode] || '');
    if (!month) continue;

    const divisiTikTok = parseNum(row[idxTT]);
    const divisiShopee = parseNum(row[idxSP]);
    if (divisiTikTok > 0 && divisiShopee > 0) {
      out[month] = { divisiTikTok, divisiShopee };
    }
  }
  return out;
}

async function fetchSheetText(
  sheetName: string,
  localPath: string,
  preferLive: boolean,
  directExportUrl?: string
): Promise<{ text: string; source: 'live' | 'snapshot' }> {
  if (preferLive) {
    const urls = [
      `/api/raw-sheet?sheet=${encodeURIComponent(sheetName)}&_t=${Date.now()}`,
      ...(directExportUrl ? [directExportUrl] : []),
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
 * Fetch historical Shopee rows (Jan - Sep 2026) from Supabase `shopee_live` table.
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
  } catch {
    return null;
  }
}

export interface LiveHostFetchResult {
  rawData: RawData;
  sheetAttendance: Partial<Record<MonthName, Record<string, AttendanceInput>>>;
  sheetTargets: Partial<Record<MonthName, SheetDivisionTarget>>;
  sourceMode: 'live' | 'snapshot';
  fetchedAt: string;
}

const newExportUrl = (gid: string) =>
  `https://docs.google.com/spreadsheets/d/${NEW_SPREADSHEET_ID}/export?format=csv&gid=${gid}`;

export async function fetchLiveHostRawData(preferLive = true): Promise<LiveHostFetchResult> {
  const [
    dbLiveRes,
    adsTtDailyRes,
    adsSpNewRes,
    rawAdsTtRes,
    masterTargetRes,
    supabaseShopeeRows,
  ] = await Promise.all([
    fetchSheetText(
      '03_DATABASE_LIVE',
      '/data/03_DATABASE_LIVE.csv',
      preferLive,
      newExportUrl(NEW_SHEET_GIDS.DATABASE_LIVE)
    ),
    fetchSheetText(
      '09_ADS_TIKTOK',
      '/data/09_ADS_TIKTOK.csv',
      preferLive,
      newExportUrl(NEW_SHEET_GIDS.ADS_TIKTOK)
    ),
    fetchSheetText(
      '10_ADS_SHOPEE',
      '/data/10_ADS_SHOPEE.csv',
      preferLive,
      newExportUrl(NEW_SHEET_GIDS.ADS_SHOPEE)
    ),
    fetchSheetText(
      'RAW ADS TT',
      '/data/RAW_ADS_TT.csv',
      preferLive,
      newExportUrl(NEW_SHEET_GIDS.RAW_ADS_TT)
    ),
    fetchSheetText(
      '04_MASTER_TARGET',
      '/data/04_MASTER_TARGET.csv',
      preferLive,
      newExportUrl(NEW_SHEET_GIDS.MASTER_TARGET)
    ),
    fetchShopeeRowsFromSupabase(),
  ]);

  const dbLive = parseDatabaseLiveCsv(dbLiveRes.text);
  const adsTtDaily = parseAdsTiktokDailyCsv(adsTtDailyRes.text);
  const adsSpNew = parseAdsShopeeNewCsv(adsSpNewRes.text);
  const rawAdsTt = parseRawAdsTtCsv(rawAdsTtRes.text);
  const sheetTargets = parseMasterTargetCsv(masterTargetRes.text);

  // 1. Shopee rows:
  //    - Operational months in 03_DATABASE_LIVE (Oct 2026+) use Direct GMV from 03_DATABASE_LIVE
  //    - Historical months (Jan - Sep 2026) use Supabase shopee_live (with local CSV fallback)
  let historicalShopee: ShopeeRow[] = [];
  if (supabaseShopeeRows && supabaseShopeeRows.length > 0) {
    historicalShopee = supabaseShopeeRows;
  } else {
    const spRes = await fetchSheetText('Shopee JAN 26', '/data/Shopee_JAN_26.csv', false);
    historicalShopee = parseCsvRows(spRes.text).map((r) => ({
      host: (r['Nama Host'] || '').trim(),
      month: (r['Bulan'] || '').trim(),
      omzet: parseNum(r['Penjualan(Pesanan Siap Dikirim)']),
    }));
  }

  const shopee: ShopeeRow[] = [
    ...historicalShopee.filter((r) => !dbLive.monthsPresent.has(r.month as MonthName)),
    ...dbLive.shopee,
  ];

  // 2. TikTok rows:
  //    - Operational months in 03_DATABASE_LIVE (Oct 2026+):
  //        * Omzet (Direct GMV) from 03_DATABASE_LIVE
  //        * Biaya Ads from 09_ADS_TIKTOK (daily per host) when available for that month (e.g. Nov 2026+),
  //          otherwise fallback to RAW ADS TT Biaya for that month (e.g. Oct 2026)
  //    - Historical months (Jan - Sep 2026): Omzet & Biaya from RAW ADS TT
  const tiktok: TikTokRow[] = [];

  for (const r of rawAdsTt) {
    const m = r.month as MonthName;
    if (!dbLive.monthsPresent.has(m)) {
      tiktok.push(r);
    } else if (!adsTtDaily.monthsPresent.has(m) && r.biaya > 0) {
      // Operational month without 09_ADS_TIKTOK entries yet -> carry over Biaya Ads from RAW ADS TT
      tiktok.push({ host: r.host, month: m, omzet: 0, biaya: r.biaya });
    }
  }

  // Add Direct GMV from 03_DATABASE_LIVE and daily Biaya Ads from 09_ADS_TIKTOK
  tiktok.push(...dbLive.tiktokOmzet);
  tiktok.push(...adsTtDaily.rows);

  // 3. Shopee Ads rows:
  //    - All months from 10_ADS_SHOPEE (only when filled; blank stays null)
  // Semua biaya Ads Shopee (Jan–Dec 2026) diinput di 10_ADS_SHOPEE.
  const ads: AdsRow[] = [];
  for (const [month, nominal] of adsSpNew.entries()) {
    ads.push({ marketplace: 'Shopee', month, nominal });
  }

  const isLive = dbLiveRes.source === 'live' && adsTtDailyRes.source === 'live';

  return {
    rawData: { tiktok, shopee, ads },
    sheetAttendance: dbLive.attendanceByMonth,
    sheetTargets,
    sourceMode: isLive ? 'live' : 'snapshot',
    fetchedAt: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}
