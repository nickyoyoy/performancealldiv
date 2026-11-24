import React from 'react';
import { RefreshCw, Radio, Calculator, SlidersHorizontal } from 'lucide-react';
import { MONTHS, MONTH_LABEL_ID, MonthName } from '../utils/liveHostEngine';

export type ViewKey = 'live' | 'komisi' | 'skema';

const VIEWS: { key: ViewKey; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    key: 'live',
    label: 'Dashboard Live',
    hint: 'Omzet & biaya Ads',
    icon: <Radio className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  {
    key: 'komisi',
    label: 'Komisi Host Live',
    hint: 'Perhitungan komisi',
    icon: <Calculator className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  {
    key: 'skema',
    label: 'Skema Komisi',
    hint: 'Target & parameter',
    icon: <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />,
  },
];

interface ViewToolbarProps {
  view: ViewKey;
  onViewChange: (v: ViewKey) => void;
  month: MonthName;
  onMonthChange: (m: MonthName) => void;
  onRefreshSheets: () => void;
  isRefreshing: boolean;
  sourceMode: 'live' | 'snapshot' | 'loading';
  fetchedAt: string;
}

export const ViewToolbar: React.FC<ViewToolbarProps> = ({
  view,
  onViewChange,
  month,
  onMonthChange,
  onRefreshSheets,
  isRefreshing,
  sourceMode,
  fetchedAt,
}) => {
  return (
    <div className="bg-white rounded-xl px-4 py-3 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div role="tablist" aria-label="Pilih tampilan" className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
          {VIEWS.map((v) => {
            const active = view === v.key;
            return (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onViewChange(v.key)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-left transition ${
                  active
                    ? 'bg-[#127a60] border-[#127a60] text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className={active ? 'text-white' : 'text-[#127a60]'}>{v.icon}</span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold leading-tight">{v.label}</span>
                  <span className={`block text-2xs leading-tight ${active ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {v.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="month-select" className="sr-only">
            Pilih bulan
          </label>
          <select
            id="month-select"
            value={month}
            onChange={(e) => onMonthChange(e.target.value as MonthName)}
            className="px-3 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-slate-100/80 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#127a60] transition"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {MONTH_LABEL_ID[m]} 2026
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onRefreshSheets}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isRefreshing ? 'Menarik...' : 'Tarik Ulang Sheets'}</span>
          </button>
        </div>
      </div>

      <p className="text-2xs text-slate-500">
        Sumber data: {sourceMode === 'live' ? 'Google Sheets (live)' : sourceMode === 'snapshot' ? 'Snapshot lokal' : 'Memuat...'}
        {fetchedAt ? ` · ditarik ${fetchedAt}` : ''}
      </p>
    </div>
  );
};
