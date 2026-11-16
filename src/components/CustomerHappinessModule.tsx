import React, { useState, useMemo, useRef } from 'react';
import { CustomerHappinessSummary } from '../types';
import {
  HAPPINESS_CAMPAIGN_ROWS,
  HAPPINESS_10_INDICATORS,
  HappinessCampaignRow,
} from '../data/customerHappinessData';
import {
  formatCurrencyIDR,
  formatNumber,
  formatPercent,
} from '../utils/formatters';
import {
  CalendarDays,
  ListChecks,
  ChevronDown,
  ChevronUp,
  X,
  TrendingUp,
  MessagesSquare,
  UserCheck,
  CreditCard,
} from 'lucide-react';

interface CustomerHappinessModuleProps {
  summary?: CustomerHappinessSummary;
}

const PAGE_SIZE = 7;

export const CustomerHappinessModule: React.FC<CustomerHappinessModuleProps> = () => {
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'custom' | 'instagram'>('all');
  const [page, setPage] = useState<number>(0);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [isScoringOpen, setIsScoringOpen] = useState<boolean>(false);

  const scoringRef = useRef<HTMLDivElement>(null);

  // Filtered rows for the campaign table
  const filteredRows = useMemo(() => {
    return HAPPINESS_CAMPAIGN_ROWS.filter((r) => {
      if (selectedChannel === 'all') return true;
      return r.channel === selectedChannel;
    }).sort((a, b) => b.revenue - a.revenue || a.id - b.id);
  }, [selectedChannel]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(() => {
    return filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  }, [filteredRows, currentPage]);

  // Totals for filtered rows (table footer)
  const filteredTotals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => ({
        chats: acc.chats + r.chats,
        leads: acc.leads + r.leads,
        paid: acc.paid + r.paid,
        revenue: acc.revenue + r.revenue,
      }),
      { chats: 0, leads: 0, paid: 0, revenue: 0 }
    );
  }, [filteredRows]);

  // Overall totals across all 28 campaigns (October 2026 baseline)
  const grandTotals = useMemo(() => {
    return HAPPINESS_CAMPAIGN_ROWS.reduce(
      (acc, r) => ({
        chats: acc.chats + r.chats,
        leads: acc.leads + r.leads,
        paid: acc.paid + r.paid,
        revenue: acc.revenue + r.revenue,
      }),
      { chats: 0, leads: 0, paid: 0, revenue: 0 }
    );
  }, []);

  // Channel breakdown (Custom vs Instagram)
  const channelBreakdown = useMemo(() => {
    const customRows = HAPPINESS_CAMPAIGN_ROWS.filter((r) => r.channel === 'custom');
    const igRows = HAPPINESS_CAMPAIGN_ROWS.filter((r) => r.channel === 'instagram');

    const sum = (rows: HappinessCampaignRow[]) =>
      rows.reduce(
        (acc, r) => ({
          count: acc.count + 1,
          chats: acc.chats + r.chats,
          leads: acc.leads + r.leads,
          paid: acc.paid + r.paid,
          revenue: acc.revenue + r.revenue,
        }),
        { count: 0, chats: 0, leads: 0, paid: 0, revenue: 0 }
      );

    const custom = sum(customRows);
    const instagram = sum(igRows);
    const totalRev = grandTotals.revenue || 1;

    return {
      custom: {
        ...custom,
        sharePct: (custom.revenue / totalRev) * 100,
      },
      instagram: {
        ...instagram,
        sharePct: (instagram.revenue / totalRev) * 100,
      },
    };
  }, [grandTotals]);

  // Top 5 ranking campaigns by revenue
  const top5Campaigns = useMemo(() => {
    return [...HAPPINESS_CAMPAIGN_ROWS]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, []);

  // Selected campaign for detail panel
  const selectedCampaign = useMemo(() => {
    if (selectedCampaignId === null) return null;
    return HAPPINESS_CAMPAIGN_ROWS.find((r) => r.id === selectedCampaignId) ?? null;
  }, [selectedCampaignId]);

  const handleOpenKetentuan = () => {
    setIsScoringOpen(true);
    setTimeout(() => {
      scoringRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* 1. Header Banner & Title Area (Compact) */}
      <div className="bg-white rounded-xl px-4 py-3.5 border border-slate-200/90 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xs font-bold tracking-widest text-[#127a60] uppercase">
                ACQUISITION PERFORMANCE
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-[#fff6e7] text-[#8c5e18] border border-amber-200">
                Pratinjau modul
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              KPI Customer Happiness · Tri
            </h1>
            <p className="text-2xs text-slate-500 mt-0.5">
              Kontribusi akuisisi, campaign, dan aktivasi channel (Periode laporan dan penilaian KPI ditampilkan terpisah).
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#e6f4ee] text-[#127a60]">
              <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
              Oktober 2026
            </span>

            <button
              type="button"
              onClick={handleOpenKetentuan}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#127a60]"
            >
              <ListChecks className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>Lihat ketentuan KPI</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top 4 Executive Stat Cards (Compact OpsFlow Tinted Squircle Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" aria-label="Ringkasan performa Oktober">
        {/* Stat 1: Revenue Attribution (Emerald Tint) */}
        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-white rounded-xl p-3.5 border border-emerald-100/90 shadow-card flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-emerald-100/80 border border-emerald-200/60 text-[#127a60] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xs font-medium text-slate-500 block truncate">Revenue attribution</span>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight tabular-nums mt-0.5 truncate">
              {formatCurrencyIDR(grandTotals.revenue)}
            </div>
            <p className="text-2xs text-slate-500 mt-0.5 truncate">Kontribusi seluruh campaign</p>
          </div>
        </div>

        {/* Stat 2: Chats (Blue Tint) */}
        <div className="bg-gradient-to-br from-blue-50/50 via-white to-white rounded-xl p-3.5 border border-blue-100/90 shadow-card flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-blue-100/80 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <MessagesSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xs font-medium text-slate-500 block truncate">Chats</span>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight tabular-nums mt-0.5">
              {formatNumber(grandTotals.chats)}
            </div>
            <p className="text-2xs text-slate-500 mt-0.5 truncate">Percakapan seluruh campaign</p>
          </div>
        </div>

        {/* Stat 3: Leads (Amber Tint) */}
        <div className="bg-gradient-to-br from-amber-50/50 via-white to-white rounded-xl p-3.5 border border-amber-100/90 shadow-card flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-amber-100/80 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xs font-medium text-slate-500 block truncate">Leads</span>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight tabular-nums mt-0.5">
              {formatNumber(grandTotals.leads)}
            </div>
            <p className="text-2xs text-slate-500 mt-0.5 truncate">Leads seluruh campaign</p>
          </div>
        </div>

        {/* Stat 4: Paid (Teal Tint) */}
        <div className="bg-gradient-to-br from-teal-50/50 via-white to-white rounded-xl p-3.5 border border-teal-100/90 shadow-card flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-teal-100/80 border border-teal-200/60 text-teal-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xs font-medium text-slate-500 block truncate">Paid</span>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight tabular-nums mt-0.5">
              {formatNumber(grandTotals.paid)}
            </div>
            <p className="text-2xs text-slate-500 mt-0.5 truncate">Paid seluruh campaign</p>
          </div>
        </div>
      </div>

      {/* 3. 2-Column Grid: Channel Breakdown & KPI Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel 1: Kontribusi Channel */}
        <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card flex flex-col justify-between" aria-label="Revenue per channel">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Kontribusi channel</h2>
              <span className="text-2xs text-slate-500 font-medium">Revenue Oktober</span>
            </div>

            {/* Stack Bar */}
            <div
              className="flex h-3 rounded-md overflow-hidden bg-slate-100 mb-4"
              role="img"
              aria-label={`Custom ${formatPercent(channelBreakdown.custom.sharePct / 100, 2)}; Instagram ${formatPercent(channelBreakdown.instagram.sharePct / 100, 2)}`}
            >
              <div
                className="bg-[#127a60] transition-all"
                style={{ width: `${channelBreakdown.custom.sharePct}%` }}
                title={`Custom: ${formatPercent(channelBreakdown.custom.sharePct / 100, 2)}`}
              />
              <div
                className="bg-[#597c9a] transition-all"
                style={{ width: `${channelBreakdown.instagram.sharePct}%` }}
                title={`Instagram: ${formatPercent(channelBreakdown.instagram.sharePct / 100, 2)}`}
              />
            </div>

            {/* Channel List */}
            <div className="divide-y divide-slate-100">
              {/* Custom */}
              <div className="py-2.5">
                <div className="flex items-center justify-between text-xs">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-xs bg-[#127a60] inline-block" aria-hidden="true" />
                    Custom
                  </h3>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatCurrencyIDR(channelBreakdown.custom.revenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                  <span>
                    {channelBreakdown.custom.count} baris · {channelBreakdown.custom.chats} chats · {channelBreakdown.custom.leads} leads
                  </span>
                  <span className="font-medium text-slate-700 tabular-nums">
                    {formatPercent(channelBreakdown.custom.sharePct / 100, 2)}
                  </span>
                </div>
              </div>

              {/* Instagram */}
              <div className="py-2.5">
                <div className="flex items-center justify-between text-xs">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-xs bg-[#597c9a] inline-block" aria-hidden="true" />
                    Instagram
                  </h3>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatCurrencyIDR(channelBreakdown.instagram.revenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-2xs text-slate-500 mt-1">
                  <span>
                    {channelBreakdown.instagram.count} baris · {channelBreakdown.instagram.chats} chats · {channelBreakdown.instagram.leads} leads
                  </span>
                  <span className="font-medium text-slate-700 tabular-nums">
                    {formatPercent(channelBreakdown.instagram.sharePct / 100, 2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-2xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            Distribusi kontribusi revenue menurut channel akuisisi.
          </p>
        </section>

        {/* Panel 2: Status Perhitungan KPI */}
        <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Status perhitungan KPI</h2>
              <span className="inline-flex items-center gap-1 text-2xs px-2.5 py-0.5 rounded-md font-semibold bg-[#fff6e7] text-[#8c5e18] border border-amber-200">
                November 2026
              </span>
            </div>

            {/* KPI State Symbol */}
            <div className="flex items-center gap-3.5 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-400">
                —
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 tracking-tight">Belum dapat dihitung</div>
                <div className="text-2xs text-slate-500">Realisasi periode penilaian belum tersedia</div>
              </div>
            </div>

            {/* Metric Lines */}
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-600">Bobot KPI utama</span>
                <strong className="text-slate-900 font-bold">100%</strong>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-600">Batas skor utama</span>
                <strong className="text-slate-900 font-bold">120 poin</strong>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-600">Bonus growth</span>
                <strong className="text-slate-900 font-bold">Terpisah dari skor</strong>
              </div>
            </div>
          </div>

          <p className="text-2xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            Input belum tersedia ditampilkan sebagai “—”, bukan nol. Nilai baseline tidak menjadi realisasi November.
          </p>
        </section>
      </div>

      {/* 4. Perbandingan & Target KPI Panel */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card" aria-label="Baseline dan target KPI November">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Perbandingan &amp; target KPI</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-2xs font-semibold bg-[#e6f4ee] text-[#127a60] border border-emerald-200">
            Skema November · usulan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-600 text-2xs uppercase tracking-wider font-semibold border-b border-slate-200/90">
              <tr>
                <th scope="col" className="py-3 px-4">Komponen</th>
                <th scope="col" className="py-3 px-3 text-right">Bobot</th>
                <th scope="col" className="py-3 px-3">Baseline Oktober</th>
                <th scope="col" className="py-3 px-3">Target November</th>
                <th scope="col" className="py-3 px-3 text-right">Actual Nov</th>
                <th scope="col" className="py-3 px-4 text-right">Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/60 transition">
                <td className="py-3 px-4 font-bold text-slate-900">Revenue attribution</td>
                <td className="py-3 px-3 text-right font-medium tabular-nums">30%</td>
                <td className="py-3 px-3 tabular-nums">{formatCurrencyIDR(53275260)}</td>
                <td className="py-3 px-3 tabular-nums">{formatCurrencyIDR(53275260)}</td>
                <td className="py-3 px-3 text-right text-slate-400 font-mono">—</td>
                <td className="py-3 px-4 text-right text-slate-400 font-mono">—</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition">
                <td className="py-3 px-4 font-bold text-slate-900">Traffic acquisition</td>
                <td className="py-3 px-3 text-right font-medium tabular-nums">20%</td>
                <td className="py-3 px-3">448 chats*</td>
                <td className="py-3 px-3">448 unique chats valid</td>
                <td className="py-3 px-3 text-right text-slate-400 font-mono">—</td>
                <td className="py-3 px-4 text-right text-slate-400 font-mono">—</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition">
                <td className="py-3 px-4 font-bold text-slate-900">Total campaign</td>
                <td className="py-3 px-3 text-right font-medium tabular-nums">20%</td>
                <td className="py-3 px-3">28 entri*</td>
                <td className="py-3 px-3">28 campaign valid</td>
                <td className="py-3 px-3 text-right text-slate-400 font-mono">—</td>
                <td className="py-3 px-4 text-right text-slate-400 font-mono">—</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition">
                <td className="py-3 px-4 font-bold text-slate-900">Paid promote</td>
                <td className="py-3 px-3 text-right font-medium tabular-nums">20%</td>
                <td className="py-3 px-3 text-slate-500">Belum terpisah</td>
                <td className="py-3 px-3 font-semibold text-[#127a60]">ROAS 1,5×</td>
                <td className="py-3 px-3 text-right text-slate-400 font-mono">—</td>
                <td className="py-3 px-4 text-right text-slate-400 font-mono">—</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition">
                <td className="py-3 px-4 font-bold text-slate-900">Engagement &amp; activation</td>
                <td className="py-3 px-3 text-right font-medium tabular-nums">10%</td>
                <td className="py-3 px-3 text-slate-500">Belum tersedia</td>
                <td className="py-3 px-3">100% rencana disetujui</td>
                <td className="py-3 px-3 text-right text-slate-400 font-mono">—</td>
                <td className="py-3 px-4 text-right text-slate-400 font-mono">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-2xs text-slate-500 mt-3">
          *Traffic dinilai berdasarkan unique incoming chats valid. Campaign dinilai setelah memenuhi kriteria pelaksanaan dan evaluasi.
        </p>

        {/* Collapsible 10 Indicators */}
        <div ref={scoringRef} className="mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsScoringOpen(!isScoringOpen)}
            className="flex items-center justify-between w-full text-left text-xs font-semibold text-[#127a60] hover:text-emerald-800 transition py-1 cursor-pointer focus:outline-none"
          >
            <span className="flex items-center gap-1.5">
              Rincian 10 indikator &amp; kebutuhan data
            </span>
            {isScoringOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isScoringOpen && (
            <div className="mt-3 overflow-x-auto bg-slate-50/60 rounded-xl border border-slate-200/80 p-3">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="text-2xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">Indikator</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Bobot</th>
                    <th scope="col" className="py-2.5 px-3">Data penilaian yang dibutuhkan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {HAPPINESS_10_INDICATORS.map((ind, i) => (
                    <tr key={i} className="hover:bg-white/80 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{ind.name}</td>
                      <td className="py-2.5 px-3 text-right font-medium tabular-nums">{ind.bobotPct}%</td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">{ind.dataRequirements}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-2xs text-slate-500 mt-2.5 pt-2 border-t border-slate-200">
                Skor kuantitatif = min(actual ÷ target, 120%) × bobot. Metode planning/evaluasi dan rubrik efisiensi perlu disepakati. Paid revenue sudah termasuk dalam total revenue attribution.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 5. 2-Column Grid: Top 5 Campaigns & Bonus Revenue Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel 1: Top 5 Campaigns Ranking */}
        <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Campaign dengan revenue terbesar</h2>
              <span className="text-2xs text-slate-500 font-medium">5 baris teratas</span>
            </div>

            <div className="space-y-3.5">
              {top5Campaigns.map((camp, idx) => {
                const pct = (camp.revenue / grandTotals.revenue) * 100;
                return (
                  <div key={camp.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate max-w-[70%]">
                        {idx + 1}. {camp.name}
                      </span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatCurrencyIDR(camp.revenue)}
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full bg-slate-100 overflow-hidden"
                      role="img"
                      aria-label={`${camp.name}: ${formatPercent(pct / 100, 2)} dari total revenue`}
                    >
                      <div
                        className="h-full bg-[#127a60] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-2xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            Porsi kontribusi terhadap total revenue attribution.
          </p>
        </section>

        {/* Panel 2: Bonus Revenue Growth */}
        <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Bonus revenue growth</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Di luar KPI
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">Baseline Oktober</span>
                <strong className="text-slate-900 font-bold tabular-nums">
                  {formatCurrencyIDR(53275260)}
                </strong>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">Syarat growth</span>
                <strong className="text-slate-900 font-bold">≥30% MoM</strong>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">Ambang November</span>
                <strong className="text-slate-900 font-bold tabular-nums">
                  {formatCurrencyIDR(69257838)}
                </strong>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600">Actual November</span>
                <strong className="text-slate-400 font-mono font-bold">—</strong>
              </div>
            </div>

            <p className="text-xs font-semibold text-[#8c5e18] mt-3">
              Kelayakan bonus belum dapat dinilai.
            </p>
          </div>

          <p className="text-2xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            Revenue harus paid, tervalidasi, tanpa double attribution, tracking konsisten, serta budget paid promote disetujui. Nominal bonus ditetapkan manajemen.
          </p>
        </section>
      </div>

      {/* 6. Performa Campaign Table Panel with Filter, Pager & Detail Drawer */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card" id="hp-campaign-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Performa campaign</h2>
            <p className="text-2xs text-slate-500 mt-0.5">28 entri campaign/channel</p>
          </div>

          {/* Channel Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="hp-channel-filter" className="text-xs text-slate-600 font-medium">
              Channel:
            </label>
            <select
              id="hp-channel-filter"
              value={selectedChannel}
              onChange={(e) => {
                setSelectedChannel(e.target.value as 'all' | 'custom' | 'instagram');
                setPage(0);
                setSelectedCampaignId(null);
              }}
              className="py-1.5 px-3 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#127a60] cursor-pointer"
            >
              <option value="all">Semua channel</option>
              <option value="custom">Custom</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
        </div>

        {/* Campaign Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-600 text-2xs uppercase tracking-wider font-semibold border-b border-slate-200/90">
              <tr>
                <th scope="col" className="py-3 px-4">Campaign / channel</th>
                <th scope="col" className="py-3 px-3 text-right">Chats</th>
                <th scope="col" className="py-3 px-3 text-right">Leads</th>
                <th scope="col" className="py-3 px-3 text-right">Paid</th>
                <th scope="col" className="py-3 px-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.map((r) => {
                const isSelected = selectedCampaignId === r.id;
                return (
                  <tr
                    key={r.id}
                    className={`transition ${isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50/80'}`}
                  >
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setSelectedCampaignId(isSelected ? null : r.id)}
                        className="text-left font-semibold text-slate-900 hover:text-[#127a60] underline underline-offset-3 decoration-slate-300 hover:decoration-[#127a60] transition cursor-pointer"
                      >
                        {r.name}
                      </button>
                      <div className="text-2xs text-slate-500 mt-0.5">
                        {r.channel} · {r.schedule || 'Jadwal belum tersedia'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-700">{r.chats}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-700">{r.leads}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-700">{r.paid}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">
                      {formatCurrencyIDR(r.revenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer Totals */}
            <tfoot className="bg-slate-50/90 font-semibold border-t-2 border-slate-300 text-slate-900">
              <tr>
                <td className="py-3 px-4">
                  Total pilihan · {filteredRows.length} baris
                </td>
                <td className="py-3 px-3 text-right tabular-nums font-mono">{filteredTotals.chats}</td>
                <td className="py-3 px-3 text-right tabular-nums font-mono">{filteredTotals.leads}</td>
                <td className="py-3 px-3 text-right tabular-nums font-mono">{filteredTotals.paid}</td>
                <td className="py-3 px-4 text-right tabular-nums font-mono font-bold text-slate-900">
                  {formatCurrencyIDR(filteredTotals.revenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pager Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
          <span className="text-2xs text-slate-500" aria-live="polite">
            {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredRows.length)} dari {filteredRows.length} baris · halaman {currentPage + 1}/{totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Halaman sebelumnya"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Halaman berikutnya"
            >
              Berikutnya
            </button>
          </div>
        </div>

        {/* Campaign Detail Drawer (When clicked) */}
        {selectedCampaign && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-xs transition" aria-live="polite">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">{selectedCampaign.name}</h3>
              <button
                type="button"
                onClick={() => setSelectedCampaignId(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tutup detail</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3.5">
              <div>
                <span className="block text-2xs text-slate-500">ID campaign</span>
                <span className="font-semibold text-slate-800 font-mono">
                  CH-{String(selectedCampaign.id).padStart(3, '0')}
                </span>
              </div>
              <div>
                <span className="block text-2xs text-slate-500">Status campaign</span>
                <span className="font-semibold text-emerald-800">
                  {selectedCampaign.status === 'active' ? 'Aktif' : selectedCampaign.status}
                </span>
              </div>
              <div>
                <span className="block text-2xs text-slate-500">Jadwal campaign</span>
                <span className="font-semibold text-slate-800">
                  {selectedCampaign.schedule || 'Belum dijadwalkan'}
                </span>
              </div>
              <div>
                <span className="block text-2xs text-slate-500">Channel</span>
                <span className="font-semibold text-slate-800 capitalize">{selectedCampaign.channel}</span>
              </div>
              <div>
                <span className="block text-2xs text-slate-500">Chats / Leads / Paid</span>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {selectedCampaign.chats} / {selectedCampaign.leads} / {selectedCampaign.paid}
                </span>
              </div>
              <div>
                <span className="block text-2xs text-slate-500">Revenue attribution</span>
                <span className="font-bold text-emerald-800 tabular-nums">
                  {formatCurrencyIDR(selectedCampaign.revenue)}
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="text-2xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
          Filter berlaku pada daftar campaign. Ringkasan menampilkan seluruh channel pada periode laporan.
        </p>
      </section>

      {/* 7. Monitoring KPI (Tindak Lanjut) */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card" id="hp-validation">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Monitoring KPI</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Tindak lanjut
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-l-2 border-[#127a60] pl-3 py-1">
            <strong className="block text-xs font-bold text-slate-900 mb-1">Paid promote</strong>
            <p className="text-2xs text-slate-600 leading-relaxed">
              ROAS dan CPL ditampilkan setelah biaya aktual, paid revenue, dan valid paid leads tersedia.
            </p>
          </div>
          <div className="border-l-2 border-[#597c9a] pl-3 py-1">
            <strong className="block text-xs font-bold text-slate-900 mb-1">Aktivasi channel</strong>
            <p className="text-2xs text-slate-600 leading-relaxed">
              Pantau realisasi community, social media, dan CTA terhadap kalender aktivitas yang disetujui.
            </p>
          </div>
          <div className="border-l-2 border-amber-400 pl-3 py-1">
            <strong className="block text-xs font-bold text-slate-900 mb-1">Evaluasi campaign</strong>
            <p className="text-2xs text-slate-600 leading-relaxed">
              Lengkapi objective, materi, CTA, tracking, bukti pelaksanaan, hasil, dan tindak lanjut.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Module Footer */}
      <div className="text-2xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 px-1">
        <span>Tri: akuisisi &amp; campaign · CS Sales: handling &amp; closing</span>
        <span>Pratinjau modul · data contoh</span>
      </div>
    </div>
  );
};
