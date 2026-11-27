import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import { MONTHS, MONTH_LABEL_ID } from '../utils/liveHostEngine';
import { getAccessToken } from '../services/auth';
import '../styles/dashboard-live.css';

/** Nama tab di spreadsheet utama yang berisi jadwal campaign (dibaca saja). */
export const CAMPAIGN_SHEET = '11_CAMPAIGN_CALENDAR';
const SHEET_EDIT_URL = 'https://docs.google.com/spreadsheets/d/18djB-SiIrUL2HhXcC35HTmc9oCKkLoWPqe2kklf8S2M/edit';

export type Platform = 'tiktok' | 'shopee' | 'semua';
export type EventType = 'campaign' | 'promo' | 'live';
export type EventStatus = 'rencana' | 'berjalan' | 'selesai';

export interface CampaignEvent {
  id: string;
  title: string;
  platform: Platform;
  type: EventType;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  status: EventStatus;
  note: string;
}

const PLATFORM_LABEL: Record<Platform, string> = { tiktok: 'TikTok', shopee: 'Shopee', semua: 'Semua marketplace' };
const PLATFORM_COLOR: Record<Platform, string> = { tiktok: '#7fa3d6', shopee: '#ff8a6b', semua: '#ffffff' };
const TYPE_LABEL: Record<EventType, string> = { campaign: 'Campaign', promo: 'Promo', live: 'Live khusus' };
const STATUS_LABEL: Record<EventStatus, string> = { rencana: 'Rencana', berjalan: 'Berjalan', selesai: 'Selesai' };
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/* ---------- Membaca tab spreadsheet ----------
 * Kolom (baris pertama): Judul | Marketplace | Jenis | Tanggal Mulai | Tanggal Selesai | Status | Catatan
 * Tanggal boleh YYYY-MM-DD atau DD/MM/YYYY. Tanggal Selesai kosong = sama dengan Tanggal Mulai.
 */
const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase();

function parseDate(raw: string | undefined): string | null {
  const t = (raw ?? '').trim();
  if (!t) return null;
  const isoM = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoM) return `${isoM[1]}-${pad(Number(isoM[2]))}-${pad(Number(isoM[3]))}`;
  const dmy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${pad(Number(dmy[2]))}-${pad(Number(dmy[1]))}`;
  return null;
}

function toPlatform(s: string): Platform {
  if (s.includes('tiktok')) return 'tiktok';
  if (s.includes('shopee')) return 'shopee';
  return 'semua';
}

function toType(s: string): EventType {
  if (s.includes('promo')) return 'promo';
  if (s.includes('live')) return 'live';
  return 'campaign';
}

function toStatus(s: string): EventStatus {
  if (s.includes('berjalan')) return 'berjalan';
  if (s.includes('selesai')) return 'selesai';
  return 'rencana';
}

export function parseCampaignCsv(csv: string): CampaignEvent[] {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const out: CampaignEvent[] = [];
  parsed.data.forEach((row, i) => {
    const title = (row['Judul'] ?? '').trim();
    const start = parseDate(row['Tanggal Mulai']);
    if (!title || !start) return;
    const end = parseDate(row['Tanggal Selesai']) ?? start;
    out.push({
      id: `${i}-${title}`,
      title,
      platform: toPlatform(norm(row['Marketplace'])),
      type: toType(norm(row['Jenis'])),
      start,
      end: end < start ? start : end,
      status: toStatus(norm(row['Status'])),
      note: (row['Catatan'] ?? '').trim(),
    });
  });
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

async function fetchCampaigns(): Promise<CampaignEvent[]> {
  const token = getAccessToken();
  const res = await fetch(`/api/raw-sheet?sheet=${encodeURIComponent(CAMPAIGN_SHEET)}&_t=${Date.now()}`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(
      res.status === 400
        ? `Tab "${CAMPAIGN_SHEET}" belum terdaftar di aplikasi. Hubungi tim developer.`
        : `Gagal memuat jadwal campaign (${res.status}).`
    );
  }
  const text = await res.text();
  if (text.trim().startsWith('<')) throw new Error('Respons tidak valid. Cek akses spreadsheet.');
  return parseCampaignCsv(text);
}

export const CampaignCalendar: React.FC = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setEvents(await fetchCampaigns());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat jadwal campaign.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Sel kalender Senin-first.
  const cells = useMemo(() => {
    const first = new Date(year, monthIdx, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(year, monthIdx + 1, 0).getDate();
    const out: (string | null)[] = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(iso(year, monthIdx, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [year, monthIdx]);

  const eventsOn = (date: string) => events.filter((e) => e.start <= date && date <= e.end);

  const monthEvents = useMemo(() => {
    const first = iso(year, monthIdx, 1);
    const last = iso(year, monthIdx, new Date(year, monthIdx + 1, 0).getDate());
    return events.filter((e) => e.start <= last && e.end >= first);
  }, [events, year, monthIdx]);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, monthIdx + delta, 1);
    setYear(d.getFullYear());
    setMonthIdx(d.getMonth());
    setSelected(null);
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonthIdx(t.getMonth());
    setSelected(iso(t.getFullYear(), t.getMonth(), t.getDate()));
  };

  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedEvents = selected ? eventsOn(selected) : [];

  return (
    <div className="dl-stack">
      <section className="dl-card">
        <div className="dl-head" style={{ justifyContent: 'space-between' }}>
          <div>
            <h3 className="dl-h">Kalender Campaign &amp; Promo Live</h3>
            <p className="dl-sub">Jadwal dibaca dari tab {CAMPAIGN_SHEET}. Untuk menambah atau mengubah, edit langsung di spreadsheet.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="dl-btn" onClick={() => shiftMonth(-1)} aria-label="Bulan sebelumnya">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="dl-h" style={{ minWidth: 160, textAlign: 'center' }}>
              {MONTH_LABEL_ID[MONTHS[monthIdx]]} {year}
            </span>
            <button type="button" className="dl-btn" onClick={() => shiftMonth(1)} aria-label="Bulan berikutnya">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button type="button" className="dl-btn" onClick={goToday}>Hari ini</button>
            <button type="button" className="dl-btn" onClick={load} disabled={loading} aria-label="Muat ulang jadwal">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
            <a href={SHEET_EDIT_URL} target="_blank" rel="noreferrer" className="sh-btn sh-btn-solid" style={{ textDecoration: 'none' }}>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              Buka spreadsheet
            </a>
          </div>
        </div>

        <div className="dl-body">
          <div className="dl-legend-row" style={{ justifyContent: 'flex-start', gap: 18, padding: 0, marginBottom: 12 }}>
            {(['tiktok', 'shopee', 'semua'] as Platform[]).map((p) => (
              <span key={p} className="dl-muted" style={{ display: 'flex', alignItems: 'center' }}>
                <span className="dl-dot" style={{ background: PLATFORM_COLOR[p] }} />
                {PLATFORM_LABEL[p]}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
            {WEEKDAYS.map((w) => (
              <div key={w} className="dl-lbl" style={{ textAlign: 'center', padding: '4px 0' }}>{w}</div>
            ))}
            {cells.map((date, i) => {
              if (!date) return <div key={`e${i}`} style={{ minHeight: 96 }} />;
              const list = eventsOn(date);
              const isSel = selected === date;
              const isToday = date === todayIso;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  style={{
                    minHeight: 96,
                    textAlign: 'left',
                    padding: 6,
                    borderRadius: 12,
                    border: `1px solid ${isSel ? '#ffffff' : '#262626'}`,
                    background: isSel ? '#1f1f1f' : '#141414',
                    color: '#fff',
                    cursor: 'pointer',
                    font: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        minWidth: 22,
                        height: 22,
                        borderRadius: 7,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isToday ? '#ffffff' : 'transparent',
                        color: isToday ? '#111' : '#fff',
                      }}
                    >
                      {Number(date.slice(8))}
                    </span>
                    {list.length > 0 && <span className="dl-muted" style={{ fontSize: 10 }}>{list.length} event</span>}
                  </div>
                  {list.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      title={e.title}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 6,
                        marginBottom: 3,
                        background: PLATFORM_COLOR[e.platform],
                        color: '#111',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {e.title}
                    </div>
                  ))}
                  {list.length > 2 && <div className="dl-muted" style={{ fontSize: 10 }}>+{list.length - 2} lagi</div>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {loadError && (
        <div role="alert" className="dl-tag bad" style={{ borderRadius: 10, padding: '8px 12px' }}>{loadError}</div>
      )}

      {selected && (
        <section className="dl-card">
          <div className="dl-head">
            <div>
              <h3 className="dl-h">
                {Number(selected.slice(8))} {MONTH_LABEL_ID[MONTHS[Number(selected.slice(5, 7)) - 1]]} {selected.slice(0, 4)}
              </h3>
              <p className="dl-sub">{selectedEvents.length} campaign pada tanggal ini</p>
            </div>
          </div>
          <div className="dl-body dl-stack-tight">
            {selectedEvents.length === 0 && <p className="dl-muted">Belum ada campaign pada tanggal ini.</p>}
            {selectedEvents.map((e) => (
              <div key={e.id} style={{ padding: 12, borderRadius: 12, border: '1px solid #262626', background: '#1a1a1a' }}>
                <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="dl-dot" style={{ background: PLATFORM_COLOR[e.platform], margin: 0 }} />
                  {e.title}
                </div>
                <div className="dl-muted" style={{ marginTop: 4 }}>
                  {PLATFORM_LABEL[e.platform]} · {TYPE_LABEL[e.type]} · {STATUS_LABEL[e.status]} · {e.start}
                  {e.end !== e.start ? ` s/d ${e.end}` : ''}
                </div>
                {e.note && <div className="dl-muted" style={{ marginTop: 4 }}>{e.note}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="dl-card">
        <div className="dl-head">
          <div>
            <h3 className="dl-h">Daftar Campaign {MONTH_LABEL_ID[MONTHS[monthIdx]]} {year}</h3>
            <p className="dl-sub">{monthEvents.length} campaign</p>
          </div>
        </div>
        <div className="dl-table-wrap">
          <table className="dl-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Marketplace</th>
                <th>Jenis</th>
                <th>Periode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {monthEvents.map((e) => (
                <tr key={e.id} className="clickable" onClick={() => setSelected(e.start)}>
                  <td style={{ fontWeight: 800, color: '#fff' }}>{e.title}</td>
                  <td>{PLATFORM_LABEL[e.platform]}</td>
                  <td>{TYPE_LABEL[e.type]}</td>
                  <td className="tabular-nums">{e.start}{e.end !== e.start ? ` s/d ${e.end}` : ''}</td>
                  <td>{STATUS_LABEL[e.status]}</td>
                </tr>
              ))}
              {monthEvents.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#737373', padding: 24 }}>
                    {loading ? 'Memuat...' : 'Belum ada campaign di bulan ini.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
