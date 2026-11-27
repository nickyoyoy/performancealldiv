import React, { useEffect, useMemo, useState } from 'react';
import {
  AttendanceInput,
  CommissionParams,
  DEFAULT_COMMISSION_PARAMS,
  DEFAULT_NAME_RULES,
  HostCommission,
  MONTH_LABEL_ID,
  MONTHS,
  MonthName,
  OrganicParams,
  RawData,
  SPREADSHEET_ADJ_DEFAULTS,
  DEFAULT_TARGETS_BY_MONTH,
  DEFAULT_ATTENDANCE_BY_MONTH,
  TargetInput,
  aggregateMonth,
  allocateTargets,
  computeCommission,
  computeOrganic,
  previousMonths,
} from './utils/liveHostEngine';
import { fetchLiveHostRawData, SheetDivisionTarget } from './services/liveHostDataSource';
import { Header } from './components/Header';
import { ViewToolbar } from './components/ViewToolbar';
import { AUTH_ENABLED, GUEST_SESSION } from './config/auth';
import { Sidebar, VIEWS, ViewKey } from './components/Sidebar';
import { LiveDashboard } from './components/LiveDashboard';
import { KomisiDashboard } from './components/KomisiDashboard';
import { SkemaKomisi } from './components/SkemaKomisi';
import { LoginScreen } from './components/LoginScreen';
import { AccountSettings } from './components/AccountSettings';
import { AdminUsers } from './components/AdminUsers';
import { CampaignCalendar } from './components/CampaignCalendar';
import { AppSession, getSession, logout, readSessionSync } from './services/auth';
import {
  ROLE_LABEL,
  ROLE_VIEWS,
  canExportCommission,
  canSyncSources,
  canView,
} from './utils/permissions';
import { HostDetailModal } from './components/HostDetailModal';
import {
  DataSourceSyncModal,
  DataSourceItem,
  INITIAL_DATA_SOURCES,
} from './components/DataSourceSyncModal';

const STORAGE_KEY = 'scentplus_live_host_web_state_v2';
const DATA_SOURCES_STORAGE_KEY = 'scentplus_live_host_data_sources_v3';

interface StoredLiveHostState {
  adjByMonth: Partial<Record<MonthName, OrganicParams>>;
  targetsByMonth: Partial<Record<MonthName, TargetInput>>;
  attendanceByMonth: Partial<Record<MonthName, Record<string, AttendanceInput>>>;
  commissionParams: CommissionParams;
}

function loadStoredState(): StoredLiveHostState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredLiveHostState>;
      return {
        adjByMonth: parsed.adjByMonth || {},
        targetsByMonth: parsed.targetsByMonth || {},
        attendanceByMonth: parsed.attendanceByMonth || {},
        commissionParams: {
          ...DEFAULT_COMMISSION_PARAMS,
          ...(parsed.commissionParams || {}),
        },
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    adjByMonth: {},
    targetsByMonth: {},
    attendanceByMonth: {},
    commissionParams: DEFAULT_COMMISSION_PARAMS,
  };
}

export const App: React.FC = () => {
  const [, setPeriod] = useState<string>('November 2026');
  const [liveHostMonth, setLiveHostMonth] = useState<MonthName>('November');
  const [selectedHostName, setSelectedHostName] = useState<string | null>(null);
  const [view, setView] = useState<ViewKey>('live');
  const [sidebarHidden, setSidebarHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('scentplus_sidebar_hidden') === '1';
    } catch {
      return false;
    }
  });
  const toggleSidebar = () => {
    setSidebarHidden((v) => {
      const next = !v;
      try {
        localStorage.setItem('scentplus_sidebar_hidden', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };
  const [session, setSession] = useState<AppSession | null>(() => (AUTH_ENABLED ? readSessionSync() : GUEST_SESSION));

  // Perbarui / verifikasi token saat aplikasi dibuka.
  useEffect(() => {
    if (AUTH_ENABLED) getSession().then((s) => setSession(s));
  }, []);

  // Pastikan tab aktif selalu boleh dibuka oleh role yang login.
  useEffect(() => {
    if (session && !canView(session.role, view)) {
      setView(ROLE_VIEWS[session.role][0]);
    }
  }, [session, view]);

  const [rawData, setRawData] = useState<RawData>({ tiktok: [], shopee: [], ads: [] });
  const [sheetAttendance, setSheetAttendance] = useState<
    Partial<Record<MonthName, Record<string, AttendanceInput>>>
  >({});
  const [sheetTargets, setSheetTargets] = useState<
    Partial<Record<MonthName, SheetDivisionTarget>>
  >({});
  const [sourceMode, setSourceMode] = useState<'live' | 'snapshot' | 'loading'>('loading');
  const [fetchedAt, setFetchedAt] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [stored, setStored] = useState<StoredLiveHostState>(() => loadStoredState());

  const [dataSources, setDataSources] = useState<DataSourceItem[]>(() => {
    try {
      const raw = localStorage.getItem(DATA_SOURCES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DataSourceItem[];
        if (Array.isArray(parsed)) {
          const allowedIds = new Set(INITIAL_DATA_SOURCES.map((item) => item.id));
          const filtered = parsed.filter((item) => allowedIds.has(item.id));
          const existingIds = new Set(filtered.map((item) => item.id));
          const missing = INITIAL_DATA_SOURCES.filter((item) => !existingIds.has(item.id));
          return [...filtered, ...missing];
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_DATA_SOURCES;
  });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(DATA_SOURCES_STORAGE_KEY, JSON.stringify(dataSources));
    } catch {
      // ignore
    }
  }, [dataSources]);

  const handleUpdateDataSource = (updated: DataSourceItem) => {
    setDataSources((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleSyncSingleDataSource = async () => {
    await loadData(true);
  };

  const handleSyncAllDataSources = async () => {
    await loadData(true);
    const now = new Date();
    const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()}, ${String(now.getHours()).padStart(
      2,
      '0'
    )}.${String(now.getMinutes()).padStart(2, '0')}.${String(
      now.getSeconds()
    ).padStart(2, '0')}`;

    setDataSources((prev) =>
      prev.map((s) => ({
        ...s,
        version: s.version + 1,
        lastSynced: formatted,
        status: 'synced',
      }))
    );
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // ignore storage errors
    }
  }, [stored]);

  const loadData = async (preferLive: boolean) => {
    setIsRefreshing(true);
    try {
      const res = await fetchLiveHostRawData(preferLive);
      setRawData(res.rawData);
      setSheetAttendance(res.sheetAttendance);
      setSheetTargets(res.sheetTargets);
      setSourceMode(res.sourceMode);
      setFetchedAt(res.fetchedAt);
    } catch (err) {
      console.error('Failed loading Live Host raw data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // Shopee OAuth Callback detector
  const [shopeeAuthResult, setShopeeAuthResult] = useState<{ code: string; shop_id: string } | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const shop_id = params.get('shop_id');
      if (code && shop_id) {
        setShopeeAuthResult({ code, shop_id });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {
      // ignore
    }
  }, []);

  const isNewSchemeMonth = MONTHS.indexOf(liveHostMonth) >= MONTHS.indexOf('September');

  const handleMonthChange = (m: MonthName) => {
    setLiveHostMonth(m);
    setPeriod(`${MONTH_LABEL_ID[m]} 2026`);
  };

  const currentOrganicParams: OrganicParams =
    stored.adjByMonth[liveHostMonth] ??
    SPREADSHEET_ADJ_DEFAULTS[liveHostMonth] ?? { adjTikTok: 0, adjShopee: 0 };

  const currentTargetInput: TargetInput = useMemo(() => {
    const defTarget = DEFAULT_TARGETS_BY_MONTH[liveHostMonth];
    const sheetTarget = sheetTargets[liveHostMonth];
    const userTarget = stored.targetsByMonth[liveHostMonth];

    const baseTikTok = sheetTarget?.divisiTikTok ?? defTarget?.divisiTikTok ?? null;
    const baseShopee = sheetTarget?.divisiShopee ?? defTarget?.divisiShopee ?? null;

    return {
      divisiTikTok: userTarget?.divisiTikTok ?? baseTikTok,
      divisiShopee: userTarget?.divisiShopee ?? baseShopee,
      manual: {
        ...(defTarget?.manual || {}),
        ...(userTarget?.manual || {}),
      },
    };
  }, [liveHostMonth, sheetTargets, stored.targetsByMonth]);

  const currentAttendanceMap: Record<string, AttendanceInput> = useMemo(
    () => ({
      ...(DEFAULT_ATTENDANCE_BY_MONTH[liveHostMonth] || {}),
      ...(sheetAttendance[liveHostMonth] || {}),
      ...(stored.attendanceByMonth[liveHostMonth] || {}),
    }),
    [liveHostMonth, sheetAttendance, stored.attendanceByMonth]
  );

  const prevMonth: MonthName | null = previousMonths(liveHostMonth, 1)[0] ?? null;
  const prevAggregate = useMemo(
    () => (prevMonth ? aggregateMonth(rawData, prevMonth, DEFAULT_NAME_RULES) : null),
    [rawData, prevMonth]
  );

  // Tren 3 bulan terakhir (termasuk bulan yang dipilih) untuk ringkasan.
  const trend = useMemo(() => {
    const months = [...previousMonths(liveHostMonth, 2).reverse(), liveHostMonth];
    return months.map((m) => {
      const a = aggregateMonth(rawData, m, DEFAULT_NAME_RULES);
      return {
        month: m,
        tt: [...a.tiktok.values()].reduce((s, v) => s + v.omzet, 0),
        sp: [...a.shopee.values()].reduce((s, v) => s + v.omzet, 0),
      };
    });
  }, [rawData, liveHostMonth]);

  const { aggregate, hosts, summary } = useMemo(() => {
    const agg = aggregateMonth(rawData, liveHostMonth, DEFAULT_NAME_RULES);
    const organic = computeOrganic(agg, currentOrganicParams);

    const prevMonthNames = previousMonths(liveHostMonth, 3);
    const history = prevMonthNames.map((pm) => {
      const pAgg = aggregateMonth(rawData, pm, DEFAULT_NAME_RULES);
      const pAdj = stored.adjByMonth[pm] ?? SPREADSHEET_ADJ_DEFAULTS[pm] ?? { adjTikTok: 0, adjShopee: 0 };
      return computeOrganic(pAgg, { ...pAdj, method: currentOrganicParams.method ?? 'brief_v5' });
    });

    const targets = allocateTargets(
      organic.map((o) => o.host),
      currentTargetInput,
      history
    );

    const result = computeCommission(
      organic,
      targets,
      currentAttendanceMap,
      currentTargetInput,
      stored.commissionParams,
      agg.shopeeAdsTotal
    );

    return { aggregate: agg, hosts: result.hosts, summary: result.summary };
  }, [
    rawData,
    liveHostMonth,
    currentOrganicParams,
    currentTargetInput,
    currentAttendanceMap,
    stored.adjByMonth,
    stored.commissionParams,
  ]);

  const selectedHost: HostCommission | null = useMemo(
    () => (selectedHostName ? hosts.find((h) => h.host === selectedHostName) ?? null : null),
    [hosts, selectedHostName]
  );

  const updateOrganicParams = (next: OrganicParams) => {
    setStored((prev) => ({
      ...prev,
      adjByMonth: { ...prev.adjByMonth, [liveHostMonth]: next },
    }));
  };

  const updateTargetDivisi = (market: 'tiktok' | 'shopee', val: number | null) => {
    setStored((prev) => {
      const curr = prev.targetsByMonth[liveHostMonth] ?? {
        divisiTikTok: null,
        divisiShopee: null,
        manual: {},
      };
      return {
        ...prev,
        targetsByMonth: {
          ...prev.targetsByMonth,
          [liveHostMonth]: {
            ...curr,
            divisiTikTok: market === 'tiktok' ? val : curr.divisiTikTok,
            divisiShopee: market === 'shopee' ? val : curr.divisiShopee,
          },
        },
      };
    });
  };

  const updateManualTarget = (
    hostName: string,
    market: 'tiktok' | 'shopee',
    val: number | null
  ) => {
    setStored((prev) => {
      const curr = prev.targetsByMonth[liveHostMonth] ?? {
        divisiTikTok: null,
        divisiShopee: null,
        manual: {},
      };
      const hostCurr = curr.manual[hostName] ?? {};
      return {
        ...prev,
        targetsByMonth: {
          ...prev.targetsByMonth,
          [liveHostMonth]: {
            ...curr,
            manual: {
              ...curr.manual,
              [hostName]: {
                ...hostCurr,
                [market]: val,
              },
            },
          },
        },
      };
    });
  };

  const updateAttendance = (hostName: string, next: AttendanceInput) => {
    setStored((prev) => {
      const monthMap = prev.attendanceByMonth[liveHostMonth] ?? {};
      return {
        ...prev,
        attendanceByMonth: {
          ...prev.attendanceByMonth,
          [liveHostMonth]: {
            ...monthMap,
            [hostName]: next,
          },
        },
      };
    });
  };

  const updateQuickHadir = (hostName: string, hadir: number | null) => {
    const curr = currentAttendanceMap[hostName] ?? {};
    updateAttendance(hostName, { ...curr, hadir });
  };

  const updateCommissionParams = (next: CommissionParams) => {
    setStored((prev) => ({ ...prev, commissionParams: next }));
  };

  const handleExport = () => {
    const headers = [
      'Host',
      'TikTok_Omzet',
      'TikTok_Biaya',
      'TikTok_Organic_G',
      'Shopee_Omzet',
      'Shopee_Organic_N',
      'Dasar_Organik',
      'Target_Host',
      'Capaian_Pct',
      'Hadir_Reguler',
      'Komisi_Utama',
      'Bonus_Kehadiran',
      'Total_Komisi',
    ];
    const csvRows = [
      headers.join(','),
      ...hosts.map((h) =>
        [
          h.host,
          Math.round(h.ttOmzet),
          Math.round(h.ttBiaya),
          Math.round(h.ttOrganic),
          Math.round(h.spOmzet),
          Math.round(h.spOrganic),
          Math.round(h.dasarOrganik),
          h.target.total !== null ? Math.round(h.target.total) : '',
          h.capaian !== null ? (h.capaian * 100).toFixed(2) : '',
          h.attendanceInput?.hadir ?? '',
          h.komisiUtama ?? '',
          h.bonusKehadiran ?? '',
          h.total ?? '',
        ].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-live-host-${liveHostMonth.toLowerCase()}-2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (AUTH_ENABLED && !session) {
    return <LoginScreen onLogin={(s) => setSession(s)} />;
  }

  const current: AppSession = session ?? GUEST_SESSION;
  const role = current.role;

  return (
    <div className="sh-root">
      {!sidebarHidden && (
        <Sidebar view={view} allowedViews={ROLE_VIEWS[role]} onViewChange={setView} />
      )}
      <div className="sh-main">
      <Header
        pageTitle={VIEWS.find((v) => v.key === view)?.label ?? ''}
        sidebarHidden={sidebarHidden}
        onToggleSidebar={toggleSidebar}
        totalCompanyPayout={summary.totalDibayar}
        totalCompanyOmzet={summary.totalDasar}
        onExport={handleExport}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        showCommissionSummary={canView(role, 'komisi')}
        canSync={canSyncSources(role)}
        canExport={canExportCommission(role)}
        userLabel={`${current.email} · ${ROLE_LABEL[role]}`}
        onLogout={
          AUTH_ENABLED
            ? () => {
                logout();
                setSession(null);
              }
            : undefined
        }
      />

      {shopeeAuthResult && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>
                Otorisasi Shopee Berhasil! Toko Shopee (ID: <strong>{shopeeAuthResult.shop_id}</strong>) telah tersambung.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Shop ID: ${shopeeAuthResult.shop_id}\nAuth Code: ${shopeeAuthResult.code}`);
                  alert('Detail otorisasi Shopee berhasil disalin ke clipboard!');
                }}
                className="px-2.5 py-1 rounded-md bg-[#127a60] hover:bg-[#0e634e] text-white font-semibold text-2xs transition shadow-xs cursor-pointer"
              >
                Salin Detail untuk Rizqy/Maul
              </button>
              <button
                type="button"
                onClick={() => setShopeeAuthResult(null)}
                className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                title="Tutup notifikasi"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="sh-content">
        {(view === 'live' || view === 'komisi' || view === 'skema') && (
          <ViewToolbar
            title={VIEWS.find((v) => v.key === view)?.hint ?? ''}
            month={liveHostMonth}
            onMonthChange={handleMonthChange}
            onRefreshSheets={() => loadData(true)}
            isRefreshing={isRefreshing}
            sourceMode={sourceMode}
            fetchedAt={fetchedAt}
          />
        )}

        {view === 'live' && (
          <LiveDashboard
            month={liveHostMonth}
            prevMonth={prevMonth}
            prevAggregate={prevAggregate}
            trend={trend}
            aggregate={aggregate}
            summary={summary}
            hosts={hosts}
            targetInput={currentTargetInput}
          />
        )}

        {(view === 'komisi' || view === 'skema') && !isNewSchemeMonth && (
          <div role="alert" className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700">
            <b className="font-semibold">{MONTH_LABEL_ID[liveHostMonth]} 2026 memakai skema komisi lama</b> (cut-off Agustus 2026).
            Skema baru berlaku mulai September 2026, jadi angka komisi di bulan ini hanya sebagai referensi.
          </div>
        )}

        {view === 'komisi' && (
          <KomisiDashboard
            month={liveHostMonth}
            summary={summary}
            hosts={hosts}
            commissionParams={stored.commissionParams}
            onSelectHost={(host) => setSelectedHostName(host.host)}
          />
        )}

        {view === 'kalender' && <CampaignCalendar />}

        {view === 'pengguna' && role === 'owner' && <AdminUsers />}

        {view === 'akun' && (
          <AccountSettings
            session={current}
            onLogout={() => setSession(null)}
          />
        )}

        {view === 'skema' && (
          <SkemaKomisi
            month={liveHostMonth}
            hosts={hosts}
            targetInput={currentTargetInput}
            onTargetDivisiChange={updateTargetDivisi}
            onUpdateManualTarget={updateManualTarget}
            organicParams={currentOrganicParams}
            onOrganicParamsChange={updateOrganicParams}
            commissionParams={stored.commissionParams}
            onCommissionParamsChange={updateCommissionParams}
            attendanceMap={currentAttendanceMap}
            onQuickHadirChange={updateQuickHadir}
          />
        )}
      </main>
      </div>

      <HostDetailModal
        host={selectedHost}
        onClose={() => setSelectedHostName(null)}
        faktorDivisi={summary.faktorDivisi}
        params={stored.commissionParams}
        organicParams={currentOrganicParams}
        manualTarget={selectedHost ? currentTargetInput.manual[selectedHost.host] ?? {} : {}}
        onUpdateManualTarget={updateManualTarget}
        attendance={selectedHost ? currentAttendanceMap[selectedHost.host] : undefined}
        onUpdateAttendance={updateAttendance}
      />

      <DataSourceSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        sources={dataSources}
        onUpdateSource={handleUpdateDataSource}
        onSyncAll={handleSyncAllDataSources}
        onSyncSource={handleSyncSingleDataSource}
      />
    </div>
  );
};

export default App;
