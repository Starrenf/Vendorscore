-- VendorScore v0.5.17 - Join via invites (secure)
-- Run this in Supabase SQL Editor (as postgres).

begin;

-- 1) Table: org_invites
create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz null,
  max_uses integer not null default 1,
  uses integer not null default 0,
  revoked boolean not null default false
);

-- Unique code (global). Keeps UX simple.
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'org_invites_code_unique'
  ) then
    execute 'create unique index org_invites_code_unique on public.org_invites (code)';
  end if;
end $$;

create index if not exists org_invites_org_id_idx on public.org_invites (organization_id);

-- 2) RLS
alter table public.org_invites enable row level security;

-- Helper: is current user admin in their org?
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- 3) Policies for org_invites (admins manage invites for their own org)
drop policy if exists org_invites_select on public.org_invites;
drop policy if exists org_invites_insert on public.org_invites;
drop policy if exists org_invites_update on public.org_invites;
drop policy if exists org_invites_delete on public.org_invites;

create policy org_invites_select
on public.org_invites
for select
to authenticated
using (
  public.is_current_user_admin()
  and organization_id = (select organization_id from public.profiles where id = auth.uid())
);

create policy org_invites_insert
on public.org_invites
for insert
to authenticated
with check (
  public.is_current_user_admin()
  and organization_id = (select organization_id from public.profiles where id = auth.uid())
);

create policy org_invites_update
on public.org_invites
for update
to authenticated
using (
  public.is_current_user_admin()
  and organization_id = (select organization_id from public.profiles where id = auth.uid())
)
with check (
  public.is_current_user_admin()
  and organization_id = (select organization_id from public.profiles where id = auth.uid())
);

create policy org_invites_delete
on public.org_invites
for delete
to authenticated
using (
  public.is_current_user_admin()
  and organization_id = (select organization_id from public.profiles where id = auth.uid())
);

-- 4) Lock down: profiles update should NOT allow changing organization_id
-- (Join happens through the secure function below.)
drop policy if exists vs_profiles_update_self on public.profiles;

create policy vs_profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and organization_id = (select organization_id from public.profiles p2 where p2.id = auth.uid())
);

-- 5) Join function (invite redemption)
-- This function is SECURITY DEFINER so it can update profiles.organization_id.
create or replace function public.join_org_by_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
begin
  -- Ensure this function can update despite RLS policies.
  -- (Works when created/owned by a role with BYPASSRLS, like postgres.)
  perform set_config('row_security', 'off', true);

  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite
  from public.org_invites
  where code = p_code
    and revoked = false
    and (expires_at is null or expires_at > now())
    and uses < max_uses
  limit 1;

  if not found then
    raise exception 'invalid_or_expired_invite';
  end if;

  -- Update caller profile org
  update public.profiles
  set organization_id = v_invite.organization_id
  where id = auth.uid();

  -- Consume invite use
  update public.org_invites
  set uses = uses + 1
  where id = v_invite.id;

  return v_invite.organization_id;
end;
$$;

-- Allow authenticated users to execute the join function
revoke all on function public.join_org_by_invite(text) from public;
grant execute on function public.join_org_by_invite(text) to authenticated;

commit;

-- Notes:
-- - Admins create invites in the Admin → Organisaties UI.
-- - New users must join via /onboarding (invite code) or /join/<invite-code>.
