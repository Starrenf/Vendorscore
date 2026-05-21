-- VendorScore v0.6.5 - evaluations year / invite created_by / weight_configs tenant-safe
-- Run in Supabase SQL Editor before deploying this build.

begin;

alter table if exists public.evaluations
  add column if not exists year integer;

update public.evaluations
set year = extract(year from coalesce(created_at, now()))::int
where year is null;

alter table if exists public.evaluations
  alter column year set default extract(year from now())::int;

alter table if exists public.org_invites
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create unique index if not exists weight_configs_org_strategy_block_key
  on public.weight_configs (organization_id, strategy, k_block);

commit;
