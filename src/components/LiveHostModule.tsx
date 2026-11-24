import React, { useState } from 'react';
import {
  AttendanceInput,
  CommissionParams,
  DivisionSummary,
  HostCommission,
  MONTHS,
  MONTH_LABEL_ID,
  MonthAggregate,
  MonthName,
  OrganicParams,
  TargetInput,
} from '../utils/liveHostEngine';
import { formatCurrencyIDR, formatPercent } from '../utils/formatters';
import {
  Mic2,
  TrendingUp,
  Percent,
  Coins,
  ShieldAlert,
  ShieldCheck,
  Search,
  CalendarCheck,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  FileText,
  ArrowUpRight,
} from 'lucide-react';

interface LiveHostModuleProps {
  month: MonthName;
  onMonthChange: (m: MonthName) => void;
  aggregate: MonthAggregate;
  summary: DivisionSummary;
  hosts: HostCommission[];
  organicParams?: OrganicParams;
  onOrganicParamsChange?: (next: OrganicParams) => void;
  targetInput: TargetInput;
  onTargetDivisiChange?: (market: 'tiktok' | 'shopee', val: number | null) => void;
  commissionParams: CommissionParams;
  onCommissionParamsChange?: (next: CommissionParams) => void;
  attendanceMap: Record<string, AttendanceInput>;
  onQuickHadirChange?: (hostName: string, hadir: number | null) => void;
  onSelectHost: (host: HostCommission) => void;
  sourceMode: 'live' | 'snapshot' | 'loading';
  fetchedAt: string;
  onRefreshSheets: () => void;
  isRefreshing: boolean;
  onOpenSyncModal: () => void;
}

export const LiveHostModule: React.FC<LiveHostModuleProps> = ({
  month,
  onMonthChange,
  aggregate,
  summary,
  hosts,
  targetInput,
  commissionParams,
  attendanceMap,
  onSelectHost,
  sourceMode: _sourceMode,
  fetchedAt: _fetchedAt,
  onRefreshSheets,
  isRefreshing,
  onOpenSyncModal: _onOpenSyncModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tableMode, setTableMode] = useState<'executive' | 'detailed'>('executive');

  const filteredHosts = hosts.filter((h) =>
    h.host.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCapaianBadgeClass = (capaian: number) => {
    if (capaian >= 1.0) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (capaian >= 0.7) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const getCapaianBarColor = (capaian: number) => {
    if (capaian >= 1.0) return 'bg-emerald-500';
    if (capaian >= 0.7) return 'bg-blue-500';
    return 'bg-rose-500';
  };

  // Donut chart percentages for Alokasi Pembayaran
  const plafon = Math.max(1, summary.anggaranMaksimal);
  const komisiPct = Math.min(100, (summary.totalKomisiUtama / plafon) * 100);
  const bonusPct = Math.min(100 - komisiPct, (summary.totalBonus / plafon) * 100);
  const sisaPct = Math.max(0, 100 - komisiPct - bonusPct);
  const usedPct = summary.anggaranMaksimal > 0 ? (summary.totalDibayar / summary.anggaranMaksimal) : 0;

  return (
    <div className="space-y-4">
      {/* Compact Module Header Toolbar (No Duplicate Buttons) */}
      <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Mic2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Komisi &amp; Bonus Live Host · {MONTH_LABEL_ID[month]} 2026
            </h2>
            <p className="text-2xs text-slate-500 truncate mt-0.5">
              Sumber: 03_DATABASE_LIVE (Direct GMV &amp; Absensi) + 09_ADS_TIKTOK + 10_ADS_SHOPEE + RAW ADS TT.
            </p>
          </div>
        </div>

        {/* Month Selector & Refresh Action */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="livehost-month-select" className="sr-only">
            Pilih Bulan Periode Live Host
          </label>
          <select
            id="livehost-month-select"
            value={month}
            onChange={(e) => onMonthChange(e.target.value as MonthName)}
            className="px-3 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-slate-100/80 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#127a60] transition"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {MONTH_LABEL_ID[m]} 2026
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onRefreshSheets}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#127a60] hover:bg-[#0e634e] text-white font-semibold text-xs transition shadow-2xs disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Menarik...' : 'Tarik Ulang Sheets'}</span>
          </button>
        </div>
      </div>

      {/* Missing Source Warnings (e.g., October has no Shopee) */}
      {(!aggregate.hasShopee || !aggregate.hasTikTok || aggregate.shopeeAdsTotal === null) && (
        <div
          role="alert"
          className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-950"
        >
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <b className="font-semibold">Data bulan {MONTH_LABEL_ID[month]} belum lengkap:</b>{' '}
            {!aggregate.hasTikTok && 'Data TikTok Live (03_DATABASE_LIVE / RAW ADS TT) belum tersedia. '}
            {!aggregate.hasShopee && 'Data Shopee Live (03_DATABASE_LIVE) belum tersedia. '}
            {aggregate.shopeeAdsTotal === null && 'Data Ads Shopee bulan ini (10_ADS_SHOPEE) belum diinput.'}
          </div>
        </div>
      )}

      {/* 4 Compact Executive KPI Cards (OpsFlow Tinted Squircle Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Omzet Organik (Blue Tint) */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-2xs font-medium text-slate-500">Omzet organik</span>
              <span className="inline-flex items-center gap-0.5 text-3xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 tabular-nums">
                <ArrowUpRight className="w-2.5 h-2.5" aria-hidden="true" />
                {formatPercent(
                  summary.totalTTOmzet + summary.totalSPOmzet > 0
                    ? summary.totalDasar / (summary.totalTTOmzet + summary.totalSPOmzet)
                    : 0,
                  1
                )}
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight tabular-nums mt-0.5 truncate">
              {formatCurrencyIDR(summary.totalDasar)}
            </div>
            <p className="text-2xs text-slate-500 truncate tabular-nums mt-1">
              Gross: {formatCurrencyIDR(summary.totalTTOmzet + summary.totalSPOmzet)}
            </p>
          </div>
        </div>

        {/* Card 2: Total Komisi + Bonus (Emerald Tint) */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-[#127a60] flex items-center justify-center shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <Coins className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-2xs font-medium text-slate-500">Total komisi + bonus</span>
              <span className="text-3xs font-semibold text-[#127a60] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 tabular-nums">
                {summary.hostsKomisiLengkap}/{summary.hostCount} Host
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-[#127a60] tracking-tight tabular-nums mt-0.5 truncate">
              {formatCurrencyIDR(summary.totalDibayar)}
            </div>
            <p className="text-2xs text-slate-500 truncate tabular-nums mt-1">
              {summary.totalDasar > 0
                ? `${formatPercent(summary.totalDibayar / summary.totalDasar, 2)} dari omzet organik`
                : '-'}
            </p>
          </div>
        </div>

        {/* Card 3: Anggaran Maksimal 1.5% (Amber Tint) */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <Percent className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-2xs font-medium text-slate-500">Anggaran maksimal</span>
              <span className="text-3xs font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                Plafon 1,5%
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight tabular-nums mt-0.5 truncate">
              {formatCurrencyIDR(summary.anggaranMaksimal)}
            </div>
            <p className="text-2xs text-slate-500 truncate tabular-nums mt-1">
              Bonus 0,2%: {formatCurrencyIDR(summary.plafonBonus)}
            </p>
          </div>
        </div>

        {/* Card 4: Sisa Anggaran (Teal Tint) */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-2xs font-medium text-slate-500">Sisa anggaran</span>
              <span className="text-3xs font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60">
                Tidak dibagi
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight tabular-nums mt-0.5 truncate">
              {formatCurrencyIDR(summary.sisaAnggaran)}
            </div>
            <p className="text-2xs text-slate-500 truncate mt-1">
              Efisiensi anggaran (1,5% plafon)
            </p>
          </div>
        </div>
      </div>

      {/* Division Progress & Allocation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Pencapaian Target Divisi Live */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">
                    Pencapaian Target Divisi Live
                  </h3>
                  <span
                    className={`text-2xs px-2.5 py-0.5 rounded-full font-semibold border ${
                      summary.faktorDivisi === 1.0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : summary.faktorDivisi === null
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    Faktor Pengali Divisi:{' '}
                    {summary.faktorDivisi === null
                      ? 'Belum dihitung'
                      : formatPercent(summary.faktorDivisi, 0)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Jika capaian divisi di bawah 100%, faktor pengali adalah {formatPercent(commissionParams.faktorDivisiBawah, 0)}. Jika tercapai penuh, pengali 100%.
                </p>
              </div>
              <div className="text-left sm:text-right bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70">
                <span className="text-2xs text-slate-500 block">Target Gabungan</span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {formatCurrencyIDR(summary.targetDivisi)}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-600">
                  Realisasi Organik Divisi: <b className="text-slate-900 tabular-nums">{formatCurrencyIDR(summary.totalDasar)}</b>
                </span>
                <span className="font-bold text-[#127a60] tabular-nums">
                  {summary.capaianDivisi === null
                    ? 'Target belum diisi'
                    : `${formatPercent(summary.capaianDivisi, 1)} dari Target`}
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (summary.capaianDivisi ?? 0) >= 1.0
                      ? 'bg-gradient-to-r from-emerald-500 to-[#127a60]'
                      : 'bg-gradient-to-r from-blue-500 to-[#127a60]'
                  }`}
                  style={{
                    width: `${Math.min(100, (summary.capaianDivisi ?? 0) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* TikTok Live & Shopee Live Breakdown Cards (Exact Labels Preserved) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" aria-hidden="true" />
                  TikTok Live
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  Target: {formatCurrencyIDR(targetInput.divisiTikTok)}
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900 tabular-nums">
                {formatCurrencyIDR(summary.totalTTOrganic)}
              </div>
              <div className="text-xs text-slate-500 mt-1.5 flex justify-between tabular-nums">
                <span>Gross: {formatCurrencyIDR(summary.totalTTOmzet)}</span>
                <span className="text-rose-600 font-semibold">
                  Biaya Ads: {formatCurrencyIDR(summary.totalTTBiaya)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  Shopee Live
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  Target: {formatCurrencyIDR(targetInput.divisiShopee)}
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900 tabular-nums">
                {formatCurrencyIDR(summary.totalSPOrganic)}
              </div>
              <div className="text-xs text-slate-500 mt-1.5 flex justify-between tabular-nums">
                <span>Siap Dikirim: {formatCurrencyIDR(summary.totalSPOmzet)}</span>
                <span className="text-rose-600 font-semibold">
                  Ads Shopee: {formatCurrencyIDR(summary.totalSPAds)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Alokasi Pembayaran Live Host (OpsFlow Donut Chart Style) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm text-slate-900">
                Alokasi Pembayaran Live Host
              </h3>
              <span className="text-2xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                Plafon {formatPercent(commissionParams.plafonTotal, 1)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Distribusi realisasi komisi, bonus, dan efisiensi anggaran.
            </p>

            {/* OpsFlow Donut Ring + Legend */}
            <div className="flex items-center gap-4 mb-4">
              <div
                className="relative w-24 h-24 shrink-0 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background:
                    plafon <= 0
                      ? '#F1F5F9'
                      : `conic-gradient(
                          #127a60 0% ${komisiPct}%,
                          #3B82F6 ${komisiPct}% ${komisiPct + bonusPct}%,
                          #F59E0B ${komisiPct + bonusPct}% 100%
                        )`,
                }}
                aria-label={`Donut chart alokasi: Komisi ${formatPercent(komisiPct, 0)}, Bonus ${formatPercent(bonusPct, 0)}, Sisa ${formatPercent(sisaPct, 0)}`}
              >
                {/* Inner white circle for donut hole */}
                <div className="w-[74px] h-[74px] bg-white rounded-full flex flex-col items-center justify-center text-center shadow-xs">
                  <span className="text-xs font-bold text-slate-900 tabular-nums">
                    {formatPercent(usedPct, 0)}
                  </span>
                  <span className="text-3xs text-slate-500">Terpakai</span>
                </div>
              </div>

              <div className="flex-1 space-y-2 text-xs min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-600 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#127a60] shrink-0" />
                    <span className="truncate">Komisi ({formatPercent(commissionParams.tarifUtama, 1)})</span>
                  </span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatCurrencyIDR(summary.totalKomisiUtama)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-600 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="truncate">Bonus ({commissionParams.shiftWajib} shift)</span>
                  </span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatCurrencyIDR(summary.totalBonus)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-600 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate">Sisa Anggaran</span>
                  </span>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    {formatCurrencyIDR(summary.sisaAnggaran)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500">Plafon Anggaran (1,5%):</span>
            <span className="font-bold text-slate-900 tabular-nums">
              {formatCurrencyIDR(summary.anggaranMaksimal)}
            </span>
          </div>
        </div>
      </div>

      {/* Host Data Table (OpsFlow Table with In-Cell Utilization Bars) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-bold text-base text-slate-900">
                Rincian host Scentplus
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold tabular-nums">
                {filteredHosts.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik nama host untuk melihat rincian perhitungan, menyesuaikan target, atau mengedit data absensi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div
              role="group"
              aria-label="Mode tampilan tabel"
              className="inline-flex rounded-xl bg-slate-100/90 p-1 text-xs border border-slate-200/80"
            >
              <button
                type="button"
                onClick={() => setTableMode('executive')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  tableMode === 'executive'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ringkas Eksekutif
              </button>
              <button
                type="button"
                onClick={() => setTableMode('detailed')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  tableMode === 'detailed'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rincian Kanal
              </button>
            </div>

            <div className="relative flex-1 sm:w-56">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="host-search-input" className="sr-only">
                Cari nama host
              </label>
              <input
                id="host-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama host..."
                className="w-full pl-9 pr-3 min-h-[38px] rounded-xl border border-slate-200/90 bg-slate-50/60 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#127a60] transition"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {tableMode === 'executive' ? (
            /* Mode Eksekutif */
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 text-slate-500 text-2xs uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-5">Host</th>
                  <th className="py-3.5 px-4 text-right">Omzet organik</th>
                  <th className="py-3.5 px-4 text-center">Target tercapai</th>
                  <th className="py-3.5 px-4 text-center">Kehadiran</th>
                  <th className="py-3.5 px-4 text-right">Komisi</th>
                  <th className="py-3.5 px-4 text-right">Bonus</th>
                  <th className="py-3.5 px-5 text-right">Total</th>
                  <th className="py-3.5 px-3 text-center">
                    <span className="sr-only">Detail</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHosts.map((host) => {
                  const attInput = attendanceMap[host.host];
                  const capPct = Math.min(100, Math.round((host.capaian ?? 0) * 100));
                  return (
                    <tr
                      key={host.host}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                      onClick={() => onSelectHost(host)}
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-start sm:items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs uppercase shrink-0"
                            aria-hidden="true"
                          >
                            {host.host.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 text-sm tracking-tight">
                                {host.host}
                              </p>
                              {host.target.total !== null && (
                                <span className="text-2xs text-slate-500 tabular-nums">
                                  Target {formatCurrencyIDR(host.target.total)}
                                </span>
                              )}
                            </div>
                            {attInput?.keterangan && (
                              <div className="mt-1">
                                <span
                                  title={attInput.keterangan}
                                  className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-medium max-w-xs sm:max-w-md truncate"
                                >
                                  <FileText className="w-3 h-3 text-amber-700 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{attInput.keterangan}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums text-xs">
                        {formatCurrencyIDR(host.dasarOrganik)}
                      </td>

                      {/* OpsFlow In-Cell Progress Bar + Percentage */}
                      <td className="py-3.5 px-4 text-center">
                        {host.capaian === null ? (
                          <span className="text-slate-400 font-mono">-</span>
                        ) : (
                          <div className="inline-flex items-center gap-2.5">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full rounded-full ${getCapaianBarColor(host.capaian)}`}
                                style={{ width: `${capPct}%` }}
                              />
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border tabular-nums ${getCapaianBadgeClass(
                                host.capaian
                              )}`}
                            >
                              {formatPercent(host.capaian, 1)}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-semibold text-slate-900 text-xs tabular-nums">
                            {host.attendance.kehadiran !== null
                              ? formatPercent(host.attendance.kehadiran, 1)
                              : '-'}
                          </span>
                          <span className="text-2xs text-slate-500 tabular-nums">
                            {attInput?.hadir ?? 0}/{commissionParams.shiftWajib} shift
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 tabular-nums text-xs">
                        {formatCurrencyIDR(host.komisiUtama)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 tabular-nums text-xs">
                        {formatCurrencyIDR(host.bonusKehadiran)}
                      </td>

                      <td className="py-3.5 px-5 text-right font-bold text-[#127a60] text-sm tabular-nums">
                        {formatCurrencyIDR(host.total)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <ChevronRight
                          className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition inline-block"
                          aria-hidden="true"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50/90 border-t border-slate-200/90 text-xs font-bold text-slate-900">
                <tr>
                  <td className="py-3.5 px-5">
                    Total Keseluruhan ({filteredHosts.length} Host)
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatCurrencyIDR(summary.totalDasar)}
                  </td>
                  <td className="py-3.5 px-4 text-center tabular-nums">
                    {summary.capaianDivisi !== null ? formatPercent(summary.capaianDivisi, 1) : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-600 font-medium">
                    Shift Wajib: {commissionParams.shiftWajib}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatCurrencyIDR(summary.totalKomisiUtama)}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatCurrencyIDR(summary.totalBonus)}
                  </td>
                  <td className="py-3.5 px-5 text-right text-[#127a60] text-sm tabular-nums">
                    {formatCurrencyIDR(summary.totalDibayar)}
                  </td>
                  <td className="py-3.5 px-3"></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            /* Mode Audit Kanal Lengkap */
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 text-slate-500 text-2xs uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-5">Nama Host</th>
                  <th className="py-3.5 px-3 text-right">TikTok Organik</th>
                  <th className="py-3.5 px-3 text-right">Shopee Organik</th>
                  <th className="py-3.5 px-3 text-right">Dasar Organik</th>
                  <th className="py-3.5 px-3 text-center min-w-[115px]">Capaian Target</th>
                  <th className="py-3.5 px-3 text-center min-w-[95px]">Hadir / {commissionParams.shiftWajib}</th>
                  <th className="py-3.5 px-3 text-right">Komisi Utama</th>
                  <th className="py-3.5 px-3 text-right">Bonus Hadir</th>
                  <th className="py-3.5 px-5 text-right">Total Komisi</th>
                  <th className="py-3.5 px-3 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHosts.map((host) => {
                  const attInput = attendanceMap[host.host];
                  const capPct = Math.min(100, Math.round((host.capaian ?? 0) * 100));
                  return (
                    <tr
                      key={host.host}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => onSelectHost(host)}
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-start sm:items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl bg-emerald-50 text-[#127a60] border border-emerald-100 flex items-center justify-center font-bold text-xs uppercase shrink-0"
                            aria-hidden="true"
                          >
                            {host.host.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm">{host.host}</p>
                            <span className="text-2xs text-slate-500 block tabular-nums">
                              Target:{' '}
                              {host.target.total !== null
                                ? formatCurrencyIDR(host.target.total)
                                : 'Belum diisi'}
                            </span>
                            {attInput?.keterangan && (
                              <span
                                title={attInput.keterangan}
                                className="mt-1 inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-medium max-w-xs truncate"
                              >
                                <FileText className="w-3 h-3 text-amber-700 shrink-0" aria-hidden="true" />
                                <span className="truncate">{attInput.keterangan}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 tabular-nums">
                        {formatCurrencyIDR(host.ttOrganic)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 tabular-nums">
                        {formatCurrencyIDR(host.spOrganic)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatCurrencyIDR(host.dasarOrganik)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        {host.capaian === null ? (
                          <span className="text-slate-400 font-mono">-</span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${getCapaianBarColor(host.capaian)}`}
                                  style={{ width: `${capPct}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-900 tabular-nums">
                                {formatPercent(host.capaian, 1)}
                              </span>
                            </div>
                            <span
                              className={`text-2xs px-2.5 py-0.5 rounded-md font-semibold mt-1 border whitespace-nowrap tabular-nums ${getCapaianBadgeClass(
                                host.capaian
                              )}`}
                            >
                              Pengali {formatPercent(host.pengali, 0)}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <div className="inline-flex items-baseline gap-1">
                            <span className="font-bold text-slate-900 text-xs tabular-nums">
                              {attInput?.hadir ?? '-'}
                            </span>
                            <span className="text-2xs text-slate-500 tabular-nums">
                              / {commissionParams.shiftWajib}
                            </span>
                          </div>
                          {host.attendance.tarif !== null && (
                            <span className="text-2xs text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 tabular-nums whitespace-nowrap">
                              <CalendarCheck className="w-3 h-3" aria-hidden="true" />
                              +{formatPercent(host.attendance.tarif, 2)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 tabular-nums">
                        {formatCurrencyIDR(host.komisiUtama)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 tabular-nums">
                        {formatCurrencyIDR(host.bonusKehadiran)}
                      </td>

                      <td className="py-3.5 px-5 text-right font-bold text-[#127a60] text-sm tabular-nums">
                        {formatCurrencyIDR(host.total)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectHost(host);
                          }}
                          aria-label={`Buka audit detail ${host.host}`}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                        >
                          <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50/90 border-t border-slate-200/90 text-xs font-bold text-slate-900">
                <tr>
                  <td className="py-3.5 px-5">
                    Total Keseluruhan ({filteredHosts.length} Host)
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatCurrencyIDR(summary.totalTTOrganic)}
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatCurrencyIDR(summary.totalSPOrganic)}
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatCurrencyIDR(summary.totalDasar)}
                  </td>
                  <td className="py-3.5 px-3 text-center tabular-nums">
                    {summary.capaianDivisi !== null ? formatPercent(summary.capaianDivisi, 1) : '-'}
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-600 font-medium">
                    Wajib {commissionParams.shiftWajib}
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatCurrencyIDR(summary.totalKomisiUtama)}
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">
                    {formatCurrencyIDR(summary.totalBonus)}
                  </td>
                  <td className="py-3.5 px-5 text-right text-[#127a60] text-sm tabular-nums">
                    {formatCurrencyIDR(summary.totalDibayar)}
                  </td>
                  <td className="py-3.5 px-3"></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Unmapped / Non-Host Labels Notice */}
        {aggregate.unmapped.length > 0 && (
          <div className="bg-amber-50/80 px-5 py-3.5 border-t border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <b className="font-semibold">Label non-host dikeluarkan ({aggregate.unmapped.length}):</b>{' '}
              {aggregate.unmapped
                .map((u) => `${u.source} "${u.label}" (${u.rows} baris, ${formatCurrencyIDR(u.omzet)})`)
                .join(' · ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
