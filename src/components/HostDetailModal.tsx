import React, { useEffect } from 'react';
import {
  AttendanceInput,
  CommissionParams,
  HostCommission,
  OrganicParams,
} from '../utils/liveHostEngine';
import { formatCurrencyIDR, formatPercent } from '../utils/formatters';
import { X, Calculator, CalendarCheck, Target, AlertTriangle } from 'lucide-react';

interface HostDetailModalProps {
  host: HostCommission | null;
  onClose: () => void;
  faktorDivisi: number | null;
  params: CommissionParams;
  organicParams: OrganicParams;
  manualTarget: { tiktok?: number | null; shopee?: number | null };
  onUpdateManualTarget: (
    hostName: string,
    market: 'tiktok' | 'shopee',
    value: number | null
  ) => void;
  attendance: AttendanceInput | undefined;
  onUpdateAttendance: (hostName: string, next: AttendanceInput) => void;
}

export const HostDetailModal: React.FC<HostDetailModalProps> = ({
  host,
  onClose,
  faktorDivisi,
  params,
  organicParams,
  manualTarget,
  onUpdateManualTarget,
  attendance,
  onUpdateAttendance,
}) => {
  useEffect(() => {
    if (!host) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [host, onClose]);

  if (!host) return null;

  const parseOptNum = (val: string): number | null => {
    if (val.trim() === '') return null;
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const setAttField = (field: keyof AttendanceInput, raw: string) => {
    const val = parseOptNum(raw);
    onUpdateAttendance(host.host, {
      ...attendance,
      [field]: val,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scentplus-forestDark/65 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="host-detail-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="bg-scentplus-forest text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl bg-scentplus-mint text-scentplus-forest font-bold flex items-center justify-center text-base shrink-0"
              aria-hidden="true"
            >
              {host.host.substring(0, 2)}
            </div>
            <div>
              <h3 id="host-detail-modal-title" className="font-bold text-base text-white">
                Audit &amp; Input Host: {host.host}
              </h3>
              <p className="text-xs text-slate-200">
                Rincian Perhitungan Web · Metode Brief v5 &amp; Organic Calculation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup rincian host"
            className="p-2 rounded-xl hover:bg-scentplus-forestLight text-slate-200 hover:text-white transition"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 max-h-[80vh] overflow-y-auto">
          {/* Step 1: Dasar Omzet Organik */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-scentplus-forest" aria-hidden="true" />
                Langkah 1: Dasar Omzet Organik
              </span>
              <span className="text-sm font-bold text-scentplus-forest tabular-nums">
                {formatCurrencyIDR(host.dasarOrganik)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 mt-2">
              <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1.5">
                <div className="font-bold text-slate-900">TikTok Live</div>
                <div className="flex justify-between">
                  <span>Pendapatan kotor:</span>
                  <b className="text-slate-900 tabular-nums">{formatCurrencyIDR(host.ttOmzet)}</b>
                </div>
                <div className="flex justify-between">
                  <span>Biaya (kolom Biaya):</span>
                  <span className="tabular-nums">{formatCurrencyIDR(host.ttBiaya)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Proporsi + Adj ({formatPercent(organicParams.adjTikTok, 0)}):</span>
                  <span className="tabular-nums">
                    {formatPercent(host.ttProporsi, 2)} ke {formatPercent(host.ttUnorganicPct, 2)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-100">
                  <span className="font-semibold text-slate-900">Organic TikTok:</span>
                  <b className="text-scentplus-forest tabular-nums">
                    {formatCurrencyIDR(host.ttOrganic)}
                  </b>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1.5">
                <div className="font-bold text-slate-900">Shopee Live</div>
                <div className="flex justify-between">
                  <span>Pesanan Siap Dikirim:</span>
                  <b className="text-slate-900 tabular-nums">{formatCurrencyIDR(host.spOmzet)}</b>
                </div>
                <div className="flex justify-between">
                  <span>Alokasi Ads Shopee:</span>
                  <span className="tabular-nums">
                    {host.spAdsAlokasi === null ? '-' : formatCurrencyIDR(host.spAdsAlokasi)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Proporsi + Adj ({formatPercent(organicParams.adjShopee, 0)}):</span>
                  <span className="tabular-nums">
                    {formatPercent(host.spProporsi, 2)} ke {formatPercent(host.spUnorganicPct, 2)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-100">
                  <span className="font-semibold text-slate-900">Organic Shopee:</span>
                  <b className="text-scentplus-forest tabular-nums">
                    {formatCurrencyIDR(host.spOrganic)}
                  </b>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Target Manual / Histori & Komisi Utama */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-scentplus-forest" aria-hidden="true" />
                Langkah 2: Target &amp; Komisi Utama ({formatPercent(params.tarifUtama, 1)})
              </span>
              <span className="text-sm font-bold text-emerald-800 tabular-nums">
                {host.komisiUtama === null ? 'Target belum diisi' : formatCurrencyIDR(host.komisiUtama)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="modal-target-tiktok"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Target Manual TikTok (Rp) · Sumber: {host.target.sourceTikTok}
                </label>
                <input
                  id="modal-target-tiktok"
                  type="number"
                  min={0}
                  step={1000000}
                  value={manualTarget.tiktok ?? ''}
                  onChange={(e) =>
                    onUpdateManualTarget(host.host, 'tiktok', parseOptNum(e.target.value))
                  }
                  placeholder={
                    host.target.tiktok !== null
                      ? `Otomatis: ${Math.round(host.target.tiktok)}`
                      : 'Kosongkan untuk alokasi histori'
                  }
                  className="w-full px-3 min-h-[38px] rounded-xl border border-slate-300 bg-white text-xs text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label
                  htmlFor="modal-target-shopee"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Target Manual Shopee (Rp) · Sumber: {host.target.sourceShopee}
                </label>
                <input
                  id="modal-target-shopee"
                  type="number"
                  min={0}
                  step={1000000}
                  value={manualTarget.shopee ?? ''}
                  onChange={(e) =>
                    onUpdateManualTarget(host.host, 'shopee', parseOptNum(e.target.value))
                  }
                  placeholder={
                    host.target.shopee !== null
                      ? `Otomatis: ${Math.round(host.target.shopee)}`
                      : 'Kosongkan untuk alokasi histori'
                  }
                  className="w-full px-3 min-h-[38px] rounded-xl border border-slate-300 bg-white text-xs text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Total Target Host:</span>
                <b className="text-slate-900 tabular-nums">{formatCurrencyIDR(host.target.total)}</b>
              </div>
              <div className="flex justify-between">
                <span>Capaian Host ke Pengali Host:</span>
                <b className="text-slate-900 tabular-nums">
                  {formatPercent(host.capaian, 1)} ke {formatPercent(host.pengali, 0)}
                </b>
              </div>
              <div className="flex justify-between">
                <span>Faktor Divisi:</span>
                <b className="text-slate-900 tabular-nums">{formatPercent(faktorDivisi, 0)}</b>
              </div>
            </div>
          </div>

          {/* Step 3: Input Absensi & Bonus Kehadiran */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-scentplus-forest" aria-hidden="true" />
                Langkah 3: Absensi &amp; Bonus Kehadiran (Shift Wajib: {params.shiftWajib})
              </span>
              <span className="text-sm font-bold text-teal-800 tabular-nums">
                {host.bonusKehadiran === null
                  ? 'Absensi belum diisi'
                  : formatCurrencyIDR(host.bonusKehadiran)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
              {(
                [
                  ['hadir', 'Hadir Reguler'],
                  ['backup', 'Backup'],
                  ['izin', 'Izin'],
                  ['sakit', 'Sakit'],
                  ['cuti', 'Cuti'],
                  ['alpa', 'Alpa'],
                ] as [keyof AttendanceInput, string][]
              ).map(([field, label]) => (
                <div key={field}>
                  <label
                    htmlFor={`modal-att-${field}`}
                    className="block text-2xs font-semibold text-slate-700 mb-1"
                  >
                    {label}
                  </label>
                  <input
                    id={`modal-att-${field}`}
                    type="number"
                    min={0}
                    max={60}
                    value={attendance?.[field] ?? ''}
                    onChange={(e) => setAttField(field, e.target.value)}
                    placeholder="-"
                    className="w-full px-2 min-h-[36px] rounded-xl border border-slate-300 bg-white text-xs text-center font-semibold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              ))}
            </div>

            {/* Catatan / Keterangan Khusus Absensi */}
            <div className="pt-1">
              <label
                htmlFor="modal-att-keterangan"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Catatan / Alasan Absensi (misal: izin kabar duka, sakit, backup shift)
              </label>
              <input
                id="modal-att-keterangan"
                type="text"
                value={attendance?.keterangan ?? ''}
                onChange={(e) =>
                  onUpdateAttendance(host.host, {
                    ...attendance,
                    keterangan: e.target.value,
                  })
                }
                placeholder="Contoh: Jadwal diganti karena ada kabar duka..."
                className="w-full px-3 min-h-[38px] rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {host.attendance.warning && (
              <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" aria-hidden="true" />
                <span>{host.attendance.warning}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-600 pt-1">
              <span>
                Kehadiran ({attendance?.hadir ?? '-'} / {params.shiftWajib}):{' '}
                <b className="text-slate-900 tabular-nums">{formatPercent(host.attendance.kehadiran, 1)}</b>
              </span>
              <span>
                Tarif Bonus: <b className="text-teal-800 tabular-nums">{formatPercent(host.attendance.tarif, 2)}</b>
              </span>
            </div>
          </div>

          {/* Step 4: Total Akhir */}
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-950 font-bold uppercase tracking-wider block">
                Total Komisi + Bonus Diterima
              </span>
              <p className="text-xs text-emerald-900 mt-0.5 tabular-nums">
                Komisi Utama ({formatCurrencyIDR(host.komisiUtama)}) + Bonus Hadir ({formatCurrencyIDR(host.bonusKehadiran)})
              </p>
            </div>
            <div className="text-xl font-bold text-scentplus-forest tabular-nums">
              {formatCurrencyIDR(host.total)}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 min-h-[38px] rounded-xl bg-scentplus-forest text-white font-semibold text-xs hover:bg-scentplus-forestLight transition"
          >
            Simpan &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
