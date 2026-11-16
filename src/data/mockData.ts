import {
  LiveHostSummary,
  CustomerHappinessSummary,
  CrmSummary,
  ScorecardMetric,
} from '../types';
import {
  calculateLiveHostCommission,
  calculateIndicatorScore,
  getCsOmzetRate,
  getConversionMultiplier,
  getLeaderOmzetRate,
} from '../utils/calculations';

// ==========================================
// 1. LIVE HOST DATA (NOVEMBER 2026 - SKEMA V5)
// ==========================================

const rawHosts = [
  {
    id: 'h1',
    name: 'Zizii',
    tiktokOmzet: 92_500_000,
    tiktokAds: 12_500_000,
    shopeeOmzet: 48_000_000,
    targetPribadi: 110_000_000,
    shiftWajib: 24,
    hadirReguler: 23,
    backup: 2,
    izin: 1,
    sakit: 0,
    cuti: 0,
    alpa: 0,
  },
  {
    id: 'h2',
    name: 'Friha',
    tiktokOmzet: 84_000_000,
    tiktokAds: 10_000_000,
    shopeeOmzet: 42_000_000,
    targetPribadi: 100_000_000,
    shiftWajib: 24,
    hadirReguler: 24,
    backup: 1,
    izin: 0,
    sakit: 0,
    cuti: 0,
    alpa: 0,
  },
  {
    id: 'h3',
    name: 'Aldyy',
    tiktokOmzet: 76_000_000,
    tiktokAds: 9_000_000,
    shopeeOmzet: 39_000_000,
    targetPribadi: 95_000_000,
    shiftWajib: 24,
    hadirReguler: 22,
    backup: 0,
    izin: 1,
    sakit: 1,
    cuti: 0,
    alpa: 0,
  },
  {
    id: 'h4',
    name: 'Bella',
    tiktokOmzet: 65_000_000,
    tiktokAds: 8_000_000,
    shopeeOmzet: 31_000_000,
    targetPribadi: 85_000_000,
    shiftWajib: 24,
    hadirReguler: 24,
    backup: 3,
    izin: 0,
    sakit: 0,
    cuti: 0,
    alpa: 0,
  },
  {
    id: 'h5',
    name: 'Farhan',
    tiktokOmzet: 58_000_000,
    tiktokAds: 6_500_000,
    shopeeOmzet: 26_000_000,
    targetPribadi: 80_000_000,
    shiftWajib: 24,
    hadirReguler: 20,
    backup: 1,
    izin: 2,
    sakit: 2,
    cuti: 0,
    alpa: 0,
  },
];

// Division parameters
const divisionTargetTikTok = 380_000_000;
const divisionTargetShopee = 190_000_000;
const totalDivisionTarget = divisionTargetTikTok + divisionTargetShopee;

// Total Shopee Ads (allocated proportionally)
const totalShopeeAds = 28_000_000;
const totalShopeeOmzet = rawHosts.reduce((acc, h) => acc + h.shopeeOmzet, 0);

const computedHosts = rawHosts.map((h) => {
  const tiktokOrganik = h.tiktokOmzet - h.tiktokAds;
  // Proporsional Ads Shopee
  const shopeeAdsAlokasi = Math.round((totalShopeeAds * h.shopeeOmzet) / totalShopeeOmzet);
  const shopeeOrganik = h.shopeeOmzet - shopeeAdsAlokasi;
  const totalDasarOrganik = tiktokOrganik + shopeeOrganik;

  const pencapaianHostPct = totalDasarOrganik / h.targetPribadi;
  const kehadiranPct = h.hadirReguler / h.shiftWajib;

  return {
    ...h,
    tiktokOrganik,
    shopeeAds: shopeeAdsAlokasi,
    shopeeOrganik,
    totalDasarOrganik,
    pencapaianHostPct,
    kehadiranPct,
  };
});

const totalDasarOrganikDivisi = computedHosts.reduce((acc, h) => acc + h.totalDasarOrganik, 0);
const pencapaianDivisiPct = totalDasarOrganikDivisi / totalDivisionTarget;
const faktorDivisiPct = pencapaianDivisiPct >= 1.0 ? 1.0 : 0.8;

export const mockLiveHostSummary: LiveHostSummary = {
  period: 'November 2026',
  divisionTargetTikTok,
  divisionTargetShopee,
  totalDivisionTarget,
  totalOmzetTikTok: rawHosts.reduce((acc, h) => acc + h.tiktokOmzet, 0),
  totalAdsTikTok: rawHosts.reduce((acc, h) => acc + h.tiktokAds, 0),
  totalOrganikTikTok: computedHosts.reduce((acc, h) => acc + h.tiktokOrganik, 0),
  totalOmzetShopee: totalShopeeOmzet,
  totalAdsShopee: totalShopeeAds,
  totalOrganikShopee: computedHosts.reduce((acc, h) => acc + h.shopeeOrganik, 0),
  totalDasarOrganik: totalDasarOrganikDivisi,
  pencapaianDivisiPct,
  faktorDivisiPct,
  anggaranMaksimal: Math.round(totalDasarOrganikDivisi * 0.015),
  totalKomisiPenjualan: 0,
  totalBonusKehadiran: 0,
  totalKomisiDibayar: 0,
  sisaAnggaran: 0,
  hosts: computedHosts.map((h) => {
    const calc = calculateLiveHostCommission(
      h.totalDasarOrganik,
      h.pencapaianHostPct,
      pencapaianDivisiPct,
      h.kehadiranPct
    );
    return {
      ...h,
      pengaliHostPct: calc.pengaliHost,
      tarifKehadiranPct: calc.tarifKehadiran,
      komisiUtama: calc.komisiUtama,
      bonusKehadiran: calc.bonusKehadiran,
      totalKomisi: calc.totalKomisi,
    };
  }),
};

mockLiveHostSummary.totalKomisiPenjualan = mockLiveHostSummary.hosts.reduce(
  (acc, h) => acc + h.komisiUtama,
  0
);
mockLiveHostSummary.totalBonusKehadiran = mockLiveHostSummary.hosts.reduce(
  (acc, h) => acc + h.bonusKehadiran,
  0
);
mockLiveHostSummary.totalKomisiDibayar =
  mockLiveHostSummary.totalKomisiPenjualan + mockLiveHostSummary.totalBonusKehadiran;
mockLiveHostSummary.sisaAnggaran =
  mockLiveHostSummary.anggaranMaksimal - mockLiveHostSummary.totalKomisiDibayar;

// ==========================================
// 2. CUSTOMER HAPPINESS (TRI) DATA (NOV 2026)
// ==========================================

const rawHappinessIndicators = [
  {
    id: 1,
    name: 'Revenue attribution',
    category: 'Sales & Growth',
    bobotPct: 30,
    targetLabel: 'Baseline +30% (Rp69.257.838)',
    targetValue: 69_257_838,
    realisasiValue: 72_450_000,
    unit: 'IDR',
    evaluatorNote: 'Verifikasi deduplikasi paid order beres, retur dikeluarkan',
  },
  {
    id: 2,
    name: 'Traffic acquisition / unique chats',
    category: 'Lead Generation',
    bobotPct: 20,
    targetLabel: '448 unique chats',
    targetValue: 448,
    realisasiValue: 492,
    unit: 'Chats',
    evaluatorNote: 'Footer CSV excluded, deduplikasi contact ID aktif',
  },
  {
    id: 3,
    name: 'Campaign planning',
    category: 'Campaign Management',
    bobotPct: 5,
    targetLabel: '100% rencana terjadwal',
    targetValue: 100,
    realisasiValue: 100,
    unit: '%',
    evaluatorNote: 'Roadmap promo bulanan diajukan tepat waktu',
  },
  {
    id: 4,
    name: 'Campaign execution',
    category: 'Campaign Management',
    bobotPct: 10,
    targetLabel: '28 campaigns valid',
    targetValue: 28,
    realisasiValue: 30,
    unit: 'Campaign',
    evaluatorNote: '30 live broadcast & blast promo terkirim',
  },
  {
    id: 5,
    name: 'Campaign evaluation',
    category: 'Campaign Management',
    bobotPct: 5,
    targetLabel: '100% review post-mortem',
    targetValue: 100,
    realisasiValue: 95,
    unit: '%',
    evaluatorNote: '27 dari 28 evaluasi tuntas diisi',
  },
  {
    id: 6,
    name: 'Paid promote - ROAS',
    category: 'Paid Performance',
    bobotPct: 10,
    targetLabel: 'Min 1,5× (monitoring 1,2×)',
    targetValue: 1.5,
    realisasiValue: 1.82,
    unit: 'x',
    evaluatorNote: 'Paid revenue Rp10.920.000 vs Ad Spend Rp6.000.000',
  },
  {
    id: 7,
    name: 'Paid promote - efisiensi evaluator',
    category: 'Paid Performance',
    bobotPct: 10,
    targetLabel: 'Maks 100%',
    targetValue: 100,
    realisasiValue: 90,
    unit: '%',
    evaluatorNote: 'Evaluator appraisal efisiensi materi & targeting',
  },
  {
    id: 8,
    name: 'Community activation',
    category: 'Customer Engagement',
    bobotPct: 4,
    targetLabel: '12 sesi aktivasi',
    targetValue: 12,
    realisasiValue: 14,
    unit: 'Sesi',
    evaluatorNote: 'Aktivasi grup VIP & give-away mingguan aktif',
  },
  {
    id: 9,
    name: 'Social media activation',
    category: 'Customer Engagement',
    bobotPct: 3,
    targetLabel: '20 posting interaktif',
    targetValue: 20,
    realisasiValue: 22,
    unit: 'Post',
    evaluatorNote: 'Stories Q&A dan interaksi reels konsisten',
  },
  {
    id: 10,
    name: 'CTA & engagement',
    category: 'Customer Engagement',
    bobotPct: 3,
    targetLabel: '15% engagement rate',
    targetValue: 15,
    realisasiValue: 16.4,
    unit: '%',
    evaluatorNote: 'CTR link WhatsApp & katalog bio meningkat',
  },
];

const computedHappinessIndicators = rawHappinessIndicators.map((ind) => {
  const capaianPct = ind.realisasiValue / ind.targetValue;
  const skorBobot = calculateIndicatorScore(ind.realisasiValue, ind.targetValue, ind.bobotPct);
  return {
    ...ind,
    capaianPct,
    skorBobot,
  };
});

const totalHappinessScore = Math.round(
  computedHappinessIndicators.reduce((acc, ind) => acc + ind.skorBobot, 0) * 10
) / 10;

const baselineRevenue = 53_275_260;
const actualRev = 72_450_000;
const growthPct = (actualRev - baselineRevenue) / baselineRevenue;

export const mockCustomerHappinessSummary: CustomerHappinessSummary = {
  period: 'November 2026',
  picName: 'Tri',
  baselineRevenue,
  targetRevenueGrowthPct: 0.3,
  actualRevenueAttributed: actualRev,
  adSpend: 6_000_000,
  uniqueChats: 492,
  totalCampaigns: 30,
  paidPromoteRoas: 1.82,
  costPerLead: Math.round(6_000_000 / 492),
  growthPct,
  growthBonusEligible: growthPct >= 0.3,
  totalScore: totalHappinessScore,
  indicators: computedHappinessIndicators,
};

// ==========================================
// 3. CRM CS & LEADER DATA (WACOMMERCE)
// ==========================================

const rawCsList = [
  {
    id: 'cs1',
    name: 'Ayu Kartika',
    poin: 18_400,
    leadsBaru: 520,
    outbound: 12_800,
    omzetValid: 112_000_000,
    omzetSebelumnya: 88_000_000,
    syaratLolos: true,
  },
  {
    id: 'cs2',
    name: 'Dina Lestari',
    poin: 16_200,
    leadsBaru: 450,
    outbound: 11_100,
    omzetValid: 74_000_000,
    omzetSebelumnya: 60_000_000,
    syaratLolos: true,
  },
  {
    id: 'cs3',
    name: 'Budi Santoso',
    poin: 15_100,
    leadsBaru: 410,
    outbound: 10_300,
    omzetValid: 52_000_000,
    omzetSebelumnya: 45_000_000,
    syaratLolos: true,
  },
  {
    id: 'cs4',
    name: 'Rian Pratama',
    poin: 13_900,
    leadsBaru: 380,
    outbound: 9_400,
    omzetValid: 35_000_000,
    omzetSebelumnya: 32_000_000,
    syaratLolos: false, // Tidak lolos syarat min (poin < 15k, lead < 400)
  },
];

const totalLeadsTim = 2100;
const closingWonUnik = 265;
const conversionRateTim = closingWonUnik / totalLeadsTim; // 12.6%
const pengaliConversionTim = getConversionMultiplier(conversionRateTim); // 25 (12% - <15%)

const computedCsList = rawCsList.map((cs) => {
  const tarifOmzetPct = getCsOmzetRate(cs.omzetValid, cs.syaratLolos);
  const komisiOmzet = Math.round(cs.omzetValid * tarifOmzetPct);
  const bonusConversion = cs.syaratLolos ? cs.poin * pengaliConversionTim : 0;
  const growthPct = (cs.omzetValid - cs.omzetSebelumnya) / cs.omzetSebelumnya;
  // Growth min 20% & conv tim min 10%
  const bonusGrowth =
    growthPct >= 0.2 && conversionRateTim >= 0.1 && cs.omzetSebelumnya > 0
      ? Math.round(cs.omzetValid * 0.005)
      : 0;

  const bruto = komisiOmzet + bonusConversion + bonusGrowth;
  const potonganSistem = Math.round(bruto * 0.05); // fixed 5% potongan
  const bersih = bruto - potonganSistem;

  return {
    ...cs,
    tarifOmzetPct,
    komisiOmzet,
    bonusConversion,
    growthPct,
    bonusGrowth,
    bruto,
    potonganSistem,
    bersih,
  };
});

const timActualOmzet = computedCsList.reduce((acc, cs) => acc + cs.omzetValid, 0);
const timTargetOmzet = 250_000_000;
const timCapaianPct = timActualOmzet / timTargetOmzet;
const leaderTarifPct = getLeaderOmzetRate(timCapaianPct);
const leaderKomisiOmzet = Math.round(timActualOmzet * leaderTarifPct);

// Leader bonus
const avgCsPoints = Math.round(
  computedCsList.filter((c) => c.syaratLolos).reduce((a, b) => a + b.poin, 0) /
    computedCsList.filter((c) => c.syaratLolos).length
);
const leaderBonusConversion = avgCsPoints * pengaliConversionTim;
const leaderBonusGrowth = Math.round(timActualOmzet * 0.005);
const leaderBruto = leaderKomisiOmzet + leaderBonusConversion + leaderBonusGrowth;
const leaderPotongan = Math.round(leaderBruto * 0.05);
const leaderBersih = leaderBruto - leaderPotongan;

export const mockCrmSummary: CrmSummary = {
  period: 'November 2026',
  timTargetOmzet,
  timActualOmzet,
  timCapaianPct,
  totalLeadsTim,
  closingWonUnik,
  conversionRateTim,
  pengaliConversionTim,
  leaderName: 'Ferry Hendra',
  leaderTarifPct,
  leaderKomisiOmzet,
  leaderBonusConversion,
  leaderBonusGrowth,
  leaderBruto,
  leaderPotongan,
  leaderBersih,
  totalPayoutTim:
    computedCsList.reduce((acc, c) => acc + c.bersih, 0) + leaderBersih,
  csList: computedCsList,
};

// ==========================================
// 4. KPI SCORECARD KARYAWAN (GENERAL)
// ==========================================

export const mockScorecards: ScorecardMetric[] = [
  {
    id: 'k1',
    karyawanName: 'Rizqy Maulana',
    role: 'Data Engineer / Pipeline',
    indicator: 'Pipeline Uptime & Freshness Sync',
    direction: 'higher',
    target: 99.5,
    realisasi: 99.8,
    bobotPct: 35,
    skor: 100.3,
    skorBobot: 35.1,
  },
  {
    id: 'k2',
    karyawanName: 'Rizqy Maulana',
    role: 'Data Engineer / Pipeline',
    indicator: 'Order Deduplication Error Rate',
    direction: 'lower',
    target: 0.5,
    realisasi: 0.2,
    bobotPct: 35,
    skor: 120.0,
    skorBobot: 42.0,
  },
  {
    id: 'k3',
    karyawanName: 'Rizqy Maulana',
    role: 'Data Engineer / Pipeline',
    indicator: 'SLA Resolusi Sync Log Error',
    direction: 'lower',
    target: 60, // menit
    realisasi: 45,
    bobotPct: 30,
    skor: 120.0,
    skorBobot: 36.0,
  },
  {
    id: 'k4',
    karyawanName: 'Aniq',
    role: 'Lead Frontend & UX',
    indicator: 'UI Delivery & Component Completeness',
    direction: 'higher',
    target: 100,
    realisasi: 110,
    bobotPct: 40,
    skor: 110.0,
    skorBobot: 44.0,
  },
  {
    id: 'k5',
    karyawanName: 'Aniq',
    role: 'Lead Frontend & UX',
    indicator: 'Design Token & Responsive Fidelity',
    direction: 'higher',
    target: 100,
    realisasi: 100,
    bobotPct: 30,
    skor: 100.0,
    skorBobot: 30.0,
  },
  {
    id: 'k6',
    karyawanName: 'Aniq',
    role: 'Lead Frontend & UX',
    indicator: 'Bug/Feedback Turnaround Time',
    direction: 'lower',
    target: 120, // menit
    realisasi: 75,
    bobotPct: 30,
    skor: 120.0,
    skorBobot: 36.0,
  },
];

