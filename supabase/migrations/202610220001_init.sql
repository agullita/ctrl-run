create extension if not exists pgcrypto;

create table if not exists public.activities (
  id text primary key,
  name text not null,
  sport_type text not null default 'Run',
  started_at timestamptz not null,
  elapsed_time integer not null check (elapsed_time > 0),
  distance numeric(10, 2) not null default 0,
  average_heartrate numeric(5, 1),
  max_heartrate integer,
  elevation_gain numeric(7, 1) default 0,
  device_name text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_streams (
  activity_id text primary key references public.activities(id) on delete cascade,
  time_seconds integer[] not null,
  heartrate smallint[] not null,
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;
alter table public.activity_streams enable row level security;

drop policy if exists "demo activities are publicly readable" on public.activities;
create policy "demo activities are publicly readable"
  on public.activities
  for select
  using (is_demo = true);

drop policy if exists "demo streams are publicly readable" on public.activity_streams;
create policy "demo streams are publicly readable"
  on public.activity_streams
  for select
  using (
    exists (
      select 1
      from public.activities
      where activities.id = activity_streams.activity_id
        and activities.is_demo = true
    )
  );

grant select on public.activities to anon, authenticated;
grant select on public.activity_streams to anon, authenticated;

create index if not exists activities_started_at_idx
  on public.activities (started_at desc);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  activity_id text references public.activities(id) on delete set null,
  score integer not null check (score >= 0 and score <= 1000),
  verdict text not null,
  points_lost integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.evaluations enable row level security;

drop policy if exists "demo evaluations are readable" on public.evaluations;
create policy "demo evaluations are readable"
  on public.evaluations
  for select
  using (true);

drop policy if exists "demo evaluations are insertable" on public.evaluations;
create policy "demo evaluations are insertable"
  on public.evaluations
  for insert
  with check (true);

grant select, insert on public.evaluations to anon, authenticated;

create index if not exists evaluations_created_at_idx
  on public.evaluations (created_at desc);
