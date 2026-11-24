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
  className?: string;
}> = ({ id, value, toDisplay = (v) => v, fromDisplay = (v) => v, step = 'any', suffix, placeholder, onCommit, className }) => {
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
    <div className={`relative ${className ?? ''}`}>
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
        className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#127a60]"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs text-slate-500 pointer-events-none">{suffix}</span>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <section className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card">
    <div className="mb-4">
      <h3 className="font-bold text-sm text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
    </div>
    {children}
  </section>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-2xs font-semibold text-slate-600 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-2xs text-slate-400 mt-1">{hint}</span>}
  </label>
);

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
  const setParam = (patch: Partial<CommissionParams>) => onCommissionParamsChange({ ...commissionParams, ...patch });

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-blue-50/70 border border-blue-100 px-4 py-2.5 text-xs text-blue-900">
        Pengaturan untuk <b>{MONTH_LABEL_ID[month]} 2026</b>. Perubahan tersimpan otomatis di browser ini dan langsung dipakai di Dashboard Komisi.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Target Divisi Bulanan" desc="Target gabungan per platform. Dipakai untuk menghitung capaian divisi dan faktor pengali divisi.">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target TikTok Live (Rp)">
              <NumField
                id="target-tt"
                value={targetInput.divisiTikTok}
                placeholder="Kosong = dari sheet"
                onCommit={(v) => onTargetDivisiChange('tiktok', v)}
              />
            </Field>
            <Field label="Target Shopee Live (Rp)">
              <NumField
                id="target-sp"
                value={targetInput.divisiShopee}
                placeholder="Kosong = dari sheet"
                onCommit={(v) => onTargetDivisiChange('shopee', v)}
              />
            </Field>
          </div>
          <p className="text-2xs text-slate-400 mt-3">
            Kosongkan kolom untuk kembali memakai nilai dari 04_MASTER_TARGET.
          </p>
        </Section>

        <Section title="Parameter Komisi" desc="Tarif dan batas yang dipakai di seluruh perhitungan komisi.">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tarif komisi utama" hint="Dikalikan dasar organik × pengali host">
              <NumField id="tarif-utama" value={commissionParams.tarifUtama} toDisplay={(v) => v * 100} fromDisplay={(v) => v / 100} suffix="%" onCommit={(v) => v !== null && setParam({ tarifUtama: v })} />
            </Field>
            <Field label="Faktor divisi jika di bawah target" hint="Pengali bila capaian divisi < 100%">
              <NumField id="faktor-bawah" value={commissionParams.faktorDivisiBawah} toDisplay={(v) => v * 100} fromDisplay={(v) => v / 100} suffix="%" onCommit={(v) => v !== null && setParam({ faktorDivisiBawah: v })} />
            </Field>
            <Field label="Plafon total anggaran" hint="Maks. komisi + bonus dari dasar organik">
              <NumField id="plafon-total" value={commissionParams.plafonTotal} toDisplay={(v) => v * 100} fromDisplay={(v) => v / 100} suffix="%" onCommit={(v) => v !== null && setParam({ plafonTotal: v })} />
            </Field>
            <Field label="Plafon bonus kehadiran" hint="Maks. bonus dari dasar organik">
              <NumField id="plafon-bonus" value={commissionParams.plafonBonus} toDisplay={(v) => v * 100} fromDisplay={(v) => v / 100} suffix="%" onCommit={(v) => v !== null && setParam({ plafonBonus: v })} />
            </Field>
            <Field label="Shift wajib per bulan" hint="Dasar perhitungan kehadiran">
              <NumField id="shift-wajib" value={commissionParams.shiftWajib} step="1" onCommit={(v) => v !== null && v > 0 && setParam({ shiftWajib: Math.round(v) })} />
            </Field>
          </div>
        </Section>

        <Section title="Metode Dasar Organik" desc="Cara memisahkan omzet organik dari biaya Ads.">
          <div className="space-y-3">
            <Field label="Metode">
              <select
                value={organicParams.method ?? 'brief_v5'}
                onChange={(e) => onOrganicParamsChange({ ...organicParams, method: e.target.value as OrganicMethod })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#127a60]"
              >
                <option value="brief_v5">Brief v5 — omzet dikurangi biaya Ads langsung</option>
                <option value="spreadsheet">Spreadsheet — proporsi + penyesuaian manual</option>
              </select>
            </Field>
            {isSpreadsheet && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Penyesuaian TikTok">
                  <NumField id="adj-tt" value={organicParams.adjTikTok} toDisplay={(v) => v * 100} fromDisplay={(v) => v / 100} suffix="%" onCommit={(v) => v !== null && onOrganicParamsChange({ ...organicParams, adjTikTok: v })} />
                </Field>
                <Field label="Penyesuaian Shopee">
                  <NumField id="adj-sp" value={organicParams.adjShopee} toDisplay={(v) => v * 100} fromDisplay={(v) => v / 100} suffix="%" onCommit={(v) => v !== null && onOrganicParamsChange({ ...organicParams, adjShopee: v })} />
                </Field>
              </div>
            )}
          </div>
        </Section>

        <Section title="Kehadiran Host" desc="Jumlah shift hadir reguler. Nilai dari 03_DATABASE_LIVE bisa ditimpa di sini.">
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200/70 rounded-xl">
            {hosts.length === 0 && <div className="p-4 text-xs text-slate-500">Belum ada host untuk bulan ini.</div>}
            {hosts.map((h) => (
              <div key={h.host} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-xs font-semibold text-slate-900">{h.host}</span>
                <NumField
                  id={`hadir-${h.host}`}
                  value={attendanceMap[h.host]?.hadir ?? null}
                  step="1"
                  placeholder="—"
                  className="w-28"
                  onCommit={(v) => onQuickHadirChange(h.host, v === null ? null : Math.max(0, Math.round(v)))}
                />
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Target Manual per Host" desc="Isi jika host punya target khusus. Kosong = target dihitung otomatis dari histori 3 bulan terakhir.">
        <div className="overflow-x-auto border border-slate-200/70 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-slate-500 text-2xs uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-2.5 px-4">Host</th>
                <th className="py-2.5 px-3 text-right">Target TikTok (Rp)</th>
                <th className="py-2.5 px-3 text-right">Target Shopee (Rp)</th>
                <th className="py-2.5 px-4 text-right">Target Dipakai (Total)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hosts.map((h) => {
                const manual = targetInput.manual[h.host] ?? {};
                return (
                  <tr key={h.host}>
                    <td className="py-2 px-4 font-semibold text-slate-900">{h.host}</td>
                    <td className="py-2 px-3 w-44">
                      <NumField id={`mt-tt-${h.host}`} value={manual.tiktok ?? null} placeholder={h.target.sourceTikTok === 'histori' ? 'Histori' : 'Kosong'} onCommit={(v) => onUpdateManualTarget(h.host, 'tiktok', v)} />
                    </td>
                    <td className="py-2 px-3 w-44">
                      <NumField id={`mt-sp-${h.host}`} value={manual.shopee ?? null} placeholder={h.target.sourceShopee === 'histori' ? 'Histori' : 'Kosong'} onCommit={(v) => onUpdateManualTarget(h.host, 'shopee', v)} />
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums">{formatCurrencyIDR(h.target.total)}</td>
                  </tr>
                );
              })}
              {hosts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">Belum ada host untuk bulan ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};
