-- ============================================================
--  Masjid e Mohammadi · Kidmat Committee — Family Records
--  Supabase schema  (Postgres)
-- ------------------------------------------------------------
--  HOW TO USE
--  1. Open your Supabase project → SQL Editor → New query.
--  2. Paste this whole file and press RUN.
--  3. Put your Project URL + anon key into config.js.
--
--  SECURITY NOTE (read this)
--  RLS is ON and, by default, only signed-in Supabase Auth users
--  can read/write. The app currently uses its own local login
--  (localStorage), so cloud sync stays OFF until you either:
--    (a) switch the app to Supabase Auth, or
--    (b) for a QUICK private demo, uncomment the "anon demo"
--        policy block at the bottom (this exposes data to anyone
--        who has the public anon key — do NOT use with real PII).
-- ============================================================

-- ---------- tables ----------
create table if not exists public.families (
  id          text primary key,              -- e.g. MEMC-2026-000001
  house_name  text not null default '',
  house_no    text default '',
  address     text default '',
  phone       text default '',
  notes       text default '',
  docs        jsonb not null default '{}'::jsonb,   -- {aadhaar:'yes',...}
  custom      jsonb not null default '[]'::jsonb,   -- [{label,value},...]
  created_by  text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.members (
  id             uuid primary key default gen_random_uuid(),
  family_id      text not null references public.families(id) on delete cascade,
  relation       text default '',
  name           text not null default '',
  father_name    text default '',
  mother_name    text default '',
  gender         text default '',
  dob            date,
  education      text default '',
  marital_status text default '',
  children       text default '',
  disability     text default 'no',
  govt_scheme    text default 'no',
  created_at     timestamptz not null default now()
);
create index if not exists members_family_id_idx on public.members(family_id);

-- app logins (mirror of local users; keeps salt + hash)
create table if not exists public.app_users (
  id         text primary key,               -- login id (lowercased)
  role       text not null default 'admin',  -- super | admin | family
  name       text default '',
  phone      text default '',
  family_id  text references public.families(id) on delete set null,
  salt       text not null default '',
  pass_hash  text not null default '',
  created_at timestamptz not null default now()
);

-- sequence that hands out the numeric part of Family IDs
create sequence if not exists public.family_seq start 1;

create or replace function public.next_family_id()
returns text language plpgsql as $$
declare n bigint;
begin
  n := nextval('public.family_seq');
  return 'MEMC-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
end $$;

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists families_touch on public.families;
create trigger families_touch before update on public.families
  for each row execute function public.touch_updated_at();

-- ---------- row level security ----------
alter table public.families  enable row level security;
alter table public.members   enable row level security;
alter table public.app_users enable row level security;

-- secure default: only authenticated (Supabase Auth) users may read/write
drop policy if exists families_auth_all  on public.families;
drop policy if exists members_auth_all   on public.members;
drop policy if exists app_users_auth_all on public.app_users;

create policy families_auth_all  on public.families  for all to authenticated using (true) with check (true);
create policy members_auth_all   on public.members   for all to authenticated using (true) with check (true);
create policy app_users_auth_all on public.app_users for all to authenticated using (true) with check (true);

-- ---------- QUICK DEMO ONLY (uncomment to allow the anon key) ----------
-- WARNING: exposes all family data to anyone holding the public anon
-- key. Use only on a throwaway/demo project, never with real records.
--
-- create policy families_anon_all  on public.families  for all to anon using (true) with check (true);
-- create policy members_anon_all   on public.members   for all to anon using (true) with check (true);
-- create policy app_users_anon_all on public.app_users for all to anon using (true) with check (true);
