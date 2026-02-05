-- v0.5.13 optional patch
--
-- Some Postgres/RLS policy combinations can accidentally create recursion
-- and trigger: "stack depth limit exceeded".
--
-- This patch makes the SECURITY DEFINER helper functions more robust by
-- disabling row security inside them.

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(is_admin, false)
  from public.profiles
  where id = auth.uid()
  limit 1
$$;
