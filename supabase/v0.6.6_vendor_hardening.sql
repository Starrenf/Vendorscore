-- VendorScore v0.6.6 - hardening for invites, evaluations and weights
-- Run this in Supabase SQL Editor before deploying this build.

begin;

-- evaluations.year
alter table if exists public.evaluations
  add column if not exists year integer;

update public.evaluations
set year = extract(year from coalesce(created_at, now()))::int
where year is null;

alter table if exists public.evaluations
  alter column year set default extract(year from now())::int;

-- org_invites compatibility
alter table if exists public.org_invites
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table if exists public.org_invites
  add column if not exists revoked boolean not null default false;

alter table if exists public.org_invites
  add column if not exists uses integer not null default 0;

alter table if exists public.org_invites
  add column if not exists max_uses integer not null default 1;

-- weight configs unique key for upsert
create unique index if not exists weight_configs_org_strategy_block_key
  on public.weight_configs (organization_id, strategy, k_block);

commit;
