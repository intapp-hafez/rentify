-- ==========================================
-- RENTIFY — SCHEMA (updated)
-- Property Rental Management — Egyptian market
-- Order per table: CREATE TABLE -> GRANT -> ENABLE RLS -> POLICIES
-- (policies live in project-info/policies.sql)
-- ==========================================

-- 1. profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  role text check (role in ('admin', 'manager', 'tenant')) default 'tenant',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- 2. units (rental units / properties)
create table if not exists public.units (
  id uuid default gen_random_uuid() primary key,
  number text,
  title text not null,
  address text,
  city text,
  type text check (type in ('apartment','villa','duplex','shop','office','warehouse','factory','land')) not null,
  floor text,
  area numeric,
  rooms int,
  baths int,
  rent_price numeric not null,
  status text check (status in ('available','rented','reserved','maintenance')) default 'available',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

grant select, insert, update, delete on public.units to authenticated;
grant all on public.units to service_role;

-- 3. tenants
create table if not exists public.tenants (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  civil_id text,           -- الرقم القومي
  job text,
  status text check (status in ('active','late','inactive')) default 'active',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

grant select, insert, update, delete on public.tenants to authenticated;
grant all on public.tenants to service_role;

-- 4. contracts
create table if not exists public.contracts (
  id uuid default gen_random_uuid() primary key,
  number text unique,
  unit_id uuid references public.units(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete restrict not null,
  start_date date not null,
  end_date date not null,
  rent_amount numeric not null,          -- monthly rent
  deposit numeric default 0,
  -- payment term drives the installment schedule (1 / 3 / 6 / 12 months)
  payment_frequency text check (payment_frequency in ('monthly','quarterly','semiannual','yearly')) default 'monthly',
  status text check (status in ('active','expired','terminated')) default 'active',
  attachment_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  constraint contracts_dates_valid check (end_date > start_date)
);

create index if not exists contracts_unit_id_idx on public.contracts(unit_id);
create index if not exists contracts_tenant_id_idx on public.contracts(tenant_id);

grant select, insert, update, delete on public.contracts to authenticated;
grant all on public.contracts to service_role;

-- 5. payments (collections / receipts)
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid references public.contracts(id) on delete cascade not null,
  amount numeric not null,
  payment_date date not null,
  status text check (status in ('pending','completed','late')) default 'completed',
  receipt_number text unique,
  receipt_url text,
  payment_method text check (payment_method in ('cash','bank_transfer','instapay','vodafone_cash','credit_card')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists payments_contract_id_idx on public.payments(contract_id);

grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;

-- 6. deposits (security deposits lifecycle)
create table if not exists public.deposits (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid references public.contracts(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  amount numeric not null,
  status text check (status in ('held','returned','deducted','transferred')) default 'held',
  notes text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

grant select, insert, update, delete on public.deposits to authenticated;
grant all on public.deposits to service_role;

-- 7. maintenance
create table if not exists public.maintenance (
  id uuid default gen_random_uuid() primary key,
  number text,
  unit_id uuid references public.units(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  description text not null default '',
  type text,               -- تكييف / سباكة / كهرباء / مصاعد / دهانات
  priority text check (priority in ('low','medium','high','urgent')) default 'medium',
  status text check (status in ('new','in_progress','completed','cancelled')) default 'new',
  cost numeric,
  maintenance_date date,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

grant select, insert, update, delete on public.maintenance to authenticated;
grant all on public.maintenance to service_role;

-- 8. settings (key -> list of values, e.g. property types, payment methods)
create table if not exists public.settings (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value text[] default '{}',
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

grant select, insert, update, delete on public.settings to authenticated;
grant all on public.settings to service_role;

-- 9. subscriptions (app subscription / license window)
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  type text default 'trial',
  value numeric default 0,
  start_date date default current_date,
  end_date date default (current_date + interval '30 days'),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

grant select, insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

-- ==========================================
-- TRIGGER: auto-create a profile for new users
-- ==========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'admin')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- TRIGGER: keep unit status in sync with contracts
-- ==========================================
create or replace function public.sync_unit_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op in ('INSERT','UPDATE')) then
    if new.status = 'active' then
      update public.units set status = 'rented' where id = new.unit_id;
    else
      update public.units set status = 'available' where id = new.unit_id;
    end if;
    return new;
  else
    update public.units set status = 'available' where id = old.unit_id;
    return old;
  end if;
end;
$$;

drop trigger if exists contracts_sync_unit_status on public.contracts;
create trigger contracts_sync_unit_status
  after insert or update or delete on public.contracts
  for each row execute procedure public.sync_unit_status();