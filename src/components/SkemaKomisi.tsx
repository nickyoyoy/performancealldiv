import React, { useEffect, useState } from 'react';
import {
  CommissionParams,
  MonthName,
  MONTH_LABEL_ID,
  OrganicMethod,
  OrganicParams,
  TargetInput,
  HostCommission,
} from '../utils/liveHostEngine';
import { formatCurrencyIDR } from '../utils/formatters';
import '../styles/dashboard-live.css';

interface SkemaKomisiProps {
  month: MonthName;
  hosts: HostCommission[];
  targetInput: TargetInput;
  onTargetDivisiChange: (market: 'tiktok' | 'shopee', val: number | null) => void;
  onUpdateManualTarget: (host: string, market: 'tiktok' | 'shopee', val: number | null) => void;
  organicParams: OrganicParams;
  onOrganicParamsChange: (next: OrganicParams) => void;
  commissionParams: CommissionParams;
  onCommissionParamsChange: (next: CommissionParams) => void;
  attendanceMap: Record<string, { hadir?: number | null }>;
  onQuickHadirChange: (host: string, hadir: number | null) => void;
}

/** Input angka yang menyimpan draft lokal dan commit saat blur / Enter. */
const NumField: React.FC<{
  id: string;
  value: number | null;
  /** nilai yang tampil (mis. persen = value * 100) */
  toDisplay?: (v: number) => number;
  /** konversi input ke nilai tersimpan (mis. persen -> fraksi) */
  fromDisplay?: (v: number) => number;
  step?: string;
  suffix?: string;
  placeholder?: string;
  onCommit: (v: number | null) => void;
  style?: React.CSSProperties;
}> = ({ id, value, toDisplay = (v) => v, fromDisplay = (v) => v, step = 'any', suffix, placeholder, onCommit, style }) => {
  const shown = value === null || value === undefined ? '' : String(Number(toDisplay(value).toFixed(6)));
  const [draft, setDraft] = useState(shown);

  useEffect(() => {
    setDraft(shown);
  }, [shown]);

  const commit = () => {
    const t = draft.trim();
    if (t === '') return onCommit(null);
    const n = Number(t.replace(',', '.'));
    if (!Number.isFinite(n)) return setDraft(shown);
    onCommit(fromDisplay(n));
  };

  return (
    <div className="relative" style={{ width: '100%', ...style }}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="dl-field tabular-nums"
        style={{ width: '100%', paddingRight: suffix ? 34 : 12, fontWeight: 700 }}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs pointer-events-none" style={{ color: '#a3a3a3' }}>
          {suffix}
        </span>
      )}
    </div>
  );
};

/** Input rupiah: saat diketik hanya angka; saat keluar input tampil "Rp 2.000.000.000". */
const MoneyField: React.FC<{
  id: string;
  value: number | null;
  placeholder?: string;
  onCommit: (v: number | null) => void;
}> = ({ id, value, placeholder, onCommit }) => {
  const fmt = (v: number | null | undefined) =>
    v === null || v === undefined ? '' : `Rp ${Math.round(v).toLocaleString('id-ID')}`;
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(fmt(value));

  useEffect(() => {
    if (!focused) setDraft(fmt(value));
  }, [value, focused]);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={focused ? draft : fmt(value)}
      placeholder={placeholder}
      onFocus={() => {
        setFocused(true);
        setDraft(value === null || value === undefined ? '' : String(Math.round(value)));
      }}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
      onBlur={() => {
        setFocused(false);
        const digits = draft.replace(/\D/g, '');
        onCommit(digits === '' ? null : Number(digits));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className="dl-field tabular-nums"
      style={{ width: '100%', fontWeight: 700 }}
    />
  );
};

const Section: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <section className="dl-card">
    <div className="dl-head">
      <div style={{ minWidth: 0 }}>
        <h3 className="dl-h">{title}</h3>
        <p className="dl-sub">{desc}</p>
      </div>
    </div>
    <div className="dl-body">{children}</div>
  </section>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <div className="dl-lbl" style={{ marginBottom: 6 }}>{label}</div>
    {children}
    {hint && <div className="dl-muted" style={{ marginTop: 6, fontSize: 11 }}>{hint}</div>}
  </div>
);

const pct = { toDisplay: (v: number) => v * 100, fromDisplay: (v: number) => v / 100, suffix: '%' };

export const SkemaKomisi: React.FC<SkemaKomisiProps> = ({
  month,
  hosts,
  targetInput,
  onTargetDivisiChange,
  onUpdateManualTarget,
  organicParams,
  onOrganicParamsChange,
  commissionParams,
  onCommissionParamsChange,
  attendanceMap,
  onQuickHadirChange,
}) => {
  const isSpreadsheet = organicParams.method === 'spreadsheet';
  const [bulkTT, setBulkTT] = useState<number | null>(null);
  const [bulkSP, setBulkSP] = useState<number | null>(null);

  // Isi target TikTok / Shopee yang sama ke semua host. Kolom kosong di bagian isian tidak mengubah host.
  const applyBulk = () => {
    hosts.forEach((h) => {
      if (bulkTT !== null) onUpdateManualTarget(h.host, 'tiktok', bulkTT);
      if (bulkSP !== null) onUpdateManualTarget(h.host, 'shopee', bulkSP);
    });
  };
  const setParam = (patch: Partial<CommissionParams>) => onCommissionParamsChange({ ...commissionParams, ...patch });

  return (
    <div className="dl-stack">
      <div className="dl-alert">
        Pengaturan untuk <b>{MONTH_LABEL_ID[month]} 2026</b>. Perubahan tersimpan otomatis di browser ini dan langsung dipakai di Komisi Host Live.
      </div>

      <div className="dl-grid dl-g2">
        <Section title="Target Divisi Bulanan" desc="Target gabungan per platform. Dipakai untuk menghitung capaian divisi dan faktor pengali divisi.">
          <div className="dl-grid dl-g2" style={{ gap: 12 }}>
            <Field label="Target TikTok Live (Rp)" hint="Kosong = dari 04_MASTER_TARGET">
              <MoneyField id="target-tt" value={targetInput.divisiTikTok} placeholder="Rp 0" onCommit={(v) => onTargetDivisiChange('tiktok', v)} />
            </Field>
            <Field label="Target Shopee Live (Rp)" hint="Kosong = dari 04_MASTER_TARGET">
              <MoneyField id="target-sp" value={targetInput.divisiShopee} placeholder="Rp 0" onCommit={(v) => onTargetDivisiChange('shopee', v)} />
            </Field>
          </div>
        </Section>

        <Section title="Parameter Komisi" desc="Tarif dan batas yang dipakai di seluruh perhitungan komisi.">
          <div className="dl-grid dl-g2" style={{ gap: 12 }}>
            <Field label="Tarif komisi utama" hint="Dikalikan dasar organik × pengali host">
              <NumField id="tarif-utama" value={commissionParams.tarifUtama} {...pct} onCommit={(v) => v !== null && setParam({ tarifUtama: v })} />
            </Field>
            <Field label="Faktor divisi jika di bawah target" hint="Pengali bila capaian divisi < 100%">
              <NumField id="faktor-bawah" value={commissionParams.faktorDivisiBawah} {...pct} onCommit={(v) => v !== null && setParam({ faktorDivisiBawah: v })} />
            </Field>
            <Field label="Plafon total anggaran" hint="Maks. komisi + bonus dari dasar organik">
              <NumField id="plafon-total" value={commissionParams.plafonTotal} {...pct} onCommit={(v) => v !== null && setParam({ plafonTotal: v })} />
            </Field>
            <Field label="Plafon bonus kehadiran" hint="Maks. bonus dari dasar organik">
              <NumField id="plafon-bonus" value={commissionParams.plafonBonus} {...pct} onCommit={(v) => v !== null && setParam({ plafonBonus: v })} />
            </Field>
            <Field label="Shift wajib per bulan" hint="Dasar perhitungan kehadiran">
              <NumField id="shift-wajib" value={commissionParams.shiftWajib} step="1" onCommit={(v) => v !== null && v > 0 && setParam({ shiftWajib: Math.round(v) })} />
            </Field>
          </div>
        </Section>

        <Section title="Metode Dasar Organik" desc="Cara memisahkan omzet organik dari biaya Ads.">
          <div className="dl-stack-tight">
            <Field label="Metode">
              <select
                className="dl-field"
                style={{ width: '100%' }}
                value={organicParams.method ?? 'brief_v5'}
                onChange={(e) => onOrganicParamsChange({ ...organicParams, method: e.target.value as OrganicMethod })}
              >
                <option value="brief_v5">Brief v5 — omzet dikurangi biaya Ads langsung</option>
                <option value="spreadsheet">Spreadsheet — proporsi + penyesuaian manual</option>
              </select>
            </Field>
            {isSpreadsheet && (
              <div className="dl-grid dl-g2" style={{ gap: 12 }}>
                <Field label="Penyesuaian TikTok">
                  <NumField id="adj-tt" value={organicParams.adjTikTok} {...pct} onCommit={(v) => v !== null && onOrganicParamsChange({ ...organicParams, adjTikTok: v })} />
                </Field>
                <Field label="Penyesuaian Shopee">
                  <NumField id="adj-sp" value={organicParams.adjShopee} {...pct} onCommit={(v) => v !== null && onOrganicParamsChange({ ...organicParams, adjShopee: v })} />
                </Field>
              </div>
            )}
          </div>
        </Section>

        <Section title="Kehadiran Host" desc="Jumlah shift hadir reguler. Nilai dari 03_DATABASE_LIVE bisa ditimpa di sini.">
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #262626', borderRadius: 12 }}>
            {hosts.length === 0 && <div className="dl-muted" style={{ padding: 16 }}>Belum ada host untuk bulan ini.</div>}
            {hosts.map((h) => (
              <div key={h.host} className="dl-label-row" style={{ padding: '8px 12px', borderBottom: '1px solid #1f1f1f' }}>
                <span style={{ fontWeight: 800, fontSize: 12 }}>{h.host}</span>
                <NumField
                  id={`hadir-${h.host}`}
                  value={attendanceMap[h.host]?.hadir ?? null}
                  step="1"
                  placeholder="—"
                  style={{ width: 120 }}
                  onCommit={(v) => onQuickHadirChange(h.host, v === null ? null : Math.max(0, Math.round(v)))}
                />
              </div>
            ))}
          </div>
        </Section>
      </div>

      <section className="dl-card">
        <div className="dl-head">
          <div style={{ minWidth: 0 }}>
            <h3 className="dl-h">Target Manual per Host</h3>
            <p className="dl-sub">Isi jika host punya target khusus. Kosong = target dihitung otomatis dari histori 3 bulan terakhir.</p>
          </div>
        </div>
        <div className="dl-table-wrap">
          <table className="dl-table">
            <thead>
              <tr>
                <th>Host</th>
                <th className="r">Target TikTok (Rp)</th>
                <th className="r">Target Shopee (Rp)</th>
                <th className="r">Target Dipakai (Total)</th>
              </tr>
              <tr style={{ background: '#111' }}>
                <td style={{ fontWeight: 800, color: '#fff', textTransform: 'uppercase', fontSize: 11, letterSpacing: '.07em' }}>
                  Isi semua host
                </td>
                <td style={{ width: 200 }}>
                  <MoneyField id="bulk-tt" value={bulkTT} placeholder="Rp 0" onCommit={setBulkTT} />
                </td>
                <td style={{ width: 200 }}>
                  <MoneyField id="bulk-sp" value={bulkSP} placeholder="Rp 0" onCommit={setBulkSP} />
                </td>
                <td className="r">
                  <button
                    type="button"
                    className="dl-btn"
                    disabled={bulkTT === null && bulkSP === null}
                    onClick={applyBulk}
                  >
                    Terapkan ke semua
                  </button>
                </td>
              </tr>
            </thead>
            <tbody>
              {hosts.map((h) => {
                const manual = targetInput.manual[h.host] ?? {};
                return (
                  <tr key={h.host}>
                    <td style={{ fontWeight: 800, color: '#fff' }}>{h.host}</td>
                    <td style={{ width: 200 }}>
                      <MoneyField id={`mt-tt-${h.host}`} value={manual.tiktok ?? null} placeholder={h.target.sourceTikTok === 'histori' ? 'Histori' : 'Kosong'} onCommit={(v) => onUpdateManualTarget(h.host, 'tiktok', v)} />
                    </td>
                    <td style={{ width: 200 }}>
                      <MoneyField id={`mt-sp-${h.host}`} value={manual.shopee ?? null} placeholder={h.target.sourceShopee === 'histori' ? 'Histori' : 'Kosong'} onCommit={(v) => onUpdateManualTarget(h.host, 'shopee', v)} />
                    </td>
                    <td className="r">{formatCurrencyIDR(h.target.total)}</td>
                  </tr>
                );
              })}
              {hosts.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#737373', padding: 24 }}>Belum ada host untuk bulan ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
