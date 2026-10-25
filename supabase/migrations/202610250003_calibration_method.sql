alter table public.profiles
  add column if not exists calibration_method text not null default 'karvonen'
  check (calibration_method in ('karvonen', 'manual'));
