import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  CommissionParams,
  DivisionSummary,
  HostCommission,
  MonthName,
  MONTH_LABEL_ID,
} from '../utils/liveHostEngine';
import { formatCurrencyIDR, formatPercent } from '../utils/formatters';

interface KomisiDashboardProps {
  month: MonthName;
  summary: DivisionSummary;
  hosts: HostCommission[];
  commissionParams: CommissionParams;
  onSelectHost: (host: HostCommission) => void;
}

const capaianBadge = (c: number) =>
  c >= 1
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : c >= 0.7
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';

const capaianBar = (c: number) => (c >= 1 ? 'bg-emerald-500' : c >= 0.7 ? 'bg-blue-500' : 'bg-rose-500');

/**
 * Dashboard Perhitungan Komisi Host Live.
 * Hanya membaca hasil perhitungan; input ada di Skema Komisi.
 */
export const KomisiDashboard: React.FC<KomisiDashboardProps> = ({
  month,
  summary,
  hosts,
  commissionParams,
  onSelectHost,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => hosts.filter((h) => h.host.toLowerCase().includes(search.toLowerCase())),
    [hosts, search]
  );

  const plafon = Math.max(1, summary.anggaranMaksimal);
  const komisiPct = Math.min(100, (summary.totalKomisiUtama / plafon) * 100);
  const bonusPct = Math.min(100 - komisiPct, (summary.totalBonus / plafon) * 100);
  const capaian = summary.capaianDivisi ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard label="Dasar Organik" value={formatCurrencyIDR(summary.totalDasar)} sub={`${hosts.length} host · ${MONTH_LABEL_ID[month]} 2026`} tone="text-blue-700 bg-blue-50 border-blue-100" />
        <KpiCard label="Komisi Utama" value={formatCurrencyIDR(summary.totalKomisiUtama)} sub={`Tarif ${formatPercent(commissionParams.tarifUtama, 2)}`} tone="text-[#127a60] bg-emerald-50 border-emerald-100" />
        <KpiCard label="Bonus Kehadiran" value={formatCurrencyIDR(summary.totalBonus)} sub={`Plafon bonus ${formatPercent(commissionParams.plafonBonus, 2)}`} tone="text-indigo-700 bg-indigo-50 border-indigo-100" />
        <KpiCard label="Sisa Anggaran" value={formatCurrencyIDR(summary.sisaAnggaran)} sub={`Plafon total ${formatCurrencyIDR(summary.anggaranMaksimal)}`} tone="text-amber-800 bg-amber-50 border-amber-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Pencapaian Target Divisi</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Jika capaian divisi di bawah 100%, faktor pengali divisi = {formatPercent(commissionParams.faktorDivisiBawah, 0)}.
              </p>
            </div>
            <span className="text-2xs px-2.5 py-0.5 rounded-full font-semibold border bg-slate-50 text-slate-700 border-slate-200">
              Faktor divisi: {summary.faktorDivisi === null ? 'Belum dihitung' : formatPercent(summary.faktorDivisi, 0)}
            </span>
          </div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-600">
              Realisasi organik: <b className="text-slate-900 tabular-nums">{formatCurrencyIDR(summary.totalDasar)}</b>
              {' / '}
              <span className="tabular-nums">{formatCurrencyIDR(summary.targetDivisi)}</span>
            </span>
            <span className="font-bold text-[#127a60] tabular-nums">
              {summary.capaianDivisi === null ? 'Target belum diisi' : formatPercent(summary.capaianDivisi, 1)}
            </span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
            <div className={`h-full rounded-full ${capaian >= 1 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, capaian * 100)}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
          <h3 className="font-bold text-sm text-slate-900">Alokasi Anggaran Komisi</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">Dibandingkan dengan plafon {formatPercent(commissionParams.plafonTotal, 2)} dari dasar organik.</p>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-[#127a60]" style={{ width: `${komisiPct}%` }} />
            <div className="h-full bg-blue-500" style={{ width: `${bonusPct}%` }} />
          </div>
          <div className="mt-3 space-y-1.5 text-xs">
            <Legend color="bg-[#127a60]" label="Komisi utama" value={formatCurrencyIDR(summary.totalKomisiUtama)} />
            <Legend color="bg-blue-500" label="Bonus kehadiran" value={formatCurrencyIDR(summary.totalBonus)} />
            <Legend color="bg-slate-200" label="Sisa anggaran" value={formatCurrencyIDR(summary.sisaAnggaran)} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">Rincian Komisi per Host</h3>
            <p className="text-xs text-slate-500 mt-0.5">Klik nama host untuk melihat rincian perhitungan.</p>
          </div>
          <div className="relative sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <label htmlFor="komisi-search" className="sr-only">Cari nama host</label>
            <input
              id="komisi-search"
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
                <th className="py-3 px-3 text-right">Dasar Organik</th>
                <th className="py-3 px-3 text-right">Target Host</th>
                <th className="py-3 px-3 text-center min-w-[120px]">Capaian</th>
                <th className="py-3 px-3 text-center">Pengali</th>
                <th className="py-3 px-3 text-center">Hadir / {commissionParams.shiftWajib}</th>
                <th className="py-3 px-3 text-right">Komisi Utama</th>
                <th className="py-3 px-3 text-right">Bonus</th>
                <th className="py-3 px-5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((h) => {
                const cap = h.capaian;
                return (
                  <tr key={h.host} onClick={() => onSelectHost(h)} className="hover:bg-slate-50/60 cursor-pointer">
                    <td className="py-2.5 px-5 font-semibold text-slate-900">{h.host}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyIDR(h.dasarOrganik)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyIDR(h.target.total)}</td>
                    <td className="py-2.5 px-3">
                      {cap === null ? (
                        <span className="block text-center text-slate-400">Belum ada target</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full border text-2xs font-bold tabular-nums ${capaianBadge(cap)}`}>
                            {formatPercent(cap, 0)}
                          </span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${capaianBar(cap)}`} style={{ width: `${Math.min(100, cap * 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums">{h.pengali === null ? '—' : formatPercent(h.pengali, 0)}</td>
                    <td className="py-2.5 px-3 text-center tabular-nums">
                      {h.attendanceInput?.hadir ?? '—'} / {commissionParams.shiftWajib}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyIDR(h.komisiUtama)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyIDR(h.bonusKehadiran)}</td>
                    <td className="py-2.5 px-5 text-right tabular-nums font-bold text-slate-900">{formatCurrencyIDR(h.total)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">Tidak ada host untuk bulan ini.</td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-900">
                <tr>
                  <td className="py-3 px-5">Total ({filtered.length} host)</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatCurrencyIDR(summary.totalDasar)}</td>
                  <td colSpan={4} />
                  <td className="py-3 px-3 text-right tabular-nums">{formatCurrencyIDR(summary.totalKomisiUtama)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{formatCurrencyIDR(summary.totalBonus)}</td>
                  <td className="py-3 px-5 text-right tabular-nums">{formatCurrencyIDR(summary.totalDibayar)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ label: string; value: string; sub: string; tone: string }> = ({ label, value, sub, tone }) => (
  <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
    <span className={`inline-block text-2xs font-semibold px-2 py-0.5 rounded-full border ${tone}`}>{label}</span>
    <div className="mt-2 text-lg font-bold text-slate-900 tabular-nums">{value}</div>
    <div className="text-2xs text-slate-500 mt-1">{sub}</div>
  </div>
);

const Legend: React.FC<{ color: string; label: string; value: string }> = ({ color, label, value }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="flex items-center gap-1.5 text-slate-600">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </span>
    <span className="font-bold text-slate-900 tabular-nums">{value}</span>
  </div>
);
