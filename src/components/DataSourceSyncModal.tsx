import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Database,
} from 'lucide-react';

export interface DataSourceItem {
  id: string;
  category: string;
  name: string;
  sheetUrl: string;
  selectedTab: string;
  availableTabs: string[];
  version: number;
  lastSynced: string;
  status: 'synced' | 'pending' | 'error';
  auditNote: string;
}

export const SCHEDULE_TAB_GIDS: Record<string, string> = {
  'SC+ September 2026': '247359567',
  'SC+ September': '247359567',
  'SC+October 2026': '1726778735',
  'SC+ Oktober 2026': '1726778735',
  'SC+November 2026': '1044268224',
  'SC+ November 2026': '1044268224',
};

export function getScheduleUrlForTab(tab: string): string {
  const gid =
    SCHEDULE_TAB_GIDS[tab] ||
    (tab.toLowerCase().includes('okt') || tab.toLowerCase().includes('oct')
      ? '1726778735'
      : tab.toLowerCase().includes('nov')
      ? '1044268224'
      : '247359567');
  return `https://docs.google.com/spreadsheets/d/1HZ4OO5z24MeJQFIWCZr7t8yoz-CQKwDZVg7C6eml78A/edit?gid=${gid}`;
}

const NEW_DB_BASE =
  'https://docs.google.com/spreadsheets/d/18djB-SiIrUL2HhXcC35HTmc9oCKkLoWPqe2kklf8S2M/edit?gid=';

export const INITIAL_DATA_SOURCES: DataSourceItem[] = [
  {
    id: 'scentplus_db',
    category: 'SPREADSHEET UTAMA',
    name: 'Database Live Scentplus (satu spreadsheet)',
    sheetUrl: NEW_DB_BASE.replace(/\?gid=$/, ''),
    selectedTab: '03_DATABASE_LIVE',
    availableTabs: [
      '03_DATABASE_LIVE',
      '04_MASTER_TARGET',
      '09_ADS_TIKTOK',
      'RAW ADS TT',
      '10_ADS_SHOPEE',
      '01_EXEC_DASHBOARD',
      '02_DAILY_RECAP',
      '06_MASTER_DATA',
      'DATA_KARYAWAN_LSH',
    ],
    version: 1,
    lastSynced: '24/11/2026, 15.20.00',
    status: 'synced',
    auditNote:
      'Dibaca otomatis: 03_DATABASE_LIVE (omzet & absensi), 09_ADS_TIKTOK + RAW ADS TT (biaya Ads TikTok), 10_ADS_SHOPEE (Ads Shopee), 04_MASTER_TARGET (target divisi). Tab lain belum dipakai perhitungan.',
  },
];

interface DataSourceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: DataSourceItem[];
  onUpdateSource: (updated: DataSourceItem) => void;
  onSyncAll: () => Promise<void>;
  onSyncSource?: (item: DataSourceItem) => Promise<void> | void;
}

export const DataSourceSyncModal: React.FC<DataSourceSyncModalProps> = ({
  isOpen,
  onClose,
  sources,
  onUpdateSource,
  onSyncAll,
  onSyncSource,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [customTabName, setCustomTabName] = useState<string>('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSyncCard = async (item: DataSourceItem) => {
    setSyncingId(item.id);
    if (onSyncSource) {
      await onSyncSource(item);
    } else {
      await new Promise((r) => setTimeout(r, 600));
    }

    const now = new Date();
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()}, ${String(now.getHours()).padStart(
      2,
      '0'
    )}.${String(now.getMinutes()).padStart(2, '0')}.${String(
      now.getSeconds()
    ).padStart(2, '0')}`;

    const sheetUrl =
      item.id === 'attendance_schedule'
        ? getScheduleUrlForTab(item.selectedTab)
        : item.sheetUrl;

    const nextItem: DataSourceItem = {
      ...item,
      sheetUrl,
      version: item.version + 1,
      lastSynced: formatted,
      status: 'synced',
    };
    onUpdateSource(nextItem);
    setSyncingId(null);
    showToast(`Tab "${item.selectedTab}" berhasil disinkronkan (v${nextItem.version}).`);
  };

  const handleSaveCustomTab = (item: DataSourceItem) => {
    if (!customTabName.trim()) {
      setEditingTabId(null);
      return;
    }
    const clean = customTabName.trim();
    const updatedTabs = item.availableTabs.includes(clean)
      ? item.availableTabs
      : [clean, ...item.availableTabs];

    const sheetUrl =
      item.id === 'attendance_schedule'
        ? getScheduleUrlForTab(clean)
        : item.sheetUrl;

    onUpdateSource({
      ...item,
      selectedTab: clean,
      sheetUrl,
      availableTabs: updatedTabs,
      status: 'pending',
    });
    setEditingTabId(null);
    setCustomTabName('');
    showToast(`Tab sumber diubah ke "${clean}". Klik "Sinkronkan" untuk menerapkan.`);
  };

  const handleGlobalSync = async () => {
    setIsSyncingAll(true);
    await onSyncAll();
    setIsSyncingAll(false);
    showToast(`Semua ${sources.length} sumber data berhasil disinkronkan ke versi terbaru.`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-scentplus-forestDark/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-50 rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl bg-scentplus-forest text-scentplus-mint shrink-0"
              aria-hidden="true"
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 id="sync-modal-title" className="font-bold text-base text-slate-900">
                  Kelola Sumber Data &amp; Sinkronisasi Tab Spreadsheet
                </h3>
                <span className="text-2xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  Audit Snapshot Aktif
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Pilih tab sumber per periode untuk menghindari error saat nama sheet berganti.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGlobalSync}
              disabled={isSyncingAll}
              className="inline-flex items-center gap-1.5 px-3.5 min-h-[38px] rounded-xl bg-scentplus-forest hover:bg-scentplus-forestLight text-white font-semibold text-xs transition disabled:opacity-60 shadow-2xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin text-scentplus-mint' : 'text-scentplus-mint'}`}
                aria-hidden="true"
              />
              <span>{isSyncingAll ? 'Menyinkronkan...' : `Sinkronkan Semua (${sources.length})`}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panel sumber data"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Toast Notification Banner */}
        {notification && (
          <div
            role="status"
            className="bg-emerald-700 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" aria-hidden="true" />
              <span>{notification}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              aria-label="Tutup notifikasi"
              className="p-1 text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* 6 Cards Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sources.map((item) => {
            const isEditing = editingTabId === item.id;
            const isCardSyncing = syncingId === item.id || isSyncingAll;
            const selectId = `source-tab-select-${item.id}`;
            const inputId = `source-tab-input-${item.id}`;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-card flex flex-col justify-between hover:border-teal-600/50 transition"
              >
                <div>
                  {/* Category & Title */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xs uppercase tracking-wider font-bold text-slate-600">
                      {item.category}
                    </span>
                    <a
                      href={item.sheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-950 transition"
                    >
                      <span>Buka spreadsheet</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 mb-4">
                    {item.name}
                  </h4>

                  {/* Tab Selector */}
                  <div className="space-y-1.5 mb-4">
                    <label
                      htmlFor={isEditing ? inputId : selectId}
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Tab sumber
                    </label>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          id={inputId}
                          type="text"
                          value={customTabName}
                          onChange={(e) => setCustomTabName(e.target.value)}
                          placeholder="Nama tab sheet..."
                          className="flex-1 px-3 min-h-[38px] rounded-xl border border-teal-600 text-xs text-slate-900 focus:outline-none ring-2 ring-teal-600/20"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCustomTab(item)}
                          className="px-3 min-h-[38px] bg-scentplus-forest text-white rounded-xl text-xs font-semibold hover:bg-scentplus-forestLight"
                        >
                          Pilih
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTabId(null)}
                          aria-label="Batal ubah tab"
                          className="px-2.5 min-h-[38px] bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 inline-flex items-center justify-center"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <select
                        id={selectId}
                        value={item.selectedTab}
                        onChange={(e) => {
                          const val = e.target.value;
                          const sheetUrl =
                            item.id === 'attendance_schedule'
                              ? getScheduleUrlForTab(val)
                              : item.sheetUrl;
                          onUpdateSource({
                            ...item,
                            selectedTab: val,
                            sheetUrl,
                            status: 'pending',
                          });
                          showToast(`Tab diubah ke "${val}". Klik Sinkronkan.`);
                        }}
                        className="w-full px-3 min-h-[38px] rounded-xl border border-slate-300 bg-slate-50/80 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        {item.availableTabs.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Actions: Pilih tab lain & Sinkronkan */}
                  <div className="flex items-center justify-end gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTabId(item.id);
                        setCustomTabName(item.selectedTab);
                      }}
                      className="px-3 min-h-[36px] rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                    >
                      Pilih tab lain
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSyncCard(item)}
                      disabled={isCardSyncing}
                      className="inline-flex items-center gap-1.5 px-3.5 min-h-[36px] rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold transition disabled:opacity-60 shadow-2xs"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isCardSyncing ? 'animate-spin text-scentplus-mint' : ''}`}
                        aria-hidden="true"
                      />
                      <span>{isCardSyncing ? 'Proses...' : 'Sinkronkan'}</span>
                    </button>
                  </div>
                </div>

                {/* Card Footer Status & Audit Note */}
                <div className="pt-3 border-t border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span className="font-bold text-slate-900">
                      Tersimpan · v{item.version}
                    </span>
                    <span className="text-2xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono font-semibold">
                      {item.selectedTab}
                    </span>
                  </div>

                  <p className="text-2xs text-slate-600 tabular-nums">
                    Sinkronisasi terakhir {item.lastSynced}
                  </p>

                  <p className="text-2xs text-slate-600 leading-relaxed pt-1">
                    {item.auditNote}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>
              <b className="text-slate-900">Kepatuhan Audit P0:</b> Versi snapshot data tersimpan secara lokal dan tidak menimpa file spreadsheet asli.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 min-h-[38px] rounded-xl bg-scentplus-forest text-white text-xs font-semibold hover:bg-scentplus-forestLight transition"
          >
            Selesai &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
