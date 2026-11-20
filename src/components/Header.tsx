import React from 'react';
import {
  Download,
  CheckCircle2,
  TrendingUp,
  Wallet,
  Database,
} from 'lucide-react';
import { formatCurrencyIDR } from '../utils/formatters';

interface HeaderProps {
  period: string;
  onPeriodChange: (p: string) => void;
  totalCompanyPayout: number;
  totalCompanyOmzet: number;
  totalBudgetSavings: number;
  onExport: () => void;
  onOpenSyncModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalCompanyPayout,
  totalCompanyOmzet,
  onExport,
  onOpenSyncModal,
}) => {
  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand identity */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#127a60] to-[#0D5C48] text-white flex items-center justify-center font-bold text-sm shadow-2xs tracking-tight shrink-0"
            aria-hidden="true"
          >
            S+
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="font-bold text-sm tracking-tight text-slate-900">
                SCENTPLUS
              </h1>
              <span className="text-3xs px-2 py-0.5 rounded-full bg-emerald-50 text-[#127a60] font-semibold border border-emerald-200/80 inline-flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-[#127a60]" aria-hidden="true" />
                Brief v5
              </span>
              <span className="hidden sm:inline-block text-2xs text-slate-400">·</span>
              <span className="hidden sm:inline-block text-2xs text-slate-500">
                Performa &amp; Komisi Live Host
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Compact Executive Summary Pills + Global Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Compact Inline Executive Summary */}
          <div className="hidden xl:flex items-center gap-3 bg-slate-50/90 border border-slate-200/80 px-3 py-1.5 rounded-xl text-2xs">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
              <span className="text-slate-500">Omzet Organik Live:</span>
              <strong className="text-slate-900 font-bold tabular-nums">
                {formatCurrencyIDR(totalCompanyOmzet)}
              </strong>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-[#127a60] shrink-0" aria-hidden="true" />
              <span className="text-slate-500">Total Payout Host:</span>
              <strong className="text-[#127a60] font-bold tabular-nums">
                {formatCurrencyIDR(totalCompanyPayout)}
              </strong>
            </div>
          </div>

          {/* Data Source & Tab Sync Button (Single Global Button) */}
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs font-semibold transition shadow-2xs"
          >
            <Database className="w-3.5 h-3.5 text-[#127a60]" aria-hidden="true" />
            <span>Tab Sumber (6 Aktif)</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#127a60] hover:bg-[#0e634e] text-white font-semibold text-xs transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
