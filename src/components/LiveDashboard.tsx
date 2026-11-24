import React, { useMemo, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { DivisionSummary, HostCommission, MonthAggregate, MonthName, MONTH_LABEL_ID, TargetInput } from '../utils/liveHostEngine';
import { formatCurrencyIDR, formatRoas } from '../utils/formatters';

interface LiveDashboardProps {
  month: MonthName;
  aggregate: MonthAggregate;
  summary: DivisionSummary;
  hosts: HostCommission[];
  targetInput: TargetInput;
}

/**
 * Dashboard Live: omzet (Direct GMV) dan biaya Ads per kanal.
 * Tidak menampilkan komisi — itu ada di Komisi Host Live.
 */
export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  month,
  aggregate,
  summary,
  hosts,
  targetInput,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => hosts.filter((h) => h.host.toLowerCase().includes(search.toLowerCase())),
    [hosts, search]
  );

  const ttRoas = summary.totalTTBiaya > 0 ? summary.totalTTOmzet / summary.totalTTBiaya : null;
  const spRoas = summary.totalSPAds && summary.totalSPAds > 0 ? summary.totalSPOmzet / summary.totalSPAds : null;

  const cards = [
    {
      label: 'Omzet TikTok Live',
      value: formatCurrencyIDR(summary.totalTTOmzet),
      sub: `Target divisi: ${formatCurrencyIDR(targetInput.divisiTikTok)}`,
      tone: 'text-blue-700 bg-blue-50 border-blue-100',
    },
    {
      label: 'Biaya Ads TikTok',
      value: formatCurrencyIDR(summary.totalTTBiaya),
      sub: `ROAS ${ttRoas === null ? '—' : formatRoas(ttRoas)}`,
      tone: 'text-rose-700 bg-rose-50 border-rose-100',
    },
    {
      label: 'Omzet Shopee Live',
      value: formatCurrencyIDR(summary.totalSPOmzet),
      sub: `Target divisi: ${formatCurrencyIDR(targetInput.divisiShopee)}`,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    },
    {
      label: 'Biaya Ads Shopee',
      value: summary.totalSPAds === null ? 'Belum diinput' : formatCurrencyIDR(summary.totalSPAds),
      sub: `ROAS ${spRoas === null ? '—' : formatRoas(spRoas)}`,
      tone: 'text-amber-800 bg-amber-50 border-amber-100',
    },
  ];

  const missing = !aggregate.hasTikTok || !aggregate.hasShopee || aggregate.shopeeAdsTotal === null;

  return (
    <div className="space-y-4">
      {missing && (
        <div role="alert" className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <b className="font-semibold">Data {MONTH_LABEL_ID[month]} belum lengkap:</b>{' '}
            {!aggregate.hasTikTok && 'Data TikTok Live (03_DATABASE_LIVE / RAW ADS TT) belum tersedia. '}
            {!aggregate.hasShopee && 'Data Shopee Live (03_DATABASE_LIVE) belum tersedia. '}
            {aggregate.shopeeAdsTotal === null && 'Biaya Ads Shopee bulan ini (10_ADS_SHOPEE) belum diinput.'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
            <span className={`inline-block text-2xs font-semibold px-2 py-0.5 rounded-full border ${c.tone}`}>{c.label}</span>
            <div className="mt-2 text-lg font-bold text-slate-900 tabular-nums">{c.value}</div>
            <div className="text-2xs text-slate-500 mt-1 tabular-nums">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">Omzet &amp; Biaya Ads per Host</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Omzet TikTok = Direct GMV TikTok. Omzet Shopee = Direct GMV Shopee. Alokasi Ads Shopee dibagi proporsional menurut omzet.
            </p>
          </div>
          <div className="relative sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <label htmlFor="live-search" className="sr-only">Cari nama host</label>
            <input
              id="live-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama host..."
              className="w-full pl-9 pr-3 min-h-[38px] rounded-xl border border-slate-200/90 bg-slate-50/60 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#127a60] transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-slate-500 text-2xs uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-5">Host</th>
                <th className="py-3 px-3 text-right">Omzet TikTok</th>
                <th className="py-3 px-3 text-right">Biaya Ads TikTok</th>
                <th className="py-3 px-3 text-right">ROAS TikTok</th>
                <th className="py-3 px-3 text-right">Omzet Shopee</th>
                <th className="py-3 px-3 text-right">Alokasi Ads Shopee</th>
                <th className="py-3 px-5 text-right">Total Omzet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((h) => (
                <tr key={h.host} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-5 font-semibold text-slate-900">{h.host}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyIDR(h.ttOmzet)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-rose-700">{formatCurrencyIDR(h.ttBiaya)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{h.ttBiaya > 0 ? formatRoas(h.ttOmzet / h.ttBiaya) : '—'}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyIDR(h.spOmzet)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-rose-700">
                    {h.spAdsAlokasi === null ? 'Belum diinput' : formatCurrencyIDR(h.spAdsAlokasi)}
                  </td>
                  <td className="py-2.5 px-5 text-right tabular-nums font-semibold">{formatCurrencyIDR(h.totalOmzet)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">Tidak ada host untuk bulan ini.</td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-900">
                <tr>
                  <td className="py-3 px-5">Total ({filtered.length} host)</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatCurrencyIDR(summary.totalTTOmzet)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatCurrencyIDR(summary.totalTTBiaya)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{ttRoas === null ? '—' : formatRoas(ttRoas)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatCurrencyIDR(summary.totalSPOmzet)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{summary.totalSPAds === null ? 'Belum diinput' : formatCurrencyIDR(summary.totalSPAds)}</td>
                  <td className="py-3 px-5 text-right tabular-nums">{formatCurrencyIDR(summary.totalTTOmzet + summary.totalSPOmzet)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="px-5 py-2.5 text-2xs text-slate-500 border-t border-slate-100">
          Persentase ROAS tampil sebagai rasio omzet ÷ biaya Ads. Organik dan komisi tidak dihitung di halaman ini.
        </div>
      </div>

    </div>
  );
};
