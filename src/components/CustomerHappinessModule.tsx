import React, { useState, useMemo } from 'react';
import { CustomerHappinessSummary } from '../types';
import {
  HAPPINESS_CAMPAIGN_ROWS,
  HAPPINESS_10_INDICATORS,
  HAPPINESS_DAILY_TRAFFIC,
  HAPPINESS_AFTERSALES_DATA,
  HappinessSubChannel,
} from '../data/customerHappinessData';
import {
  formatCurrencyIDR,
  formatNumber,
  formatPercent,
} from '../utils/formatters';
import {
  CalendarDays,
  ListChecks,
  X,
  TrendingUp,
  MessagesSquare,
  UserCheck,
  Package,
  PackageCheck,
  Layers,
  BarChart3,
  ShoppingBag,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface CustomerHappinessModuleProps {
  summary?: CustomerHappinessSummary;
}

const PAGE_SIZE = 7;

type ViewMode = 'overview' | 'daily' | 'aftersales' | 'rubric';

export const CustomerHappinessModule: React.FC<CustomerHappinessModuleProps> = () => {
  const [activeView, setActiveView] = useState<ViewMode>('overview');
  const [selectedSubChannel, setSelectedSubChannel] = useState<'all' | HappinessSubChannel>('all');
  const [page, setPage] = useState<number>(0);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [dailyMetric, setDailyMetric] = useState<'revenue' | 'chats' | 'leads' | 'aov'>('revenue');
  const [aftersalesFilter, setAftersalesFilter] = useState<'all' | 'akan_dikirim' | 'sedang_dikirim' | 'sudah_diterima'>('all');



  // Filtered rows for the campaign table
  const filteredRows = useMemo(() => {
    return HAPPINESS_CAMPAIGN_ROWS.filter((r) => {
      if (selectedSubChannel === 'all') return true;
      return r.subChannel === selectedSubChannel;
    }).sort((a, b) => b.revenue - a.revenue || a.id - b.id);
  }, [selectedSubChannel]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(() => {
    return filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  }, [filteredRows, currentPage]);

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

  // Overall AOV
  const overallAov = useMemo(() => {
    return grandTotals.paid > 0 ? Math.round(grandTotals.revenue / grandTotals.paid) : 0;
  }, [grandTotals]);

  // Filtered totals for campaign table footer
  const filteredTotals = useMemo(() => {
    const res = filteredRows.reduce(
      (acc, r) => ({
        chats: acc.chats + r.chats,
        leads: acc.leads + r.leads,
        paid: acc.paid + r.paid,
        revenue: acc.revenue + r.revenue,
      }),
      { chats: 0, leads: 0, paid: 0, revenue: 0 }
    );
    const aov = res.paid > 0 ? Math.round(res.revenue / res.paid) : 0;
    return { ...res, aov };
  }, [filteredRows]);

  // Detailed Source Performance Breakdown (Persentase % & Sub-channels)
  const sourcePerformance = useMemo(() => {
    const subChannels: HappinessSubChannel[] = [
      'ScentplusClub',
      'Instagram',
      'TikTok',
      'StoryWA',
      'Threads',
    ];

    const totalRev = grandTotals.revenue || 1;
    const totalChats = grandTotals.chats || 1;
    const totalLeads = grandTotals.leads || 1;
    const totalPaid = grandTotals.paid || 1;

    return subChannels.map((sc) => {
      const rows = HAPPINESS_CAMPAIGN_ROWS.filter((r) => r.subChannel === sc);
      const revenue = rows.reduce((acc, r) => acc + r.revenue, 0);
      const chats = rows.reduce((acc, r) => acc + r.chats, 0);
      const leads = rows.reduce((acc, r) => acc + r.leads, 0);
      const paid = rows.reduce((acc, r) => acc + r.paid, 0);
      const aov = paid > 0 ? Math.round(revenue / paid) : 0;
      const cvr = chats > 0 ? (paid / chats) * 100 : 0;

      return {
        subChannel: sc,
        count: rows.length,
        revenue,
        chats,
        leads,
        paid,
        aov,
        cvr,
        shareRevPct: (revenue / totalRev) * 100,
        shareChatsPct: (chats / totalChats) * 100,
        shareLeadsPct: (leads / totalLeads) * 100,
        sharePaidPct: (paid / totalPaid) * 100,
      };
    }).sort((a, b) => b.revenue - a.revenue);
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

  // Filtered aftersales tickets
  const filteredTickets = useMemo(() => {
    if (aftersalesFilter === 'all') return HAPPINESS_AFTERSALES_DATA.tickets;
    return HAPPINESS_AFTERSALES_DATA.tickets.filter((t) => t.packageStatus === aftersalesFilter);
  }, [aftersalesFilter]);

  // Max value calculation for Daily Chart scaling
  const dailyMaxVal = useMemo(() => {
    if (dailyMetric === 'revenue') {
      return Math.max(...HAPPINESS_DAILY_TRAFFIC.map((d) => d.revenue));
    }
    if (dailyMetric === 'chats') {
      return Math.max(...HAPPINESS_DAILY_TRAFFIC.map((d) => d.chats));
    }
    if (dailyMetric === 'leads') {
      return Math.max(...HAPPINESS_DAILY_TRAFFIC.map((d) => d.leads));
    }
    return Math.max(...HAPPINESS_DAILY_TRAFFIC.map((d) => d.aov));
  }, [dailyMetric]);



  const getSubChannelBadge = (subChannel: HappinessSubChannel) => {
    switch (subChannel) {
      case 'ScentplusClub':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Instagram':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'TikTok':
        return 'bg-violet-50 text-violet-800 border-violet-200';
      case 'StoryWA':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Threads':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* 1. Header Banner & View Controls */}
      <div className="bg-white rounded-xl px-4 py-3.5 border border-slate-200/90 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xs font-bold tracking-widest text-[#127a60] uppercase">
                CUSTOMER HAPPINESS &amp; RETENTION
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-3xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Operasional Aktif
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              Customer Happiness &amp; Retention · Tri
            </h1>
            <p className="text-2xs text-slate-500 mt-0.5">
              Akuisisi Multi-Channel, AOV, Traffic Harian, dan After-Sales Upselling via WACommerce.
            </p>
          </div>

          {/* Period Badge */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              Oktober 2026
            </span>
          </div>
        </div>

        {/* Segmented View Control (Executive Segmented Control) */}
        <div className="bg-slate-100/90 p-1 rounded-xl inline-flex flex-wrap gap-1 border border-slate-200/80 mt-3">
          <button
            type="button"
            onClick={() => setActiveView('overview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
              activeView === 'overview'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Overview &amp; Channel Share</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('daily')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
              activeView === 'daily'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Traffic Day by Day</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('aftersales')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
              activeView === 'aftersales'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-slate-500" />
            <span>After-Sales &amp; Upsell WACommerce</span>
            <span className="px-1.5 py-0.2 rounded-full text-3xs font-semibold bg-emerald-100 text-emerald-800 ml-0.5">
              {HAPPINESS_AFTERSALES_DATA.upsellClosingCount} Won
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('rubric')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
              activeView === 'rubric'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5 text-slate-500" />
            <span>Ketentuan &amp; Target KPI</span>
          </button>
        </div>
      </div>

      {/* 2. Top 5 Executive Stat Cards (Clean Executive Cards, No Rainbow Gradient) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" aria-label="Ringkasan performa utama Customer Happiness">
        {/* Stat 1: Revenue Attribution */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-card flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-2xs font-semibold text-slate-500 truncate">Revenue Attribution</span>
            <div className="w-6 h-6 rounded-md bg-[#EAF2E8] text-[#133326] flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-sans tabular-nums truncate my-0.5">
            {formatCurrencyIDR(grandTotals.revenue)}
          </div>
          <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-400">
            <span>Cakupan:</span>
            <span className="font-semibold text-slate-700">28 Kampanye Aktif</span>
          </div>
        </div>

        {/* Stat 2: AOV (Average Order Value) - Req Tri */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-card flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-2xs font-semibold text-slate-500 truncate">AOV (Rata-rata Order)</span>
            <div className="w-6 h-6 rounded-md bg-[#EAF2E8] text-[#133326] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-sans tabular-nums truncate my-0.5">
            {formatCurrencyIDR(overallAov)}
          </div>
          <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-400">
            <span>Rasio:</span>
            <span className="font-semibold text-slate-700">Omzet ÷ {grandTotals.paid} Paid</span>
          </div>
        </div>

        {/* Stat 3: Chats & Traffic */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-card flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-2xs font-semibold text-slate-500 truncate">Incoming Chats</span>
            <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <MessagesSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-sans tabular-nums truncate my-0.5">
            {formatNumber(grandTotals.chats)}
          </div>
          <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-400">
            <span>Traffic:</span>
            <span className="font-semibold text-slate-700">Deduplikasi Valid</span>
          </div>
        </div>

        {/* Stat 4: Leads & Paid */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-card flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-2xs font-semibold text-slate-500 truncate">Leads &amp; Paid Won</span>
            <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-sans tabular-nums truncate my-0.5">
            {formatNumber(grandTotals.leads)} <span className="text-xs font-normal text-slate-400">/ {grandTotals.paid}</span>
          </div>
          <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-400">
            <span>Konversi:</span>
            <span className="font-semibold text-emerald-800">{formatPercent(grandTotals.paid / grandTotals.chats, 1)} CVR</span>
          </div>
        </div>

        {/* Stat 5: After-Sales Upsell Revenue (WACommerce) - Req Tri */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-card flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-2xs font-semibold text-slate-500 truncate">After-Sales Upsell</span>
            <div className="w-6 h-6 rounded-md bg-[#EAF2E8] text-[#133326] flex items-center justify-center shrink-0">
              <PackageCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-sans tabular-nums truncate my-0.5">
            {formatCurrencyIDR(HAPPINESS_AFTERSALES_DATA.totalUpsellRevenue)}
          </div>
          <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-400">
            <span>Closing WA:</span>
            <span className="font-semibold text-emerald-800">{HAPPINESS_AFTERSALES_DATA.upsellClosingCount} Won ({formatPercent(HAPPINESS_AFTERSALES_DATA.upsellConversionPct / 100, 1)})</span>
          </div>
        </div>
      </div>

      {/* 3. Insight Operasional Harian (Clean Executive Briefing, Anti AI-Slop, No Emojis, Quiet Chrome) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-card">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#127a60]" aria-hidden="true" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Insight Operasional Hari Ini · Tri Customer Happiness
            </h2>
          </div>
          <span className="text-3xs font-mono text-slate-400">
            Periode Evaluasi Oktober
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="space-y-1">
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
              Akuisisi &amp; Saluran
            </span>
            <p className="leading-relaxed text-slate-700">
              <strong className="text-slate-900 font-semibold">ScentplusClub (SC)</strong> menyumbang <span className="font-semibold text-emerald-800">89,2%</span> dari total omzet akuisisi, sementara kanal Threads dan TikTok mulai berkontribusi pada leads baru.
            </p>
          </div>

          <div className="space-y-1 md:border-l md:border-slate-100 md:pl-4">
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
              Basket Size &amp; AOV
            </span>
            <p className="leading-relaxed text-slate-700">
              Rata-rata nilai belanja konsisten di angka <strong className="text-slate-900 font-semibold">{formatCurrencyIDR(overallAov)}</strong> per order, didorong transaksi bundling kampanye 925 dan promo Scentplus Day.
            </p>
          </div>

          <div className="space-y-1 md:border-l md:border-slate-100 md:pl-4">
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
              After-Sales &amp; Retensi
            </span>
            <p className="leading-relaxed text-slate-700">
              Dari 265 customer berstatus paket dikirim yang ditawari promo via WACommerce, <strong className="text-slate-900 font-semibold">58 customer</strong> berhasil closing repeat order baru (+Rp13,92 Juta).
            </p>
          </div>
        </div>
      </div>

      {/* VIEW 1: OVERVIEW & SOURCE PERFORMANCE (DEFAULT) */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          {/* Source Performance Section with Sub-channels & Percentages */}
          <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#127a60]" />
                  Kontribusi Channel &amp; Source Performance (%)
                </h2>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Rincian sub-channel akuisisi (ScentplusClub, Instagram, Threads, TikTok, Story WA) lengkap dengan proporsi omzet &amp; AOV.
                </p>
              </div>
              <span className="text-2xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md font-mono">
                Total: {formatCurrencyIDR(grandTotals.revenue)}
              </span>
            </div>

            {/* Visual Stack Bar */}
            <div className="mb-4">
              <div className="flex h-3.5 rounded-lg overflow-hidden bg-slate-100 p-0.5 border border-slate-200" role="img" aria-label="Distribusi revenue per sub-channel">
                {sourcePerformance.map((src) => (
                  <div
                    key={src.subChannel}
                    style={{ width: `${Math.max(src.shareRevPct, 1.5)}%` }}
                    className={`h-full transition-all ${
                      src.subChannel === 'ScentplusClub'
                        ? 'bg-[#127a60]'
                        : src.subChannel === 'Instagram'
                        ? 'bg-[#0284c7]'
                        : src.subChannel === 'TikTok'
                        ? 'bg-[#7c3aed]'
                        : src.subChannel === 'StoryWA'
                        ? 'bg-[#d97706]'
                        : 'bg-[#475569]'
                    }`}
                    title={`${src.subChannel}: ${formatPercent(src.shareRevPct / 100, 1)} (${formatCurrencyIDR(src.revenue)})`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-3xs text-slate-600">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-[#127a60]" /> ScentplusClub (SC)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-[#0284c7]" /> Instagram</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-[#7c3aed]" /> TikTok</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-[#d97706]" /> Story WA</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-[#475569]" /> Threads</span>
              </div>
            </div>

            {/* Source Performance Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {sourcePerformance.map((src) => (
                <div
                  key={src.subChannel}
                  className="bg-slate-50/70 hover:bg-slate-50 rounded-xl p-3 border border-slate-200/80 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-3xs font-bold border ${getSubChannelBadge(src.subChannel)}`}>
                        {src.subChannel === 'ScentplusClub' ? 'ScentplusClub (SC)' : src.subChannel}
                      </span>
                      <span className="text-xs font-bold text-[#127a60] font-mono tabular-nums">
                        {formatPercent(src.shareRevPct / 100, 1)}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900 tabular-nums">
                      {formatCurrencyIDR(src.revenue)}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/70 text-3xs space-y-1 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>AOV:</span>
                      <strong className="text-slate-900 font-semibold tabular-nums">{formatCurrencyIDR(src.aov)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Chats / Leads:</span>
                      <span className="tabular-nums">{src.chats} / {src.leads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Paid / CVR:</span>
                      <span className="font-semibold text-emerald-700 tabular-nums">{src.paid} ({formatPercent(src.cvr / 100, 1)})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2-Column: Top 5 Campaigns & Bonus Growth */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Panel 1: Top 5 Campaigns Ranking */}
            <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Campaign dengan Revenue Terbesar</h2>
                  <span className="text-2xs text-slate-500 font-medium">5 Baris Teratas</span>
                </div>

                <div className="space-y-3.5">
                  {top5Campaigns.map((camp, idx) => {
                    const pct = (camp.revenue / grandTotals.revenue) * 100;
                    return (
                      <div key={camp.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                            <span className="font-bold text-slate-400 text-2xs">{idx + 1}.</span>
                            <span className="font-semibold text-slate-800 truncate">{camp.name}</span>
                            <span className={`px-1.5 py-0.2 rounded text-3xs font-semibold border shrink-0 ${getSubChannelBadge(camp.subChannel)}`}>
                              {camp.subChannel}
                            </span>
                          </div>
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
                Porsi kontribusi terhadap total revenue attribution Scentplus Customer Happiness.
              </p>
            </section>

            {/* Panel 2: Bonus Revenue Growth */}
            <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Bonus Revenue Growth (30% MoM)</h2>
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
                    <span className="text-slate-600">Syarat Growth</span>
                    <strong className="text-slate-900 font-bold">≥30% MoM</strong>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-600">Target Ambang November</span>
                    <strong className="text-slate-900 font-bold tabular-nums">
                      {formatCurrencyIDR(69257838)}
                    </strong>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-600">Actual November</span>
                    <strong className="text-slate-400 font-mono font-bold">— (Dalam Proses)</strong>
                  </div>
                </div>

                <p className="text-xs font-semibold text-[#8c5e18] mt-3">
                  Kelayakan bonus dinilai setelah realisasi akhir bulan terverifikasi.
                </p>
              </div>

              <p className="text-2xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                Revenue harus paid, tervalidasi, tanpa double attribution, dan tracking konsisten.
              </p>
            </section>
          </div>
        </div>
      )}

      {/* VIEW 2: TRAFFIC DAY BY DAY (REQ TRI) */}
      {activeView === 'daily' && (
        <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#127a60]" />
                Traffic Day by Day (1–31 Oktober 2026)
              </h2>
              <p className="text-2xs text-slate-500 mt-0.5">
                Dinamika harian penjualan, perolehan leads, dan volume incoming chat.
              </p>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setDailyMetric('revenue')}
                className={`px-2.5 py-1 text-2xs font-semibold rounded-md transition ${
                  dailyMetric === 'revenue' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Penjualan (Rp)
              </button>
              <button
                type="button"
                onClick={() => setDailyMetric('chats')}
                className={`px-2.5 py-1 text-2xs font-semibold rounded-md transition ${
                  dailyMetric === 'chats' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chats
              </button>
              <button
                type="button"
                onClick={() => setDailyMetric('leads')}
                className={`px-2.5 py-1 text-2xs font-semibold rounded-md transition ${
                  dailyMetric === 'leads' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Leads
              </button>
              <button
                type="button"
                onClick={() => setDailyMetric('aov')}
                className={`px-2.5 py-1 text-2xs font-semibold rounded-md transition ${
                  dailyMetric === 'aov' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                AOV
              </button>
            </div>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80">
            <div className="h-44 w-full flex items-end gap-1 sm:gap-1.5 pt-6 pb-2">
              {HAPPINESS_DAILY_TRAFFIC.map((d) => {
                const val =
                  dailyMetric === 'revenue'
                    ? d.revenue
                    : dailyMetric === 'chats'
                    ? d.chats
                    : dailyMetric === 'leads'
                    ? d.leads
                    : d.aov;
                const heightPct = dailyMaxVal > 0 ? (val / dailyMaxVal) * 100 : 0;
                const isSpike = !!d.highlight;

                return (
                  <div
                    key={d.day}
                    className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none w-44">
                      <div className="bg-slate-900 text-white text-3xs rounded-lg p-2 shadow-xl border border-slate-700 leading-tight">
                        <div className="font-bold text-amber-300 mb-0.5">{d.date}</div>
                        {d.highlight && <div className="text-emerald-300 font-semibold mb-1">{d.highlight}</div>}
                        <div>Omzet: <strong className="tabular-nums">{formatCurrencyIDR(d.revenue)}</strong></div>
                        <div>Chats: <strong className="tabular-nums">{d.chats}</strong> · Leads: <strong className="tabular-nums">{d.leads}</strong></div>
                        <div>Paid: <strong className="tabular-nums">{d.paid}</strong> · AOV: <strong className="tabular-nums">{formatCurrencyIDR(d.aov)}</strong></div>
                      </div>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${Math.max(heightPct, 6)}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        isSpike
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : dailyMetric === 'revenue'
                          ? 'bg-[#127a60] hover:bg-emerald-700'
                          : dailyMetric === 'chats'
                          ? 'bg-sky-600 hover:bg-sky-700'
                          : dailyMetric === 'leads'
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    />
                    <span className="text-[10px] text-slate-500 mt-1 font-mono">{d.day}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-2xs text-slate-500 pt-2 border-t border-slate-200">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#127a60]" /> Nilai Harian Reguler
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 ml-2" /> Puncak Kampanye / Spike Event
              </span>
              <span>Total Periode: {formatCurrencyIDR(grandTotals.revenue)} ({grandTotals.chats} Chats · {grandTotals.leads} Leads · {grandTotals.paid} Paid)</span>
            </div>
          </div>

          {/* Daily Table Summary */}
          <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 sticky top-0 text-2xs uppercase tracking-wider text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Highlight Kampanye</th>
                  <th className="py-2.5 px-3 text-right">Incoming Chats</th>
                  <th className="py-2.5 px-3 text-right">Leads</th>
                  <th className="py-2.5 px-3 text-right">Paid Orders</th>
                  <th className="py-2.5 px-3 text-right">AOV</th>
                  <th className="py-2.5 px-3 text-right">Penjualan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {HAPPINESS_DAILY_TRAFFIC.map((d) => (
                  <tr key={d.day} className={`hover:bg-slate-50/80 transition ${d.highlight ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-2 px-3 font-mono font-medium text-slate-800">{d.date}</td>
                    <td className="py-2 px-3">
                      {d.highlight ? (
                        <span className="inline-flex items-center gap-1 text-3xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          {d.highlight}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-3xs">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{d.chats}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{d.leads}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-700">{d.paid}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrencyIDR(d.aov)}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-900">{formatCurrencyIDR(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* VIEW 3: AFTER-SALES & UPSELL WACOMMERCE (REQ TRI) */}
      {activeView === 'aftersales' && (
        <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-700" />
                After-Sales Pipeline &amp; Upselling (WACommerce)
              </h2>
              <p className="text-2xs text-slate-500 mt-0.5">
                Maintain pesanan aktif via WACommerce: edukasi resi paket + penawaran promo repeat order.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xs text-slate-600 font-medium">Filter Paket:</span>
              <select
                aria-label="Filter Status Paket After-Sales"
                value={aftersalesFilter}
                onChange={(e) => setAftersalesFilter(e.target.value as any)}
                className="py-1 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#127a60]"
              >
                <option value="all">Semua Status ({HAPPINESS_AFTERSALES_DATA.totalTickets})</option>
                <option value="akan_dikirim">Akan Dikirim ({HAPPINESS_AFTERSALES_DATA.akanDikirimCount})</option>
                <option value="sedang_dikirim">Sedang Dikirim ({HAPPINESS_AFTERSALES_DATA.sedangDikirimCount})</option>
                <option value="sudah_diterima">Sudah Diterima ({HAPPINESS_AFTERSALES_DATA.sudahDiterimaCount})</option>
              </select>
            </div>
          </div>

          {/* After-Sales Funnel Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-purple-50/60 rounded-xl p-3.5 border border-purple-100">
              <span className="text-2xs text-purple-800 font-semibold block">Total Paket Dimaintain</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                {HAPPINESS_AFTERSALES_DATA.totalTickets} Paket
              </div>
              <p className="text-3xs text-slate-600 mt-0.5">Pesanan aktif di sistem WACommerce</p>
            </div>

            <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100">
              <span className="text-2xs text-blue-800 font-semibold block">Ditawari Promo Baru</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                {HAPPINESS_AFTERSALES_DATA.offeredPromoCount} Cust
              </div>
              <p className="text-3xs text-slate-600 mt-0.5">84,9% tingkat follow-up penawaran</p>
            </div>

            <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-100">
              <span className="text-2xs text-emerald-800 font-semibold block">Closing Repeat Won (Upsell)</span>
              <div className="text-lg font-bold text-emerald-800 mt-0.5 tabular-nums">
                {HAPPINESS_AFTERSALES_DATA.upsellClosingCount} Closing
              </div>
              <p className="text-3xs text-emerald-700 mt-0.5">
                Konversi: <strong className="font-semibold">{formatPercent(HAPPINESS_AFTERSALES_DATA.upsellConversionPct / 100, 1)}</strong>
              </p>
            </div>

            <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-100">
              <span className="text-2xs text-amber-800 font-semibold block">Omzet Hasil Upsell</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                {formatCurrencyIDR(HAPPINESS_AFTERSALES_DATA.totalUpsellRevenue)}
              </div>
              <p className="text-3xs text-slate-600 mt-0.5">AOV Repeat: {formatCurrencyIDR(HAPPINESS_AFTERSALES_DATA.upsellAov)}</p>
            </div>
          </div>

          {/* Active Ticket Log Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">No. Order / Tiket</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Respon Upsell / Penawaran Promo</th>
                  <th className="py-2.5 px-3 text-right">Nilai Closing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((t) => {
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{t.orderNumber}</div>
                        <span className="text-3xs text-slate-400 font-mono">{t.id} · {t.lastUpdated}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-800">{t.customerName}</span>
                        <div className="text-3xs text-slate-500">{t.channel}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {t.upsellStatus === 'closing' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-3xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Closing Promo Baru
                            </span>
                            <div className="text-3xs text-slate-600 mt-0.5">{t.upsellCampaign}</div>
                          </div>
                        ) : t.upsellStatus === 'followup' ? (
                          <span className="inline-flex items-center gap-1 text-3xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-600" /> Dalam Follow-up
                          </span>
                        ) : (
                          <span className="text-slate-400 text-3xs">Belum Berminat</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {t.upsellRevenue > 0 ? (
                          <span className="text-emerald-700">{formatCurrencyIDR(t.upsellRevenue)}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* VIEW 4: RUBRIC & 10 INDIKATOR KPI */}
      {activeView === 'rubric' && (
        <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-[#127a60]" />
                Perbandingan &amp; Target KPI (10 Indikator)
              </h2>
              <p className="text-2xs text-slate-500 mt-0.5">
                Skema penilaian performa Tri Customer Happiness sesuai Brief Panduan Operasional.
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-2xs font-semibold bg-[#e6f4ee] text-[#127a60] border border-emerald-200">
              Skema November · Usulan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-2xs uppercase tracking-wider font-semibold border-b border-slate-200">
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
                  <td className="py-3 px-4 font-bold text-slate-900">Revenue Attribution</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">30%</td>
                  <td className="py-3 px-3 tabular-nums">{formatCurrencyIDR(53275260)}</td>
                  <td className="py-3 px-3 tabular-nums">{formatCurrencyIDR(53275260)}</td>
                  <td className="py-3 px-3 text-right text-slate-400 font-mono">—</td>
                  <td className="py-3 px-4 text-right text-slate-400 font-mono">—</td>
                </tr>
                <tr className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">Traffic Acquisition</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">20%</td>
                  <td className="py-3 px-3">448 chats*</td>
                  <td className="py-3 px-3">448 unique chats valid</td>
                  <td className="py-3 px-3 text-right text-slate-400 font-mono">—</td>
                  <td className="py-3 px-4 text-right text-slate-400 font-mono">—</td>
                </tr>
                <tr className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">Total Campaign</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">20%</td>
                  <td className="py-3 px-3">28 entri*</td>
                  <td className="py-3 px-3">28 campaign valid</td>
                  <td className="py-3 px-3 text-right text-slate-400 font-mono">—</td>
                  <td className="py-3 px-4 text-right text-slate-400 font-mono">—</td>
                </tr>
                <tr className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">Paid Promote</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">20%</td>
                  <td className="py-3 px-3 text-slate-500">Belum terpisah</td>
                  <td className="py-3 px-3 font-semibold text-[#127a60]">ROAS 1,5×</td>
                  <td className="py-3 px-3 text-right text-slate-400 font-mono">—</td>
                  <td className="py-3 px-4 text-right text-slate-400 font-mono">—</td>
                </tr>
                <tr className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">Engagement &amp; Activation</td>
                  <td className="py-3 px-3 text-right font-medium tabular-nums">10%</td>
                  <td className="py-3 px-3 text-slate-500">Belum tersedia</td>
                  <td className="py-3 px-3">100% rencana disetujui</td>
                  <td className="py-3 px-3 text-right text-slate-400 font-mono">—</td>
                  <td className="py-3 px-4 text-right text-slate-400 font-mono">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 10 Detailed Rubric Table */}
          <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-3.5 mt-3">
            <h3 className="text-xs font-bold text-slate-900 mb-2">Rincian Kebutuhan Data 10 Indikator</h3>
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="text-2xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th scope="col" className="py-2 px-3">Indikator</th>
                  <th scope="col" className="py-2 px-3 text-right">Bobot</th>
                  <th scope="col" className="py-2 px-3">Data Penilaian yang Dibutuhkan</th>
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
          </div>
        </section>
      )}

      {/* 5. Performa Campaign Table Panel with Sub-Channel Filter, AOV, Pager & Detail Drawer */}
      <section className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card" id="hp-campaign-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Performa Seluruh Campaign</h2>
            <p className="text-2xs text-slate-500 mt-0.5">
              Menampilkan {filteredRows.length} campaign · Termasuk metrik AOV &amp; Sub-Channel
            </p>
          </div>

          {/* Sub-Channel Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="hp-channel-filter" className="text-xs text-slate-600 font-medium">
              Sub-Channel:
            </label>
            <select
              id="hp-channel-filter"
              value={selectedSubChannel}
              onChange={(e) => {
                setSelectedSubChannel(e.target.value as any);
                setPage(0);
                setSelectedCampaignId(null);
              }}
              className="py-1.5 px-3 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#127a60] cursor-pointer"
            >
              <option value="all">Semua Sub-Channel ({HAPPINESS_CAMPAIGN_ROWS.length})</option>
              <option value="ScentplusClub">ScentplusClub / SC (12)</option>
              <option value="Instagram">Instagram (10)</option>
              <option value="Threads">Threads (4)</option>
              <option value="TikTok">TikTok (2)</option>
              <option value="StoryWA">Story WA (2)</option>
            </select>
          </div>
        </div>

        {/* Campaign Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-600 text-2xs uppercase tracking-wider font-semibold border-b border-slate-200/90">
              <tr>
                <th scope="col" className="py-3 px-3">ID</th>
                <th scope="col" className="py-3 px-4">Nama Campaign</th>
                <th scope="col" className="py-3 px-3">Sub-Channel</th>
                <th scope="col" className="py-3 px-3">Jadwal</th>
                <th scope="col" className="py-3 px-3 text-right">Chats</th>
                <th scope="col" className="py-3 px-3 text-right">Leads</th>
                <th scope="col" className="py-3 px-3 text-right">Paid</th>
                <th scope="col" className="py-3 px-3 text-right">AOV</th>
                <th scope="col" className="py-3 px-4 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.map((r) => {
                const isSelected = selectedCampaignId === r.id;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedCampaignId(isSelected ? null : r.id)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-emerald-50/80 font-medium'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="py-3 px-3 font-mono text-slate-400 text-3xs">#{r.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[220px] truncate" title={r.name}>
                      {r.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-3xs font-semibold border ${getSubChannelBadge(r.subChannel)}`}>
                        {r.subChannel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-3xs">
                      {r.schedule ? r.schedule : <span className="text-slate-400">Berkelanjutan</span>}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">{r.chats}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{r.leads}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-emerald-700">{r.paid}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-indigo-700 font-medium">
                      {r.aov > 0 ? formatCurrencyIDR(r.aov) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                      {formatCurrencyIDR(r.revenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50/80 text-slate-900 font-bold text-xs border-t border-slate-200">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-left">
                  Total {selectedSubChannel === 'all' ? 'Seluruh Campaign' : selectedSubChannel}
                </td>
                <td className="py-3 px-3 text-right tabular-nums">{filteredTotals.chats}</td>
                <td className="py-3 px-3 text-right tabular-nums">{filteredTotals.leads}</td>
                <td className="py-3 px-3 text-right tabular-nums text-emerald-800">{filteredTotals.paid}</td>
                <td className="py-3 px-3 text-right tabular-nums text-indigo-800">{formatCurrencyIDR(filteredTotals.aov)}</td>
                <td className="py-3 px-4 text-right tabular-nums text-[#127a60]">{formatCurrencyIDR(filteredTotals.revenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pager */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-600">
          <span>
            Halaman {currentPage + 1} dari {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200"
            >
              Selanjutnya
            </button>
          </div>
        </div>

        {/* Selected Campaign Drawer Detail */}
        {selectedCampaign && (
          <div className="mt-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/80 relative">
            <button
              type="button"
              aria-label="Tutup detail campaign"
              onClick={() => setSelectedCampaignId(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-3xs font-bold border ${getSubChannelBadge(selectedCampaign.subChannel)}`}>
                {selectedCampaign.subChannel}
              </span>
              <h3 className="text-sm font-bold text-slate-900">{selectedCampaign.name}</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs mt-3 pt-3 border-t border-emerald-200/60">
              <div>
                <span className="text-slate-500 text-3xs block">Revenue:</span>
                <strong className="text-slate-900 font-bold">{formatCurrencyIDR(selectedCampaign.revenue)}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-3xs block">AOV:</span>
                <strong className="text-indigo-700 font-bold">{selectedCampaign.aov > 0 ? formatCurrencyIDR(selectedCampaign.aov) : '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-3xs block">Paid Orders:</span>
                <strong className="text-emerald-700 font-bold">{selectedCampaign.paid}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-3xs block">Chats / Leads:</span>
                <strong className="text-slate-900 font-bold">{selectedCampaign.chats} / {selectedCampaign.leads}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-3xs block">Jadwal:</span>
                <span className="text-slate-700 font-mono text-3xs">{selectedCampaign.schedule || 'Berkelanjutan'}</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
