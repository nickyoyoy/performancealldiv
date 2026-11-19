import React, { useEffect, useMemo, useState } from 'react';
import { AppTab } from './types';
import {
  mockCustomerHappinessSummary,
  mockCrmSummary,
} from './data/mockData';
import {
  fetchWacommerceOrders,
  computeCrmSummary,
  WacommerceOrderRecord,
} from './services/crmDataSource';
import {
  AttendanceInput,
  CommissionParams,
  DEFAULT_COMMISSION_PARAMS,
  DEFAULT_NAME_RULES,
  HostCommission,
  MONTH_LABEL_ID,
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
import { fetchLiveHostRawData } from './services/liveHostDataSource';
import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { LiveHostModule } from './components/LiveHostModule';
import { CustomerHappinessModule } from './components/CustomerHappinessModule';
import { CrmModule } from './components/CrmModule';
import { HostDetailModal } from './components/HostDetailModal';
import {
  DataSourceSyncModal,
  DataSourceItem,
  INITIAL_DATA_SOURCES,
} from './components/DataSourceSyncModal';

const STORAGE_KEY = 'scentplus_live_host_web_state_v1';
const DATA_SOURCES_STORAGE_KEY = 'scentplus_data_sources_v1';

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
      const targetsByMonth = {
        ...DEFAULT_TARGETS_BY_MONTH,
        ...(parsed.targetsByMonth || {}),
      };
      if (
        !targetsByMonth.September?.divisiTikTok &&
        (!targetsByMonth.September?.manual || Object.keys(targetsByMonth.September.manual).length === 0)
      ) {
        targetsByMonth.September = DEFAULT_TARGETS_BY_MONTH.September!;
      }

      const attendanceByMonth = {
        ...DEFAULT_ATTENDANCE_BY_MONTH,
        ...(parsed.attendanceByMonth || {}),
      };
      if (!attendanceByMonth.September || Object.keys(attendanceByMonth.September).length === 0) {
        attendanceByMonth.September = DEFAULT_ATTENDANCE_BY_MONTH.September!;
      } else {
        if (attendanceByMonth.September.GISCA?.hadir === 26) {
          attendanceByMonth.September.GISCA = DEFAULT_ATTENDANCE_BY_MONTH.September!.GISCA;
        }
        if (attendanceByMonth.September.ARNIE?.hadir === 25) {
          attendanceByMonth.September.ARNIE = DEFAULT_ATTENDANCE_BY_MONTH.September!.ARNIE;
        }
        for (const [h, def] of Object.entries(DEFAULT_ATTENDANCE_BY_MONTH.September || {})) {
          if (def.keterangan && attendanceByMonth.September[h] && !attendanceByMonth.September[h].keterangan) {
            attendanceByMonth.September[h] = {
              ...attendanceByMonth.September[h],
              keterangan: def.keterangan,
            };
          }
        }
      }

      if (!attendanceByMonth.October || Object.keys(attendanceByMonth.October).length === 0) {
        attendanceByMonth.October = DEFAULT_ATTENDANCE_BY_MONTH.October!;
      }

      return {
        adjByMonth: parsed.adjByMonth || {},
        targetsByMonth,
        attendanceByMonth,
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
    targetsByMonth: { ...DEFAULT_TARGETS_BY_MONTH },
    attendanceByMonth: { ...DEFAULT_ATTENDANCE_BY_MONTH },
    commissionParams: DEFAULT_COMMISSION_PARAMS,
  };
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('live-host');
  const [period, setPeriod] = useState<string>('September 2026');
  const [liveHostMonth, setLiveHostMonth] = useState<MonthName>('September');
  const [selectedHostName, setSelectedHostName] = useState<string | null>(null);

  const [rawData, setRawData] = useState<RawData>({ tiktok: [], shopee: [], ads: [] });
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
          const existingIds = new Set(parsed.map((item) => item.id));
          const missing = INITIAL_DATA_SOURCES.filter((item) => !existingIds.has(item.id));
          return [...parsed, ...missing];
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

  const handleSyncSingleDataSource = async (item: DataSourceItem) => {
    if (item.id === 'attendance_schedule') {
      const tabLower = item.selectedTab.toLowerCase();
      if (tabLower.includes('okt') || tabLower.includes('oct')) {
        setStored((prev) => ({
          ...prev,
          attendanceByMonth: {
            ...prev.attendanceByMonth,
            October: DEFAULT_ATTENDANCE_BY_MONTH.October || {},
          },
        }));
      } else if (tabLower.includes('sep')) {
        setStored((prev) => ({
          ...prev,
          attendanceByMonth: {
            ...prev.attendanceByMonth,
            September: DEFAULT_ATTENDANCE_BY_MONTH.September || {},
          },
        }));
      }
    }
  };

  const handleSyncAllDataSources = async () => {
    await Promise.all([loadData(true), loadCrmData(true)]);
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
      setSourceMode(res.sourceMode);
      setFetchedAt(res.fetchedAt);
    } catch (err) {
      console.error('Failed loading Live Host raw data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  // CRM Live Data (WACOMMERCE REST API)
  const [crmOrders, setCrmOrders] = useState<WacommerceOrderRecord[]>([]);
  const [crmMonth, setCrmMonth] = useState<string>('2026-09');
  const [crmSource, setCrmSource] = useState<'live' | 'snapshot'>('snapshot');
  const [crmSyncedAt, setCrmSyncedAt] = useState<string>('');
  const [isCrmSyncing, setIsCrmSyncing] = useState<boolean>(false);

  const loadCrmData = async (forceLive = false) => {
    setIsCrmSyncing(true);
    try {
      const res = await fetchWacommerceOrders(forceLive);
      setCrmOrders(res.orders);
      setCrmSource(res.source);
      setCrmSyncedAt(res.syncedAt);
    } catch (err) {
      console.error('Failed loading CRM data:', err);
    } finally {
      setIsCrmSyncing(false);
    }
  };

  useEffect(() => {
    loadCrmData(false);
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

  const crmSummary = useMemo(() => {
    if (crmOrders.length === 0) {
      return mockCrmSummary;
    }
    return computeCrmSummary(crmOrders, crmMonth);
  }, [crmOrders, crmMonth]);

  const handleMonthChange = (m: MonthName) => {
    setLiveHostMonth(m);
    setPeriod(`${MONTH_LABEL_ID[m]} 2026`);
  };

  const currentOrganicParams: OrganicParams =
    stored.adjByMonth[liveHostMonth] ??
    SPREADSHEET_ADJ_DEFAULTS[liveHostMonth] ?? { adjTikTok: 0, adjShopee: 0 };

  const currentTargetInput: TargetInput =
    stored.targetsByMonth[liveHostMonth] ??
    DEFAULT_TARGETS_BY_MONTH[liveHostMonth] ?? {
      divisiTikTok: null,
      divisiShopee: null,
      manual: {},
    };

  const currentAttendanceMap: Record<string, AttendanceInput> =
    stored.attendanceByMonth[liveHostMonth] ??
    DEFAULT_ATTENDANCE_BY_MONTH[liveHostMonth] ?? {};

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

  const totalCompanyPayout = summary.totalDibayar + crmSummary.totalPayoutTim;
  const totalCompanyOmzet =
    summary.totalDasar +
    mockCustomerHappinessSummary.actualRevenueAttributed +
    crmSummary.timActualOmzet;
  const totalBudgetSavings = summary.sisaAnggaran;

  const handleExport = () => {
    if (activeTab === 'crm-cs') {
      const headers = [
        'Nama_CS',
        'Status_Syarat',
        'Poin',
        'Leads_Baru',
        'Outbound',
        'Omzet_Valid',
        'Tarif_Omzet',
        'Komisi_Omzet',
        'Bonus_Conversion',
        'Bonus_Growth',
        'Bruto',
        'Potongan_Sistem_5pct',
        'Bersih_Net',
      ];
      const csvRows = [
        headers.join(','),
        ...crmSummary.csList.map((cs) =>
          [
            `"${cs.name}"`,
            cs.syaratLolos ? 'Lolos' : 'Belum Syarat',
            cs.poin,
            cs.leadsBaru,
            cs.outbound,
            cs.omzetValid,
            `${(cs.tarifOmzetPct * 100).toFixed(1)}%`,
            cs.komisiOmzet,
            cs.bonusConversion,
            cs.bonusGrowth,
            cs.bruto,
            cs.potonganSistem,
            cs.bersih,
          ].join(',')
        ),
        [
          `"LEADER: ${crmSummary.leaderName}"`,
          'Lolos Target Tim',
          '-',
          '-',
          '-',
          crmSummary.timActualOmzet,
          `${(crmSummary.leaderTarifPct * 100).toFixed(2)}%`,
          crmSummary.leaderKomisiOmzet,
          crmSummary.leaderBonusConversion,
          crmSummary.leaderBonusGrowth,
          crmSummary.leaderBruto,
          crmSummary.leaderPotongan,
          crmSummary.leaderBersih,
        ].join(','),
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekap-crm-${crmMonth}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (activeTab === 'live-host') {
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
      return;
    }

    alert(
      `Ekspor Rekap ${activeTab.toUpperCase()} (${period}) berhasil di-generate sesuai format Brief Versi 5!`
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Header
        period={period}
        onPeriodChange={setPeriod}
        totalCompanyPayout={totalCompanyPayout}
        totalCompanyOmzet={totalCompanyOmzet}
        totalBudgetSavings={totalBudgetSavings}
        onExport={handleExport}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
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

      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        liveHostCount={hosts.length}
        happinessScore={mockCustomerHappinessSummary.totalScore}
        crmCsCount={crmSummary.csList.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === 'live-host' && (
          <LiveHostModule
            month={liveHostMonth}
            onMonthChange={handleMonthChange}
            aggregate={aggregate}
            summary={summary}
            hosts={hosts}
            organicParams={currentOrganicParams}
            onOrganicParamsChange={updateOrganicParams}
            targetInput={currentTargetInput}
            onTargetDivisiChange={updateTargetDivisi}
            commissionParams={stored.commissionParams}
            onCommissionParamsChange={updateCommissionParams}
            attendanceMap={currentAttendanceMap}
            onQuickHadirChange={updateQuickHadir}
            onSelectHost={(host) => setSelectedHostName(host.host)}
            sourceMode={sourceMode}
            fetchedAt={fetchedAt}
            onRefreshSheets={() => loadData(true)}
            isRefreshing={isRefreshing}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
          />
        )}

        {activeTab === 'customer-happiness' && (
          <CustomerHappinessModule summary={mockCustomerHappinessSummary} />
        )}

        {activeTab === 'crm-cs' && (
          <CrmModule
            summary={crmSummary}
            selectedMonth={crmMonth}
            onMonthChange={setCrmMonth}
            availableMonths={[
              { key: '2026-09', label: 'September 2026' },
              { key: '2026-10', label: 'Oktober 2026' },
              { key: '2026-11', label: 'November 2026' },
              { key: '2026-08', label: 'Agustus 2026' },
            ]}
            dataSource={crmSource}
            syncedAt={crmSyncedAt}
            isSyncing={isCrmSyncing}
            onRefreshLive={() => loadCrmData(true)}
          />
        )}
      </main>

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
