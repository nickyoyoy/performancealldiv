import React from 'react';
import { CrmSummary } from '../types';
import {
  formatCurrencyIDR,
  formatPercent,
  formatNumber,
} from '../utils/formatters';
import {
  Users,
  TrendingUp,
  Coins,
  CheckCircle2,
  XCircle,
  Percent,
  Crown,
  RefreshCw,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';

interface CrmModuleProps {
  summary: CrmSummary;
  selectedMonth?: string;
  onMonthChange?: (monthKey: string) => void;
  availableMonths?: { key: string; label: string }[];
  dataSource?: 'live' | 'snapshot';
  syncedAt?: string;
  isSyncing?: boolean;
  onRefreshLive?: () => void;
}

export const CrmModule: React.FC<CrmModuleProps> = ({
  summary,
  selectedMonth = '2026-09',
  onMonthChange,
  availableMonths = [
    { key: '2026-09', label: 'September 2026' },
    { key: '2026-10', label: 'Oktober 2026' },
    { key: '2026-11', label: 'November 2026' },
    { key: '2026-08', label: 'Agustus 2026' },
  ],
  dataSource = 'live',
  syncedAt,
  isSyncing = false,
  onRefreshLive,
}) => {
  // Compute column totals for table footer
  const totalPoin = summary.csList.reduce((acc, c) => acc + c.poin, 0);
  const totalOmzetValid = summary.csList.reduce((acc, c) => acc + c.omzetValid, 0);
  const totalKomisiOmzet = summary.csList.reduce((acc, c) => acc + c.komisiOmzet, 0);
  const totalBonusConv = summary.csList.reduce((acc, c) => acc + c.bonusConversion, 0);
  const totalBonusGrowth = summary.csList.reduce((acc, c) => acc + c.bonusGrowth, 0);
  const totalBrutoCs = summary.csList.reduce((acc, c) => acc + c.bruto, 0);
  const totalBersihCs = summary.csList.reduce((acc, c) => acc + c.bersih, 0);

  return (
    <div className="space-y-4">
      {/* Header Banner & Controls (Compact OpsFlow Toolbar) */}
      <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Komisi CRM · Customer Service &amp; Leader
              </h2>
              <span className="inline-flex items-center gap-1.5 text-2xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                {dataSource === 'live' ? 'WACOMMERCE Live REST API' : 'WACOMMERCE Local Snapshot'}
                {syncedAt && <span className="text-emerald-700/70 font-normal">({syncedAt})</span>}
              </span>
            </div>
            <p className="text-2xs text-slate-500 mt-0.5 truncate">
              Perhitungan Omzet Valid (Net Shipping), Bonus Conversion Poin, Bonus Growth 0,5% &amp; Potongan Sistem 5%.
            </p>
          </div>
        </div>

        {/* Month Selector & Sync Button */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onMonthChange && (
            <div className="relative inline-flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" aria-hidden="true" />
              <select
                aria-label="Pilih Periode CRM"
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#127a60] cursor-pointer transition"
              >
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {onRefreshLive && (
            <button
              type="button"
              onClick={onRefreshLive}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#127a60] hover:bg-[#0e634e] rounded-lg transition shadow-xs disabled:opacity-50 cursor-pointer"
              title="Tarik transaksi terbaru langsung dari server WACOMMERCE"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sync Live'}</span>
            </button>
          )}

          {/* Conversion Rate Team Badge */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg text-xs text-slate-800">
            <span className="font-semibold text-slate-500 text-2xs uppercase">Conv Tim:</span>
            <span className="font-bold text-xs text-[#127a60] font-mono tabular-nums">
              {formatPercent(summary.conversionRateTim, 1)}
            </span>
            <span className="text-2xs text-slate-300">·</span>
            <span className="text-2xs font-semibold text-slate-700">Pengali: {summary.pengaliConversionTim}</span>
          </div>
        </div>
      </div>

      {/* 4 Executive KPI Cards (Compact OpsFlow Tinted Squircle Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Omzet Valid CRM (Blue Tint) */}
        <div className="bg-gradient-to-br from-blue-50/50 via-white to-white rounded-xl p-3.5 border border-blue-100/90 shadow-card flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-blue-100/80 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-2xs font-medium text-slate-500 truncate">
                Total omzet valid ({summary.period})
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-2xs font-semibold px-1.5 py-0.5 rounded border tabular-nums shrink-0 ${
                  summary.timCapaianPct >= 1
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
                    : 'text-blue-700 bg-blue-50 border-blue-200/60'
                }`}
              >
                <ArrowUpRight className="w-2.5 h-2.5" aria-hidden="true" />
                {formatPercent(summary.timCapaianPct, 1)}
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight tabular-nums mt-0.5 truncate">
              {formatCurrencyIDR(summary.timActualOmzet)}
            </div>
            <div className="text-2xs text-slate-500 truncate tabular-nums mt-0.5">
              Target: {formatCurrencyIDR(summary.timTargetOmzet)}
            </div>
          </div>
        </div>

        {/* Card 2: Total Payout Bersih Tim (Emerald Tint) */}
        <div className="bg-gradient-to-br from-emerald-50/60 via-white to-white rounded-xl p-3.5 border border-emerald-100/90 shadow-card flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-emerald-100/80 border border-emerald-200/60 text-[#127a60] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Coins className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-2xs font-medium text-slate-500 truncate">
                Total payout bersih tim
              </span>
              <span className="inline-flex items-center text-2xs font-semibold text-[#127a60] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 shrink-0">
                Net 95%
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-[#127a60] tracking-tight tabular-nums mt-0.5 truncate">
              {formatCurrencyIDR(summary.totalPayoutTim)}
            </div>
            <div className="text-2xs text-slate-500 truncate mt-0.5">
              {summary.csList.length} CS + {summary.leaderName}
            </div>
          </div>
        </div>

        {/* Card 3: Leader Payout (Amber Tint) */}
        <div className="bg-gradient-to-br from-amber-50/50 via-white to-white rounded-xl p-3.5 border border-amber-100/90 shadow-card flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-amber-100/80 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Crown className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-2xs font-medium text-slate-500 truncate">
                Komisi leader ({summary.leaderName})
              </span>
              <span className="inline-flex items-center text-2xs font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 tabular-nums shrink-0">
                Tarif {formatPercent(summary.leaderTarifPct, 1)}
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight tabular-nums mt-0.5 truncate">
              {formatCurrencyIDR(summary.leaderBersih)}
            </div>
            <div className="text-2xs text-slate-500 truncate mt-0.5">Net Payout</div>
          </div>
        </div>

        {/* Card 4: Potongan Sistem 5% (Rose Tint) */}
        <div className="bg-gradient-to-br from-rose-50/50 via-white to-white rounded-xl p-3.5 border border-rose-100/90 shadow-card flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-rose-100/80 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Percent className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-2xs font-medium text-slate-500 truncate">
                Potongan sistem (5%)
              </span>
              <span className="inline-flex items-center text-2xs font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60 shrink-0">
                5% Bruto
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight tabular-nums mt-0.5 truncate">
              {formatCurrencyIDR(
                summary.csList.reduce((acc, c) => acc + c.potonganSistem, 0) + summary.leaderPotongan
              )}
            </div>
            <div className="text-2xs text-slate-500 truncate mt-0.5">Aturan aplikasi tetap</div>
          </div>
        </div>
      </div>

      {/* CRM CS Performance Table (OpsFlow Table with In-Cell Utilization Bars) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Rincian Performa &amp; Komisi CS · {summary.period}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Syarat komisi omzet: Poin min 15.000, Leads baru min 400, Outbound min 10.000, tanpa pelanggaran.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-medium tabular-nums">
            <span>{summary.closingWonUnik} Customer Won Unik</span>
            <span className="text-slate-300">/</span>
            <span>{summary.totalLeadsTim} Leads Tim</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-slate-500 text-2xs uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th scope="col" className="py-3.5 px-5">Nama CS</th>
                <th scope="col" className="py-3.5 px-3 text-center">Status Syarat</th>
                <th scope="col" className="py-3.5 px-3 text-right">Poin</th>
                <th scope="col" className="py-3.5 px-3 text-right">Omzet Valid</th>
                <th scope="col" className="py-3.5 px-3 text-center">Tarif Omzet</th>
                <th scope="col" className="py-3.5 px-3 text-right">Komisi Omzet</th>
                <th scope="col" className="py-3.5 px-3 text-right">Bonus Conv</th>
                <th scope="col" className="py-3.5 px-3 text-right">Bonus Growth</th>
                <th scope="col" className="py-3.5 px-3 text-right">Bruto</th>
                <th scope="col" className="py-3.5 px-5 text-right">Bersih (Net)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.csList.map((cs) => {
                // Tier progress towards 100M top tier
                const tierProgressPct = Math.min(100, Math.round((cs.omzetValid / 100_000_000) * 100));
                const barColor =
                  cs.tarifOmzetPct >= 0.025
                    ? 'bg-emerald-500'
                    : cs.tarifOmzetPct >= 0.015
                    ? 'bg-blue-500'
                    : cs.tarifOmzetPct >= 0.01
                    ? 'bg-amber-500'
                    : 'bg-slate-300';

                return (
                  <tr key={cs.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center font-bold text-xs uppercase shrink-0"
                          aria-hidden="true"
                        >
                          {cs.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{cs.name}</p>
                          <p className="text-2xs text-slate-500 tabular-nums">
                            {cs.leadsBaru} leads · {formatNumber(cs.outbound)} outbound
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      {cs.syaratLolos ? (
                        <span className="inline-flex items-center gap-1 text-2xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          Lolos
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-2xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" aria-hidden="true" />
                          Belum Syarat
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right font-medium text-slate-700 tabular-nums">
                      {formatNumber(cs.poin)}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="font-bold text-slate-900 tabular-nums">
                          {formatCurrencyIDR(cs.omzetValid)}
                        </span>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${tierProgressPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-xs border tabular-nums ${
                          cs.tarifOmzetPct >= 0.02
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : cs.tarifOmzetPct >= 0.01
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {formatPercent(cs.tarifOmzetPct, 1)}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-medium text-slate-800 tabular-nums">
                      {formatCurrencyIDR(cs.komisiOmzet)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-medium text-slate-800 tabular-nums">
                      {formatCurrencyIDR(cs.bonusConversion)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-medium text-emerald-700 tabular-nums">
                      {formatCurrencyIDR(cs.bonusGrowth)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-semibold text-slate-700 tabular-nums">
                      {formatCurrencyIDR(cs.bruto)}
                    </td>

                    <td className="py-3.5 px-5 text-right font-bold text-[#127a60] text-sm tabular-nums">
                      {formatCurrencyIDR(cs.bersih)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Table Footer with Verified Sum Parity */}
            <tfoot className="bg-slate-50/90 font-semibold border-t border-slate-200/90 text-slate-900">
              <tr>
                <td className="py-3.5 px-5" colSpan={2}>
                  Total CS ({summary.csList.length} orang)
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-slate-700 font-mono">
                  {formatNumber(totalPoin)}
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-slate-900 font-mono font-bold">
                  {formatCurrencyIDR(totalOmzetValid)}
                </td>
                <td className="py-3.5 px-3 text-center text-slate-400">-</td>
                <td className="py-3.5 px-3 text-right tabular-nums text-slate-900 font-mono">
                  {formatCurrencyIDR(totalKomisiOmzet)}
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-slate-900 font-mono">
                  {formatCurrencyIDR(totalBonusConv)}
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-emerald-700 font-mono">
                  {formatCurrencyIDR(totalBonusGrowth)}
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-slate-900 font-mono">
                  {formatCurrencyIDR(totalBrutoCs)}
                </td>
                <td className="py-3.5 px-5 text-right tabular-nums text-[#127a60] font-mono font-bold text-sm">
                  {formatCurrencyIDR(totalBersihCs)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
