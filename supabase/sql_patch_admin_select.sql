-- Add this if admins should be able to list ALL organizations in Admin UI
-- Run in Supabase SQL Editor

alter table public.organizations enable row level security;

drop policy if exists org_admin_select on public.organizations;
create policy org_admin_select
on public.organizations
for select
to authenticated
using (public.is_admin() = true);
