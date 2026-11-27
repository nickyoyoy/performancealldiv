import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { MONTHS, MONTH_LABEL_ID } from '../utils/liveHostEngine';
import '../styles/dashboard-live.css';
import { SUPABASE_ANON_KEY, SUPABASE_URL, getAccessToken } from '../services/auth';

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

/* ---------- Data: tabel Supabase public.campaign_events ---------- */
interface EventRow {
  id: string;
  title: string;
  platform: Platform;
  type: EventType;
  start_date: string;
  end_date: string;
  status: EventStatus;
  note: string;
}

const toEvent = (r: EventRow): CampaignEvent => ({
  id: r.id,
  title: r.title,
  platform: r.platform,
  type: r.type,
  start: r.start_date,
  end: r.end_date,
  status: r.status,
  note: r.note ?? '',
});

const toRow = (d: Omit<CampaignEvent, 'id'>) => ({
  title: d.title,
  platform: d.platform,
  type: d.type,
  start_date: d.start,
  end_date: d.end,
  status: d.status,
  note: d.note,
});

function headers(json = false): Record<string, string> {
  const token = getAccessToken() || SUPABASE_ANON_KEY;
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json', Prefer: 'return=minimal' } : {}),
  };
}

async function dbError(res: Response): Promise<Error> {
  if (res.status === 401 || res.status === 403) return new Error('Anda tidak punya izin mengubah jadwal. Masuk dengan akun Owner atau Admin.');
  const text = await res.text().catch(() => '');
  return new Error(text || `Gagal (${res.status})`);
}

async function fetchEvents(): Promise<CampaignEvent[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/campaign_events?select=*&order=start_date.asc`, { headers: headers() });
  if (!res.ok) throw await dbError(res);
  const rows = (await res.json()) as EventRow[];
  return rows.map(toEvent);
}

async function insertEvent(d: Omit<CampaignEvent, 'id'>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/campaign_events`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify(toRow(d)),
  });
  if (!res.ok) throw await dbError(res);
}

async function updateEvent(id: string, d: Omit<CampaignEvent, 'id'>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/campaign_events?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...headers(true), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...toRow(d), updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw await dbError(res);
}

async function deleteEvent(id: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/campaign_events?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) throw await dbError(res);
}

const emptyForm = (date: string): Omit<CampaignEvent, 'id'> => ({
  title: '',
  platform: 'semua',
  type: 'campaign',
  start: date,
  end: date,
  status: 'rencana',
  note: '',
});

interface CampaignCalendarProps {
  canEdit: boolean;
}

export const CampaignCalendar: React.FC<CampaignCalendarProps> = ({ canEdit }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<{ id: string | null; data: Omit<CampaignEvent, 'id'> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setEvents(await fetchEvents());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat campaign.');
    }
  };

  useEffect(() => {
    refresh();
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
    const prefix = `${year}-${pad(monthIdx + 1)}`;
    return events
      .filter((e) => e.start.startsWith(prefix) || e.end.startsWith(prefix) || (e.start < prefix && e.end > prefix))
      .sort((a, b) => a.start.localeCompare(b.start));
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

  const openNew = (date: string) => {
    setError(null);
    setForm({ id: null, data: emptyForm(date) });
  };

  const openEdit = (e: CampaignEvent) => {
    setError(null);
    const { id, ...data } = e;
    setForm({ id, data });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const { id, data } = form;
    if (!data.title.trim()) return setError('Nama campaign wajib diisi.');
    if (data.end < data.start) return setError('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    const clean = { ...data, title: data.title.trim(), note: data.note.trim() };
    setBusy(true);
    setError(null);
    try {
      if (id) await updateEvent(id, clean);
      else await insertEvent(clean);
      setForm(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Hapus campaign ini?')) return;
    try {
      await deleteEvent(id);
      await refresh();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal menghapus.');
    }
  };

  const selectedEvents = selected ? eventsOn(selected) : [];
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="dl-stack">
      <section className="dl-card">
        <div className="dl-head" style={{ justifyContent: 'space-between' }}>
          <div>
            <h3 className="dl-h">Kalender Campaign &amp; Promo Live</h3>
            <p className="dl-sub">
              {canEdit
                ? 'Klik tanggal untuk melihat atau menambah campaign. Klik campaign untuk mengubah.'
                : 'Tampilan hanya lihat. Hubungi Owner atau Admin untuk mengubah jadwal.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            {canEdit && (
              <button type="button" className="sh-btn sh-btn-solid" onClick={() => openNew(selected ?? todayIso)}>
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Campaign baru
              </button>
            )}
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
                        color: e.platform === 'semua' ? '#111' : '#111',
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
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid #262626',
                  background: '#1a1a1a',
                }}
              >
                <div style={{ minWidth: 0 }}>
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
                {canEdit && (
                  <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                    <button type="button" className="dl-btn" onClick={() => openEdit(e)} aria-label={`Ubah ${e.title}`}>
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button type="button" className="dl-btn" onClick={() => remove(e.id)} aria-label={`Hapus ${e.title}`} style={{ borderColor: '#ef4444', color: '#f87171' }}>
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {form && canEdit && (
        <section className="dl-card">
          <div className="dl-head">
            <h3 className="dl-h">{form.id ? 'Ubah campaign' : 'Campaign baru'}</h3>
          </div>
          <form onSubmit={submit} className="dl-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <Field label="Nama campaign" wide>
              <input className="dl-field" style={{ width: '100%' }} value={form.data.title} onChange={(e) => setForm({ ...form, data: { ...form.data, title: e.target.value } })} />
            </Field>
            <Field label="Marketplace">
              <select className="dl-field" style={{ width: '100%' }} value={form.data.platform} onChange={(e) => setForm({ ...form, data: { ...form.data, platform: e.target.value as Platform } })}>
                {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
              </select>
            </Field>
            <Field label="Jenis">
              <select className="dl-field" style={{ width: '100%' }} value={form.data.type} onChange={(e) => setForm({ ...form, data: { ...form.data, type: e.target.value as EventType } })}>
                {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="Tanggal mulai">
              <input type="date" className="dl-field" style={{ width: '100%' }} value={form.data.start} onChange={(e) => setForm({ ...form, data: { ...form.data, start: e.target.value, end: form.data.end < e.target.value ? e.target.value : form.data.end } })} />
            </Field>
            <Field label="Tanggal selesai">
              <input type="date" className="dl-field" style={{ width: '100%' }} value={form.data.end} onChange={(e) => setForm({ ...form, data: { ...form.data, end: e.target.value } })} />
            </Field>
            <Field label="Status">
              <select className="dl-field" style={{ width: '100%' }} value={form.data.status} onChange={(e) => setForm({ ...form, data: { ...form.data, status: e.target.value as EventStatus } })}>
                {(Object.keys(STATUS_LABEL) as EventStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Catatan" wide>
              <textarea className="dl-field" style={{ width: '100%', minHeight: 70 }} value={form.data.note} onChange={(e) => setForm({ ...form, data: { ...form.data, note: e.target.value } })} />
            </Field>
            {error && <div className="dl-tag bad" style={{ gridColumn: '1 / -1', borderRadius: 10, padding: '8px 12px' }}>{error}</div>}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
              <button type="submit" className="sh-btn sh-btn-solid" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
              <button type="button" className="sh-btn sh-btn-outline" onClick={() => setForm(null)}>Batal</button>
            </div>
          </form>
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
                  <td colSpan={5} style={{ textAlign: 'center', color: '#737373', padding: 24 }}>Belum ada campaign di bulan ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const Field: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide, children }) => (
  <label style={wide ? { gridColumn: '1 / -1' } : undefined}>
    <span className="dl-lbl" style={{ display: 'block', marginBottom: 6 }}>{label}</span>
    {children}
  </label>
);
