-- =========================================================
-- VendorScore RESET (partial): Orgs/Join + Suppliers + Contacts
-- Correct order (profiles.is_admin first, then functions)
-- =========================================================
-- Run in Supabase SQL Editor as ONE script.
-- By default this keeps existing suppliers table/data.
-- To fully reset suppliers, see the commented DROP line.
-- =========================================================

begin;

create extension if not exists pgcrypto;

-- 1) profiles: add admin flag FIRST (so functions can reference it)
alter table public.profiles
add column if not exists is_admin boolean not null default false;

-- 2) organizations: onboarding fields
alter table public.organizations
  add column if not exists display_name text,
  add column if not exists is_public boolean not null default false,
  add column if not exists join_code text;

update public.organizations
set display_name = coalesce(display_name, initcap(replace(slug, '-', ' ')))
where display_name is null;

create unique index if not exists organizations_join_code_unique
on public.organizations (join_code)
where join_code is not null;

-- 3) helper functions (avoid RLS recursion)
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

comment on function public.current_org_id() is
'Returns organization_id for auth.uid(). Used in RLS policies to avoid recursion.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.is_admin, false)
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

comment on function public.is_admin() is
'Returns whether current user is admin (profiles.is_admin).';

-- 4) Join by code RPC (recommended)
create or replace function public.join_org_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select o.id into v_org_id
  from public.organizations o
  where o.join_code = trim(p_code)
  limit 1;

  if v_org_id is null then
    raise exception 'Invalid join code';
  end if;

  update public.profiles
  set organization_id = v_org_id
  where id = auth.uid();

  return v_org_id;
end;
$$;

comment on function public.join_org_by_code(text) is
'Joins the current user to an organization by join_code. Security definer bypasses RLS safely.';

-- 5) Suppliers fields (minimum required)
-- OPTIONAL HARD RESET (DANGEROUS): Uncomment if you truly want to drop suppliers.
-- drop table if exists public.suppliers cascade;

alter table public.suppliers
  add column if not exists kvk_number text,
  add column if not exists classification text,
  add column if not exists creditor_number text,
  add column if not exists notes text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'suppliers_classification_check') then
    alter table public.suppliers
      add constraint suppliers_classification_check
      check (
        classification is null
        or classification in ('Strategisch', 'Knelpunt', 'Hefboom', 'Routine')
      );
  end if;
end $$;

create unique index if not exists suppliers_org_lower_name_unique
on public.suppliers (organization_id, lower(name));

create index if not exists suppliers_org_idx
on public.suppliers (organization_id);

-- 6) Contacts table (recreate to guarantee shape)
drop table if exists public.supplier_contacts cascade;

create table public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  full_name text not null,
  role_title text,
  email text,
  phone text,
  is_primary boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_contacts_supplier_idx on public.supplier_contacts (supplier_id);
create index if not exists supplier_contacts_org_idx on public.supplier_contacts (organization_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists supplier_contacts_set_updated_at on public.supplier_contacts;
create trigger supplier_contacts_set_updated_at
before update on public.supplier_contacts
for each row execute function public.set_updated_at();

-- 7) RLS: organizations
alter table public.organizations enable row level security;

drop policy if exists org_public_select on public.organizations;
create policy org_public_select
on public.organizations
for select
to authenticated
using (is_public = true);

drop policy if exists org_select_own on public.organizations;
create policy org_select_own
on public.organizations
for select
to authenticated
using (id = public.current_org_id());

drop policy if exists org_admin_insert on public.organizations;
create policy org_admin_insert
on public.organizations
for insert
to authenticated
with check (public.is_admin() = true);

drop policy if exists org_admin_update on public.organizations;
create policy org_admin_update
on public.organizations
for update
to authenticated
using (public.is_admin() = true)
with check (public.is_admin() = true);

drop policy if exists org_admin_delete on public.organizations;
create policy org_admin_delete
on public.organizations
for delete
to authenticated
using (public.is_admin() = true);

-- 8) RLS: profiles
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and (
    organization_id is null
    or organization_id = public.current_org_id()
    or exists (
      select 1 from public.organizations o
      where o.id = organization_id
        and o.is_public = true
    )
  )
);

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
on public.profiles
for update
to authenticated
using (public.is_admin() = true)
with check (public.is_admin() = true);

-- 9) RLS: suppliers
alter table public.suppliers enable row level security;

drop policy if exists suppliers_select_own_org on public.suppliers;
create policy suppliers_select_own_org
on public.suppliers
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists suppliers_insert_own_org on public.suppliers;
create policy suppliers_insert_own_org
on public.suppliers
for insert
to authenticated
with check (organization_id = public.current_org_id());

drop policy if exists suppliers_update_own_org on public.suppliers;
create policy suppliers_update_own_org
on public.suppliers
for update
to authenticated
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

drop policy if exists suppliers_delete_own_org on public.suppliers;
create policy suppliers_delete_own_org
on public.suppliers
for delete
to authenticated
using (organization_id = public.current_org_id());

-- 10) RLS: supplier_contacts
alter table public.supplier_contacts enable row level security;

drop policy if exists supplier_contacts_select_own_org on public.supplier_contacts;
create policy supplier_contacts_select_own_org
on public.supplier_contacts
for select
to authenticated
using (organization_id = public.current_org_id());

drop policy if exists supplier_contacts_insert_own_org on public.supplier_contacts;
create policy supplier_contacts_insert_own_org
on public.supplier_contacts
for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and exists (
    select 1 from public.suppliers s
    where s.id = supplier_id
      and s.organization_id = public.current_org_id()
  )
);

drop policy if exists supplier_contacts_update_own_org on public.supplier_contacts;
create policy supplier_contacts_update_own_org
on public.supplier_contacts
for update
to authenticated
using (organization_id = public.current_org_id())
with check (organization_id = public.current_org_id());

drop policy if exists supplier_contacts_delete_own_org on public.supplier_contacts;
create policy supplier_contacts_delete_own_org
on public.supplier_contacts
for delete
to authenticated
using (organization_id = public.current_org_id());

commit;
