/**
 * Live Host calculation engine.
 *
 * Organic method reverse-engineered from spreadsheet "Organic Calculation 2026"
 * (verified against Jan–Sep blocks; September = rows 214–232):
 *
 *   TikTok  : proporsi = biaya host / total biaya TikTok (bulan itu)
 *             un-organic % = proporsi + adjustment factor TikTok
 *             organic (G)  = omzet × (1 − un-organic %)
 *   Shopee  : proporsi = omzet host / total omzet Shopee (bulan itu)
 *             un-organic % = proporsi + adjustment factor Shopee
 *             organic (N)  = omzet × (1 − un-organic %)
 *             alokasi Ads Shopee (info) = total Ads Shopee × proporsi
 *
 *   Dasar komisi = G + N
 *
 * Commission rules follow Brief Versi 5 (13 Nov 2026).
 */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
export type MonthName = (typeof MONTHS)[number];

export const MONTH_LABEL_ID: Record<MonthName, string> = {
  January: 'Januari', February: 'Februari', March: 'Maret', April: 'April',
  May: 'Mei', June: 'Juni', July: 'Juli', August: 'Agustus',
  September: 'September', October: 'Oktober', November: 'November', December: 'Desember',
};

// ---------- Raw row shapes (only the columns we use) ----------
export interface TikTokRow { host: string; month: string; omzet: number; biaya: number }
export interface ShopeeRow { host: string; month: string; omzet: number }
export interface AdsRow { marketplace: string; month: string; nominal: number }

export interface RawData {
  tiktok: TikTokRow[];
  shopee: ShopeeRow[];
  ads: AdsRow[];
}

// ---------- Host name normalisation ----------
export interface NameRules {
  /** alias -> canonical host name */
  aliases: Record<string, string>;
  /** labels that are not hosts (excluded from calculation) */
  excluded: string[];
}

export const DEFAULT_NAME_RULES: NameRules = {
  aliases: { TACAA: 'TACCA' },
  excluded: ['', 'LIVE', 'SALE', 'DEALS', 'L 1.1', 'VOL.3', 'VOL.4', 'ALS‼️'],
};

export function normaliseHost(raw: string, rules: NameRules): string | null {
  const key = (raw || '').trim().toUpperCase();
  if (rules.excluded.map((e) => e.toUpperCase()).includes(key)) return null;
  return rules.aliases[key] ?? key;
}

// ---------- Aggregation ----------
export interface UnmappedEntry { source: 'TikTok' | 'Shopee'; label: string; rows: number; omzet: number; biaya: number }

export interface MonthAggregate {
  month: MonthName;
  tiktok: Map<string, { omzet: number; biaya: number; rows: number }>;
  shopee: Map<string, { omzet: number; rows: number }>;
  shopeeAdsTotal: number | null; // null = belum ada sumber
  hasTikTok: boolean;
  hasShopee: boolean;
  unmapped: UnmappedEntry[];
}

export function aggregateMonth(raw: RawData, month: MonthName, rules: NameRules): MonthAggregate {
  const tiktok = new Map<string, { omzet: number; biaya: number; rows: number }>();
  const shopee = new Map<string, { omzet: number; rows: number }>();
  const unmapped = new Map<string, UnmappedEntry>();
  let ttRows = 0;
  let spRows = 0;

  for (const r of raw.tiktok) {
    if (r.month !== month) continue;
    ttRows++;
    const host = normaliseHost(r.host, rules);
    if (!host) {
      const k = `TikTok|${r.host.trim()}`;
      const u = unmapped.get(k) ?? { source: 'TikTok', label: r.host.trim() || '(kosong)', rows: 0, omzet: 0, biaya: 0 };
      u.rows++; u.omzet += r.omzet; u.biaya += r.biaya;
      unmapped.set(k, u);
      continue;
    }
    const a = tiktok.get(host) ?? { omzet: 0, biaya: 0, rows: 0 };
    a.omzet += r.omzet; a.biaya += r.biaya; a.rows++;
    tiktok.set(host, a);
  }

  for (const r of raw.shopee) {
    if (r.month !== month) continue;
    spRows++;
    const host = normaliseHost(r.host, rules);
    if (!host) {
      const k = `Shopee|${r.host.trim()}`;
      const u = unmapped.get(k) ?? { source: 'Shopee', label: r.host.trim() || '(kosong)', rows: 0, omzet: 0, biaya: 0 };
      u.rows++; u.omzet += r.omzet;
      unmapped.set(k, u);
      continue;
    }
    const a = shopee.get(host) ?? { omzet: 0, rows: 0 };
    a.omzet += r.omzet; a.rows++;
    shopee.set(host, a);
  }

  const adsRow = raw.ads.find((a) => a.month === month && a.marketplace.toLowerCase() === 'shopee');

  return {
    month,
    tiktok,
    shopee,
    shopeeAdsTotal: adsRow ? adsRow.nominal : null,
    hasTikTok: ttRows > 0,
    hasShopee: spRows > 0,
    unmapped: [...unmapped.values()].sort((a, b) => b.omzet - a.omzet),
  };
}

// ---------- Organic calculation ----------
export type OrganicMethod = 'brief_v5' | 'spreadsheet';
export interface OrganicParams { adjTikTok: number; adjShopee: number; method?: OrganicMethod }

export interface HostOrganic {
  host: string;
  // TikTok
  ttOmzet: number;
  ttBiaya: number;
  ttProporsi: number;
  ttUnorganicPct: number;
  ttUnorganic: number;
  ttOrganic: number;
  // Shopee
  spOmzet: number;
  spAdsAlokasi: number | null;
  spProporsi: number;
  spUnorganicPct: number;
  spUnorganic: number;
  spOrganic: number;
  // Total
  totalOmzet: number;
  dasarOrganik: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function computeOrganic(agg: MonthAggregate, p: OrganicParams): HostOrganic[] {
  const method: OrganicMethod = p.method ?? 'brief_v5';
  const hosts = new Set<string>([...agg.tiktok.keys(), ...agg.shopee.keys()]);
  const totalTTBiaya = [...agg.tiktok.values()].reduce((s, v) => s + v.biaya, 0);
  const totalSPOmzet = [...agg.shopee.values()].reduce((s, v) => s + v.omzet, 0);

  const out: HostOrganic[] = [];
  for (const host of hosts) {
    const tt = agg.tiktok.get(host) ?? { omzet: 0, biaya: 0 };
    const sp = agg.shopee.get(host) ?? { omzet: 0 };

    const ttProporsi = totalTTBiaya > 0 ? tt.biaya / totalTTBiaya : 0;
    const spProporsi = totalSPOmzet > 0 ? sp.omzet / totalSPOmzet : 0;
    const spAdsAlokasi = agg.shopeeAdsTotal === null ? null : agg.shopeeAdsTotal * spProporsi;

    let ttUnorganicPct = 0;
    let ttUnorganic = 0;
    let ttOrganic = 0;
    let spUnorganicPct = 0;
    let spUnorganic = 0;
    let spOrganic = 0;

    if (method === 'brief_v5') {
      // Brief v5: TikTok = omzet - biaya langsung; Shopee = omzet - alokasi Ads proporsional
      ttUnorganic = tt.biaya;
      ttOrganic = Math.max(0, tt.omzet - ttUnorganic);
      ttUnorganicPct = tt.omzet > 0 ? ttUnorganic / tt.omzet : 0;

      spUnorganic = spAdsAlokasi ?? 0;
      spOrganic = Math.max(0, sp.omzet - spUnorganic);
      spUnorganicPct = sp.omzet > 0 ? spUnorganic / sp.omzet : 0;
    } else {
      ttUnorganicPct = tt.omzet > 0 ? clamp01(ttProporsi + p.adjTikTok) : 0;
      ttUnorganic = tt.omzet * ttUnorganicPct;
      ttOrganic = tt.omzet - ttUnorganic;

      spUnorganicPct = sp.omzet > 0 ? clamp01(spProporsi + p.adjShopee) : 0;
      spUnorganic = sp.omzet * spUnorganicPct;
      spOrganic = sp.omzet - spUnorganic;
    }

    out.push({
      host,
      ttOmzet: tt.omzet,
      ttBiaya: tt.biaya,
      ttProporsi,
      ttUnorganicPct,
      ttUnorganic,
      ttOrganic,
      spOmzet: sp.omzet,
      spAdsAlokasi,
      spProporsi,
      spUnorganicPct,
      spUnorganic,
      spOrganic,
      totalOmzet: tt.omzet + sp.omzet,
      dasarOrganik: ttOrganic + spOrganic,
    });
  }
  return out.sort((a, b) => b.dasarOrganik - a.dasarOrganik);
}

// ---------- Brief v5 tiers ----------
export function pengaliHost(capaian: number): number {
  if (capaian < 0.5) return 0;
  if (capaian < 0.8) return 0.5;
  if (capaian < 1) return 0.8;
  return 1;
}

export function faktorDivisi(capaianDivisi: number, belowFactor = 0.8): number {
  return capaianDivisi < 1 ? belowFactor : 1;
}

export function tarifKehadiran(kehadiran: number): number {
  if (kehadiran < 0.8) return 0;
  if (kehadiran < 0.9) return 0.001;
  if (kehadiran < 1) return 0.0015;
  return 0.002;
}

// ---------- Targets (Brief v5: manual dulu, sisa dibagi proporsi histori 3 bulan) ----------
export interface TargetInput {
  divisiTikTok: number | null;
  divisiShopee: number | null;
  /** manual target per host per marketplace */
  manual: Record<string, { tiktok?: number | null; shopee?: number | null }>;
}

export interface HostTarget {
  tiktok: number | null;
  shopee: number | null;
  total: number | null;
  sourceTikTok: 'manual' | 'histori' | 'belum';
  sourceShopee: 'manual' | 'histori' | 'belum';
}

/**
 * history: organic per host for each of the previous months (up to 3).
 * A host absent from a month is "kosong" (excluded from its average); a value of 0 is counted.
 */
export function allocateTargets(
  hosts: string[],
  input: TargetInput,
  history: HostOrganic[][],
): Record<string, HostTarget> {
  const result: Record<string, HostTarget> = {};
  for (const h of hosts) result[h] = { tiktok: null, shopee: null, total: null, sourceTikTok: 'belum', sourceShopee: 'belum' };

  const allocate = (market: 'tiktok' | 'shopee', divisi: number | null) => {
    const srcKey = market === 'tiktok' ? 'sourceTikTok' : 'sourceShopee';
    // 1. manual reserved first
    let reserved = 0;
    const auto: string[] = [];
    for (const h of hosts) {
      const m = input.manual?.[h]?.[market];
      if (m !== undefined && m !== null && !isNaN(m)) {
        result[h][market] = m;
        result[h][srcKey] = 'manual';
        reserved += m;
      } else auto.push(h);
    }
    if (divisi === null || auto.length === 0) return;
    const remaining = Math.max(0, divisi - reserved);

    // 2. average historical share per host (empty months excluded)
    const avgShare: Record<string, number> = {};
    for (const h of auto) {
      const shares: number[] = [];
      for (const month of history) {
        const total = month.reduce((s, x) => s + (market === 'tiktok' ? x.ttOrganic : x.spOrganic), 0);
        const row = month.find((x) => x.host === h);
        if (!row || total <= 0) continue; // kosong → dikecualikan
        const has = market === 'tiktok' ? row.ttOmzet > 0 || row.ttBiaya > 0 : row.spOmzet > 0;
        if (!has) continue;
        shares.push((market === 'tiktok' ? row.ttOrganic : row.spOrganic) / total);
      }
      if (shares.length) avgShare[h] = shares.reduce((a, b) => a + b, 0) / shares.length;
    }
    const sumShare = Object.values(avgShare).reduce((a, b) => a + b, 0);
    if (sumShare <= 0) return; // histori tidak cukup → target belum dapat dihitung
    for (const h of Object.keys(avgShare)) {
      result[h][market] = remaining * (avgShare[h] / sumShare);
      result[h][srcKey] = 'histori';
    }
  };

  allocate('tiktok', input.divisiTikTok);
  allocate('shopee', input.divisiShopee);

  for (const h of hosts) {
    const t = result[h];
    // a host with no activity on a marketplace needs no target there
    t.total = t.tiktok === null && t.shopee === null ? null : (t.tiktok ?? 0) + (t.shopee ?? 0);
  }
  return result;
}

// ---------- Attendance ----------
export interface AttendanceInput {
  hadir?: number | null;
  backup?: number | null;
  izin?: number | null;
  sakit?: number | null;
  cuti?: number | null;
  alpa?: number | null;
  keterangan?: string;
}

export interface AttendanceResult {
  kehadiran: number | null; // null = belum tersedia
  tarif: number | null;
  warning: string | null;
}

export function evaluateAttendance(a: AttendanceInput | undefined, shiftWajib: number): AttendanceResult {
  if (!a || a.hadir === undefined || a.hadir === null || isNaN(a.hadir)) {
    return { kehadiran: null, tarif: null, warning: null };
  }
  if (shiftWajib <= 0) return { kehadiran: null, tarif: null, warning: 'Shift wajib harus > 0' };
  const sum = (a.hadir ?? 0) + (a.izin ?? 0) + (a.sakit ?? 0) + (a.cuti ?? 0) + (a.alpa ?? 0);
  const anyOther = [a.izin, a.sakit, a.cuti, a.alpa].some((v) => v !== undefined && v !== null);
  const warning =
    anyOther && sum !== shiftWajib
      ? `Hadir + izin + sakit + cuti + alpa = ${sum}, tidak sama dengan shift wajib ${shiftWajib}`
      : null;
  const kehadiran = Math.min(1, a.hadir / shiftWajib); // backup tidak menambah hadir reguler
  return { kehadiran, tarif: tarifKehadiran(kehadiran), warning };
}

// ---------- Full commission ----------
export interface CommissionParams {
  tarifUtama: number; // 0.013
  faktorDivisiBawah: number; // 0.8
  plafonTotal: number; // 0.015
  plafonBonus: number; // 0.002
  shiftWajib: number; // 26
}

export const DEFAULT_COMMISSION_PARAMS: CommissionParams = {
  tarifUtama: 0.013,
  faktorDivisiBawah: 0.8,
  plafonTotal: 0.015,
  plafonBonus: 0.002,
  shiftWajib: 26,
};

export interface HostCommission extends HostOrganic {
  target: HostTarget;
  capaian: number | null;
  pengali: number | null;
  attendance: AttendanceResult;
  attendanceInput: AttendanceInput | undefined;
  komisiUtama: number | null;
  bonusKehadiran: number | null;
  total: number | null;
}

export interface DivisionSummary {
  totalTTOmzet: number;
  totalTTBiaya: number;
  totalTTOrganic: number;
  totalSPOmzet: number;
  totalSPAds: number | null;
  totalSPOrganic: number;
  totalDasar: number;
  targetDivisi: number | null;
  capaianDivisi: number | null;
  faktorDivisi: number | null;
  anggaranMaksimal: number;
  plafonBonus: number;
  totalKomisiUtama: number;
  totalBonus: number;
  totalDibayar: number;
  sisaAnggaran: number;
  hostsKomisiLengkap: number;
  hostsBonusLengkap: number;
  hostCount: number;
}

export function computeCommission(
  organic: HostOrganic[],
  targets: Record<string, HostTarget>,
  attendance: Record<string, AttendanceInput>,
  targetInput: TargetInput,
  params: CommissionParams,
  shopeeAdsTotal: number | null,
): { hosts: HostCommission[]; summary: DivisionSummary } {
  const totalDasar = organic.reduce((s, h) => s + h.dasarOrganik, 0);
  const targetDivisi =
    targetInput.divisiTikTok === null || targetInput.divisiShopee === null
      ? null
      : targetInput.divisiTikTok + targetInput.divisiShopee;
  const capaianDivisi = targetDivisi && targetDivisi > 0 ? totalDasar / targetDivisi : null;
  const fDiv = capaianDivisi === null ? null : faktorDivisi(capaianDivisi, params.faktorDivisiBawah);

  const hosts: HostCommission[] = organic.map((h) => {
    const target = targets[h.host];
    const capaian = target?.total && target.total > 0 ? h.dasarOrganik / target.total : null;
    const pengali = capaian === null ? null : pengaliHost(capaian);
    const att = evaluateAttendance(attendance[h.host], params.shiftWajib);
    const komisiUtama =
      pengali === null || fDiv === null ? null : Math.floor(h.dasarOrganik * params.tarifUtama * pengali * fDiv);
    const bonusKehadiran = att.tarif === null ? null : Math.floor(h.dasarOrganik * att.tarif);
    const total = komisiUtama === null && bonusKehadiran === null ? null : (komisiUtama ?? 0) + (bonusKehadiran ?? 0);
    return {
      ...h,
      target,
      capaian,
      pengali,
      attendance: att,
      attendanceInput: attendance[h.host],
      komisiUtama,
      bonusKehadiran,
      total,
    };
  });

  const totalKomisiUtama = hosts.reduce((s, h) => s + (h.komisiUtama ?? 0), 0);
  const totalBonus = hosts.reduce((s, h) => s + (h.bonusKehadiran ?? 0), 0);
  const anggaranMaksimal = Math.round(totalDasar * params.plafonTotal);

  return {
    hosts,
    summary: {
      totalTTOmzet: organic.reduce((s, h) => s + h.ttOmzet, 0),
      totalTTBiaya: organic.reduce((s, h) => s + h.ttBiaya, 0),
      totalTTOrganic: organic.reduce((s, h) => s + h.ttOrganic, 0),
      totalSPOmzet: organic.reduce((s, h) => s + h.spOmzet, 0),
      totalSPAds: shopeeAdsTotal,
      totalSPOrganic: organic.reduce((s, h) => s + h.spOrganic, 0),
      totalDasar,
      targetDivisi,
      capaianDivisi,
      faktorDivisi: fDiv,
      anggaranMaksimal,
      plafonBonus: Math.round(totalDasar * params.plafonBonus),
      totalKomisiUtama,
      totalBonus,
      totalDibayar: totalKomisiUtama + totalBonus,
      sisaAnggaran: anggaranMaksimal - (totalKomisiUtama + totalBonus),
      hostsKomisiLengkap: hosts.filter((h) => h.komisiUtama !== null).length,
      hostsBonusLengkap: hosts.filter((h) => h.bonusKehadiran !== null).length,
      hostCount: hosts.length,
    },
  };
}

/** Adjustment factor values found in the spreadsheet (editable defaults). */
export const SPREADSHEET_ADJ_DEFAULTS: Partial<Record<MonthName, OrganicParams>> = {
  January: { adjTikTok: 0.25, adjShopee: 0.43 },
  February: { adjTikTok: 0.26, adjShopee: 0.44 },
  March: { adjTikTok: 0.45, adjShopee: 0.4 },
  April: { adjTikTok: 0.35, adjShopee: 0.4 },
  May: { adjTikTok: 0.35, adjShopee: 0.4 },
  June: { adjTikTok: 0.3, adjShopee: 0.4 },
  July: { adjTikTok: 0.3, adjShopee: 0.4 },
  August: { adjTikTok: 0.3, adjShopee: 0.4 },
  September: { adjTikTok: 0, adjShopee: 0 },
};

export function previousMonths(month: MonthName, n = 3): MonthName[] {
  const i = MONTHS.indexOf(month);
  const out: MonthName[] = [];
  for (let k = 1; k <= n && i - k >= 0; k++) out.push(MONTHS[i - k]);
  return out;
}

/** Verified default targets by month */
export const DEFAULT_TARGETS_BY_MONTH: Partial<Record<MonthName, TargetInput>> = {
  September: {
    divisiTikTok: 1820000000,
    divisiShopee: 980000000,
    manual: {
      TYASS: { tiktok: 130000000, shopee: 70000000 },
      SASAA: { tiktok: 130000000, shopee: 70000000 },
      INTAN: { tiktok: 130000000, shopee: 70000000 },
      MICEL: { tiktok: 130000000, shopee: 70000000 },
      LUCIA: { tiktok: 130000000, shopee: 70000000 },
      ALESA: { tiktok: 130000000, shopee: 70000000 },
      RAISA: { tiktok: 130000000, shopee: 70000000 },
      TATAA: { tiktok: 130000000, shopee: 70000000 },
      NIAAA: { tiktok: 130000000, shopee: 70000000 },
      RATNA: { tiktok: 130000000, shopee: 70000000 },
      FARAH: { tiktok: 130000000, shopee: 70000000 },
      TIAAA: { tiktok: 130000000, shopee: 70000000 },
      GISCA: { tiktok: 130000000, shopee: 70000000 },
      ARNIE: { tiktok: 130000000, shopee: 70000000 },
    },
  },
  October: {
    divisiTikTok: 1820000000,
    divisiShopee: 980000000,
    manual: {},
  },
  November: {
    divisiTikTok: 1820000000,
    divisiShopee: 980000000,
    manual: {},
  },
};

/** Verified default attendance records by month */
export const DEFAULT_ATTENDANCE_BY_MONTH: Partial<Record<MonthName, Record<string, AttendanceInput>>> = {
  September: {
    TYASS: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0 },
    SASAA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0 },
    INTAN: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0 },
    MICEL: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0 },
    LUCIA: { hadir: 25, izin: 1, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Izin 1 shift' },
    ALESA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0 },
    RAISA: { hadir: 24, izin: 2, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Izin 2 shift' },
    TATAA: { hadir: 25, izin: 1, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Izin 1 shift' },
    NIAAA: { hadir: 25, izin: 0, sakit: 1, cuti: 0, alpa: 0, keterangan: 'Sakit, jadwal di-backup Farah' },
    RATNA: { hadir: 24, izin: 2, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Izin 2 shift' },
    FARAH: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Backup shift Nia yang sakit' },
    TIAAA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0 },
    GISCA: { hadir: 24, izin: 2, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 24 shift (92,3%), backup shift Arnie' },
    ARNIE: { hadir: 22, izin: 4, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 22 shift (84,6%), izin ada kabar duka' },
  },
  October: {
    TYASS: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 30 shift (100%), shift wajib 26 terpenuhi' },
    TATAA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 30 shift (100%), shift wajib 26 terpenuhi' },
    RATNA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 31 shift (100%), shift wajib 26 terpenuhi' },
    SASAA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 31 shift (100%), shift wajib 26 terpenuhi' },
    RAISA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 31 shift (100%), shift wajib 26 terpenuhi' },
    FARAH: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 34 shift (100%), shift wajib 26 terpenuhi' },
    ARNIE: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 31 shift (100%), shift wajib 26 terpenuhi' },
    LUCIA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 31 shift (100%), shift wajib 26 terpenuhi' },
    GISCA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 31 shift (100%), shift wajib 26 terpenuhi' },
    NIAAA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 31 shift (100%), shift wajib 26 terpenuhi' },
    INTAN: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 31 shift (100%), shift wajib 26 terpenuhi' },
    ALESA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 31 shift (100%), shift wajib 26 terpenuhi' },
    TIAAA: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 32 shift (100%), shift wajib 26 terpenuhi' },
    MICEL: { hadir: 26, izin: 0, sakit: 0, cuti: 0, alpa: 0, keterangan: 'Hadir 32 shift (100%), shift wajib 26 terpenuhi' },
  },
};

