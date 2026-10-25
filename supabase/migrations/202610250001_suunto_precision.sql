create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  hr_max integer check (hr_max between 120 and 230),
  hr_rest integer check (hr_rest between 30 and 120),
  z1_min integer,
  z1_max integer,
  z2_min integer,
  z2_max integer,
  z3_min integer,
  z3_max integer,
  z4_min integer,
  z4_max integer,
  z5_min integer,
  z5_max integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.ctrlrun_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ctrlrun_profiles_updated_at on public.profiles;
create trigger ctrlrun_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.ctrlrun_touch_updated_at();

create or replace function public.ctrlrun_create_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ctrlrun_on_auth_user_created on auth.users;
create trigger ctrlrun_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.ctrlrun_create_profile();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, insert, update on public.profiles to authenticated;

create table if not exists public.suunto_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_type text not null default 'bearer',
  scope text,
  suunto_username text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.suunto_tokens enable row level security;
revoke all on public.suunto_tokens from anon, authenticated;

create table if not exists public.precision_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  suunto_workout_key text,
  activity_name text not null,
  activity_started_at timestamptz not null,
  elapsed_seconds integer not null check (elapsed_seconds > 0),
  mission_zone text not null,
  zone_min integer not null,
  zone_max integer not null,
  target_bpm integer not null,
  score integer not null,
  gross_points integer not null default 0,
  penalty_points integer not null default 0,
  precision_percent numeric(8, 3) not null,
  target_seconds integer not null default 0,
  sweet_spot_seconds integer not null default 0,
  above_seconds integer not null default 0,
  below_seconds integer not null default 0,
  source text not null default 'suunto',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint precision_runs_zone_order check (zone_min < zone_max)
);

alter table public.precision_runs enable row level security;

drop policy if exists "precision_runs_select_own" on public.precision_runs;
create policy "precision_runs_select_own"
  on public.precision_runs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "precision_runs_insert_own" on public.precision_runs;
create policy "precision_runs_insert_own"
  on public.precision_runs for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.precision_runs to authenticated;

create index if not exists precision_runs_user_created_idx
  on public.precision_runs (user_id, created_at desc);

create index if not exists precision_runs_workout_idx
  on public.precision_runs (suunto_workout_key);
