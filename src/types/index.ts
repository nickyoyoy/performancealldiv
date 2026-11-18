/**
 * Type definitions based on SCENTPLUS Panduan Operasional - Brief Versi 5 (13 November 2026)
 */

export type AppTab = 'live-host' | 'customer-happiness' | 'crm-cs';

export type DatePreset = 'all' | '30d' | '7d' | 'mtd' | 'prev_month' | 'custom';

// --- LIVE HOST TYPES ---
export interface HostRecord {
  id: string;
  name: string;
  tiktokOmzet: number;
  tiktokAds: number;
  tiktokOrganik: number;
  shopeeOmzet: number;
  shopeeAds: number;
  shopeeOrganik: number;
  totalDasarOrganik: number;
  targetPribadi: number;
  pencapaianHostPct: number;
  pengaliHostPct: number; // 0%, 50%, 80%, 100%
  shiftWajib: number;
  hadirReguler: number;
  backup: number;
  izin: number;
  sakit: number;
  cuti: number;
  alpa: number;
  kehadiranPct: number;
  tarifKehadiranPct: number; // 0%, 0.10%, 0.15%, 0.20%
  komisiUtama: number; // dasar * 1.3% * pengaliHost * faktorDivisi
  bonusKehadiran: number; // dasar * tarifKehadiran
  totalKomisi: number;
}

export interface LiveHostSummary {
  period: string;
  divisionTargetTikTok: number;
  divisionTargetShopee: number;
  totalDivisionTarget: number;
  totalOmzetTikTok: number;
  totalAdsTikTok: number;
  totalOrganikTikTok: number;
  totalOmzetShopee: number;
  totalAdsShopee: number;
  totalOrganikShopee: number;
  totalDasarOrganik: number;
  pencapaianDivisiPct: number;
  faktorDivisiPct: number; // 80% if < 100%, 100% if >= 100%
  anggaranMaksimal: number; // 1.5% dari total dasar organik
  totalKomisiPenjualan: number;
  totalBonusKehadiran: number;
  totalKomisiDibayar: number;
  sisaAnggaran: number;
  hosts: HostRecord[];
}

// --- CUSTOMER HAPPINESS (TRI) TYPES ---
export interface HappinessIndicator {
  id: number;
  name: string;
  category: string;
  bobotPct: number; // e.g. 30%
  targetLabel: string;
  targetValue: number;
  realisasiValue: number;
  unit: string;
  capaianPct: number;
  skorBobot: number; // min(realisasi/target, 1.20) * bobot
  evaluatorNote?: string;
}

export interface CustomerHappinessSummary {
  period: string;
  picName: string; // "Tri"
  baselineRevenue: number; // Rp53.275.260
  targetRevenueGrowthPct: number; // 30% -> Rp69.257.838
  actualRevenueAttributed: number;
  adSpend: number; // Daily Rp200k * 30 = Rp6.000.000
  uniqueChats: number;
  totalCampaigns: number;
  paidPromoteRoas: number; // revenue / ad spend (target 1.5x)
  costPerLead: number;
  growthPct: number; // (actual - baseline) / baseline
  growthBonusEligible: boolean; // growth >= 30% & validasi komplit
  totalScore: number; // max 120 points
  indicators: HappinessIndicator[];
}

// --- CRM CS & LEADER TYPES ---
export interface CsRecord {
  id: string;
  name: string;
  poin: number;
  leadsBaru: number;
  outbound: number;
  omzetValid: number; // totalPayment - shipping
  syaratLolos: boolean; // poin >= 15000, lead baru >= 400, outbound >= 10000, tanpa pelanggaran/komplain
  tarifOmzetPct: number; // 0%, 1%, 1.5%, 2%, 2.5%
  komisiOmzet: number;
  bonusConversion: number; // poin * pengaliConversionTim
  omzetSebelumnya: number;
  growthPct: number;
  bonusGrowth: number; // 0.5% omzet jika growth >= 20% & conv >= 10%
  bruto: number;
  potonganSistem: number; // 5% bruto
  bersih: number;
}

export interface CrmSummary {
  period: string;
  timTargetOmzet: number;
  timActualOmzet: number;
  timCapaianPct: number;
  totalLeadsTim: number;
  closingWonUnik: number;
  conversionRateTim: number;
  pengaliConversionTim: number; // 0, 15, 20, 25, 30, 35
  leaderName: string;
  leaderTarifPct: number;
  leaderKomisiOmzet: number;
  leaderBonusConversion: number;
  leaderBonusGrowth: number;
  leaderBruto: number;
  leaderPotongan: number;
  leaderBersih: number;
  totalPayoutTim: number;
  csList: CsRecord[];
}

// --- KPI SCORECARD KARYAWAN TYPES ---
export interface ScorecardMetric {
  id: string;
  karyawanName: string;
  role: string;
  indicator: string;
  direction: 'higher' | 'lower'; // higher is better / lower is better
  target: number;
  realisasi: number;
  bobotPct: number;
  skor: number; // capped at 120
  skorBobot: number;
}

