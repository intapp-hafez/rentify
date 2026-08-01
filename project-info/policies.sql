-- ==========================================
-- RENTIFY — ROW LEVEL SECURITY (updated)
-- Roles: admin / manager (back-office), tenant (self-service)
-- Run AFTER project-info/schema.sql
-- ==========================================

-- Role enum + roles table (roles are NEVER stored on profiles)
do $$ begin
  create type public.app_role as enum ('admin', 'manager', 'tenant');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- Security-definer role check (avoids recursive RLS)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Convenience: is this user back-office staff?
create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin') or public.has_role(_user_id, 'manager')
$$;

-- Convenience: tenant row(s) owned by the current user
create or replace function public.current_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.tenants where user_id = auth.uid()
$$;

drop policy if exists "read own roles" on public.user_roles;
create policy "read own roles" on public.user_roles
for select to authenticated using (user_id = auth.uid());

drop policy if exists "admins manage roles" on public.user_roles;
create policy "admins manage roles" on public.user_roles
for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- Enable RLS everywhere
-- ==========================================
alter table public.profiles      enable row level security;
alter table public.units         enable row level security;
alter table public.tenants       enable row level security;
alter table public.contracts     enable row level security;
alter table public.payments      enable row level security;
alter table public.deposits      enable row level security;
alter table public.maintenance   enable row level security;
alter table public.settings      enable row level security;
alter table public.subscriptions enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_staff(auth.uid()));

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles staff manage" on public.profiles;
create policy "profiles staff manage" on public.profiles
for all to authenticated
using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ---------- units ----------
drop policy if exists "units staff manage" on public.units;
create policy "units staff manage" on public.units
for all to authenticated
using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "units tenant read own" on public.units;
create policy "units tenant read own" on public.units
for select to authenticated using (
  exists (
    select 1 from public.contracts c
    where c.unit_id = units.id
      and c.tenant_id in (select public.current_tenant_ids())
  )
);

-- ---------- tenants ----------
drop policy if exists "tenants staff manage" on public.tenants;
create policy "tenants staff manage" on public.tenants
for all to authenticated
using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "tenants read own" on public.tenants;
create policy "tenants read own" on public.tenants
for select to authenticated using (user_id = auth.uid());

-- ---------- contracts ----------
drop policy if exists "contracts staff manage" on public.contracts;
create policy "contracts staff manage" on public.contracts
for all to authenticated
using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "contracts tenant read own" on public.contracts;
create policy "contracts tenant read own" on public.contracts
for select to authenticated
using (tenant_id in (select public.current_tenant_ids()));

-- ---------- payments ----------
drop policy if exists "payments staff manage" on public.payments;
create policy "payments staff manage" on public.payments
for all to authenticated
using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "payments tenant read own" on public.payments;
create policy "payments tenant read own" on public.payments
for select to authenticated using (
  exists (
    select 1 from public.contracts c
    where c.id = payments.contract_id
      and c.tenant_id in (select public.current_tenant_ids())
  )
);

-- ---------- deposits ----------
drop policy if exists "deposits staff manage" on public.deposits;
create policy "deposits staff manage" on public.deposits
for all to authenticated
using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "deposits tenant read own" on public.deposits;
create policy "deposits tenant read own" on public.deposits
for select to authenticated
using (tenant_id in (select public.current_tenant_ids()));

-- ---------- maintenance ----------
drop policy if exists "maintenance staff manage" on public.maintenance;
create policy "maintenance staff manage" on public.maintenance
for all to authenticated
using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "maintenance tenant read own" on public.maintenance;
create policy "maintenance tenant read own" on public.maintenance
for select to authenticated
using (tenant_id in (select public.current_tenant_ids()));

-- tenants may open their own request
drop policy if exists "maintenance tenant insert own" on public.maintenance;
create policy "maintenance tenant insert own" on public.maintenance
for insert to authenticated
with check (tenant_id in (select public.current_tenant_ids()));

-- ---------- settings ----------
drop policy if exists "settings read" on public.settings;
create policy "settings read" on public.settings
for select to authenticated using (true);

drop policy if exists "settings admin write" on public.settings;
create policy "settings admin write" on public.settings
for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ---------- subscriptions ----------
drop policy if exists "subscriptions read" on public.subscriptions;
create policy "subscriptions read" on public.subscriptions
for select to authenticated using (true);

drop policy if exists "subscriptions admin write" on public.subscriptions;
create policy "subscriptions admin write" on public.subscriptions
for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- NOTE: no `anon` grants and no anon policies — every table is signed-in only.