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
import '../styles/dashboard-live.css';

interface KomisiDashboardProps {
  month: MonthName;
  summary: DivisionSummary;
  hosts: HostCommission[];
  commissionParams: CommissionParams;
  onSelectHost: (host: HostCommission) => void;
}

const achColor = (c: number) => (c >= 1 ? '#22c55e' : c >= 0.7 ? '#7fa3d6' : '#ef4444');

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
    <div className="dl-stack">
      <div className="dl-grid dl-g4">
        <Tile label="Dasar Organik" value={formatCurrencyIDR(summary.totalDasar)} sub={`${hosts.length} host · ${MONTH_LABEL_ID[month]} 2026`} />
        <Tile label="Komisi Utama" value={formatCurrencyIDR(summary.totalKomisiUtama)} sub={`Tarif ${formatPercent(commissionParams.tarifUtama, 2)}`} />
        <Tile label="Bonus Kehadiran" value={formatCurrencyIDR(summary.totalBonus)} sub={`Plafon bonus ${formatPercent(commissionParams.plafonBonus, 2)}`} />
        <Tile label="Sisa Anggaran" value={formatCurrencyIDR(summary.sisaAnggaran)} sub={`Plafon total ${formatCurrencyIDR(summary.anggaranMaksimal)}`} />
      </div>

      <div className="dl-grid dl-g3">
        <section className="dl-card" style={{ gridColumn: 'span 2 / span 2' }}>
          <div className="dl-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className="dl-h">Pencapaian Target Divisi</h3>
              <p className="dl-sub">
                Jika capaian divisi di bawah 100%, faktor pengali divisi = {formatPercent(commissionParams.faktorDivisiBawah, 0)}.
              </p>
            </div>
            <span className="dl-tag">
              Faktor divisi: {summary.faktorDivisi === null ? 'Belum dihitung' : formatPercent(summary.faktorDivisi, 0)}
            </span>
          </div>
          <div className="dl-body">
            <div className="dl-label-row" style={{ marginBottom: 8, fontSize: 12 }}>
              <span>
                Realisasi organik: <b className="tabular-nums">{formatCurrencyIDR(summary.totalDasar)}</b>
                {' / '}
                <span className="tabular-nums">{formatCurrencyIDR(summary.targetDivisi)}</span>
              </span>
              <b className="tabular-nums" style={{ color: achColor(capaian) }}>
                {summary.capaianDivisi === null ? 'Target belum diisi' : formatPercent(summary.capaianDivisi, 1)}
              </b>
            </div>
            <div className="dl-bar" style={{ height: 12 }}>
              <i style={{ width: `${Math.min(100, capaian * 100)}%`, background: achColor(capaian) }} />
            </div>
          </div>
        </section>

        <section className="dl-card">
          <div className="dl-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className="dl-h">Alokasi Anggaran Komisi</h3>
              <p className="dl-sub">Dibandingkan dengan plafon {formatPercent(commissionParams.plafonTotal, 2)} dari dasar organik.</p>
            </div>
          </div>
          <div className="dl-body dl-stack-tight">
            <div className="dl-split">
              <i style={{ width: `${komisiPct}%`, background: '#ffffff' }} />
              <i style={{ width: `${bonusPct}%`, background: '#7fa3d6' }} />
            </div>
            <Legend color="#ffffff" label="Komisi utama" value={formatCurrencyIDR(summary.totalKomisiUtama)} />
            <Legend color="#7fa3d6" label="Bonus kehadiran" value={formatCurrencyIDR(summary.totalBonus)} />
            <Legend color="#404040" label="Sisa anggaran" value={formatCurrencyIDR(summary.sisaAnggaran)} />
          </div>
        </section>
      </div>

      <section className="dl-card">
        <div className="dl-head" style={{ justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <h3 className="dl-h">Rincian Komisi per Host</h3>
            <p className="dl-sub">Klik nama host untuk melihat rincian perhitungan.</p>
          </div>
          <div className="relative" style={{ minWidth: 220 }}>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#737373' }} aria-hidden="true" />
            <label htmlFor="komisi-search" className="sr-only">Cari nama host</label>
            <input
              id="komisi-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama host..."
              className="dl-field"
              style={{ width: '100%', paddingLeft: 34 }}
            />
          </div>
        </div>

        <div className="dl-table-wrap">
          <table className="dl-table">
            <thead>
              <tr>
                <th>Host</th>
                <th className="r">Dasar Organik</th>
                <th className="r">Target Host</th>
                <th>Capaian</th>
                <th className="r">Pengali</th>
                <th className="r">Hadir / {commissionParams.shiftWajib}</th>
                <th className="r">Komisi Utama</th>
                <th className="r">Bonus</th>
                <th className="r">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => {
                const cap = h.capaian;
                return (
                  <tr key={h.host} className="clickable" onClick={() => onSelectHost(h)}>
                    <td style={{ fontWeight: 800, color: '#fff' }}>{h.host}</td>
                    <td className="r">{formatCurrencyIDR(h.dasarOrganik)}</td>
                    <td className="r">{formatCurrencyIDR(h.target.total)}</td>
                    <td className="dl-ach">
                      {cap === null ? (
                        <span className="dl-muted">Belum ada target</span>
                      ) : (
                        <>
                          <div className="dl-bar" style={{ height: 6 }}>
                            <i style={{ width: `${Math.min(100, cap * 100)}%`, background: achColor(cap) }} />
                          </div>
                          <small style={{ color: achColor(cap) }}>{formatPercent(cap, 1)}</small>
                        </>
                      )}
                    </td>
                    <td className="r">{h.pengali === null ? '—' : formatPercent(h.pengali, 0)}</td>
                    <td className="r">
                      {h.attendanceInput?.hadir ?? '—'} / {commissionParams.shiftWajib}
                    </td>
                    <td className="r">{formatCurrencyIDR(h.komisiUtama)}</td>
                    <td className="r">{formatCurrencyIDR(h.bonusKehadiran)}</td>
                    <td className="r" style={{ fontWeight: 800, color: '#fff' }}>{formatCurrencyIDR(h.total)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: '#737373', padding: 28 }}>
                    Tidak ada host untuk bulan ini.
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr>
                  <td>Total ({filtered.length} host)</td>
                  <td className="r">{formatCurrencyIDR(summary.totalDasar)}</td>
                  <td colSpan={4} />
                  <td className="r">{formatCurrencyIDR(summary.totalKomisiUtama)}</td>
                  <td className="r">{formatCurrencyIDR(summary.totalBonus)}</td>
                  <td className="r">{formatCurrencyIDR(summary.totalDibayar)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
};

const Tile: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div className="dl-tile">
    <div className="dl-lbl">{label}</div>
    <div className="dl-num dl-num-sm" style={{ marginTop: 8 }}>{value}</div>
    <div className="dl-muted" style={{ marginTop: 4 }}>{sub}</div>
  </div>
);

const Legend: React.FC<{ color: string; label: string; value: string }> = ({ color, label, value }) => (
  <div className="dl-legend-row">
    <span className="flex items-center" style={{ color: '#bdbdbd' }}>
      <span className="dl-dot" style={{ background: color }} />
      {label}
    </span>
    <b className="tabular-nums">{value}</b>
  </div>
);
