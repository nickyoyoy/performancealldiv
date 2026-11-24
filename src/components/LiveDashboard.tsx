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
import '../styles/dashboard-live.css';

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

// Warna sesuai tema referensi Dashboard Live.
const TT = '#7fa3d6';
const TT_DARK = '#1e3a5f';
const SP = '#ff8a6b';
const SP_SOLID = '#ee4d2d';

type SortKey = 'host' | 'sessions' | 'target' | 'omzet' | 'achievement' | 'prev' | 'growth' | 'tt' | 'sp';
type MetricKey = 'sessions' | 'target' | 'omzet' | 'achievement' | 'prev' | 'growth' | 'tt' | 'sp';

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

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'omzet', label: 'Omzet' },
  { key: 'host', label: 'Nama host' },
  { key: 'sessions', label: 'Sesi Live' },
  { key: 'target', label: 'Target' },
  { key: 'achievement', label: 'Achievement (%)' },
  { key: 'prev', label: 'Omzet Bulan Lalu' },
  { key: 'growth', label: 'Growth (%)' },
  { key: 'tt', label: 'Omzet TikTok' },
  { key: 'sp', label: 'Omzet Shopee' },
];

const pctOf = (num: number, den: number | null | undefined) => (den && den > 0 ? num / den : null);
const growthOf = (cur: number, prev: number) => (prev > 0 ? (cur - prev) / prev : null);
const juta = (v: number) => `Rp ${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 0 })} jt`;

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
    sessions: true,
    target: true,
    omzet: true,
    achievement: true,
    prev: true,
    growth: true,
    tt: true,
    sp: true,
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

  const shareTT = omzetTotal > 0 ? omzetTT / omzetTotal : 0;
  const shareSP = omzetTotal > 0 ? omzetSP / omzetTotal : 0;

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

  // Proyeksi akhir bulan: omzet sejauh ini dibagi hari yang sudah lewat (WIB), dikali jumlah hari bulan.
  const monthIdx = MONTHS.indexOf(month) + 1; // 1..12
  const [tYear, tMonth, tDay] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .split('-')
    .map(Number);
  const DATA_YEAR = 2026;
  const daysInMonth = new Date(DATA_YEAR, monthIdx, 0).getDate();
  let elapsed: number | null = null;
  if (tYear === DATA_YEAR && tMonth === monthIdx) elapsed = tDay;
  else if (tYear * 12 + tMonth > DATA_YEAR * 12 + monthIdx) elapsed = daysInMonth;
  const projected = elapsed && elapsed > 0 && omzetTotal > 0 ? (omzetTotal / elapsed) * daysInMonth : null;
  const projectedAch = pctOf(projected ?? 0, targetTotal);

  const lowHosts = rows
    .filter((r) => r.achievement !== null && r.achievement < 0.5)
    .sort((a, b) => (a.achievement ?? 0) - (b.achievement ?? 0));

  const trendMax = Math.max(1, ...trend.map((t) => t.tt + t.sp));
  const prevLabel = prevMonth ? MONTH_LABEL_ID[prevMonth] : '—';
  const missing = !aggregate.hasTikTok || !aggregate.hasShopee || aggregate.shopeeAdsTotal === null;

  // Sparkline 3 bulan di hero
  const spark = (() => {
    const vals = trend.map((t) => t.tt + t.sp);
    const max = Math.max(1, ...vals);
    const w = 260;
    const h = 60;
    const pts = vals.map((v, i) => ({
      x: vals.length > 1 ? (i / (vals.length - 1)) * w : w / 2,
      y: h - (v / max) * (h - 8) - 4,
    }));
    return { pts, w, h };
  })();

  // Donut & ring (gap 2px antar segmen)
  const R = 42;
  const C = 2 * Math.PI * R;
  const gap = 2;
  const ttLen = Math.max(0, shareTT * C - gap);
  const spLen = Math.max(0, shareSP * C - gap);
  const RING_R = 46;
  const ringPct = Math.min(1, achTotal ?? 0);

  const visibleCols = METRICS.filter((m) => visible[m.key]);
  const totalSessions = filteredRows.reduce((s, r) => s + r.sessions, 0);
  const avgGrowth = growthOf(omzetTotal, prevTotal);
  const achColor = (v: number | null) => (v === null ? '#d4d4d4' : v >= 0.5 ? '#22c55e' : '#ef4444');

  return (
    <div className="dl-root dl-stack">
      {missing && (
        <div role="alert" className="dl-alert">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <div>
            <b>Data {MONTH_LABEL_ID[month]} belum lengkap:</b>{' '}
            {!aggregate.hasTikTok && 'Data TikTok Live belum tersedia. '}
            {!aggregate.hasShopee && 'Data Shopee Live belum tersedia. '}
            {aggregate.shopeeAdsTotal === null && 'Biaya Ads Shopee belum diinput.'}
          </div>
        </div>
      )}

      {/* HERO: omzet total, target, achievement */}
      <section className="dl-hero" aria-label="Ringkasan omzet">
        <div>
          <div className="dl-lbl">Omzet Total</div>
          <div className="dl-num dl-num-lg" style={{ marginTop: 6 }}>{formatCurrencyIDR(omzetTotal)}</div>
          <div className="dl-muted">TikTok + Shopee · {MONTH_LABEL_ID[month]} 2026</div>
          <svg viewBox={`0 0 ${spark.w} ${spark.h}`} className="w-full mt-4" style={{ height: 60 }} aria-label="Tren 3 bulan">
            <polyline points={spark.pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#ffffff" strokeWidth="2" />
            {spark.pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="4" fill="#000" stroke="#fff" strokeWidth="2" />
            ))}
          </svg>
          <div className="flex justify-between dl-muted mt-1">
            {trend.map((t) => (
              <span key={t.month}>
                {MONTH_LABEL_ID[t.month].slice(0, 3)} {juta(t.tt + t.sp)}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="dl-lbl">Target</div>
          <div className="dl-num dl-num-lg" style={{ marginTop: 6 }}>{formatCurrencyIDR(targetTotal)}</div>
          <div className="dl-muted">Target gabungan TikTok + Shopee</div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="dl-pill tt">TikTok {achTT === null ? '—' : formatPercent(achTT, 0)}</span>
            <span className="dl-pill sp">Shopee {achSP === null ? '—' : formatPercent(achSP, 0)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0" role="img" aria-label={`Achievement ${achTotal === null ? '—' : formatPercent(achTotal, 1)}`}>
            <circle cx="60" cy="60" r={RING_R} fill="none" stroke="#2e2e2e" strokeWidth="14" />
            <circle
              cx="60"
              cy="60"
              r={RING_R}
              fill="none"
              stroke={achColor(achTotal)}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${ringPct * 2 * Math.PI * RING_R} ${2 * Math.PI * RING_R}`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div>
            <div className="dl-lbl">Achievement</div>
            <div className="dl-num dl-num-lg" style={{ marginTop: 4 }}>{achTotal === null ? '—' : formatPercent(achTotal, 1)}</div>
            <div className="dl-muted">Realisasi dari target {formatCurrencyIDR(targetTotal)}</div>
          </div>
        </div>
      </section>

      {/* Omzet TikTok & Shopee */}
      <div className="dl-grid dl-g2">
        <section className="dl-card light">
          <div className="dl-head">
            <span className="dl-ico tt">T</span>
            <h3 className="dl-h" style={{ color: TT_DARK }}>Omzet TikTok</h3>
          </div>
          <div className="dl-body">
            <div className="dl-num" style={{ color: TT_DARK }}>{formatCurrencyIDR(omzetTT)}</div>
            <div className="dl-muted" style={{ marginTop: 4 }}>{formatPercent(shareTT, 1)} dari total omzet · Target {formatCurrencyIDR(targetTT)}</div>
            <div className="dl-bar" style={{ marginTop: 16 }}>
              <i style={{ width: `${Math.min(100, (achTT ?? 0) * 100)}%`, background: TT }} />
            </div>
          </div>
        </section>
        <section className="dl-card light">
          <div className="dl-head">
            <span className="dl-ico sp">S</span>
            <h3 className="dl-h" style={{ color: SP_SOLID }}>Omzet Shopee</h3>
          </div>
          <div className="dl-body">
            <div className="dl-num" style={{ color: SP_SOLID }}>{formatCurrencyIDR(omzetSP)}</div>
            <div className="dl-muted" style={{ marginTop: 4 }}>{formatPercent(shareSP, 1)} dari total omzet · Target {formatCurrencyIDR(targetSP)}</div>
            <div className="dl-bar" style={{ marginTop: 16 }}>
              <i style={{ width: `${Math.min(100, (achSP ?? 0) * 100)}%`, background: SP_SOLID }} />
            </div>
          </div>
        </section>
      </div>

      {/* Tren & proyeksi */}
      <div className="dl-grid dl-g2">
        <section className="dl-card">
          <div className="dl-head">
            <span className="dl-ico">▮</span>
            <div>
              <h3 className="dl-h">Tren Omzet 3 Bulan</h3>
              <p className="dl-sub">Omzet TikTok dan Shopee per bulan</p>
            </div>
          </div>
          <div className="dl-body">
            <div className="flex items-end gap-6" style={{ height: 190 }}>
              {trend.map((t) => {
                const total = t.tt + t.sp;
                const h = (total / trendMax) * 100;
                return (
                  <div key={t.month} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                    <span className="dl-muted mb-2 tabular-nums" style={{ color: '#fff', fontWeight: 700 }}>{juta(total)}</span>
                    <div className="w-full max-w-[72px] flex flex-col-reverse gap-[2px] rounded-t-[6px] overflow-hidden" style={{ height: `${Math.max(h, 2)}%` }}>
                      <div style={{ background: TT, height: `${total > 0 ? (t.tt / total) * 100 : 0}%` }} title={`TikTok ${formatCurrencyIDR(t.tt)}`} />
                      <div style={{ background: SP, height: `${total > 0 ? (t.sp / total) * 100 : 0}%` }} title={`Shopee ${formatCurrencyIDR(t.sp)}`} />
                    </div>
                    <span className="mt-2 text-xs font-bold" style={{ color: t.month === month ? '#fff' : '#a3a3a3' }}>
                      {MONTH_LABEL_ID[t.month].slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 dl-muted">
              <span className="flex items-center gap-1.5"><span className="dl-dot" style={{ background: TT, margin: 0 }} />TikTok</span>
              <span className="flex items-center gap-1.5"><span className="dl-dot" style={{ background: SP, margin: 0 }} />Shopee</span>
            </div>
          </div>
        </section>

        <section className="dl-card">
          <div className="dl-head">
            <span className="dl-ico">↗</span>
            <div>
              <h3 className="dl-h">Proyeksi Akhir Bulan</h3>
              <p className="dl-sub">Omzet sejauh ini dibagi hari berjalan, dikali jumlah hari bulan</p>
            </div>
          </div>
          <div className="dl-body">
            {elapsed === null ? (
              <p className="dl-muted">Bulan ini belum dimulai.</p>
            ) : (
              <>
                <div className="dl-lbl">Proyeksi omzet {MONTH_LABEL_ID[month]}</div>
                <div className="dl-num dl-num-lg" style={{ marginTop: 4 }}>{projected === null ? '—' : formatCurrencyIDR(projected)}</div>
                <div className="dl-lbl" style={{ marginTop: 20 }}>Proyeksi vs target</div>
                <div className="dl-bar" style={{ marginTop: 8 }}>
                  <i style={{ width: `${Math.min(100, (projectedAch ?? 0) * 100)}%`, background: achColor(projectedAch) }} />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span><b>{projectedAch === null ? '—' : formatPercent(projectedAch, 1)}</b> <span className="dl-muted">dari target</span></span>
                  <span className="dl-muted">Hari {elapsed} dari {daysInMonth}</span>
                </div>
                <p className="dl-muted" style={{ marginTop: 16 }}>Hanya berdasarkan data yang sudah masuk.</p>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Host di bawah 50% & kontribusi marketplace */}
      <div className="dl-grid dl-g2">
        <section className="dl-card">
          <div className="dl-head">
            <span className="dl-ico">!</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className="dl-h">Host di Bawah 50%</h3>
              <p className="dl-sub">Achievement terhadap target host</p>
            </div>
            <span className="dl-pill count">{lowHosts.length} host</span>
          </div>
          <div className="dl-body">
            {lowHosts.length === 0 ? (
              <p className="dl-muted">Semua host sudah di atas 50% (atau belum punya target).</p>
            ) : (
              <ul className="dl-stack" style={{ gap: 16 }}>
                {lowHosts.map((r) => (
                  <li key={r.host}>
                    <div className="flex justify-between text-sm font-bold">
                      <span>{r.host}</span>
                      <span className="tabular-nums">{formatPercent(r.achievement, 1)}</span>
                    </div>
                    <div className="dl-bar" style={{ marginTop: 6 }}>
                      <i style={{ width: `${Math.min(100, (r.achievement ?? 0) * 100)}%`, background: '#ef4444' }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="dl-card light">
          <div className="dl-head">
            <span className="dl-ico" style={{ background: '#111', color: '#fff' }}>%</span>
            <div>
              <h3 className="dl-h">Kontribusi Omzet Marketplace</h3>
              <p className="dl-sub">Porsi omzet TikTok dan Shopee dari total</p>
            </div>
          </div>
          <div className="dl-body">
            <div className="dl-donut-wrap">
              <svg viewBox="0 0 120 120" className="w-36 h-36 shrink-0" role="img" aria-label={`TikTok ${formatPercent(shareTT, 1)}, Shopee ${formatPercent(shareSP, 1)}`}>
                <circle cx="60" cy="60" r={R} fill="none" stroke="#e5e5e5" strokeWidth="18" />
                <circle cx="60" cy="60" r={R} fill="none" stroke={TT} strokeWidth="18" strokeDasharray={`${ttLen} ${C}`} transform="rotate(-90 60 60)" />
                <circle cx="60" cy="60" r={R} fill="none" stroke={SP} strokeWidth="18" strokeDasharray={`${spLen} ${C}`} strokeDashoffset={-(shareTT * C + gap / 2)} transform="rotate(-90 60 60)" />
              </svg>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="dl-lbl">Total omzet</div>
                <div className="dl-num dl-num-sm" style={{ marginTop: 4 }}>{juta(omzetTotal)}</div>
                <div className="dl-legend-row" style={{ marginTop: 16 }}>
                  <span><span className="dl-dot" style={{ background: TT_DARK }} />TikTok</span>
                  <b className="tabular-nums">{formatPercent(shareTT, 1)}</b>
                </div>
                <div className="dl-muted" style={{ marginLeft: 18 }}>{formatCurrencyIDR(omzetTT)}</div>
                <div className="dl-legend-row" style={{ marginTop: 8 }}>
                  <span><span className="dl-dot" style={{ background: SP_SOLID }} />Shopee</span>
                  <b className="tabular-nums">{formatPercent(shareSP, 1)}</b>
                </div>
                <div className="dl-muted" style={{ marginLeft: 18 }}>{formatCurrencyIDR(omzetSP)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Top 5: total, TikTok, Shopee */}
      <div className="dl-grid dl-g3">
        <TopFive
          title="Kontribusi Host (5 Besar)"
          subtitle="Total omzet TikTok + Shopee"
          icon={<span className="dl-ico">★</span>}
          items={top5Total}
          field="omzet"
          total={omzetTotal}
          bar="#ffffff"
        />
        <TopFive
          title="5 Besar TikTok"
          subtitle="Omzet TikTok"
          icon={<span className="dl-ico tt">T</span>}
          items={top5TT}
          field="tt"
          total={omzetTT}
          bar={TT}
          titleColor={TT}
        />
        <TopFive
          title="5 Besar Shopee"
          subtitle="Omzet Shopee"
          icon={<span className="dl-ico sp">S</span>}
          items={top5SP}
          field="sp"
          total={omzetSP}
          bar={SP_SOLID}
          titleColor={SP}
        />
      </div>

      {/* Rincian host */}
      <section className="dl-card light">
        <div className="dl-head" style={{ justifyContent: 'space-between' }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="dl-ico" style={{ background: '#111', color: '#fff' }}>≡</span>
            <div className="min-w-0">
              <h3 className="dl-h">Rincian Host</h3>
              <p className="dl-sub">Omzet bulan lalu: {prevLabel} 2026{prevAggregate ? '' : ' (data belum tersedia)'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" style={{ minWidth: 200 }}>
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <label htmlFor="live-search" className="sr-only">Cari nama host</label>
              <input
                id="live-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari host..."
                className="dl-field"
                style={{ width: '100%', paddingLeft: 34, background: '#fff', color: '#111', borderColor: '#d4d4d4' }}
              />
            </div>
            <div className="dl-sel">
              <label htmlFor="live-sort" className="sr-only">Urutkan host berdasarkan</label>
              <select
                id="live-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="dl-field"
                style={{ background: '#fff', color: '#111', borderColor: '#d4d4d4' }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    Urutkan: {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <button
                type="button"
                className="dl-btn"
                onClick={() => setShowPicker((v) => !v)}
                aria-expanded={showPicker}
                style={{ background: '#fff', color: '#111', borderColor: '#d4d4d4' }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" style={{ display: 'inline', marginRight: 6 }} aria-hidden="true" />
                Pilih Matrics
              </button>
              {showPicker && (
                <div className="dl-menu">
                  {METRICS.map((m) => (
                    <label key={m.key}>
                      <input type="checkbox" checked={visible[m.key]} onChange={() => setVisible((v) => ({ ...v, [m.key]: !v[m.key] }))} />
                      {m.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="dl-seg" role="group" aria-label="Arah urutan">
              <button type="button" aria-pressed={sortDir === 'desc'} onClick={() => setSortDir('desc')}>Tertinggi</button>
              <button type="button" aria-pressed={sortDir === 'asc'} onClick={() => setSortDir('asc')}>Terendah</button>
            </div>
          </div>
        </div>

        <div className="dl-table-wrap">
          <table className="dl-table">
            <thead>
              <tr>
                <th>Host</th>
                {visibleCols.map((c) => (
                  <th
                    key={c.key}
                    className={`${c.key === 'sessions' ? '' : 'r'} ${c.key === 'tt' ? 'tt-h' : ''} ${c.key === 'sp' ? 'sp-h' : ''}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.host} className={r.achievement !== null && r.achievement < 0.5 ? 'low' : undefined}>
                  <td style={{ fontWeight: 800, color: '#111' }}>{r.host}</td>
                  {visible.sessions && <td>{r.sessions}</td>}
                  {visible.target && <td className="r">{formatCurrencyIDR(r.target)}</td>}
                  {visible.omzet && <td className="r" style={{ fontWeight: 700 }}>{formatCurrencyIDR(r.omzet)}</td>}
                  {visible.achievement && (
                    <td className="dl-ach">
                      <div className="dl-bar">
                        <i style={{ width: `${Math.min(100, (r.achievement ?? 0) * 100)}%`, background: achColor(r.achievement) }} />
                      </div>
                      <small style={{ color: achColor(r.achievement) }}>
                        {r.achievement === null ? '—' : formatPercent(r.achievement, 1)}
                      </small>
                    </td>
                  )}
                  {visible.prev && <td className="r">{r.prev === null ? '—' : formatCurrencyIDR(r.prev)}</td>}
                  {visible.growth && (
                    <td className="r">
                      <GrowthCell value={r.growth} />
                    </td>
                  )}
                  {visible.tt && <td className="r">{formatCurrencyIDR(r.tt)}</td>}
                  {visible.sp && <td className="r">{formatCurrencyIDR(r.sp)}</td>}
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length + 1} style={{ textAlign: 'center', color: '#6b6b6b', padding: 28 }}>
                    Tidak ada host untuk bulan ini.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr>
                  <td>Total ({filteredRows.length} host)</td>
                  {visible.sessions && <td>{totalSessions}</td>}
                  {visible.target && <td className="r">{formatCurrencyIDR(targetTotal)}</td>}
                  {visible.omzet && <td className="r">{formatCurrencyIDR(omzetTotal)}</td>}
                  {visible.achievement && <td className="r">{achTotal === null ? '—' : formatPercent(achTotal, 1)}</td>}
                  {visible.prev && <td className="r">{prevAggregate ? formatCurrencyIDR(prevTotal) : '—'}</td>}
                  {visible.growth && (
                    <td className="r">
                      <GrowthCell value={growthOf(omzetTotal, prevTotal)} />
                    </td>
                  )}
                  {visible.tt && <td className="r">{formatCurrencyIDR(omzetTT)}</td>}
                  {visible.sp && <td className="r">{formatCurrencyIDR(omzetSP)}</td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Ringkasan total */}
      <section className="dl-card">
        <div className="dl-head">
          <span className="dl-ico">Σ</span>
          <div>
            <h3 className="dl-h">Total ({filteredRows.length} Host)</h3>
            <p className="dl-sub">Akumulasi seluruh host · {MONTH_LABEL_ID[month]} 2026</p>
          </div>
        </div>
        <div className="dl-body">
          <div className="dl-grid dl-g4">
            <div className="dl-tile">
              <div className="dl-lbl">Sesi Live total</div>
              <div className="dl-num dl-num-sm" style={{ marginTop: 8 }}>{totalSessions}</div>
            </div>
            <div className="dl-tile">
              <div className="dl-lbl">Target total</div>
              <div className="dl-num dl-num-sm" style={{ marginTop: 8 }}>{formatCurrencyIDR(targetTotal)}</div>
            </div>
            <div className="dl-tile white">
              <div className="dl-lbl" style={{ color: '#6b6b6b' }}>Omzet total</div>
              <div className="dl-num dl-num-sm" style={{ marginTop: 8 }}>{formatCurrencyIDR(omzetTotal)}</div>
            </div>
            <div className="dl-tile">
              <div className="dl-lbl">Achievement total</div>
              <div className="dl-num dl-num-sm" style={{ marginTop: 8 }}>{achTotal === null ? '—' : formatPercent(achTotal, 1)}</div>
              <div className="dl-bar" style={{ marginTop: 12 }}>
                <i style={{ width: `${Math.min(100, (achTotal ?? 0) * 100)}%`, background: achColor(achTotal) }} />
              </div>
            </div>
            <div className="dl-tile">
              <div className="dl-lbl">Omzet bulan lalu</div>
              <div className="dl-num dl-num-sm" style={{ marginTop: 8 }}>{prevAggregate ? formatCurrencyIDR(prevTotal) : '—'}</div>
              <div className="dl-muted" style={{ marginTop: 4 }}>{prevLabel} 2026</div>
            </div>
            <div className="dl-tile">
              <div className="dl-lbl">Growth</div>
              <div className="dl-num dl-num-sm" style={{ marginTop: 8 }}>
                <GrowthCell value={avgGrowth} />
              </div>
              <div className="dl-muted" style={{ marginTop: 4 }}>vs {prevLabel} 2026</div>
            </div>
            <div className="dl-tile tt">
              <div className="dl-lbl" style={{ color: TT }}>Omzet TikTok total</div>
              <div className="dl-num dl-num-sm" style={{ marginTop: 8, color: TT }}>{formatCurrencyIDR(omzetTT)}</div>
              <div className="dl-muted" style={{ marginTop: 4 }}>{formatPercent(shareTT, 1)} dari total</div>
            </div>
            <div className="dl-tile sp">
              <div className="dl-lbl" style={{ color: SP }}>Omzet Shopee total</div>
              <div className="dl-num dl-num-sm" style={{ marginTop: 8, color: SP }}>{formatCurrencyIDR(omzetSP)}</div>
              <div className="dl-muted" style={{ marginTop: 4 }}>{formatPercent(shareSP, 1)} dari total</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const GrowthCell: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null) return <span className="dl-muted">—</span>;
  const up = value >= 0;
  return (
    <span className={up ? 'dl-up' : 'dl-down'}>
      {up ? '▲' : '▼'} {formatPercent(Math.abs(value), 1)}
    </span>
  );
};

interface TopFiveProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: { host: string; omzet: number; tt: number; sp: number }[];
  field: 'omzet' | 'tt' | 'sp';
  total: number;
  bar: string;
  titleColor?: string;
}

const TopFive: React.FC<TopFiveProps> = ({ title, subtitle, icon, items, field, total, bar, titleColor }) => {
  const max = items.length > 0 ? Math.max(...items.map((i) => i[field])) : 0;
  return (
    <section className="dl-card">
      <div className="dl-head">
        {icon}
        <div>
          <h3 className="dl-h" style={titleColor ? { color: titleColor } : undefined}>{title}</h3>
          <p className="dl-sub">{subtitle}</p>
        </div>
      </div>
      <div className="dl-body">
        {items.length === 0 ? (
          <p className="dl-muted">Belum ada omzet.</p>
        ) : (
          <ol className="dl-stack" style={{ gap: 16 }}>
            {items.map((i, idx) => {
              const v = i[field];
              return (
                <li key={i.host} title={`${i.host}: ${formatCurrencyIDR(v)}`}>
                  <div className="flex items-center justify-between gap-2 text-xs" style={{ marginBottom: 6 }}>
                    <span className="flex items-center" style={{ minWidth: 0 }}>
                      <span className="dl-rank">{idx + 1}</span>
                      <b className="truncate">{i.host}</b>
                    </span>
                    <span className="tabular-nums shrink-0">
                      {formatCurrencyIDR(v)} <span className="dl-muted">({formatPercent(total > 0 ? v / total : 0, 1)})</span>
                    </span>
                  </div>
                  <div className="dl-bar" style={{ height: 6 }}>
                    <i style={{ width: `${max > 0 ? (v / max) * 100 : 0}%`, background: bar }} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
};
