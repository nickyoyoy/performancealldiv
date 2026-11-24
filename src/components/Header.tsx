import React from 'react';
import { Download, Database, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { formatCurrencyIDR } from '../utils/formatters';
import '../styles/shell.css';

interface HeaderProps {
  pageTitle: string;
  totalCompanyPayout: number;
  totalCompanyOmzet: number;
  onExport: () => void;
  onOpenSyncModal: () => void;
  /** Role-based visibility */
  showCommissionSummary?: boolean;
  canSync?: boolean;
  canExport?: boolean;
  userLabel?: string;
  onLogout?: () => void;
  sidebarHidden: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  totalCompanyPayout,
  totalCompanyOmzet,
  onExport,
  onOpenSyncModal,
  showCommissionSummary = true,
  canSync = true,
  canExport = true,
  userLabel,
  onLogout,
  sidebarHidden,
  onToggleSidebar,
}) => (
  <header className="sh-header">
    <div className="sh-header-left">
      <button
        type="button"
        className="sh-toggle"
        onClick={onToggleSidebar}
        aria-label={sidebarHidden ? 'Tampilkan navigasi' : 'Sembunyikan navigasi'}
        title={sidebarHidden ? 'Tampilkan navigasi' : 'Sembunyikan navigasi'}
      >
        {sidebarHidden ? <PanelLeftOpen className="w-4 h-4" aria-hidden="true" /> : <PanelLeftClose className="w-4 h-4" aria-hidden="true" />}
      </button>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="sh-header-title">{pageTitle}</h1>
          <span className="sh-badge">Brief v5</span>
        </div>
        <p className="sh-header-sub">Scentplus · Live Host</p>
      </div>
    </div>

    <div className="sh-header-right">
      {showCommissionSummary && (
        <>
          <div className="sh-stat">
            <span>Omzet Organik Live</span>
            <b>{formatCurrencyIDR(totalCompanyOmzet)}</b>
          </div>
          <div className="sh-stat">
            <span>Total Payout Host</span>
            <b>{formatCurrencyIDR(totalCompanyPayout)}</b>
          </div>
        </>
      )}

      {canSync && (
        <button type="button" onClick={onOpenSyncModal} className="sh-btn sh-btn-outline">
          <Database className="w-3.5 h-3.5" aria-hidden="true" />
          Spreadsheet Utama (1)
        </button>
      )}

      {canExport && (
        <button type="button" onClick={onExport} className="sh-btn sh-btn-solid">
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Ekspor CSV
        </button>
      )}

      {userLabel && (
        <div className="sh-user">
          {userLabel}
          {onLogout && (
            <button type="button" onClick={onLogout} className="sh-logout">
              Keluar
            </button>
          )}
        </div>
      )}
    </div>
  </header>
);
