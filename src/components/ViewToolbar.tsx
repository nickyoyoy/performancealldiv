import React from 'react';
import { RefreshCw } from 'lucide-react';
import { MONTHS, MONTH_LABEL_ID, MonthName } from '../utils/liveHostEngine';
import '../styles/shell.css';

export type { ViewKey } from './Sidebar';

interface ViewToolbarProps {
  title: string;
  month: MonthName;
  onMonthChange: (m: MonthName) => void;
  onRefreshSheets: () => void;
  isRefreshing: boolean;
  sourceMode: 'live' | 'snapshot' | 'loading';
  fetchedAt: string;
}

/** Toolbar di atas konten: judul halaman, pilih bulan, tarik ulang sumber data. */
export const ViewToolbar: React.FC<ViewToolbarProps> = ({
  title,
  month,
  onMonthChange,
  onRefreshSheets,
  isRefreshing,
  sourceMode,
  fetchedAt,
}) => (
  <div className="sh-toolbar">
    <div className="min-w-0">
      <p className="sh-toolbar-title">{title}</p>
      <p className="sh-toolbar-src">
        Sumber data: {sourceMode === 'live' ? 'Google Sheets (live)' : sourceMode === 'snapshot' ? 'Snapshot' : 'Memuat...'}
        {fetchedAt ? ` · ditarik ${fetchedAt}` : ''}
      </p>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <label htmlFor="month-select" className="sr-only">Pilih bulan</label>
      <select id="month-select" value={month} onChange={(e) => onMonthChange(e.target.value as MonthName)} className="sh-field">
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {MONTH_LABEL_ID[m]} 2026
          </option>
        ))}
      </select>
      <button type="button" onClick={onRefreshSheets} disabled={isRefreshing} className="sh-btn sh-btn-solid">
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
        {isRefreshing ? 'Menarik...' : 'Tarik Ulang Sheets'}
      </button>
    </div>
  </div>
);
