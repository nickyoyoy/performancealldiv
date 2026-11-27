import React from 'react';
import { Radio, Calculator, SlidersHorizontal, UserCog, Users, CalendarDays } from 'lucide-react';
import '../styles/shell.css';

export type ViewKey = 'live' | 'komisi' | 'skema' | 'kalender' | 'akun' | 'pengguna';

/** Urutan menu dari atas ke bawah. */
export const VIEWS: { key: ViewKey; label: string; hint: string; icon: React.ReactNode }[] = [
  { key: 'live', label: 'Dashboard Live', hint: 'Omzet & biaya Ads', icon: <Radio className="w-4 h-4" aria-hidden="true" /> },
  { key: 'komisi', label: 'Komisi Host Live', hint: 'Perhitungan komisi', icon: <Calculator className="w-4 h-4" aria-hidden="true" /> },
  { key: 'skema', label: 'Skema Komisi', hint: 'Target & parameter', icon: <SlidersHorizontal className="w-4 h-4" aria-hidden="true" /> },
  { key: 'kalender', label: 'Kalender Campaign', hint: 'Promo & campaign Live', icon: <CalendarDays className="w-4 h-4" aria-hidden="true" /> },
  { key: 'akun', label: 'Pengaturan Akun', hint: 'Profil & password', icon: <UserCog className="w-4 h-4" aria-hidden="true" /> },
  { key: 'pengguna', label: 'Kelola Pengguna', hint: 'Akun & role', icon: <Users className="w-4 h-4" aria-hidden="true" /> },
];

interface SidebarProps {
  view: ViewKey;
  allowedViews: ViewKey[];
  onViewChange: (v: ViewKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, allowedViews, onViewChange }) => (
  <aside className="sh-side" aria-label="Navigasi utama">
    <div className="sh-brand">
      <img src="/logo-scentplus.jpg" alt="" className="sh-logo sh-logo-img" />
      <div className="min-w-0">
        <p className="sh-brand-title">SCENTPLUS</p>
        <p className="sh-brand-sub">Dashboard &amp; Performa Live Host</p>
      </div>
    </div>

    <div className="sh-nav-label">Menu</div>
    <nav className="sh-nav">
      {VIEWS.filter((v) => allowedViews.includes(v.key)).map((v) => (
        <button
          key={v.key}
          type="button"
          className="sh-nav-btn"
          aria-current={view === v.key ? 'page' : undefined}
          onClick={() => onViewChange(v.key)}
        >
          <span className="sh-nav-ico">{v.icon}</span>
          <span className="sh-nav-text">
            <span className="sh-nav-title">{v.label}</span>
            <span className="sh-nav-hint">{v.hint}</span>
          </span>
        </button>
      ))}
    </nav>

    <div className="sh-side-foot">Sembunyikan menu lewat tombol di header.</div>
  </aside>
);
