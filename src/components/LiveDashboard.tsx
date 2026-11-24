import React, { useMemo, useState } from 'react';
import { AlertCircle, Search, SlidersHorizontal } from 'lucide-react';
import {
  DivisionSummary,
  HostCommission,
  MonthAggregate,
  MonthName,
  MONTH_LABEL_ID,
  MONTHS,
  TargetInput,
} from '../utils/liveHostEngine';
import { formatCurrencyIDR, formatPercent } from '../utils/formatters';

interface LiveDashboardProps {
  month: MonthName;
  prevMonth: MonthName | null;
  aggregate: MonthAggregate;
  prevAggregate: MonthAggregate | null;
  trend: { month: MonthName; tt: number; sp: number }[];
  summary: DivisionSummary;
  hosts: HostCommission[];
  targetInput: TargetInput;
}

// Palet referensi dataviz: slot 1 = blue (TikTok), slot 2 = orange (Shopee).
const TT_COLOR = '#2a78d6';
const SP_COLOR = '#eb6834';
const SEQ_COLOR = '#2a78d6';

type SortKey = 'host' | 'sessions' | 'target' | 'omzet' | 'achievement' | 'prev' | 'growth' | 'tt' | 'sp';

type MetricKey = 'target' | 'omzet' | 'achievement' | 'prev' | 'growth' | 'tt' | 'sp' | 'sessions';

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'sessions', label: 'Sesi Live' },
  { key: 'target', label: 'Target' },
  { key: 'omzet', label: 'Omzet' },
  { key: 'achievement', label: 'Achievement (%)' },
  { key: 'prev', label: 'Omzet Bulan Lalu' },
  { key: 'growth', label: 'Growth (%)' },
  { key: 'tt', label: 'Omzet TikTok' },
  { key: 'sp', label: 'Omzet Shopee' },
];

const pctOf = (num: number, den: number | null | undefined) =>
  den && den > 0 ? num / den : null;

const growthOf = (cur: number, prev: number) => (prev > 0 ? (cur - prev) / prev : null);

export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  month,
  prevMonth,
  aggregate,
  prevAggregate,
  trend,
  summary,
  hosts,
  targetInput,
}) => {
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState<Record<MetricKey, boolean>>({
    target: true,
    omzet: true,
    achievement: true,
    prev: true,
    growth: true,
    tt: true,
    sp: true,
    sessions: true,
  });
  const [showPicker, setShowPicker] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('omzet');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // ---- Angka utama -------------------------------------------------------
  const omzetTT = summary.totalTTOmzet;
  const omzetSP = summary.totalSPOmzet;
  const omzetTotal = omzetTT + omzetSP;

  const targetTT = targetInput.divisiTikTok;
  const targetSP = targetInput.divisiShopee;
  const targetTotal = targetTT !== null && targetSP !== null ? targetTT + targetSP : null;

  const achTotal = pctOf(omzetTotal, targetTotal);
  const achTT = pctOf(omzetTT, targetTT);
  const achSP = pctOf(omzetSP, targetSP);

  const prevTT = prevAggregate ? [...prevAggregate.tiktok.values()].reduce((s, v) => s + v.omzet, 0) : 0;
  const prevSP = prevAggregate ? [...prevAggregate.shopee.values()].reduce((s, v) => s + v.omzet, 0) : 0;
  const prevTotal = prevTT + prevSP;

  // ---- Per host ----------------------------------------------------------
  const rows = useMemo(
    () =>
      hosts.map((h) => {
        const omzet = h.ttOmzet + h.spOmzet;
        const prev =
          (prevAggregate?.tiktok.get(h.host)?.omzet ?? 0) + (prevAggregate?.shopee.get(h.host)?.omzet ?? 0);
        return {
          host: h.host,
          tt: h.ttOmzet,
          sp: h.spOmzet,
          omzet,
          sessions: aggregate.sessions.get(h.host) ?? 0,
          target: h.target.total,
          achievement: pctOf(omzet, h.target.total),
          prev: prevAggregate ? prev : null,
          growth: prevAggregate ? growthOf(omzet, prev) : null,
        };
      }),
    [hosts, prevAggregate, aggregate]
  );

  const filteredRows = useMemo(() => {
    const base = rows.filter((r) => r.host.toLowerCase().includes(search.toLowerCase()));
    const dir = sortDir === 'desc' ? -1 : 1;
    return [...base].sort((a, b) => {
      if (sortKey === 'host') return dir * a.host.localeCompare(b.host, 'id');
      const av = a[sortKey];
      const bv = b[sortKey];
      // nilai kosong (—) selalu di bawah, apa pun arahnya
      if (av === null && bv === null) return a.host.localeCompare(b.host, 'id');
      if (av === null) return 1;
      if (bv === null) return -1;
      return dir * (av - bv) || a.host.localeCompare(b.host, 'id');
    });
  }, [rows, search, sortKey, sortDir]);
  const top = (key: 'omzet' | 'tt' | 'sp') =>
    [...rows].sort((a, b) => b[key] - a[key]).filter((r) => r[key] > 0).slice(0, 5);

  const top5Total = top('omzet');
  const top5TT = top('tt');
  const top5SP = top('sp');

  const share = (v: number) => (omzetTotal > 0 ? v / omzetTotal : 0);
  const ttShare = share(omzetTT);
  const spShare = share(omzetSP);

  // Proyeksi akhir bulan: omzet sejauh ini dibagi hari yang sudah lewat (WIB), dikali jumlah hari bulan.
  const monthIdx = MONTHS.indexOf(month) + 1; // 1..12
  const todayParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .split('-')
    .map(Number);
  const [tYear, tMonth, tDay] = todayParts;
  const DATA_YEAR = 2026;
  const daysInMonth = new Date(DATA_YEAR, monthIdx, 0).getDate();
  let elapsed: number | null = null;
  if (tYear === DATA_YEAR && tMonth === monthIdx) elapsed = tDay;
  else if (tYear * 12 + tMonth > DATA_YEAR * 12 + monthIdx) elapsed = daysInMonth;
  const projected = elapsed && elapsed > 0 && omzetTotal > 0 ? (omzetTotal / elapsed) * daysInMonth : null;
  const projectedAch = pctOf(projected ?? 0, targetTotal);

  // Peringatan: host dengan achievement di bawah 50%.
  const lowHosts = rows
    .filter((r) => r.achievement !== null && r.achievement < 0.5)
    .sort((a, b) => (a.achievement ?? 0) - (b.achievement ?? 0));

  const trendMax = Math.max(1, ...trend.map((t) => t.tt + t.sp));

  const missing = !aggregate.hasTikTok || !aggregate.hasShopee || aggregate.shopeeAdsTotal === null;
  const prevLabel = prevMonth ? MONTH_LABEL_ID[prevMonth] : '—';

  const kpis = [
    {
      label: 'Omzet Total',
      value: formatCurrencyIDR(omzetTotal),
      sub: `TikTok + Shopee · ${MONTH_LABEL_ID[month]}`,
      tone: 'text-slate-700 bg-slate-100 border-slate-200',
    },
    {
      label: 'Omzet Shopee',
      value: formatCurrencyIDR(omzetSP),
      sub: `${formatPercent(spShare, 1)} dari total`,
      tone: 'text-orange-800 bg-orange-50 border-orange-100',
    },
    {
      label: 'Omzet TikTok',
      value: formatCurrencyIDR(omzetTT),
      sub: `${formatPercent(ttShare, 1)} dari total`,
      tone: 'text-blue-700 bg-blue-50 border-blue-100',
    },
    {
      label: 'Target',
      value: formatCurrencyIDR(targetTotal),
      sub: `TikTok ${formatCurrencyIDR(targetTT)} · Shopee ${formatCurrencyIDR(targetSP)}`,
      tone: 'text-indigo-700 bg-indigo-50 border-indigo-100',
    },
    {
      label: 'Achievement',
      value: achTotal === null ? '—' : formatPercent(achTotal, 1),
      sub: `TikTok ${achTT === null ? '—' : formatPercent(achTT, 0)} · Shopee ${achSP === null ? '—' : formatPercent(achSP, 0)}`,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    },
  ];

  const donutR = 42;
  const circ = 2 * Math.PI * donutR;
  const gap = 2; // px gap antar segmen, sesuai aturan dataviz
  const ttLen = Math.max(0, ttShare * circ - gap);
  const spLen = Math.max(0, spShare * circ - gap);

  const visibleCols = METRICS.filter((m) => visible[m.key]);

  return (
    <div className="space-y-4">
      {missing && (
        <div role="alert" className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <b className="font-semibold">Data {MONTH_LABEL_ID[month]} belum lengkap:</b>{' '}
            {!aggregate.hasTikTok && 'Data TikTok Live belum tersedia. '}
            {!aggregate.hasShopee && 'Data Shopee Live belum tersedia. '}
            {aggregate.shopeeAdsTotal === null && 'Biaya Ads Shopee belum diinput.'}
          </div>
        </div>
      )}

      {/* 1-5: KPI utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
            <span className={`inline-block text-2xs font-semibold px-2 py-0.5 rounded-full border ${k.tone}`}>{k.label}</span>
            <div className="mt-2 text-lg font-bold text-slate-900 tabular-nums">{k.value}</div>
            <div className="text-2xs text-slate-500 mt-1 tabular-nums">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Ringkasan: tren 3 bulan, proyeksi akhir bulan, peringatan host */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
          <h3 className="font-bold text-sm text-slate-900">Tren Omzet 3 Bulan</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Omzet TikTok dan Shopee per bulan.</p>
          <div className="flex items-end gap-4 h-36">
            {trend.map((t) => {
              const total = t.tt + t.sp;
              const h = (total / trendMax) * 100;
              return (
                <div key={t.month} className="flex-1 flex flex-col items-center h-full justify-end min-w-0">
                  <span className="text-2xs tabular-nums text-slate-600 mb-1 truncate max-w-full">
                    Rp {(total / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 0 })} jt
                  </span>
                  <div className="w-full max-w-[56px] flex flex-col-reverse gap-[2px]" style={{ height: `${Math.max(h, 2)}%` }}>
                    <div className="rounded-t-[4px]" style={{ background: TT_COLOR, height: `${total > 0 ? (t.tt / total) * 100 : 0}%` }} title={`TikTok ${formatCurrencyIDR(t.tt)}`} />
                    <div className="rounded-t-[4px]" style={{ background: SP_COLOR, height: `${total > 0 ? (t.sp / total) * 100 : 0}%` }} title={`Shopee ${formatCurrencyIDR(t.sp)}`} />
                  </div>
                  <span className={`text-2xs mt-1.5 ${t.month === month ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                    {MONTH_LABEL_ID[t.month].slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-2xs text-slate-600">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: TT_COLOR }} />TikTok</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: SP_COLOR }} />Shopee</span>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
          <h3 className="font-bold text-sm text-slate-900">Proyeksi Akhir Bulan</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Omzet sejauh ini dibagi hari yang sudah lewat, dikali jumlah hari bulan. Hanya berdasarkan data yang sudah masuk.
          </p>
          {elapsed === null ? (
            <p className="text-xs text-slate-400">Bulan ini belum dimulai.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-2xs text-slate-500">Proyeksi omzet {MONTH_LABEL_ID[month]}</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">{projected === null ? '—' : formatCurrencyIDR(projected)}</div>
              </div>
              <div>
                <div className="text-2xs text-slate-500">Proyeksi vs target</div>
                <div className="text-sm font-bold text-slate-900 tabular-nums">{projectedAch === null ? '—' : formatPercent(projectedAch, 1)}</div>
              </div>
              <div className="text-2xs text-slate-500 tabular-nums">
                Hari berjalan: {elapsed} dari {daysInMonth}
              </div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" aria-hidden="true" />
            Host di Bawah 50%
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Achievement terhadap target host di bawah 50%.</p>
          {lowHosts.length === 0 ? (
            <p className="text-xs text-emerald-700 font-semibold">Semua host sudah di atas 50% (atau belum punya target).</p>
          ) : (
            <ul className="space-y-2">
              {lowHosts.map((r) => (
                <li key={r.host} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{r.host}</span>
                  <span className="tabular-nums text-rose-700 font-bold">{formatPercent(r.achievement, 1)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 6: Donut kontribusi marketplace */}
      <div className="grid grid-cols-1 gap-4">
        <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
          <h3 className="font-bold text-sm text-slate-900">Kontribusi Omzet Marketplace</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Porsi omzet TikTok dan Shopee dari total.</p>
          <div className="flex items-center gap-5">
            <svg viewBox="0 0 120 120" className="w-32 h-32 shrink-0" role="img" aria-label={`TikTok ${formatPercent(ttShare, 1)}, Shopee ${formatPercent(spShare, 1)}`}>
              <circle cx="60" cy="60" r={donutR} fill="none" stroke="#e2e8f0" strokeWidth="16" />
              <circle
                cx="60"
                cy="60"
                r={donutR}
                fill="none"
                stroke={TT_COLOR}
                strokeWidth="16"
                strokeDasharray={`${ttLen} ${circ}`}
                transform="rotate(-90 60 60)"
              />
              <circle
                cx="60"
                cy="60"
                r={donutR}
                fill="none"
                stroke={SP_COLOR}
                strokeWidth="16"
                strokeDasharray={`${spLen} ${circ}`}
                strokeDashoffset={-(ttShare * circ + gap / 2)}
                transform="rotate(-90 60 60)"
              />
              <text x="60" y="58" textAnchor="middle" className="fill-slate-900" style={{ fontSize: 11, fontWeight: 700 }}>
                {omzetTotal > 0 ? `Rp ${(omzetTotal / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 0 })} jt` : '—'}
              </text>
              <text x="60" y="72" textAnchor="middle" className="fill-slate-500" style={{ fontSize: 8 }}>
                total omzet
              </text>
            </svg>
            <ul className="space-y-2.5 text-xs min-w-0 flex-1">
              <li className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: TT_COLOR }} />
                  TikTok
                </span>
                <span className="font-bold text-slate-900 tabular-nums">{formatPercent(ttShare, 1)}</span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: SP_COLOR }} />
                  Shopee
                </span>
                <span className="font-bold text-slate-900 tabular-nums">{formatPercent(spShare, 1)}</span>
              </li>
            </ul>
          </div>
        </section>

      </div>

      {/* 7-9: Top 5 host */}
      <TopFive
          sections={[
            { title: 'Kontribusi Host (5 Besar)', subtitle: 'Total omzet TikTok + Shopee', items: top5Total, key: 'omzet', color: SEQ_COLOR, total: omzetTotal },
            { title: '5 Besar TikTok', subtitle: 'Omzet TikTok', items: top5TT, key: 'tt', color: TT_COLOR, total: omzetTT },
            { title: '5 Besar Shopee', subtitle: 'Omzet Shopee', items: top5SP, key: 'sp', color: SP_COLOR, total: omzetSP },
          ]}
        />

      {/* 10: Rincian host */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">Rincian Host</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Omzet bulan lalu: {prevLabel} {prevMonth ? '2026' : ''}
              {prevAggregate ? '' : ' (data belum tersedia)'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex items-center gap-1.5">
              <label htmlFor="live-sort" className="sr-only">Urutkan host berdasarkan</label>
              <select
                id="live-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#127a60]"
              >
                <option value="omzet">Urutkan: Omzet</option>
                <option value="host">Urutkan: Nama host</option>
                <option value="sessions">Urutkan: Sesi Live</option>
                <option value="target">Urutkan: Target</option>
                <option value="achievement">Urutkan: Achievement (%)</option>
                <option value="prev">Urutkan: Omzet Bulan Lalu</option>
                <option value="growth">Urutkan: Growth (%)</option>
                <option value="tt">Urutkan: Omzet TikTok</option>
                <option value="sp">Urutkan: Omzet Shopee</option>
              </select>
              <div role="group" aria-label="Arah urutan" className="inline-flex rounded-xl bg-slate-100/90 p-1 text-xs border border-slate-200/80">
                {(['desc', 'asc'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={sortDir === d}
                    onClick={() => setSortDir(d)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${sortDir === d ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {d === 'desc' ? 'Tertinggi' : 'Terendah'}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPicker((v) => !v)}
                aria-expanded={showPicker}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                Pilih Matrics
              </button>
              {showPicker && (
                <div className="absolute right-0 z-10 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-card p-2">
                  {METRICS.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visible[m.key]}
                        onChange={() => setVisible((v) => ({ ...v, [m.key]: !v[m.key] }))}
                        className="accent-[#127a60]"
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-slate-500 text-2xs uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-5">Host</th>
                {visibleCols.map((c) => (
                  <th key={c.key} className="py-3 px-3 text-right whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((r) => (
                <tr key={r.host} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-5 font-semibold text-slate-900">{r.host}</td>
                  {visible.sessions && <td className="py-2.5 px-3 text-right tabular-nums">{r.sessions}</td>}
                  {visible.target && <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyIDR(r.target)}</td>}
                  {visible.omzet && <td className="py-2.5 px-3 text-right tabular-nums font-semibold">{formatCurrencyIDR(r.omzet)}</td>}
                  {visible.achievement && (
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <AchBadge value={r.achievement} />
                    </td>
                  )}
                  {visible.prev && <td className="py-2.5 px-3 text-right tabular-nums">{r.prev === null ? '—' : formatCurrencyIDR(r.prev)}</td>}
                  {visible.growth && (
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <GrowthCell value={r.growth} />
                    </td>
                  )}
                  {visible.tt && <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyIDR(r.tt)}</td>}
                  {visible.sp && <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrencyIDR(r.sp)}</td>}
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length + 1} className="py-8 text-center text-slate-500">
                    Tidak ada host untuk bulan ini.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-slate-900">
                <tr>
                  <td className="py-3 px-5">Total ({filteredRows.length} host)</td>
                  {visible.sessions && <td className="py-3 px-3 text-right tabular-nums">{filteredRows.reduce((s, r) => s + r.sessions, 0)}</td>}
                  {visible.target && <td className="py-3 px-3 text-right tabular-nums">{formatCurrencyIDR(targetTotal)}</td>}
                  {visible.omzet && <td className="py-3 px-3 text-right tabular-nums">{formatCurrencyIDR(omzetTotal)}</td>}
                  {visible.achievement && <td className="py-3 px-3 text-right tabular-nums">{achTotal === null ? '—' : formatPercent(achTotal, 1)}</td>}
                  {visible.prev && <td className="py-3 px-3 text-right tabular-nums">{prevAggregate ? formatCurrencyIDR(prevTotal) : '—'}</td>}
                  {visible.growth && <td className="py-3 px-3 text-right tabular-nums"><GrowthCell value={growthOf(omzetTotal, prevTotal)} /></td>}
                  {visible.tt && <td className="py-3 px-3 text-right tabular-nums">{formatCurrencyIDR(omzetTT)}</td>}
                  {visible.sp && <td className="py-3 px-3 text-right tabular-nums">{formatCurrencyIDR(omzetSP)}</td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

const AchBadge: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null) return <span className="text-slate-400">—</span>;
  const tone =
    value >= 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : value >= 0.7 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-rose-50 text-rose-700 border-rose-200';
  return <span className={`inline-block px-2 py-0.5 rounded-full border text-2xs font-bold ${tone}`}>{formatPercent(value, 1)}</span>;
};

const GrowthCell: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null) return <span className="text-slate-400">—</span>;
  const up = value >= 0;
  return (
    <span className={`font-semibold ${up ? 'text-emerald-700' : 'text-rose-700'}`}>
      {up ? '▲' : '▼'} {formatPercent(Math.abs(value), 1)}
    </span>
  );
};

interface TopSection {
  title: string;
  subtitle: string;
  items: { host: string; omzet: number; tt: number; sp: number }[];
  key: 'omzet' | 'tt' | 'sp';
  color: string;
  total: number;
}

const TopFive: React.FC<{ sections: TopSection[]; className?: string }> = ({ sections, className }) => (
  <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className ?? ''}`}>
    {sections.map((s) => {
      const max = s.items.length > 0 ? Math.max(...s.items.map((i) => i[s.key])) : 0;
      return (
        <section key={s.title} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
          <h3 className="font-bold text-sm text-slate-900">{s.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">{s.subtitle}</p>
          {s.items.length === 0 ? (
            <p className="text-xs text-slate-400">Belum ada omzet.</p>
          ) : (
            <ol className="space-y-3">
              {s.items.map((i, idx) => {
                const v = i[s.key];
                return (
                  <li key={i.host} title={`${i.host}: ${formatCurrencyIDR(v)}`}>
                    <div className="flex items-center justify-between text-xs mb-1 gap-2">
                      <span className="font-semibold text-slate-800 truncate">
                        {idx + 1}. {i.host}
                      </span>
                      <span className="tabular-nums text-slate-700 shrink-0">
                        {formatCurrencyIDR(v)} <span className="text-slate-400">({formatPercent(s.total > 0 ? v / s.total : 0, 1)})</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${max > 0 ? (v / max) * 100 : 0}%`, background: s.color }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      );
    })}
  </div>
);
