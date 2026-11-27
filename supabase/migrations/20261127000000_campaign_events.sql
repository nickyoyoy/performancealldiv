-- Tabel kalender campaign & promo Live.
-- Baca: semua orang (anon & login). Tulis (tambah/ubah/hapus): hanya user login dengan role owner atau admin.

create table if not exists public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  platform text not null check (platform in ('tiktok', 'shopee', 'semua')),
  type text not null check (type in ('campaign', 'promo', 'live')),
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('rencana', 'berjalan', 'selesai')),
  note text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_events_dates check (end_date >= start_date)
);

alter table public.campaign_events enable row level security;

drop policy if exists "campaign_events read" on public.campaign_events;
create policy "campaign_events read" on public.campaign_events
  for select to anon, authenticated using (true);

drop policy if exists "campaign_events write" on public.campaign_events;
create policy "campaign_events write" on public.campaign_events
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('owner', 'admin'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('owner', 'admin'));

grant select on public.campaign_events to anon, authenticated;
grant insert, update, delete on public.campaign_events to authenticated;
